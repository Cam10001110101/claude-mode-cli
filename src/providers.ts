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
    { id: 'bytedance-seed/seed-1.6', name: 'Seed 1.6', shortcut: 'seed16' },
    // Existing Models
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', shortcut: 'sonnet' },
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', shortcut: 'haiku' },
    { id: '@preset/gpt-oss-120b-cerebras', name: 'GPT-OSS 120B (Cerebras)', shortcut: 'gpt120' },
    { id: '@preset/cerebras-glm-4-7-cerebras', name: 'GLM 4.7 (Cerebras)', shortcut: 'glm47' },
    { id: 'z-ai/glm-4.7', name: 'Z.AI GLM 4.7', shortcut: 'zai-glm47' },
    { id: 'z-ai/glm-4.6', name: 'Z.AI GLM 4.6', shortcut: 'zai-glm46' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', shortcut: 'gemini-pro' },
    { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', shortcut: 'gemini-flash' },
  ],
  'ollama-cloud': [
    { id: 'gpt-oss:120b', name: 'GPT-OSS 120B', shortcut: 'gpt120' },
    { id: 'glm-4.7', name: 'GLM 4.7', shortcut: 'glm47' },
    { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', shortcut: 'deepseek' },
    { id: 'minimax-m2.1', name: 'MiniMax M2.1', shortcut: 'minimax' },
  ],
  'ollama-local': [
    { id: 'gpt-oss:20b', name: 'GPT-OSS 20B (local)', shortcut: 'gpt20' },
    { id: 'qwen3:4b', name: 'Qwen3 4B (local)', shortcut: 'qwen3' },
    { id: 'qwen3:latest', name: 'Qwen3 8B (local)', shortcut: 'qwen8' },
    { id: 'llama3.2:latest', name: 'Llama 3.2 (local)', shortcut: 'llama' },
    { id: 'glm-4.7:cloud', name: 'GLM 4.7 (cloud proxy)', shortcut: 'glm47-cloud' },
    { id: 'gpt-oss:120b-cloud', name: 'GPT-OSS 120B (cloud proxy)', shortcut: 'gpt120-cloud' },
    { id: 'minimax-m2.1:cloud', name: 'MiniMax M2.1 (cloud proxy)', shortcut: 'minimax-cloud' },
  ],
  'ollama-custom': [
    { id: 'gpt-oss:20b', name: 'GPT-OSS 20B', shortcut: 'gpt20' },
    { id: 'gpt-oss:120b', name: 'GPT-OSS 120B', shortcut: 'gpt120' },
    { id: 'qwen3:4b', name: 'Qwen3 4B', shortcut: 'qwen3' },
    { id: 'qwen3:14b', name: 'Qwen3 14B', shortcut: 'qwen14' },
    { id: 'qwen3:32b', name: 'Qwen3 32B', shortcut: 'qwen32' },
    { id: 'qwen3-coder:30b', name: 'Qwen3 Coder 30B', shortcut: 'coder30' },
    { id: 'phi4:14b', name: 'Phi 4 14B', shortcut: 'phi4' },
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
export function getModels(providerKey: string): Model[] {
  return models[resolveProvider(providerKey)] || [];
}
