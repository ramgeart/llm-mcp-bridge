# LLM MCP Bridge 🌉

Un servidor MCP (Model Context Protocol) agnóstico para cualquier API compatible con OpenAI. Permite analizar y evaluar la calidad de modelos LLM.

## 🎯 Proveedores Soportados

Cualquier servidor que implemente la OpenAI API:

| Proveedor | URL Base Típica |
|-----------|-----------------|
| **LM Studio** | `http://localhost:1234/v1` |
| **Ollama** | `http://localhost:11434/v1` |
| **vLLM** | `http://localhost:8000/v1` |
| **LocalAI** | `http://localhost:8080/v1` |
| **llama.cpp** | `http://localhost:8080/v1` |
| **OpenAI** | `https://api.openai.com/v1` |
| **Azure OpenAI** | `https://{resource}.openai.azure.com/` |
| **Together.ai** | `https://api.together.xyz/v1` |
| **Groq** | `https://api.groq.com/openai/v1` |
| **Anyscale** | `https://api.endpoints.anyscale.com/v1` |

## 🛠️ Herramientas MCP Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `llm_get_models` | Obtiene lista de modelos (JSON) |
| `llm_status` | Verifica conexión con el servidor |
| `llm_list_models` | Lista modelos (formato legible) |
| `llm_chat` | Chat con métricas de rendimiento |
| `llm_benchmark` | Benchmark con múltiples prompts |
| `llm_evaluate_coherence` | Evalúa consistencia del modelo |
| `llm_test_capabilities` | Test en diferentes áreas |
| `llm_compare_models` | Compara múltiples modelos |
| `llm_quality_report` | Reporte completo de calidad |

### Parámetros Configurables en Chat

Todas las herramientas aceptan `baseURL` y `apiKey` opcionales para override de conexión.

| Parámetro | Descripción | Default |
|-----------|-------------|---------|
| `prompt` | Texto a enviar al modelo | requerido |
| `model` | ID del modelo | modelo por defecto |
| `maxTokens` | Máximo de tokens | 512 |
| `temperature` | Temperatura (0-2) | 0.7 |
| `topP` | Nucleus sampling (0-1) | - |
| `topK` | Top K sampling | - |
| `repeatPenalty` | Penalización repetición | - |
| `presencePenalty` | Penalización presencia | - |
| `frequencyPenalty` | Penalización frecuencia | - |
| `stop` | Secuencias de parada | - |
| `systemPrompt` | Prompt de sistema | - |

## 📋 Requisitos

- Node.js >= 18
- Un servidor LLM con API compatible con OpenAI

## 🚀 Instalación

```bash
cd llm-mcp-bridge
npm install
npm run build
```

## ⚙️ Configuración en VS Code

Añade a tu archivo `mcp.json` de VS Code:

### LM Studio (local)
```json
{
  "servers": {
    "llm-local": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "http://localhost:1234/v1"
      }
    }
  }
}
```

### Ollama
```json
{
  "servers": {
    "ollama": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "http://localhost:11434/v1"
      }
    }
  }
}
```

### OpenAI
```json
{
  "servers": {
    "openai": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "https://api.openai.com/v1",
        "LLM_API_KEY": "sk-..."
      }
    }
  }
}
```

### Groq
```json
{
  "servers": {
    "groq": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "https://api.groq.com/openai/v1",
        "LLM_API_KEY": "gsk_..."
      }
    }
  }
}
```

### Múltiples proveedores
```json
{
  "servers": {
    "llm-lmstudio": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "http://localhost:1234/v1"
      }
    },
    "llm-ollama": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "http://localhost:11434/v1"
      }
    },
    "llm-openai": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/llm-mcp-bridge/dist/index.js"],
      "env": {
        "LLM_BASE_URL": "https://api.openai.com/v1",
        "LLM_API_KEY": "sk-..."
      }
    }
  }
}
```

## 🔧 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `LLM_BASE_URL` | URL del servidor LLM | `http://localhost:1234/v1` |
| `LLM_API_KEY` | API Key (requerida para servicios cloud) | - |

## 📖 Ejemplos de Uso

### Verificar conexión
```
@llm_status
```

### Obtener modelos (JSON)
```
@llm_get_models
```

### Chat con métricas
```
@llm_chat prompt="Explica qué es machine learning" temperature=0.5 maxTokens=256
```

### Chat con otro servidor (override)
```
@llm_chat prompt="Hola" baseURL="http://localhost:11434/v1"
```

### Benchmark
```
@llm_benchmark prompts=["Hola", "¿Qué hora es?", "Cuenta hasta 10"]
```

### Reporte de calidad
```
@llm_quality_report
```

### Comparar modelos
```
@llm_compare_models prompt="Escribe un haiku sobre la luna"
```

## 🏗️ Estructura del Proyecto

```
llm-mcp-bridge/
├── src/
│   ├── index.ts       # Servidor MCP principal
│   ├── llm-client.ts  # Cliente OpenAI-compatible
│   └── tools.ts       # Definiciones de herramientas MCP
├── dist/              # Código compilado
├── package.json
├── tsconfig.json
└── README.md
```

## 📊 Métricas de Calidad

El servidor analiza:

- **Latencia**: Tiempo total de respuesta (ms)
- **Tokens/segundo**: Velocidad de generación
- **Coherencia**: Consistencia entre múltiples ejecuciones
- **Capacidades**: Rendimiento en diferentes tipos de tareas
  - Razonamiento
  - Programación
  - Creatividad
  - Conocimiento factual
  - Seguir instrucciones

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Abre un issue o pull request.

## 📄 Licencia

MIT
