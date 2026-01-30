import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomProvider {
  name: string;
  key: string;
  baseUrl: string;
  authToken?: string;
  authEnvVar?: string;
  description?: string;
}

export interface Config {
  // Default settings
  defaultProvider?: string;
  defaultModel?: string;

  // Timeouts (in milliseconds)
  modelDiscoveryTimeout?: number;
  healthCheckTimeout?: number;
  cacheTTL?: number;

  // Custom providers
  customProviders?: CustomProvider[];

  // Feature flags
  skipHealthCheck?: boolean;
  offlineMode?: boolean;

  // Headless mode settings
  headlessAllowedTools?: string; // Tools to allow in headless mode (empty string to disable)
}

// ============================================================================
// PATHS
// ============================================================================

function getConfigDir(): string {
  // Primary location: ~/.claude-mode/
  return path.join(homedir(), '.claude-mode');
}

function getConfigPaths(): string[] {
  return [
    path.join(getConfigDir(), 'claude-mode.json'), // ~/.claude-mode/claude-mode.json (primary)
  ];
}

export function getCacheDir(): string {
  const configDir = getConfigDir();
  const cacheDir = path.join(configDir, 'cache');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: Required<Config> = {
  defaultProvider: '',
  defaultModel: '',
  modelDiscoveryTimeout: 5000,
  healthCheckTimeout: 2000,
  cacheTTL: 30000,
  customProviders: [],
  skipHealthCheck: false,
  offlineMode: false,
  headlessAllowedTools: 'Read,Edit,Write,Bash,Glob,Grep',
};

// ============================================================================
// CONFIG LOADING
// ============================================================================

let _cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (_cachedConfig) {
    return _cachedConfig;
  }

  const paths = getConfigPaths();

  for (const configPath of paths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content) as Config;
        _cachedConfig = { ...DEFAULT_CONFIG, ...parsed };
        return _cachedConfig;
      } catch (error) {
        console.error(`Warning: Failed to parse config at ${configPath}:`, error);
      }
    }
  }

  _cachedConfig = DEFAULT_CONFIG;
  return _cachedConfig;
}

export function getConfig<K extends keyof Config>(key: K): Config[K] {
  const config = loadConfig();
  return config[key] ?? DEFAULT_CONFIG[key];
}

export function clearConfigCache(): void {
  _cachedConfig = null;
}

// ============================================================================
// CONFIG WRITING
// ============================================================================

export function saveConfig(config: Config): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, 'claude-mode.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  _cachedConfig = null; // Clear cache
}

export function initConfig(): string {
  const configDir = getConfigDir();
  const configPath = path.join(configDir, 'claude-mode.json');

  if (existsSync(configPath)) {
    return configPath;
  }

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const defaultConfig: Config = {
    defaultProvider: '',
    defaultModel: '',
    modelDiscoveryTimeout: 5000,
    healthCheckTimeout: 2000,
    cacheTTL: 30000,
    customProviders: [
      // Example custom provider (commented out in JSON)
    ],
    skipHealthCheck: false,
    offlineMode: false,
    headlessAllowedTools: 'Read,Edit,Write,Bash,Glob,Grep',
  };

  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  return configPath;
}

// ============================================================================
// MODEL CACHE
// ============================================================================

interface ModelCache {
  [providerKey: string]: {
    models: Array<{ id: string; name: string; shortcut: string }>;
    timestamp: number;
  };
}

export function loadModelCache(): ModelCache {
  const cachePath = path.join(getCacheDir(), 'models.json');
  if (!existsSync(cachePath)) {
    return {};
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    return JSON.parse(content) as ModelCache;
  } catch {
    return {};
  }
}

export function saveModelCache(providerKey: string, models: Array<{ id: string; name: string; shortcut: string }>): void {
  const cache = loadModelCache();
  cache[providerKey] = {
    models,
    timestamp: Date.now(),
  };

  const cachePath = path.join(getCacheDir(), 'models.json');
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

export function getCachedModels(providerKey: string): Array<{ id: string; name: string; shortcut: string }> | null {
  const cache = loadModelCache();
  const entry = cache[providerKey];
  if (!entry) {
    return null;
  }
  return entry.models;
}
