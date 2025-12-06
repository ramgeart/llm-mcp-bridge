import OpenAI from "openai";

export interface LLMClientConfig {
  baseURL: string;
  apiKey?: string;
}

export interface ModelInfo {
  id: string;
  object: string;
  owned_by: string;
}

export interface BenchmarkResult {
  model: string;
  prompt: string;
  response: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  tokensPerSecond: number;
  timeToFirstToken?: number;
}

export interface StreamMetrics {
  timeToFirstToken: number;
  totalTime: number;
  tokenCount: number;
  tokensPerSecond: number;
}

/**
 * Cliente para cualquier API compatible con OpenAI
 * Soporta: LM Studio, Ollama, vLLM, LocalAI, OpenAI, Azure OpenAI, Together.ai, Groq, etc.
 */
export class LLMClient {
  private client: OpenAI;
  private baseURL: string;

  constructor(config: LLMClientConfig = { baseURL: "http://localhost:1234/v1" }) {
    this.baseURL = config.baseURL;
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey || "not-needed", // Muchos servidores locales no requieren API key
    });
  }

  /**
   * Lista todos los modelos disponibles
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => ({
        id: model.id,
        object: model.object,
        owned_by: model.owned_by,
      }));
    } catch (error) {
      throw new Error(`Error listing models: ${error}`);
    }
  }

  /**
   * Obtiene información del servidor
   */
  async getServerStatus(): Promise<{ connected: boolean; models: number; baseURL: string }> {
    try {
      const models = await this.listModels();
      return {
        connected: true,
        models: models.length,
        baseURL: this.baseURL,
      };
    } catch (error) {
      return {
        connected: false,
        models: 0,
        baseURL: this.baseURL,
      };
    }
  }

  /**
   * Realiza una completación simple y mide métricas
   */
  async chat(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      topK?: number;
      repeatPenalty?: number;
      presencePenalty?: number;
      frequencyPenalty?: number;
      stop?: string[];
      systemPrompt?: string;
    } = {}
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: options.model || "",
      messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature ?? 0.7,
    };

    // Añadir parámetros opcionales si están definidos
    if (options.topP !== undefined) requestParams.top_p = options.topP;
    if (options.presencePenalty !== undefined) requestParams.presence_penalty = options.presencePenalty;
    if (options.frequencyPenalty !== undefined) requestParams.frequency_penalty = options.frequencyPenalty;
    if (options.stop) requestParams.stop = options.stop;
    
    // LM Studio soporta estos parámetros adicionales via extra_body
    const extraBody: Record<string, unknown> = {};
    if (options.topK !== undefined) extraBody.top_k = options.topK;
    if (options.repeatPenalty !== undefined) extraBody.repeat_penalty = options.repeatPenalty;

    const response = await this.client.chat.completions.create({
      ...requestParams,
      ...(Object.keys(extraBody).length > 0 ? { extra_body: extraBody } : {}),
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    const completionTokens = response.usage?.completion_tokens || 0;
    const promptTokens = response.usage?.prompt_tokens || 0;

    return {
      model: response.model,
      prompt,
      response: response.choices[0]?.message?.content || "",
      promptTokens,
      completionTokens,
      totalTokens: response.usage?.total_tokens || 0,
      latencyMs,
      tokensPerSecond: completionTokens > 0 ? (completionTokens / latencyMs) * 1000 : 0,
    };
  }

  /**
   * Realiza una completación con streaming y mide métricas detalladas
   */
  async chatStream(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
      onToken?: (token: string) => void;
    } = {}
  ): Promise<BenchmarkResult & StreamMetrics> {
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let fullResponse = "";

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const stream = await this.client.chat.completions.create({
      model: options.model || "",
      messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        if (firstTokenTime === null) {
          firstTokenTime = Date.now();
        }
        tokenCount++;
        fullResponse += content;
        options.onToken?.(content);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : 0;

    return {
      model: options.model || "unknown",
      prompt,
      response: fullResponse,
      promptTokens: 0, // No disponible en streaming
      completionTokens: tokenCount,
      totalTokens: tokenCount,
      latencyMs: totalTime,
      tokensPerSecond: tokenCount > 0 ? (tokenCount / totalTime) * 1000 : 0,
      timeToFirstToken,
      totalTime,
      tokenCount,
    };
  }

  /**
   * Ejecuta un benchmark completo con múltiples prompts
   */
  async runBenchmark(
    prompts: string[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      runs?: number;
    } = {}
  ): Promise<{
    results: BenchmarkResult[];
    summary: {
      avgLatencyMs: number;
      avgTokensPerSecond: number;
      totalPrompts: number;
      totalTokensGenerated: number;
    };
  }> {
    const runs = options.runs || 1;
    const results: BenchmarkResult[] = [];

    for (let run = 0; run < runs; run++) {
      for (const prompt of prompts) {
        const result = await this.chat(prompt, options);
        results.push(result);
      }
    }

    const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0);
    const totalTps = results.reduce((sum, r) => sum + r.tokensPerSecond, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.completionTokens, 0);

    return {
      results,
      summary: {
        avgLatencyMs: totalLatency / results.length,
        avgTokensPerSecond: totalTps / results.length,
        totalPrompts: results.length,
        totalTokensGenerated: totalTokens,
      },
    };
  }

  /**
   * Evalúa la coherencia de respuestas del modelo
   */
  async evaluateCoherence(
    prompt: string,
    options: {
      model?: string;
      runs?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    responses: string[];
    consistency: number;
    avgLength: number;
  }> {
    const runs = options.runs || 3;
    const responses: string[] = [];

    for (let i = 0; i < runs; i++) {
      const result = await this.chat(prompt, {
        model: options.model,
        temperature: options.temperature ?? 0.7,
      });
      responses.push(result.response);
    }

    // Calcular similitud básica entre respuestas
    const avgLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
    
    // Calcular consistencia basada en longitud similar
    const lengthVariance = responses.reduce((sum, r) => {
      return sum + Math.pow(r.length - avgLength, 2);
    }, 0) / responses.length;
    
    const consistency = Math.max(0, 1 - (Math.sqrt(lengthVariance) / avgLength));

    return {
      responses,
      consistency,
      avgLength,
    };
  }

  /**
   * Prueba las capacidades del modelo con diferentes tipos de tareas
   */
  async testCapabilities(
    options: { model?: string } = {}
  ): Promise<{
    reasoning: BenchmarkResult;
    coding: BenchmarkResult;
    creative: BenchmarkResult;
    factual: BenchmarkResult;
    instruction: BenchmarkResult;
  }> {
    const tests = {
      reasoning: "Si todos los gatos tienen bigotes y Fluffy es un gato, ¿tiene Fluffy bigotes? Explica tu razonamiento paso a paso.",
      coding: "Escribe una función en Python que calcule el factorial de un número de forma recursiva.",
      creative: "Escribe un haiku sobre la inteligencia artificial.",
      factual: "¿Cuál es la capital de Francia y cuántos habitantes tiene aproximadamente?",
      instruction: "Lista 5 consejos para mejorar la productividad en el trabajo. Sé conciso.",
    };

    const results = {
      reasoning: await this.chat(tests.reasoning, options),
      coding: await this.chat(tests.coding, options),
      creative: await this.chat(tests.creative, options),
      factual: await this.chat(tests.factual, options),
      instruction: await this.chat(tests.instruction, options),
    };

    return results;
  }
}

export default LLMClient;
