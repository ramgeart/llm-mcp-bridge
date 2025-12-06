import { z } from "zod";
import { LLMClient, BenchmarkResult } from "./llm-client.js";

// Schema base para configuración de conexión (opcional en cada llamada)
export const ConnectionConfigSchema = z.object({
  baseURL: z.string().optional().describe("URL del servidor LM Studio (ej: http://localhost:1234/v1)"),
  apiKey: z.string().optional().describe("API Key opcional"),
});

// Schemas para validación de parámetros
export const GetModelsSchema = ConnectionConfigSchema.extend({});

export const ListModelsSchema = z.object({});

export const ServerStatusSchema = z.object({});

export const ChatSchema = ConnectionConfigSchema.extend({
  prompt: z.string().describe("El prompt a enviar al modelo"),
  model: z.string().optional().describe("ID del modelo a usar (opcional, usa el cargado por defecto)"),
  maxTokens: z.number().optional().default(512).describe("Máximo de tokens a generar"),
  temperature: z.number().optional().default(0.7).describe("Temperatura (0-2)"),
  topP: z.number().optional().describe("Top P para nucleus sampling (0-1)"),
  topK: z.number().optional().describe("Top K para sampling"),
  repeatPenalty: z.number().optional().describe("Penalización por repetición"),
  presencePenalty: z.number().optional().describe("Penalización por presencia (-2 a 2)"),
  frequencyPenalty: z.number().optional().describe("Penalización por frecuencia (-2 a 2)"),
  stop: z.array(z.string()).optional().describe("Secuencias de parada"),
  systemPrompt: z.string().optional().describe("Prompt de sistema opcional"),
});

export const BenchmarkSchema = ConnectionConfigSchema.extend({
  prompts: z.array(z.string()).describe("Lista de prompts para el benchmark"),
  model: z.string().optional().describe("ID del modelo a usar"),
  maxTokens: z.number().optional().default(256).describe("Máximo de tokens por respuesta"),
  temperature: z.number().optional().default(0.7).describe("Temperatura"),
  topP: z.number().optional().describe("Top P para nucleus sampling"),
  runs: z.number().optional().default(1).describe("Número de ejecuciones por prompt"),
});

export const CoherenceSchema = ConnectionConfigSchema.extend({
  prompt: z.string().describe("Prompt para evaluar coherencia"),
  model: z.string().optional().describe("ID del modelo a usar"),
  runs: z.number().optional().default(3).describe("Número de ejecuciones"),
  temperature: z.number().optional().default(0.7).describe("Temperatura"),
});

export const CapabilitiesSchema = ConnectionConfigSchema.extend({
  model: z.string().optional().describe("ID del modelo a usar"),
});

export const CompareModelsSchema = ConnectionConfigSchema.extend({
  prompt: z.string().describe("Prompt para comparar modelos"),
  models: z.array(z.string()).optional().describe("Lista de modelos a comparar (usa todos si no se especifica)"),
  maxTokens: z.number().optional().default(256),
});

export const StreamChatSchema = ConnectionConfigSchema.extend({
  prompt: z.string().describe("El prompt a enviar"),
  model: z.string().optional(),
  maxTokens: z.number().optional().default(512),
  temperature: z.number().optional().default(0.7),
});

// Propiedades comunes de conexión para input schemas
const connectionProperties = {
  baseURL: { type: "string", description: "URL del servidor OpenAI-compatible (ej: http://localhost:1234/v1, http://localhost:11434/v1)" },
  apiKey: { type: "string", description: "API Key (requerida para OpenAI/Azure, opcional para servidores locales)" },
};

// Definiciones de herramientas MCP
export const tools = [
  {
    name: "llm_get_models",
    description: "Obtiene la lista de modelos disponibles en el servidor LLM (compatible con OpenAI API: LM Studio, Ollama, vLLM, OpenAI, etc.)",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
      },
      required: [],
    },
  },
  {
    name: "llm_status",
    description: "Verifica el estado de conexión con el servidor LLM y lista los modelos disponibles",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
      },
      required: [],
    },
  },
  {
    name: "llm_chat",
    description: "Envía un prompt al modelo y recibe una respuesta con métricas de rendimiento (latencia, tokens/s)",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
        prompt: { type: "string", description: "El prompt a enviar al modelo" },
        model: { type: "string", description: "ID del modelo (opcional)" },
        maxTokens: { type: "number", description: "Máximo de tokens a generar (default: 512)" },
        temperature: { type: "number", description: "Temperatura 0-2 (default: 0.7)" },
        topP: { type: "number", description: "Top P para nucleus sampling (0-1)" },
        topK: { type: "number", description: "Top K para sampling" },
        repeatPenalty: { type: "number", description: "Penalización por repetición" },
        presencePenalty: { type: "number", description: "Penalización por presencia (-2 a 2)" },
        frequencyPenalty: { type: "number", description: "Penalización por frecuencia (-2 a 2)" },
        stop: { type: "array", items: { type: "string" }, description: "Secuencias de parada" },
        systemPrompt: { type: "string", description: "Prompt de sistema opcional" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "llm_benchmark",
    description: "Ejecuta un benchmark con múltiples prompts para evaluar rendimiento del modelo",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
        prompts: {
          type: "array",
          items: { type: "string" },
          description: "Lista de prompts para el benchmark",
        },
        model: { type: "string", description: "ID del modelo" },
        maxTokens: { type: "number", description: "Max tokens por respuesta (default: 256)" },
        temperature: { type: "number", description: "Temperatura (default: 0.7)" },
        topP: { type: "number", description: "Top P para nucleus sampling" },
        runs: { type: "number", description: "Ejecuciones por prompt (default: 1)" },
      },
      required: ["prompts"],
    },
  },
  {
    name: "llm_evaluate_coherence",
    description: "Evalúa la coherencia del modelo ejecutando el mismo prompt múltiples veces",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
        prompt: { type: "string", description: "Prompt para evaluar" },
        model: { type: "string", description: "ID del modelo" },
        runs: { type: "number", description: "Número de ejecuciones (default: 3)" },
        temperature: { type: "number", description: "Temperatura (default: 0.7)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "llm_test_capabilities",
    description: "Prueba las capacidades del modelo en diferentes áreas: razonamiento, código, creatividad, hechos, instrucciones",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
        model: { type: "string", description: "ID del modelo" },
      },
      required: [],
    },
  },
  {
    name: "llm_compare_models",
    description: "Compara el rendimiento de múltiples modelos con el mismo prompt",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
        prompt: { type: "string", description: "Prompt para comparar" },
        models: {
          type: "array",
          items: { type: "string" },
          description: "Lista de modelos a comparar",
        },
        maxTokens: { type: "number", description: "Max tokens (default: 256)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "llm_quality_report",
    description: "Genera un reporte completo de calidad del modelo incluyendo benchmark, coherencia y capacidades",
    inputSchema: {
      type: "object" as const,
      properties: {
        ...connectionProperties,
        model: { type: "string", description: "ID del modelo a evaluar" },
      },
      required: [],
    },
  },
];

// Manejadores de herramientas
export function createToolHandlers(defaultClient: LLMClient, defaultConfig: { baseURL: string; apiKey?: string }) {
  
  // Helper para crear cliente con configuración override
  function getClient(args: { baseURL?: string; apiKey?: string }): LLMClient {
    if (args.baseURL || args.apiKey) {
      return new LLMClient({
        baseURL: args.baseURL || defaultConfig.baseURL,
        apiKey: args.apiKey || defaultConfig.apiKey,
      });
    }
    return defaultClient;
  }

  return {
    async llm_get_models(args: z.infer<typeof GetModelsSchema> = {}) {
      const client = getClient(args);
      const models = await client.listModels();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              models: models.map(m => ({
                id: m.id,
                owned_by: m.owned_by,
              })),
              count: models.length,
              baseURL: args.baseURL || defaultConfig.baseURL,
            }, null, 2),
          },
        ],
      };
    },

    async llm_status(args: z.infer<typeof ConnectionConfigSchema> = {}) {
      const client = getClient(args);
      const usedBaseURL = args.baseURL || defaultConfig.baseURL;
      const status = await client.getServerStatus();
      if (status.connected) {
        const models = await client.listModels();
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ **LLM Server Conectado**\n\n` +
                `- URL: ${usedBaseURL}\n` +
                `- Modelos disponibles: ${status.models}\n\n` +
                `**Modelos:**\n${models.map(m => `- ${m.id}`).join("\n") || "Ninguno"}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ **LLM Server No Conectado**\n\n` +
                `No se pudo conectar a ${usedBaseURL}\n\n` +
                `Verifica que:\n` +
                `1. El servidor LLM está ejecutándose\n` +
                `2. La URL es correcta\n` +
                `3. El puerto está accesible`,
            },
          ],
        };
      }
    },

    async llm_list_models(args: z.infer<typeof ConnectionConfigSchema> = {}) {
      const client = getClient(args);
      const models = await client.listModels();
      return {
        content: [
          {
            type: "text" as const,
            text: `**Modelos disponibles:**\n\n` +
              (models.length > 0
                ? models.map(m => `- **${m.id}**\n  - Owner: ${m.owned_by}`).join("\n\n")
                : "No hay modelos disponibles"),
          },
        ],
      };
    },

    async llm_chat(args: z.infer<typeof ChatSchema>) {
      const client = getClient(args);
      const result = await client.chat(args.prompt, {
        model: args.model,
        maxTokens: args.maxTokens,
        temperature: args.temperature,
        topP: args.topP,
        topK: args.topK,
        repeatPenalty: args.repeatPenalty,
        presencePenalty: args.presencePenalty,
        frequencyPenalty: args.frequencyPenalty,
        stop: args.stop,
        systemPrompt: args.systemPrompt,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: formatBenchmarkResult(result),
          },
        ],
      };
    },

    async llm_benchmark(args: z.infer<typeof BenchmarkSchema>) {
      const client = getClient(args);
      const { results, summary } = await client.runBenchmark(args.prompts, {
        model: args.model,
        maxTokens: args.maxTokens,
        temperature: args.temperature,
        runs: args.runs,
      });

      let output = `# 📊 Benchmark Results\n\n`;
      output += `## Resumen\n`;
      output += `- **Prompts totales:** ${summary.totalPrompts}\n`;
      output += `- **Latencia promedio:** ${summary.avgLatencyMs.toFixed(2)} ms\n`;
      output += `- **Tokens/segundo promedio:** ${summary.avgTokensPerSecond.toFixed(2)}\n`;
      output += `- **Total tokens generados:** ${summary.totalTokensGenerated}\n\n`;
      output += `## Resultados Detallados\n\n`;

      results.forEach((r, i) => {
        output += `### Prompt ${i + 1}\n`;
        output += `> ${r.prompt.substring(0, 100)}${r.prompt.length > 100 ? "..." : ""}\n\n`;
        output += `- Latencia: ${r.latencyMs} ms\n`;
        output += `- Tokens: ${r.completionTokens}\n`;
        output += `- Velocidad: ${r.tokensPerSecond.toFixed(2)} tok/s\n\n`;
      });

      return { content: [{ type: "text" as const, text: output }] };
    },

    async llm_evaluate_coherence(args: z.infer<typeof CoherenceSchema>) {
      const client = getClient(args);
      const result = await client.evaluateCoherence(args.prompt, {
        model: args.model,
        runs: args.runs,
        temperature: args.temperature,
      });

      let output = `# 🎯 Evaluación de Coherencia\n\n`;
      output += `**Prompt:** ${args.prompt}\n\n`;
      output += `**Métricas:**\n`;
      output += `- Consistencia: ${(result.consistency * 100).toFixed(1)}%\n`;
      output += `- Longitud promedio: ${result.avgLength.toFixed(0)} caracteres\n\n`;
      output += `**Respuestas:**\n\n`;

      result.responses.forEach((r, i) => {
        output += `---\n**Respuesta ${i + 1}:**\n${r}\n\n`;
      });

      return { content: [{ type: "text" as const, text: output }] };
    },

    async llm_test_capabilities(args: z.infer<typeof CapabilitiesSchema>) {
      const client = getClient(args);
      const results = await client.testCapabilities({ model: args.model });

      let output = `# 🧠 Test de Capacidades del Modelo\n\n`;

      const categories = [
        { key: "reasoning", name: "Razonamiento", emoji: "🤔" },
        { key: "coding", name: "Programación", emoji: "💻" },
        { key: "creative", name: "Creatividad", emoji: "🎨" },
        { key: "factual", name: "Conocimiento Factual", emoji: "📚" },
        { key: "instruction", name: "Seguir Instrucciones", emoji: "📋" },
      ];

      for (const cat of categories) {
        const r = results[cat.key as keyof typeof results];
        output += `## ${cat.emoji} ${cat.name}\n\n`;
        output += `**Prompt:** ${r.prompt}\n\n`;
        output += `**Respuesta:**\n${r.response}\n\n`;
        output += `*Latencia: ${r.latencyMs}ms | Tokens/s: ${r.tokensPerSecond.toFixed(2)}*\n\n`;
        output += `---\n\n`;
      }

      return { content: [{ type: "text" as const, text: output }] };
    },

    async llm_compare_models(args: z.infer<typeof CompareModelsSchema>) {
      const client = getClient(args);
      let models = args.models;
      
      if (!models || models.length === 0) {
        const available = await client.listModels();
        models = available.map(m => m.id);
      }

      if (models.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ No hay modelos disponibles para comparar",
            },
          ],
        };
      }

      let output = `# ⚖️ Comparación de Modelos\n\n`;
      output += `**Prompt:** ${args.prompt}\n\n`;
      output += `| Modelo | Latencia (ms) | Tokens/s | Tokens |\n`;
      output += `|--------|---------------|----------|--------|\n`;

      const results: BenchmarkResult[] = [];

      for (const model of models) {
        try {
          const result = await client.chat(args.prompt, {
            model,
            maxTokens: args.maxTokens,
          });
          results.push(result);
          output += `| ${model} | ${result.latencyMs} | ${result.tokensPerSecond.toFixed(2)} | ${result.completionTokens} |\n`;
        } catch (error) {
          output += `| ${model} | ERROR | - | - |\n`;
        }
      }

      output += `\n## Respuestas Detalladas\n\n`;
      for (const r of results) {
        output += `### ${r.model}\n${r.response}\n\n---\n\n`;
      }

      return { content: [{ type: "text" as const, text: output }] };
    },

    async llm_quality_report(args: z.infer<typeof CapabilitiesSchema>) {
      const client = getClient(args);
      let output = `# 📋 Reporte de Calidad del Modelo\n\n`;
      output += `*Generando reporte completo...*\n\n`;

      // 1. Benchmark básico
      const benchmarkPrompts = [
        "Explica qué es la inteligencia artificial en una oración.",
        "¿Cuánto es 25 * 4?",
        "Traduce 'Hello World' al español.",
      ];

      const benchmark = await client.runBenchmark(benchmarkPrompts, {
        model: args.model,
        maxTokens: 100,
      });

      output += `## 📊 Benchmark de Rendimiento\n\n`;
      output += `- Latencia promedio: **${benchmark.summary.avgLatencyMs.toFixed(0)} ms**\n`;
      output += `- Velocidad: **${benchmark.summary.avgTokensPerSecond.toFixed(2)} tokens/s**\n`;
      output += `- Tokens generados: ${benchmark.summary.totalTokensGenerated}\n\n`;

      // 2. Coherencia
      const coherence = await client.evaluateCoherence(
        "¿Cuál es el sentido de la vida?",
        { model: args.model, runs: 3, temperature: 0.7 }
      );

      output += `## 🎯 Coherencia\n\n`;
      output += `- Consistencia: **${(coherence.consistency * 100).toFixed(1)}%**\n`;
      output += `- Longitud promedio de respuesta: ${coherence.avgLength.toFixed(0)} chars\n\n`;

      // 3. Capacidades
      const capabilities = await client.testCapabilities({ model: args.model });

      output += `## 🧠 Capacidades\n\n`;
      output += `| Área | Latencia | Velocidad |\n`;
      output += `|------|----------|----------|\n`;
      
      const areas = ["reasoning", "coding", "creative", "factual", "instruction"] as const;
      for (const area of areas) {
        const r = capabilities[area];
        output += `| ${area} | ${r.latencyMs}ms | ${r.tokensPerSecond.toFixed(1)} tok/s |\n`;
      }

      output += `\n## 📈 Puntuación General\n\n`;
      const avgSpeed = benchmark.summary.avgTokensPerSecond;
      const speedScore = Math.min(100, avgSpeed * 2);
      const coherenceScore = coherence.consistency * 100;
      const overallScore = (speedScore + coherenceScore) / 2;

      output += `- Velocidad: ${speedScore.toFixed(0)}/100\n`;
      output += `- Coherencia: ${coherenceScore.toFixed(0)}/100\n`;
      output += `- **Puntuación Total: ${overallScore.toFixed(0)}/100**\n`;

      return { content: [{ type: "text" as const, text: output }] };
    },
  };
}

function formatBenchmarkResult(result: BenchmarkResult): string {
  return `## 💬 Respuesta del Modelo

**Modelo:** ${result.model}

**Respuesta:**
${result.response}

---

### 📊 Métricas
| Métrica | Valor |
|---------|-------|
| Latencia | ${result.latencyMs} ms |
| Tokens prompt | ${result.promptTokens} |
| Tokens respuesta | ${result.completionTokens} |
| Total tokens | ${result.totalTokens} |
| Velocidad | ${result.tokensPerSecond.toFixed(2)} tokens/s |
`;
}
