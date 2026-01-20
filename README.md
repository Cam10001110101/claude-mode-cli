# Claude Mode

A Node.js CLI launcher for Claude Code that supports multiple AI providers and models.

## Features

- **Interactive menu** - Guided step-by-step selection of provider, model, and mode
- **Quick mode** - Command-line arguments for fast launching
- **Multiple providers** - OpenRouter, Ollama Cloud, Ollama Local, Ollama Custom
- **Headless mode** - Single prompt execution for scripting/automation
- **Terminal mode** - Interactive Claude Code session

## Installation

### From Source

```bash
# Clone the repository
git clone <repo-url>
cd claude-mode

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

### Global Installation (after npm publish)

```bash
npm install -g claude-mode
```

## Usage

### Interactive Menu

Run without arguments to get a guided menu:

```bash
claude-mode
```

This will prompt you to:
1. Select a provider
2. Select a model
3. Choose terminal or headless mode
4. Enter a prompt (if headless)

### Quick Mode

Specify provider, model, and optionally mode/prompt:

```bash
# Interactive terminal session
claude-mode openrouter sonnet
claude-mode ollama-local qwen3

# Headless mode with prompt
claude-mode ollama-local qwen3 h "list all TypeScript files"
claude-mode ollama-cloud glm47 headless "explain this code"

# Using full provider names
claude-mode ollama-custom gpt120 h "run tests"
```

### Help & Model List

```bash
claude-mode --help    # Show usage
claude-mode --list    # List all available models
claude-mode list      # Same as above
```

## Providers

| Provider | Description | Base URL |
|----------|-------------|----------|
| `openrouter` | OpenRouter API | https://openrouter.ai/api |
| `ollama-cloud` | Ollama Cloud | https://ollama.com |
| `ollama-local` | Local Ollama | http://localhost:11434 |
| `ollama-custom` | Custom Ollama server | http://0.0.0.0:11434 |

### Provider Shortcuts

| Shortcut | Provider |
|----------|----------|
| `or`, `open` | openrouter |
| `oc`, `cloud` | ollama-cloud |
| `ol`, `local` | ollama-local |
| `custom`, `remote` | ollama-custom |

## Models

### OpenRouter

| Shortcut | Model ID |
|----------|----------|
| `sonnet` | anthropic/claude-sonnet-4.5 |
| `haiku` | anthropic/claude-haiku-4.5 |
| `gpt120` | @preset/gpt-oss-120b-cerebras |
| `glm47` | @preset/cerebras-glm-4-7-cerebras |
| `zai-glm47` | z-ai/glm-4.7 |
| `zai-glm46` | z-ai/glm-4.6 |
| `gemini-pro` | google/gemini-3-pro-preview |
| `gemini-flash` | google/gemini-3-flash-preview |

### Ollama Cloud

| Shortcut | Model ID |
|----------|----------|
| `gpt120` | gpt-oss:120b |
| `glm47` | glm-4.7 |
| `deepseek` | deepseek-v3.2 |
| `minimax` | minimax-m2.1 |

### Ollama Local

| Shortcut | Model ID | Notes |
|----------|----------|-------|
| `gpt20` | gpt-oss:20b | Local model |
| `qwen3` | qwen3:4b | Local model |
| `qwen8` | qwen3:latest | Local model (8B) |
| `llama` | llama3.2:latest | Local model |
| `glm47-cloud` | glm-4.7:cloud | Cloud proxy |
| `gpt120-cloud` | gpt-oss:120b-cloud | Cloud proxy |
| `minimax-cloud` | minimax-m2.1:cloud | Cloud proxy |

### Ollama Custom

| Shortcut | Model ID |
|----------|----------|
| `gpt20` | gpt-oss:20b |
| `gpt120` | gpt-oss:120b |
| `qwen3` | qwen3:4b |
| `qwen14` | qwen3:14b |
| `qwen32` | qwen3:32b |
| `coder30` | qwen3-coder:30b |
| `phi4` | phi4:14b |

## Configuration

Create a `.env` file in your project directory or home directory:

```bash
# OpenRouter
ANTHROPIC_AUTH_TOKEN=sk-or-v1-your-openrouter-key
# or
OPEN_ROUTER_API_KEY=sk-or-v1-your-openrouter-key

# Ollama Cloud
OLLAMA_API_KEY=your-ollama-cloud-key
```

See `.env.example` for a template.

## Mode Options

| Mode | Aliases | Description |
|------|---------|-------------|
| Terminal | `terminal`, `t`, `interactive`, `i` | Interactive Claude Code session |
| Headless | `headless`, `h`, `prompt`, `p` | Single prompt execution |

## Examples

```bash
# Start interactive menu
claude-mode

# Quick start with Claude Sonnet (OpenRouter)
claude-mode openrouter sonnet

# Use local Qwen3 for a quick task
claude-mode ollama-local qwen3 h "list files in src/"

# Use Ollama Cloud GLM for code explanation
claude-mode ollama-cloud glm47 h "explain the main function"

# Use remote server with large model
claude-mode ollama-custom gpt120

# Use shortcuts
claude-mode or sonnet h "tell me a joke"
claude-mode ol qwen3

# List available models
claude-mode --list
```

## Headless Mode Tools

In headless mode, the following tools are enabled by default:
- `Read` - Read files
- `Edit` - Edit files
- `Write` - Write files
- `Bash` - Execute bash commands
- `Glob` - File pattern matching
- `Grep` - Search file contents

## Development

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

## Project Structure

```
claude-mode/
├── src/
│   ├── index.ts      # Main CLI entry point
│   └── providers.ts  # Provider and model configurations
├── dist/             # Built output
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Troubleshooting

### Model not found
Ensure the model is available on the selected provider. Use `--list` to see available models.

### Authentication errors
Check that your API keys are correctly set in the `.env` file or environment variables.

### Local Ollama not responding
Ensure Ollama is running: `ollama serve`

### Claude not found
Ensure Claude Code CLI is installed and available in your PATH.

## License

MIT
