#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { LLMClient } from "./llm-client.js";
import { tools, createToolHandlers } from "./tools.js";

// Configuración desde variables de entorno
const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:1234/v1";
const LLM_API_KEY = process.env.LLM_API_KEY;

const defaultConfig = {
  baseURL: LLM_BASE_URL,
  apiKey: LLM_API_KEY,
};

// Crear cliente LLM por defecto
const llmClient = new LLMClient(defaultConfig);

// Crear manejadores de herramientas
const toolHandlers = createToolHandlers(llmClient, defaultConfig);

// Crear servidor MCP
const server = new Server(
  {
    name: "lmstudio-mcp-bridge",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar herramientas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handler para ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "llm_get_models":
        return await toolHandlers.llm_get_models(args as any);

      case "llm_status":
        return await toolHandlers.llm_status(args as any);

      case "llm_list_models":
        return await toolHandlers.llm_list_models(args as any);

      case "llm_chat":
        return await toolHandlers.llm_chat(args as any);

      case "llm_benchmark":
        return await toolHandlers.llm_benchmark(args as any);

      case "llm_evaluate_coherence":
        return await toolHandlers.llm_evaluate_coherence(args as any);

      case "llm_test_capabilities":
        return await toolHandlers.llm_test_capabilities(args as any);

      case "llm_compare_models":
        return await toolHandlers.llm_compare_models(args as any);

      case "llm_quality_report":
        return await toolHandlers.llm_quality_report(args as any);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ Error ejecutando ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 LLM MCP Bridge Server started");
  console.error(`📡 Default LLM endpoint: ${LLM_BASE_URL}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
