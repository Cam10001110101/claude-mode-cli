import { loadConfig, getConfig, saveModelCache, getCachedModels, type CustomProvider } from './config.js';
import { classifyError, type ClaudeModeError, ErrorCode } from './errors.js';

// ============================================================================
// TYPES
// ============================================================================

export interface Provider {
  name: string;
  key: string;
  getBaseUrl: () => string;
  getAuthToken: () => string;
  getDescription: () => string;
  isBuiltIn: boolean;
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

export interface HealthCheckResult {
  provider: string;
  healthy: boolean;
  latencyMs?: number;
  error?: ClaudeModeError;
}

// ============================================================================
// BUILT-IN PROVIDER DEFINITIONS
// ============================================================================

const builtInProviders: Record<string, Provider> = {
  openrouter: {
    name: 'OpenRouter',
    key: 'openrouter',
    getBaseUrl: () => process.env.ANTHROPIC_BASE_URL || 'https://openrouter.ai/api',
    getAuthToken: () => process.env.ANTHROPIC_AUTH_TOKEN || process.env.OPEN_ROUTER_API_KEY || '',
    getDescription: () => {
      const url = process.env.ANTHROPIC_BASE_URL || 'https://openrouter.ai/api';
      return `OpenRouter API (${url})`;
    },
    isBuiltIn: true,
  },
  'ollama-cloud': {
    name: 'Ollama Cloud',
    key: 'ollama-cloud',
    getBaseUrl: () => process.env.OLLAMA_HOST || 'https://ollama.com',
    getAuthToken: () => process.env.OLLAMA_API_KEY || '',
    getDescription: () => {
      const url = process.env.OLLAMA_HOST || 'https://ollama.com';
      return `Ollama Cloud (${url})`;
    },
    isBuiltIn: true,
  },
  'ollama-local': {
    name: 'Ollama Local',
    key: 'ollama-local',
    getBaseUrl: () => process.env.OLLAMA_BASE_URL_LOCAL || 'http://localhost:11434',
    getAuthToken: () => 'ollama',
    getDescription: () => {
      const url = process.env.OLLAMA_BASE_URL_LOCAL || 'http://localhost:11434';
      return `Ollama Local (${url})`;
    },
    isBuiltIn: true,
  },
  'ollama-custom': {
    name: 'Ollama Custom',
    key: 'ollama-custom',
    getBaseUrl: () => process.env.OLLAMA_BASE_URL_CUSTOM || 'http://192.168.86.101:11434',
    getAuthToken: () => 'ollama',
    getDescription: () => {
      const url = process.env.OLLAMA_BASE_URL_CUSTOM || 'http://192.168.86.101:11434';
      return `Ollama Custom (${url})`;
    },
    isBuiltIn: true,
  },
};

// ============================================================================
// PROVIDERS REGISTRY (includes custom providers)
// ============================================================================

let _providersCache: Record<string, Provider> | null = null;

function createCustomProvider(custom: CustomProvider): Provider {
  return {
    name: custom.name,
    key: custom.key,
    getBaseUrl: () => custom.baseUrl,
    getAuthToken: () => {
      if (custom.authToken) return custom.authToken;
      if (custom.authEnvVar) return process.env[custom.authEnvVar] || '';
      return '';
    },
    getDescription: () => custom.description || `${custom.name} (${custom.baseUrl})`,
    isBuiltIn: false,
  };
}

export function getProviders(): Record<string, Provider> {
  if (_providersCache) {
    return _providersCache;
  }

  const config = loadConfig();
  const providers = { ...builtInProviders };

  // Add custom providers from config
  if (config.customProviders) {
    for (const custom of config.customProviders) {
      if (custom.key && custom.name && custom.baseUrl) {
        providers[custom.key] = createCustomProvider(custom);
      }
    }
  }

  _providersCache = providers;
  return providers;
}

export function clearProvidersCache(): void {
  _providersCache = null;
}

// Legacy export for backward compatibility
export const providers = new Proxy({} as Record<string, Provider>, {
  get: (_, key: string) => getProviders()[key],
  ownKeys: () => Object.keys(getProviders()),
  getOwnPropertyDescriptor: (_, key: string) => ({
    enumerable: true,
    configurable: true,
    value: getProviders()[key],
  }),
});

// ============================================================================
// MODEL DEFINITIONS (static for non-Ollama providers)
// ============================================================================

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

// ============================================================================
// PROVIDER RESOLUTION
// ============================================================================

const providerAliases: Record<string, string> = {
  or: 'openrouter',
  open: 'openrouter',
  oc: 'ollama-cloud',
  cloud: 'ollama-cloud',
  ol: 'ollama-local',
  local: 'ollama-local',
  custom: 'ollama-custom',
  remote: 'ollama-custom',
};

export function resolveProvider(shortcut: string): string {
  return providerAliases[shortcut] || shortcut;
}

export function getProviderKeys(): string[] {
  return Object.keys(getProviders());
}

export function getProvider(key: string): Provider | undefined {
  return getProviders()[resolveProvider(key)];
}

// ============================================================================
// MODEL RESOLUTION
// ============================================================================

export async function resolveModel(providerKey: string, shortcut: string): Promise<string> {
  const resolvedKey = resolveProvider(providerKey);

  // For Ollama providers, fetch models dynamically
  if (isOllamaProvider(resolvedKey)) {
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

export async function getModels(providerKey: string): Promise<Model[]> {
  const resolvedKey = resolveProvider(providerKey);

  // For all Ollama providers, fetch models dynamically
  if (isOllamaProvider(resolvedKey)) {
    return getOllamaModels(resolvedKey);
  }

  return models[resolvedKey] || [];
}

// ============================================================================
// OLLAMA MODEL DISCOVERY
// ============================================================================

function isOllamaProvider(providerKey: string): boolean {
  return providerKey === 'ollama-local' ||
         providerKey === 'ollama-custom' ||
         providerKey === 'ollama-cloud' ||
         providerKey.startsWith('ollama-');
}

// In-memory cache
const _ollamaModelCache = new Map<string, { models: Model[]; timestamp: number }>();

export function clearOllamaModelCache(providerKey?: string): void {
  if (providerKey) {
    _ollamaModelCache.delete(providerKey);
  } else {
    _ollamaModelCache.clear();
  }
}

async function fetchOllamaModelsFromAPI(baseUrl: string, timeout: number): Promise<Model[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const models: Model[] = [];

    if (data.data && Array.isArray(data.data)) {
      for (const model of data.data) {
        models.push({
          id: model.id,
          name: model.id,
          shortcut: model.id,
        });
      }
    }

    return models;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Connection timed out');
    }
    throw error;
  }
}

async function getOllamaModels(providerKey: string): Promise<Model[]> {
  const now = Date.now();
  const cacheTTL = getConfig('cacheTTL') || 30000;
  const cached = _ollamaModelCache.get(providerKey);

  // Return in-memory cached models if still valid
  if (cached && now - cached.timestamp < cacheTTL) {
    return cached.models;
  }

  const allProviders = getProviders();
  const provider = allProviders[providerKey];
  if (!provider) return [];

  const timeout = getConfig('modelDiscoveryTimeout') || 5000;

  try {
    const models = await fetchOllamaModelsFromAPI(provider.getBaseUrl(), timeout);

    // Update in-memory cache
    _ollamaModelCache.set(providerKey, { models, timestamp: now });

    // Persist to disk cache
    saveModelCache(providerKey, models);

    return models;
  } catch (error) {
    // Try to use disk cache as fallback
    const diskCached = getCachedModels(providerKey);
    if (diskCached && diskCached.length > 0) {
      console.warn(`Warning: Using cached models for ${providerKey} (API unreachable)`);
      return diskCached;
    }

    // Classify and log the error
    const classified = classifyError(error);
    if (classified.code !== ErrorCode.UNKNOWN) {
      console.error(`Failed to fetch models from ${providerKey}: ${classified.message}`);
      if (classified.hint) {
        console.error(`Hint: ${classified.hint}`);
      }
    }

    return [];
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkProviderHealth(providerKey: string): Promise<HealthCheckResult> {
  const allProviders = getProviders();
  const provider = allProviders[providerKey];

  if (!provider) {
    return {
      provider: providerKey,
      healthy: false,
      error: {
        code: ErrorCode.PROVIDER_NOT_FOUND,
        message: `Provider not found: ${providerKey}`,
      },
    };
  }

  const timeout = getConfig('healthCheckTimeout') || 2000;
  const baseUrl = provider.getBaseUrl();
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Try to hit the models endpoint (works for Ollama)
    // For OpenRouter, we'd need a different endpoint
    let healthUrl = `${baseUrl}/v1/models`;

    // OpenRouter uses a different health check
    if (providerKey === 'openrouter') {
      healthUrl = `${baseUrl}/v1/models`;
    }

    const response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: provider.getAuthToken() ? {
        'Authorization': `Bearer ${provider.getAuthToken()}`,
      } : {},
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return {
        provider: providerKey,
        healthy: true,
        latencyMs,
      };
    }

    // Handle specific HTTP errors
    if (response.status === 401 || response.status === 403) {
      return {
        provider: providerKey,
        healthy: false,
        latencyMs,
        error: {
          code: ErrorCode.AUTH_INVALID,
          message: `Authentication failed (${response.status})`,
          hint: 'Check your API key configuration.',
        },
      };
    }

    return {
      provider: providerKey,
      healthy: false,
      latencyMs,
      error: {
        code: ErrorCode.PROVIDER_UNAVAILABLE,
        message: `HTTP ${response.status}: ${response.statusText}`,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    return {
      provider: providerKey,
      healthy: false,
      latencyMs,
      error: classifyError(error),
    };
  }
}

export async function checkAllProvidersHealth(): Promise<HealthCheckResult[]> {
  const providerKeys = getProviderKeys();
  const results = await Promise.all(
    providerKeys.map((key) => checkProviderHealth(key))
  );
  return results;
}
