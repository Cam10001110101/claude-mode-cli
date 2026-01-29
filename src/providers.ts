export interface Provider {
  name: string;
  key: string;
  baseUrl: string;
  getAuthToken: () => string;
  description: string;
}

export interface Model {
  id: string;
  name: string;
  shortcut: string;
}

export interface ProviderConfig {
  provider: Provider;
  models: Model[];
}

// Provider definitions
export const providers: Record<string, Provider> = {
  openrouter: {
    name: 'OpenRouter',
    key: 'openrouter',
    baseUrl: 'https://openrouter.ai/api',
    getAuthToken: () => process.env.ANTHROPIC_AUTH_TOKEN || process.env.OPEN_ROUTER_API_KEY || '',
    description: 'OpenRouter API (Claude, Gemini, GPT-OSS, GLM)',
  },
  'ollama-cloud': {
    name: 'Ollama Cloud',
    key: 'ollama-cloud',
    baseUrl: 'https://ollama.com',
    getAuthToken: () => process.env.OLLAMA_API_KEY || '',
    description: 'Ollama Cloud',
  },
  'ollama-local': {
    name: 'Ollama Local',
    key: 'ollama-local',
    baseUrl: 'http://localhost:11434',
    getAuthToken: () => 'ollama',
    description: 'Ollama Local (localhost:11434)',
  },
  'ollama-custom': {
    name: 'Ollama Custom',
    key: 'ollama-custom',
    baseUrl: 'http://192.168.86.101:11434',
    getAuthToken: () => 'ollama',
    description: 'Ollama Custom (192.168.86.101:11434)',
  },
};

// Model definitions per provider
export const models: Record<string, Model[]> = {
  openrouter: [
    // Premium / Frontier Models
    { id: 'openai/gpt-5.2', name: 'GPT-5.2', shortcut: 'gpt52' },
    { id: 'openai/gpt-5.2-pro', name: 'GPT-5.2 Pro', shortcut: 'gpt52-pro' },
    { id: 'openai/gpt-5.2-codex', name: 'GPT-5.2 Codex', shortcut: 'gpt52-codex' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', shortcut: 'opus' },
    { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', shortcut: 'grok' },
    // Cost-Effective Performance
    { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', shortcut: 'deepseek' },
    { id: 'z-ai/glm-4.7-flash', name: 'Z.AI GLM 4.7 Flash', shortcut: 'zai-glm47-flash' },
    // Existing Models
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', shortcut: 'sonnet' },
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', shortcut: 'haiku' },
    { id: '@preset/gpt-oss-120b-cerebras', name: 'GPT-OSS 120B (Cerebras)', shortcut: 'gpt120' },
    { id: '@preset/cerebras-glm-4-7-cerebras', name: 'GLM 4.7 (Cerebras)', shortcut: 'glm47' },
    { id: 'z-ai/glm-4.7', name: 'Z.AI GLM 4.7', shortcut: 'zai-glm47' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', shortcut: 'gemini-pro' },
    { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', shortcut: 'gemini-flash' },
  ],
  'ollama-cloud': [
    { id: 'gpt-oss:120b', name: 'GPT-OSS 120B', shortcut: 'gpt120' },
    { id: 'glm-4.7', name: 'GLM 4.7', shortcut: 'glm47' },
    { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', shortcut: 'deepseek' },
    { id: 'minimax-m2.1', name: 'MiniMax M2.1', shortcut: 'minimax' },
    { id: 'kimi-k2.5:cloud', name: 'Kimi K2.5 (cloud)', shortcut: 'kimi' },
  ],
  'ollama-local': [
    { id: 'gpt-oss:20b', name: 'GPT-OSS 20B (local)', shortcut: 'gptoss-20' },
    { id: 'gpt-oss:120b', name: 'GPT-OSS 120B (local)', shortcut: 'gptoss-120' },
    { id: 'qwen3:4b', name: 'Qwen3 4B (local)', shortcut: 'qwen3' },
    { id: 'qwen3:latest', name: 'Qwen3 8B (local)', shortcut: 'qwen8' },
    { id: 'llama3.2:latest', name: 'Llama 3.2 (local)', shortcut: 'llama' },
    { id: 'gpt-oss:120b-cloud', name: 'GPT-OSS 120B', shortcut: 'gpt120-cloud' },
    { id: 'minimax-m2.1:cloud', name: 'MiniMax M2.1', shortcut: 'minimax-cloud' },
    { id: 'glm-4.7-flash`', name: 'GLM 4.7 Flash', shortcut: 'glm-flash' },
  ],
  'ollama-custom': [
    { id: 'qwen3:4b', name: 'Qwen3 4B', shortcut: 'qwen3' },
    { id: 'qwen3:14b', name: 'Qwen3 14B', shortcut: 'qwen14' },
    { id: 'qwen3:32b', name: 'Qwen3 32B', shortcut: 'qwen32' },
    { id: 'qwen3-coder:30b', name: 'Qwen3 Coder 30B', shortcut: 'coder30' },
    { id: 'glm-4.7-flash`', name: 'GLM 4.7 Flash', shortcut: 'glm-flash' },
  ],
};

// Model shortcut resolver
export function resolveModel(providerKey: string, shortcut: string): string {
  const providerModels = models[providerKey];
  if (!providerModels) return shortcut;

  const model = providerModels.find(
    (m) => m.shortcut === shortcut || m.id === shortcut || m.name.toLowerCase() === shortcut.toLowerCase()
  );
  return model?.id || shortcut;
}

// Provider shortcut resolver
export function resolveProvider(shortcut: string): string {
  const aliases: Record<string, string> = {
    or: 'openrouter',
    open: 'openrouter',
    oc: 'ollama-cloud',
    cloud: 'ollama-cloud',
    ol: 'ollama-local',
    local: 'ollama-local',
    custom: 'ollama-custom',
    remote: 'ollama-custom',
  };
  return aliases[shortcut] || shortcut;
}

// Get all provider keys
export function getProviderKeys(): string[] {
  return Object.keys(providers);
}

// Get provider by key
export function getProvider(key: string): Provider | undefined {
  return providers[resolveProvider(key)];
}

// Get models for a provider
export async function getModels(providerKey: string): Promise<Model[]> {
  const resolvedKey = resolveProvider(providerKey);

  // For local Ollama providers, fetch models dynamically
  if (resolvedKey === 'ollama-local' || resolvedKey === 'ollama-custom') {
    return getOllamaLocalModels(resolvedKey);
  }

  return models[resolvedKey] || [];
}

// Dynamic Ollama model discovery
let _cachedOllamaModels: { models: Model[]; timestamp: number } | null = null;
const OLLAMA_CACHE_TTL = 30000; // 30 seconds cache

export async function fetchOllamaModels(baseUrl: string): Promise<Model[]> {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('ollama list', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    const models: Model[] = [];

    // Skip header line (NAME ID SIZE MODIFIED)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse line format: "NAME                           ID           SIZE      MODIFIED"
      const parts = line.split(/\s+/);
      if (parts.length >= 1) {
        const name = parts[0];
        // Generate a shortcut from the model name
        // e.g., "qwen3:latest" -> "qwen3", "llama3.2:latest" -> "llama"
        const nameWithoutTag = name.split(':')[0];
        const shortcut = nameWithoutTag
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase()
          .slice(0, 12);

        models.push({
          id: name,
          name: name,
          shortcut: shortcut,
        });
      }
    }

    return models;
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return [];
  }
}

export async function getOllamaLocalModels(providerKey: string): Promise<Model[]> {
  const now = Date.now();

  // Return cached models if still valid
  if (_cachedOllamaModels && now - _cachedOllamaModels.timestamp < OLLAMA_CACHE_TTL) {
    return _cachedOllamaModels.models;
  }

  try {
    const models = await fetchOllamaModels(providers[providerKey]?.baseUrl || '');
    _cachedOllamaModels = { models, timestamp: now };
    return models;
  } catch {
    return [];
  }
}

export function clearOllamaModelCache(): void {
  _cachedOllamaModels = null;
}
