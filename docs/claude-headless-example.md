
---

## OpenRouter

```bash
source .env  # Loads ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY
```

Cerebras Preset - GPT OSS 120b
```bash
export model=@preset/gpt-oss-120b-cerebras
```

Cerebras Preset - GLM 4.7
```bash
export model=@preset/cerebras-glm-4-7-cerebras
```

Claude Sonnet 4.5
```bash
export model=anthropic/claude-sonnet-4.5
```

Claude Haiku 4.5
```bash
export model=anthropic/claude-haiku-4.5
```

Z.AI GLM 4.7
```bash
export model=z-ai/glm-4.7
```

Gemini 3 Pro Preview
```bash
export model=google/gemini-3-pro-preview
```

Gemini 3 Flash Preview
```bash
export model=google/gemini-3-flash-preview
```


### Claude Sonnet 4.5

```bash
source .env
export model=anthropic/claude-sonnet-4.5
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Claude Haiku 4.5

```bash
source .env
export model=anthropic/claude-haiku-4.5
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

---

### Cerebras Presets

### GPT-OSS 120B

```bash
source .env
export model=@preset/gpt-oss-120b-cerebras
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### GLM 4.7

```bash
source .env
export model=@preset/cerebras-glm-4-7-cerebras
```

```bash
claude -p "list files and folders in this directory"```

---


### Z.AI GLM 4.7

```bash
source .env
export model=z-ai/glm-4.7
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Z.AI GLM 4.6

```bash
source .env
export model=z-ai/glm-4.6
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

---

## OpenRouter - Google Gemini 3

### Gemini 3 Pro Preview (flagship reasoning model, 1M context)

```bash
source .env
export model=google/gemini-3-pro-preview
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Gemini 3 Flash Preview (fast, for agentic workflows)

```bash
source .env
export model=google/gemini-3-flash-preview
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

---

## Ollama Cloud

```bash
source .env
export ANTHROPIC_BASE_URL=https://ollama.com
export ANTHROPIC_AUTH_TOKEN=$OLLAMA_API_KEY
export ANTHROPIC_API_KEY=""
```

GPT-OSS 120B Cloud

```bash
export model=gpt-oss:120b
```

GLM 4.7

```bash
export model=glm-4.7
```

DeepSeek V3.2

```bash
export model=deepseek-v3.2
```

MiniMax M2.1

```bash
export model=minimax-m2.1
```

### GPT-OSS 120B Cloud (Ollama Cloud)

```bash
source .env
export ANTHROPIC_BASE_URL=https://ollama.com
export ANTHROPIC_AUTH_TOKEN=$OLLAMA_API_KEY
export ANTHROPIC_API_KEY=""
export model=gpt-oss:120b
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### GLM 4.7 (Ollama Cloud)

```bash
source .env
export ANTHROPIC_BASE_URL=https://ollama.com
export ANTHROPIC_AUTH_TOKEN=$OLLAMA_API_KEY
export ANTHROPIC_API_KEY=""
export model=glm-4.7
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### DeepSeek V3.2 (Ollama Cloud)

```bash
source .env
export ANTHROPIC_BASE_URL=https://ollama.com
export ANTHROPIC_AUTH_TOKEN=$OLLAMA_API_KEY
export ANTHROPIC_API_KEY=""
export model=deepseek-v3.2
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### MiniMax M2.1 (Ollama Cloud)

```bash
source .env
export ANTHROPIC_BASE_URL=https://ollama.com
export ANTHROPIC_AUTH_TOKEN=$OLLAMA_API_KEY
export ANTHROPIC_API_KEY=""
export model=minimax-m2.1
```

```bash
claude -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

---

## Ollama (Local)

> **Note:** Local Ollama requires `--model` flag (env var doesn't work for local endpoints)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

Available local models (tool-capable):
- `gpt-oss:20b` - GPT-OSS 20B
- `qwen3:4b`, `qwen3:latest` (8b) - Qwen3
- `llama3.2:latest` - Llama 3.2

Cloud proxies (via local Ollama):
- `glm-4.7:cloud` - GLM 4.7
- `gpt-oss:120b-cloud` - GPT-OSS 120B
- `minimax-m2.1:cloud` - MiniMax M2.1

### GPT-OSS 20B (local)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model gpt-oss:20b -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Qwen3 4B (local)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model qwen3:4b -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Llama 3.2 (local)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model llama3.2:latest -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### GLM 4.7 Cloud (via local Ollama)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model glm-4.7:cloud -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### GPT-OSS 120B Cloud (via local Ollama)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model gpt-oss:120b-cloud -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### MiniMax M2.1 Cloud (via local Ollama)

```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model minimax-m2.1:cloud -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

---

## Ollama (Remote - 192.168.86.101)

> **Note:** Remote Ollama requires `--model` flag (env var doesn't work for Ollama endpoints)

```bash
export ANTHROPIC_BASE_URL=http://192.168.86.101:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

Available remote models (tool-capable):
- `gpt-oss:20b`, `gpt-oss:120b` - GPT-OSS
- `qwen3:4b`, `qwen3:14b`, `qwen3:32b` - Qwen3
- `qwen3-coder:30b` - Qwen3 Coder
- `phi4:14b` - Phi 4

### GPT-OSS 20B (remote)

```bash
export ANTHROPIC_BASE_URL=http://192.168.86.101:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model gpt-oss:20b -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Qwen3 14B (remote)

```bash
export ANTHROPIC_BASE_URL=http://192.168.86.101:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model qwen3:14b -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### Qwen3 Coder 30B (remote)

```bash
export ANTHROPIC_BASE_URL=http://192.168.86.101:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model qwen3-coder:30b -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

### GPT-OSS 120B (remote)

```bash
export ANTHROPIC_BASE_URL=http://192.168.86.101:11434
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
```

```bash
claude --model gpt-oss:120b -p "list files and folders in this directory" --allowedTools "Read,Edit,Write,Bash,Glob,Grep"
```

---

## Test Commands

### Read-only exploration

```bash
source .env
export model=anthropic/claude-sonnet-4.5
```

```bash
claude -p "explain the architecture" --allowedTools "Read,Glob,Grep"
```

### Bash only

```bash
source .env
export model=anthropic/claude-sonnet-4.5
```

```bash
claude -p "run tests" --allowedTools "Bash"
```

### With working directory

```bash
source .env
export model=anthropic/claude-sonnet-4.5
```

```bash
claude -p "list TypeScript files" --allowedTools "Glob,Read" --cwd /path/to/project
```

---

## Direct API Testing (curl)

Use these for non-Anthropic models (which don't work via Claude Code).

### OpenRouter API (works with all models)

```bash
set -a && source .env && set +a
```

```bash
curl -s "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "z-ai/glm-4.7", "messages": [{"role": "user", "content": "Your prompt here"}]}'
```

```bash
curl -s "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "google/gemini-3-flash-preview", "messages": [{"role": "user", "content": "Your prompt here"}]}'
```

```bash
curl -s "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer $ANTHROPIC_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-oss-120b", "messages": [{"role": "user", "content": "Your prompt here"}]}'
```

### Cerebras API (direct)

```bash
source .env  # Uses CEREBRAS_API_KEY from .env
```

```bash
curl -s https://api.cerebras.ai/v1/models -H "Authorization: Bearer $CEREBRAS_API_KEY"
```

Available models: `llama-3.3-70b`, `qwen-3-32b`, `gpt-oss-120b`, `zai-glm-4.6`, `zai-glm-4.7`, `llama3.1-8b`

### Ollama Cloud API (direct)

```bash
source .env  # Uses OLLAMA_API_KEY from .env
```

```bash
curl -s https://ollama.com/api/tags -H "Authorization: Bearer $OLLAMA_API_KEY"
```

Available models: `glm-4.7`, `gpt-oss:120b`, `deepseek-v3.2`, `qwen3-coder:480b`, and many more

---

## References

- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter Google Models](https://openrouter.ai/google)
- [Gemini 3 Pro Preview](https://openrouter.ai/google/gemini-3-pro-preview)
- [Gemini 3 Flash Preview](https://openrouter.ai/google/gemini-3-flash-preview)
- [Cerebras API Docs](https://inference-docs.cerebras.ai/quickstart)
- [Ollama Cloud Models](https://ollama.com/blog/cloud-models)
