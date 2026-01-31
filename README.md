# Claude Mode

![npm version](https://img.shields.io/npm/v/%40cbuk100011%2Fclaude-mode)

A Node.js CLI launcher for Claude Code that supports multiple AI providers and models.

## Features

- **Interactive menu** - Guided step-by-step selection of provider, model, and mode
- **Quick mode** - Command-line arguments for fast launching
- **Multiple providers** - OpenRouter, Ollama Cloud, Ollama Local, Ollama Custom
- **Custom providers** - Define your own providers via config file
- **Dynamic model discovery** - Ollama models discovered automatically via API
- **Offline model cache** - Falls back to cached models when API is unreachable
- **Health checks** - Provider availability shown in interactive mode
- **Headless mode** - Single prompt execution for scripting/automation
- **Terminal mode** - Interactive Claude Code session
- **Shell completions** - Tab completion for bash, zsh, and fish

## Installation

### npm Package (Recommended)

```bash
# Install globally
npm install -g @cbuk100011/claude-mode
```

### From Source

```bash
# Clone the repository
git clone https://github.com/Cam10001110101/claude-mode-cli.git
cd claude-mode-cli

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link
```

## Usage

### Interactive Menu

Run without arguments to get a guided menu with provider health checks:

```bash
claude-mode
```

This will:
1. Check availability of all providers
2. Prompt you to select a provider
3. Select a model (dynamically discovered for Ollama)
4. Choose terminal or headless mode
5. Enter a prompt (if headless)

### Quick Mode

Specify provider, model, and optionally mode/prompt:

```bash
# Interactive terminal session
claude-mode openrouter sonnet
claude-mode ollama-local qwen3

# Headless mode with default provider/model
claude-mode -p "list files"

# Headless mode with specified provider/model
claude-mode ollama-local qwen3 h "list all TypeScript files"
claude-mode ollama-cloud glm47 headless "explain this code"

# Using full provider names
claude-mode ollama-custom gpt120 h "run tests"
```

### Commands

```bash
claude-mode --help              # Show usage
claude-mode --list              # List all available models
claude-mode list                # Same as above
claude-mode health              # Check provider availability
claude-mode config show         # Show current configuration
claude-mode config init         # Create config file
claude-mode completion bash     # Generate bash completions
claude-mode completion zsh      # Generate zsh completions
claude-mode completion fish     # Generate fish completions
```

## Providers

| Provider | Description | Environment Variable |
|----------|-------------|---------------------|
| `openrouter` | OpenRouter API | `ANTHROPIC_BASE_URL` |
| `ollama-cloud` | Ollama Cloud | `OLLAMA_HOST` |
| `ollama-local` | Local Ollama | `OLLAMA_BASE_URL_LOCAL` |
| `ollama-custom` | Custom Ollama server | `OLLAMA_BASE_URL_CUSTOM` |

### Provider Shortcuts

| Shortcut | Provider |
|----------|----------|
| `or`, `open` | openrouter |
| `oc`, `cloud` | ollama-cloud |
| `ol`, `local` | ollama-local |
| `custom`, `remote` | ollama-custom |

## Models

### OpenRouter (Static)

| Shortcut | Model ID |
|----------|----------|
| `opus` | anthropic/claude-opus-4.5 |
| `sonnet` | anthropic/claude-sonnet-4.5 |
| `haiku` | anthropic/claude-haiku-4.5 |
| `gpt52` | openai/gpt-5.2 |
| `gpt52-pro` | openai/gpt-5.2-pro |
| `gpt120` | @preset/gpt-oss-120b-cerebras |
| `glm47` | @preset/cerebras-glm-4-7-cerebras |
| `deepseek` | deepseek/deepseek-v3.2 |
| `gemini-pro` | google/gemini-3-pro-preview |
| `gemini-flash` | google/gemini-3-flash-preview |

### Ollama (Dynamic)

Ollama models are **discovered automatically** via the `/v1/models` API endpoint.
Use `claude-mode --list` to see currently available models.

Models are cached locally and will work offline if previously discovered.

## Configuration

### Environment Variables

Create a `.env` file in your project directory:

```bash
# OpenRouter
ANTHROPIC_AUTH_TOKEN=sk-or-v1-your-openrouter-key
# or
OPEN_ROUTER_API_KEY=sk-or-v1-your-openrouter-key

# Ollama Cloud
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=your-ollama-cloud-key

# Ollama Local (default: http://localhost:11434)
OLLAMA_BASE_URL_LOCAL=http://localhost:11434

# Ollama Custom (your own server)
OLLAMA_BASE_URL_CUSTOM=http://192.168.1.100:11434
```

### Config File

Create a config file for persistent settings:

```bash
claude-mode config init
```

This creates `~/.claude-mode/claude-mode.json`:

```json
{
  "defaultProvider": "",
  "defaultModel": "",
  "modelDiscoveryTimeout": 5000,
  "healthCheckTimeout": 2000,
  "cacheTTL": 30000,
  "customProviders": [],
  "skipHealthCheck": false,
  "offlineMode": false
}
```

#### Custom Providers

Add your own providers in the config file:

```json
{
  "customProviders": [
    {
      "key": "my-server",
      "name": "My Server",
      "baseUrl": "http://my-server:8080",
      "authEnvVar": "MY_SERVER_API_KEY",
      "description": "My custom LLM server"
    }
  ]
}
```

## Mode Options

| Mode | Aliases | Description |
|------|---------|-------------|
| Terminal | `terminal`, `t`, `interactive`, `i` | Interactive Claude Code session |
| Headless | `headless`, `h`, `prompt`, `p` | Single prompt execution |

## Shell Completions

Add tab completion to your shell:

### Bash
```bash
# Add to ~/.bashrc
eval "$(claude-mode completion bash)"
```

### Zsh
```bash
# Add to ~/.zshrc
eval "$(claude-mode completion zsh)"
```

### Fish
```bash
# Save to completions directory
claude-mode completion fish > ~/.config/fish/completions/claude-mode.fish
```

## Examples

```bash
# Start interactive menu with health checks
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

# Check which providers are available
claude-mode health

# List available models
claude-mode --list

# Skip permission prompts (use with caution)
claude-mode --dangerously-skip-permissions
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

# Run tests
npm test

# Watch tests
npm run test:watch

# Type check
npm run typecheck
```

## Project Structure

```
claude-mode-cli/
├── src/
│   ├── index.ts      # Main CLI entry point
│   ├── providers.ts  # Provider and model configurations
│   ├── config.ts     # Configuration management
│   ├── errors.ts     # Error handling utilities
│   ├── *.test.ts     # Test files
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
Ensure Claude Code CLI is installed and available in your PATH:
```bash
npm install -g @anthropic-ai/claude-code
```

### Provider health check failing
Run `claude-mode health` to see which providers are available and any error details.

### Timeout errors
Increase `modelDiscoveryTimeout` or `healthCheckTimeout` in your config file:
```bash
claude-mode config init
# Then edit ~/.claude-mode/claude-mode.json
```

## Roadmap
- Secure key storage
- Additional support for providers/models
- Additional support for Codex, Gemini CLI, etc.

## License

MIT
