import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveProvider,
  resolveModel,
  getProvider,
  getProviderKeys,
  getProviders,
  clearProvidersCache,
  clearOllamaModelCache,
} from './providers.js';
import { clearConfigCache } from './config.js';

describe('Provider Resolution', () => {
  beforeEach(() => {
    clearProvidersCache();
    clearConfigCache();
  });

  it('should resolve provider shortcuts', () => {
    expect(resolveProvider('or')).toBe('openrouter');
    expect(resolveProvider('open')).toBe('openrouter');
    expect(resolveProvider('oc')).toBe('ollama-cloud');
    expect(resolveProvider('cloud')).toBe('ollama-cloud');
    expect(resolveProvider('ol')).toBe('ollama-local');
    expect(resolveProvider('local')).toBe('ollama-local');
    expect(resolveProvider('custom')).toBe('ollama-custom');
    expect(resolveProvider('remote')).toBe('ollama-custom');
  });

  it('should return full name if no alias exists', () => {
    expect(resolveProvider('openrouter')).toBe('openrouter');
    expect(resolveProvider('ollama-local')).toBe('ollama-local');
    expect(resolveProvider('unknown-provider')).toBe('unknown-provider');
  });

  it('should get provider by key', () => {
    const provider = getProvider('openrouter');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('OpenRouter');
    expect(provider?.key).toBe('openrouter');
  });

  it('should get provider by alias', () => {
    const provider = getProvider('or');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('OpenRouter');
  });

  it('should return undefined for unknown provider', () => {
    const provider = getProvider('nonexistent');
    expect(provider).toBeUndefined();
  });

  it('should list all provider keys', () => {
    const keys = getProviderKeys();
    expect(keys).toContain('openrouter');
    expect(keys).toContain('ollama-cloud');
    expect(keys).toContain('ollama-local');
    expect(keys).toContain('ollama-custom');
    expect(keys.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Provider Functions', () => {
  beforeEach(() => {
    clearProvidersCache();
    clearConfigCache();
  });

  it('should have getBaseUrl function that returns string', () => {
    const provider = getProvider('openrouter');
    expect(provider).toBeDefined();
    expect(typeof provider?.getBaseUrl).toBe('function');
    expect(typeof provider?.getBaseUrl()).toBe('string');
  });

  it('should have getAuthToken function', () => {
    const provider = getProvider('openrouter');
    expect(provider).toBeDefined();
    expect(typeof provider?.getAuthToken).toBe('function');
  });

  it('should have getDescription function', () => {
    const provider = getProvider('openrouter');
    expect(provider).toBeDefined();
    expect(typeof provider?.getDescription).toBe('function');
    expect(provider?.getDescription()).toContain('OpenRouter');
  });

  it('should read OLLAMA_BASE_URL_LOCAL from env', () => {
    const originalEnv = process.env.OLLAMA_BASE_URL_LOCAL;
    process.env.OLLAMA_BASE_URL_LOCAL = 'http://test:1234';

    clearProvidersCache();
    const provider = getProvider('ollama-local');
    expect(provider?.getBaseUrl()).toBe('http://test:1234');

    // Restore
    if (originalEnv) {
      process.env.OLLAMA_BASE_URL_LOCAL = originalEnv;
    } else {
      delete process.env.OLLAMA_BASE_URL_LOCAL;
    }
  });

  it('should read OLLAMA_BASE_URL_CUSTOM from env', () => {
    const originalEnv = process.env.OLLAMA_BASE_URL_CUSTOM;
    process.env.OLLAMA_BASE_URL_CUSTOM = 'http://custom:5678';

    clearProvidersCache();
    const provider = getProvider('ollama-custom');
    expect(provider?.getBaseUrl()).toBe('http://custom:5678');

    // Restore
    if (originalEnv) {
      process.env.OLLAMA_BASE_URL_CUSTOM = originalEnv;
    } else {
      delete process.env.OLLAMA_BASE_URL_CUSTOM;
    }
  });
});

describe('Model Resolution', () => {
  beforeEach(() => {
    clearProvidersCache();
    clearOllamaModelCache();
  });

  it('should resolve OpenRouter model shortcuts', async () => {
    const modelId = await resolveModel('openrouter', 'sonnet');
    expect(modelId).toBe('anthropic/claude-sonnet-4.5');
  });

  it('should resolve OpenRouter model by full ID', async () => {
    const modelId = await resolveModel('openrouter', 'anthropic/claude-opus-4.5');
    expect(modelId).toBe('anthropic/claude-opus-4.5');
  });

  it('should return original string if model not found', async () => {
    const modelId = await resolveModel('openrouter', 'nonexistent-model');
    expect(modelId).toBe('nonexistent-model');
  });

  it('should work with provider aliases', async () => {
    const modelId = await resolveModel('or', 'opus');
    expect(modelId).toBe('anthropic/claude-opus-4.5');
  });
});
