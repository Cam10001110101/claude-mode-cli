import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadConfig,
  getConfig,
  clearConfigCache,
  getCacheDir,
  saveModelCache,
  getCachedModels,
  loadModelCache,
} from './config.js';

describe('Config Loading', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  it('should return default config when no config file exists', () => {
    const config = loadConfig();
    expect(config.modelDiscoveryTimeout).toBe(5000);
    expect(config.healthCheckTimeout).toBe(2000);
    expect(config.cacheTTL).toBe(30000);
    expect(config.skipHealthCheck).toBe(false);
    expect(config.offlineMode).toBe(false);
    expect(config.customProviders).toEqual([]);
  });

  it('should get individual config values', () => {
    clearConfigCache();
    const timeout = getConfig('modelDiscoveryTimeout');
    expect(timeout).toBe(5000);
  });

  it('should return default or configured value for defaultProvider', () => {
    clearConfigCache();
    const defaultProvider = getConfig('defaultProvider');
    // defaultProvider should be a string (empty by default, or configured value)
    expect(typeof defaultProvider).toBe('string');
  });
});

describe('Model Cache', () => {
  const testModels = [
    { id: 'test-model-1', name: 'Test Model 1', shortcut: 'tm1' },
    { id: 'test-model-2', name: 'Test Model 2', shortcut: 'tm2' },
  ];

  it('should save and retrieve model cache', () => {
    saveModelCache('test-provider', testModels);

    const cached = getCachedModels('test-provider');
    expect(cached).toBeDefined();
    expect(cached?.length).toBe(2);
    expect(cached?.[0].id).toBe('test-model-1');
  });

  it('should return null for uncached provider', () => {
    const cached = getCachedModels('nonexistent-provider');
    expect(cached).toBeNull();
  });

  it('should load full model cache', () => {
    saveModelCache('cache-test-provider', testModels);

    const cache = loadModelCache();
    expect(cache['cache-test-provider']).toBeDefined();
    expect(cache['cache-test-provider'].models.length).toBe(2);
    expect(cache['cache-test-provider'].timestamp).toBeGreaterThan(0);
  });
});

describe('Cache Directory', () => {
  it('should return a cache directory path', () => {
    const cacheDir = getCacheDir();
    expect(cacheDir).toBeDefined();
    expect(typeof cacheDir).toBe('string');
    expect(cacheDir.length).toBeGreaterThan(0);
  });

  it('should create cache directory if it does not exist', () => {
    const cacheDir = getCacheDir();
    expect(existsSync(cacheDir)).toBe(true);
  });
});
