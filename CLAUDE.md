# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Mode is a Node.js CLI launcher for Claude Code that supports multiple AI providers (OpenRouter, Ollama Cloud, Ollama Local, custom Ollama instances). It provides both an interactive menu and quick command-line mode for launching Claude Code sessions with different backends.

## Development Commands

```bash
# Install dependencies
npm install

# Build (tsup bundles to ESM)
npm run build

# Development with watch mode
npm run dev

# Run tests
npm test

# Watch tests
npm run test:watch

# Type checking
npm run typecheck
```

## Architecture

### Core Modules

**`src/index.ts`** - Main CLI entry point using Commander.js
- Parses CLI arguments and routes to interactive/quick modes
- Spawns Claude Code with configured environment variables (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`)
- Generates shell completions (bash/zsh/fish)

**`src/providers.ts`** - Provider and model management
- Built-in providers: `openrouter`, `ollama-cloud`, `ollama-local`, `ollama-custom`
- Dynamic Ollama model discovery via `/v1/models` API endpoint
- Provider health checks with timeout handling
- Model resolution supporting shortcuts (e.g., `sonnet` → `anthropic/claude-sonnet-4.5`)
- Custom providers loaded from config file

**`src/config.ts`** - Configuration management
- Config file location: `~/.claude-mode/claude-mode.json`
- Model cache stored in `~/.claude-mode/cache/models.json`
- Supports custom provider definitions, timeouts, and feature flags

**`src/errors.ts`** - Error classification and formatting
- Classifies common errors (connection refused, timeout, auth, DNS)
- Provides actionable hints for each error type

### Provider Resolution Flow

1. User provides shortcut (e.g., `or`, `ol`) or full key (e.g., `openrouter`)
2. `resolveProvider()` maps aliases to canonical keys
3. For Ollama providers, models are fetched dynamically from API
4. For OpenRouter, static model list is used
5. Models are cached to disk for offline fallback

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_BASE_URL` | OpenRouter API endpoint |
| `ANTHROPIC_AUTH_TOKEN` | OpenRouter API key (also accepts `OPEN_ROUTER_API_KEY`) |
| `OLLAMA_HOST` | Ollama Cloud endpoint |
| `OLLAMA_API_KEY` | Ollama Cloud API key |
| `OLLAMA_BASE_URL_LOCAL` | Local Ollama endpoint (default: `http://localhost:11434`) |
| `OLLAMA_BASE_URL_CUSTOM` | Custom/remote Ollama endpoint |

## Testing

Tests use Vitest and are colocated with source files (`*.test.ts`). Run a single test file:

```bash
npx vitest run src/config.test.ts
```

## Key Implementation Details

- ESM-only package (`"type": "module"` in package.json)
- Uses `tsup` for bundling with declaration files
- Requires Node.js >= 20.0.0
- Claude Code CLI must be installed globally (`npm install -g @anthropic-ai/claude-code`)
- Health checks run in parallel with configurable timeout
- In-memory model cache with TTL, persisted to disk for offline use
