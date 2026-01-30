export interface Provider {
  name: string;
  key: string;
  getBaseUrl: () => string;
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
    getBaseUrl: () => process.env.ANTHROPIC_BASE_URL || 'https://openrouter.ai/api',
    getAuthToken: () => process.env.ANTHROPIC_AUTH_TOKEN || process.env.OPEN_ROUTER_API_KEY || '',
    description: 'OpenRouter API (Claude, Gemini, GPT-OSS, GLM)',
  },
  'ollama-cloud': {
    name: 'Ollama Cloud',
    key: 'ollama-cloud',
    getBaseUrl: () => process.env.OLLAMA_HOST || 'https://ollama.com',
    getAuthToken: () => process.env.OLLAMA_API_KEY || '',
    description: 'Ollama Cloud',
  },
  'ollama-local': {
    name: 'Ollama Local',
    key: 'ollama-local',
    getBaseUrl: () => process.env.OLLAMA_BASE_URL_LOCAL || 'http://localhost:11434',
    getAuthToken: () => 'ollama',
    description: 'Ollama Local',
  },
  'ollama-custom': {
    name: 'Ollama Custom',
    key: 'ollama-custom',
    getBaseUrl: () => process.env.OLLAMA_BASE_URL_CUSTOM || 'http://192.168.86.101:11434',
    getAuthToken: () => 'ollama',
    description: 'Ollama Custom',
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
  // Ollama models are dynamically fetched via API
};

// Model shortcut resolver
export async function resolveModel(providerKey: string, shortcut: string): Promise<string> {
  const resolvedKey = resolveProvider(providerKey);

  // For Ollama providers, fetch models dynamically
  if (resolvedKey === 'ollama-local' ||
      resolvedKey === 'ollama-custom' ||
      resolvedKey === 'ollama-cloud') {
    const ollamaModels = await getOllamaModels(resolvedKey);
    const model = ollamaModels.find(
      (m) => m.shortcut === shortcut || m.id === shortcut || m.name.toLowerCase() === shortcut.toLowerCase()
    );
    return model?.id || shortcut;
  }

  // For other providers, use static models
  const providerModels = models[resolvedKey];
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

  // For all Ollama providers, fetch models dynamically
  if (resolvedKey === 'ollama-local' ||
      resolvedKey === 'ollama-custom' ||
      resolvedKey === 'ollama-cloud') {
    return getOllamaModels(resolvedKey);
  }

  return models[resolvedKey] || [];
}

// Dynamic Ollama model discovery
// Cache structure: Map<providerKey, { models: Model[], timestamp: number }>
const _ollamaModelCache = new Map<string, { models: Model[]; timestamp: number }>();
const OLLAMA_CACHE_TTL = 30000; // 30 seconds

export function clearOllamaModelCache(providerKey?: string): void {
  if (providerKey) {
    _ollamaModelCache.delete(providerKey);
  } else {
    _ollamaModelCache.clear();
  }
}

async function fetchOllamaModelsFromAPI(baseUrl: string): Promise<Model[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Response format: { object: "list", data: [...] }
    const models: Model[] = [];

    if (data.data && Array.isArray(data.data)) {
      for (const model of data.data) {
        models.push({
          id: model.id,
          name: model.id, // Use full ID as display name
          shortcut: model.id, // Use full ID as shortcut
        });
      }
    }

    return models;
  } catch (error) {
    console.error(`Failed to fetch models from ${baseUrl}:`, error);
    return [];
  }
}

async function getOllamaModels(providerKey: string): Promise<Model[]> {
  const now = Date.now();
  const cached = _ollamaModelCache.get(providerKey);

  // Return cached models if still valid
  if (cached && now - cached.timestamp < OLLAMA_CACHE_TTL) {
    return cached.models;
  }

  const provider = providers[providerKey];
  if (!provider) return [];

  try {
    const models = await fetchOllamaModelsFromAPI(provider.getBaseUrl());
    _ollamaModelCache.set(providerKey, { models, timestamp: now });
    return models;
  } catch (error) {
    console.error(`Failed to fetch Ollama models for ${providerKey}:`, error);
    return [];
  }
}
