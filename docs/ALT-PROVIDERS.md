# Jetpack Alternative Providers Implementation Plan

## Context

Jetpack is a multi-agent orchestration system that spawns and coordinates AI coding agents. Currently, only `ClaudeCodeAdapter` is implemented, but the architecture supports multiple agent types.

### Current State

**Implemented Adapters:**
- `ClaudeCodeAdapter` - Wraps `claude` CLI
- `MockAdapter` - For testing without API keys

**Defined but NOT Implemented:**
- `CodexAdapter` - Should wrap `codex` CLI
- `GeminiAdapter` - Should wrap `gemini` CLI
- `BrowserAdapter` - For browser-based agents

**Location:** `/Users/cam/GITHUB/Jetpack/packages/agent-harness/src/adapters/`

### The Three Major Coding CLIs

| CLI | Provider | Install | Docs |
|-----|----------|---------|------|
| `claude` | Anthropic | `npm i -g @anthropic-ai/claude-code` | [claude.ai/code](https://claude.ai/code) |
| `codex` | OpenAI | `npm i -g @openai/codex` | [github.com/openai/codex](https://github.com/openai/codex) |
| `gemini` | Google | `npm i -g @google/gemini-cli` | [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) |

### Latest Models (January 2026)

| Provider | Latest Models | Notes |
|----------|---------------|-------|
| **Anthropic** | `claude-opus-4.5`, `claude-sonnet-4.5` | Opus 4.5 is most intelligent; Sonnet 4.5 is best for coding |
| **OpenAI** | `gpt-5.2`, `gpt-5`, `gpt-5-mini` | GPT-5.2 is flagship reasoning model; GPT-5 replaced o3/o4-mini |
| **Google** | `gemini-3-pro`, `gemini-3-flash` | Gemini 3 Pro is reasoning-first with 1M context |

**Legacy models still available:**
- Anthropic: `claude-opus-4.1`, `claude-sonnet-4`, `claude-opus-4`
- OpenAI: `o4-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-oss-120b` (open-weight)
- Google: `gemini-2.5-flash`, `gemini-2.5-pro` (Gemini 2.0 retiring March 2026)

### Alternative Provider Support

Each CLI can be configured to use alternative providers/models via environment variables:

#### Claude Code

```bash
export ANTHROPIC_BASE_URL=https://openrouter.ai/api
export ANTHROPIC_AUTH_TOKEN=your-openrouter-key
export ANTHROPIC_API_KEY=""  # Intentionally empty

claude --model anthropic/claude-opus-4.5
claude --model anthropic/claude-sonnet-4.5
claude --model openai/gpt-5.2
claude --model @preset/cerebras-glm-4-7-cerebras
claude --model @preset/gpt-oss-120b-cerebras
```

#### Codex CLI

```bash
export OPENAI_API_KEY=your-key
export OPENAI_BASE_URL=https://api.openai.com/v1  # Or alternative

codex --model gpt-5.2 --full-auto "task"
codex --model gpt-5-mini --full-auto "task"
```

#### Gemini CLI

```bash
# Uses Google account auth or API key
export GOOGLE_API_KEY=your-key

gemini --model gemini-3-pro "task"
gemini --model gemini-3-flash "task"
```

---

## Architecture

### Adapter Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      BaseAdapter                            │
│  abstract execute(request) → ExecutionResult                │
│  abstract isAvailable() → boolean                           │
└─────────────────────────────────────────────────────────────┘
           ▲              ▲              ▲              ▲
           │              │              │              │
┌──────────┴───┐  ┌───────┴──────┐  ┌────┴─────────┐  ┌─┴────────┐
│ClaudeCode    │  │ Codex        │  │ Gemini       │  │ Mock     │
│Adapter ✅    │  │ Adapter      │  │ Adapter      │  │ Adapter ✅│
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────┤
│ claude CLI   │  │ codex CLI    │  │ gemini CLI   │  │ Simulated│
│ --print      │  │ --full-auto  │  │              │  │ responses│
│ --model      │  │ --model      │  │              │  │          │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────┘
```

### Config Interfaces

```typescript
// Base config all adapters share
interface BaseAdapterConfig {
  timeout?: number;
  maxRetries?: number;
}

// Claude Code specific
interface ClaudeCodeConfig extends BaseAdapterConfig {
  cliPath?: string;  // Default: 'claude'
  model?: string;    // e.g., 'claude-opus-4.5', 'claude-sonnet-4.5', 'openai/gpt-5.2'
  provider?: {
    baseUrl?: string;     // ANTHROPIC_BASE_URL
    authToken?: string;   // ANTHROPIC_AUTH_TOKEN
    apiKey?: string;      // ANTHROPIC_API_KEY (empty for OpenRouter)
  };
  dangerouslySkipPermissions?: boolean;
  flags?: string[];
}

// Codex specific
interface CodexConfig extends BaseAdapterConfig {
  cliPath?: string;  // Default: 'codex'
  model?: string;    // e.g., 'gpt-5.2', 'gpt-5-mini', 'o4-mini'
  mode?: 'suggest' | 'auto-edit' | 'full-auto';
  provider?: {
    baseUrl?: string;   // OPENAI_BASE_URL
    apiKey?: string;    // OPENAI_API_KEY
  };
}

// Gemini specific
interface GeminiConfig extends BaseAdapterConfig {
  cliPath?: string;  // Default: 'gemini'
  model?: string;    // e.g., 'gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-flash'
  provider?: {
    apiKey?: string;  // GOOGLE_API_KEY
  };
  sandbox?: boolean;
  yolo?: boolean;  // Skip confirmations
}
```

---

## Implementation Plan

### Phase 1: Enhance ClaudeCodeAdapter

**Goal:** Add full provider configuration support to existing adapter.

**Files to modify:**
- `/packages/agent-harness/src/adapters/ClaudeCodeAdapter.ts`

**Changes:**

1. Update `ClaudeCodeConfig` interface:
```typescript
export interface ClaudeCodeConfig {
  cliPath?: string;
  model?: string;
  provider?: {
    baseUrl?: string;
    authToken?: string;
    apiKey?: string;
  };
  dangerouslySkipPermissions?: boolean;
  flags?: string[];
}
```

2. Update `execute()` to pass provider env vars:
```typescript
const proc = spawn(this.cliPath, args, {
  cwd: request.workDir,
  env: {
    ...process.env,
    ...(this.config.provider?.baseUrl && {
      ANTHROPIC_BASE_URL: this.config.provider.baseUrl,
    }),
    ...(this.config.provider?.authToken && {
      ANTHROPIC_AUTH_TOKEN: this.config.provider.authToken,
    }),
    ANTHROPIC_API_KEY: this.config.provider?.apiKey ?? process.env.ANTHROPIC_API_KEY,
  },
});
```

3. Add `--model` flag support:
```typescript
if (this.config.model) {
  args.push('--model', this.config.model);
}
```

---

### Phase 2: Implement CodexAdapter

**Goal:** Create adapter for OpenAI Codex CLI.

**Files to create:**
- `/packages/agent-harness/src/adapters/CodexAdapter.ts`

**Key differences from ClaudeCodeAdapter:**

| Aspect | Claude Code | Codex |
|--------|-------------|-------|
| CLI | `claude` | `codex` |
| Env vars | `ANTHROPIC_*` | `OPENAI_*` |
| Modes | `--print` | `--suggest`, `--auto-edit`, `--full-auto` |
| Output | Streaming text | TUI or streaming |

**Implementation:**

```typescript
export interface CodexConfig {
  cliPath?: string;
  model?: string;
  mode?: 'suggest' | 'auto-edit' | 'full-auto';
  provider?: {
    baseUrl?: string;
    apiKey?: string;
  };
}

export class CodexAdapter extends BaseAdapter {
  constructor(config: CodexConfig = {}) {
    super();
    this.cliPath = config.cliPath ?? 'codex';
    this.config = config;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const args: string[] = [];

    // Add mode flag
    if (this.config.mode) {
      args.push(`--${this.config.mode}`);
    } else {
      args.push('--full-auto');  // Default for automation
    }

    // Add model
    if (this.config.model) {
      args.push('--model', this.config.model);
    }

    // Add prompt
    args.push(request.prompt);

    const proc = spawn(this.cliPath, args, {
      cwd: request.workDir,
      env: {
        ...process.env,
        ...(this.config.provider?.baseUrl && {
          OPENAI_BASE_URL: this.config.provider.baseUrl,
        }),
        ...(this.config.provider?.apiKey && {
          OPENAI_API_KEY: this.config.provider.apiKey,
        }),
      },
    });

    // ... handle output parsing
  }

  async isAvailable(): Promise<boolean> {
    // Check if codex CLI is installed
    try {
      execSync('codex --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

export function createCodexAdapter(config?: CodexConfig): CodexAdapter {
  return new CodexAdapter(config);
}
```

---

### Phase 3: Implement GeminiAdapter

**Goal:** Create adapter for Google Gemini CLI.

**Files to create:**
- `/packages/agent-harness/src/adapters/GeminiAdapter.ts`

**Key differences:**

| Aspect | Claude Code | Gemini |
|--------|-------------|--------|
| CLI | `claude` | `gemini` |
| Auth | API key | Google account or API key |
| Env vars | `ANTHROPIC_*` | `GOOGLE_API_KEY` |
| Features | MCP support | MCP support, Google Search |

**Implementation:**

```typescript
export interface GeminiConfig {
  cliPath?: string;
  model?: string;
  provider?: {
    apiKey?: string;
  };
  sandbox?: boolean;
  yolo?: boolean;
}

export class GeminiAdapter extends BaseAdapter {
  constructor(config: GeminiConfig = {}) {
    super();
    this.cliPath = config.cliPath ?? 'gemini';
    this.config = config;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const args: string[] = [];

    if (this.config.sandbox) {
      args.push('--sandbox');
    }

    if (this.config.yolo) {
      args.push('--yolo');
    }

    // Gemini takes prompt as positional arg
    args.push(request.prompt);

    const proc = spawn(this.cliPath, args, {
      cwd: request.workDir,
      env: {
        ...process.env,
        ...(this.config.provider?.apiKey && {
          GOOGLE_API_KEY: this.config.provider.apiKey,
        }),
      },
    });

    // ... handle output parsing
  }
}

export function createGeminiAdapter(config?: GeminiConfig): GeminiAdapter {
  return new GeminiAdapter(config);
}
```

---

### Phase 4: Update Exports and Factory

**Files to modify:**
- `/packages/agent-harness/src/adapters/index.ts`

```typescript
export { BaseAdapter } from './BaseAdapter.js';
export { ClaudeCodeAdapter, createClaudeCodeAdapter } from './ClaudeCodeAdapter.js';
export type { ClaudeCodeConfig } from './ClaudeCodeAdapter.js';
export { CodexAdapter, createCodexAdapter } from './CodexAdapter.js';
export type { CodexConfig } from './CodexAdapter.js';
export { GeminiAdapter, createGeminiAdapter } from './GeminiAdapter.js';
export type { GeminiConfig } from './GeminiAdapter.js';
export { MockAdapter, createMockAdapter } from './MockAdapter.js';
export type { MockAdapterConfig } from './MockAdapter.js';

// Factory function
export function createAdapter(type: AgentType, config: any): BaseAdapter {
  switch (type) {
    case 'claude-code':
      return createClaudeCodeAdapter(config);
    case 'codex':
      return createCodexAdapter(config);
    case 'gemini':
      return createGeminiAdapter(config);
    case 'custom':
      return createMockAdapter(config);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}
```

---

### Phase 5: Update CLI to Support Multiple Agent Types

**Files to modify:**
- `/packages/swarm-cli/src/index.ts`

**Add new options:**

```typescript
.option('--agent-type <type>', 'Agent type: claude-code, codex, gemini', 'claude-code')
.option('--model <model>', 'Model to use (provider-specific)')
.option('--provider-url <url>', 'Alternative provider base URL')
```

**Update agent spawning:**

```typescript
const agentType = options.agentType as AgentType;

let adapter: BaseAdapter;
switch (agentType) {
  case 'claude-code':
    adapter = createClaudeCodeAdapter({
      model: options.model,
      provider: options.providerUrl ? {
        baseUrl: options.providerUrl,
        authToken: process.env.PROVIDER_AUTH_TOKEN,
      } : undefined,
    });
    break;
  case 'codex':
    adapter = createCodexAdapter({
      model: options.model,
      mode: 'full-auto',
    });
    break;
  case 'gemini':
    adapter = createGeminiAdapter({
      model: options.model,
    });
    break;
}
```

---

## Usage Examples

### Mixed Agent Swarm

```bash
# Start coordinator
jetpack start --no-agents

# Spawn different agent types with latest models
jetpack spawn --agent-type claude-code --model claude-sonnet-4.5 --skills typescript,react
jetpack spawn --agent-type codex --model gpt-5-mini --skills python,testing
jetpack spawn --agent-type gemini --model gemini-3-flash --skills documentation
```

### Claude Code with OpenRouter

```bash
export OPENROUTER_KEY=sk-or-...

jetpack start \
  --agent-type claude-code \
  --model openai/gpt-5.2 \
  --provider-url https://openrouter.ai/api
```

### Programmatic Multi-Provider Swarm

```typescript
const coordinator = new SwarmCoordinator(dataLayer, { workDir });

// Claude Opus 4.5 for complex reasoning (most intelligent)
await coordinator.spawnAgent({
  name: 'Agent-Claude-Opus',
  type: 'claude-code',
  adapter: createClaudeCodeAdapter({
    model: 'claude-opus-4.5',
  }),
  skills: ['architecture', 'complex-reasoning'],
});

// Claude Sonnet 4.5 for coding (best coding model)
await coordinator.spawnAgent({
  name: 'Agent-Claude-Sonnet',
  type: 'claude-code',
  adapter: createClaudeCodeAdapter({
    model: 'claude-sonnet-4.5',
  }),
  skills: ['typescript', 'react', 'backend'],
});

// Codex with GPT-5.2 for fast iteration
await coordinator.spawnAgent({
  name: 'Agent-Codex',
  type: 'codex',
  adapter: createCodexAdapter({
    model: 'gpt-5.2',
    mode: 'full-auto',
  }),
  skills: ['quick-fixes', 'refactoring'],
});

// Codex with GPT-5 mini for cost-efficient tasks
await coordinator.spawnAgent({
  name: 'Agent-Codex-Mini',
  type: 'codex',
  adapter: createCodexAdapter({
    model: 'gpt-5-mini',
    mode: 'full-auto',
  }),
  skills: ['testing', 'linting'],
});

// Gemini 3 Pro for complex documentation (1M context)
await coordinator.spawnAgent({
  name: 'Agent-Gemini-Pro',
  type: 'gemini',
  adapter: createGeminiAdapter({
    model: 'gemini-3-pro',
  }),
  skills: ['documentation', 'codebase-analysis'],
});

// Gemini 3 Flash for fast responses (free tier)
await coordinator.spawnAgent({
  name: 'Agent-Gemini-Flash',
  type: 'gemini',
  adapter: createGeminiAdapter({
    model: 'gemini-3-flash',
  }),
  skills: ['explanations', 'quick-docs'],
});

// Claude via OpenRouter for cost optimization
await coordinator.spawnAgent({
  name: 'Agent-OpenRouter',
  type: 'claude-code',
  adapter: createClaudeCodeAdapter({
    provider: {
      baseUrl: 'https://openrouter.ai/api',
      authToken: process.env.OPENROUTER_KEY,
      apiKey: '',
    },
    model: 'anthropic/claude-sonnet-4.5',
  }),
  skills: ['general'],
});
```

---

## Testing Plan

### Unit Tests

1. **ClaudeCodeAdapter** - Verify provider env vars passed correctly
2. **CodexAdapter** - Verify mode flags and output parsing
3. **GeminiAdapter** - Verify auth and output parsing
4. **Factory** - Verify correct adapter created for each type

### Integration Tests

1. **Mock mode** - All adapters with mock responses
2. **Real CLIs** - Verify each CLI is callable (skip if not installed)
3. **Alternative providers** - Test OpenRouter with Claude Code

### E2E Tests

1. **Mixed swarm** - Spawn agents of different types, verify task routing
2. **Provider failover** - Test behavior when provider is unavailable

---

## Dependencies

### Required CLI Tools

```bash
# Claude Code
npm i -g @anthropic-ai/claude-code

# Codex
npm i -g @openai/codex

# Gemini
npm i -g @google/gemini-cli
```

### Environment Variables

```bash
# Claude Code (default)
ANTHROPIC_API_KEY=sk-ant-...

# Claude Code (OpenRouter)
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN=sk-or-...
ANTHROPIC_API_KEY=""

# Codex
OPENAI_API_KEY=sk-...

# Gemini
GOOGLE_API_KEY=...
# Or use Google account auth
```

---

## Timeline

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Enhance ClaudeCodeAdapter | Small |
| 2 | Implement CodexAdapter | Medium |
| 3 | Implement GeminiAdapter | Medium |
| 4 | Update exports and factory | Small |
| 5 | Update CLI | Small |
| - | Testing | Medium |

---

## References

### CLI Tools

- [OpenAI Codex CLI](https://github.com/openai/codex)
- [Codex CLI Docs](https://developers.openai.com/codex/cli/)
- [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI Docs](https://developers.google.com/gemini-code-assist/docs/gemini-cli)
- [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code)

### Model Documentation

- [OpenAI Models](https://platform.openai.com/docs/models/) - GPT-5.2, GPT-5, GPT-5 mini, o4-mini
- [Google Gemini Models](https://ai.google.dev/gemini-api/docs/models) - Gemini 3 Pro, Gemini 3 Flash
- [Anthropic Claude Models](https://platform.claude.com/docs/en/about-claude/models/overview) - Opus 4.5, Sonnet 4.5

### Alternative Providers

- [OpenRouter](https://openrouter.ai/) - Multi-provider routing for Claude Code
