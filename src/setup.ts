#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import chalk from 'chalk';
import {
  confirm,
  select,
  checkbox,
  input,
  password,
} from '@inquirer/prompts';

import {
  getProviders,
  getProvider,
  getProviderKeys,
  getModels,
  checkProviderHealth,
  type Provider,
  type Model,
  type HealthCheckResult,
} from './providers.js';

import {
  loadConfig,
  saveConfig,
  type Config,
} from './config.js';

import {
  type ClaudeModeError,
  ErrorCode,
  classifyError,
  formatError,
  SETUP_CONFIG_WRITE_FAILED,
  SETUP_ENV_WRITE_FAILED,
  SETUP_VALIDATION_FAILED,
  SETUP_CANCELLED,
  SETUP_INCOMPLETE,
  setupConfigWriteError,
  setupEnvWriteError,
  setupValidationError,
  setupCancelledError,
  setupIncompleteError,
  printError,
} from './errors.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SetupOptions {
  force?: boolean;
  provider?: string;
  skipValidation?: boolean;
}

export interface ProviderSetupConfig {
  key: string;
  name: string;
  apiKey?: string;
  customUrl?: string;
  validated: boolean;
}

// ============================================================================
// PATHS
// ============================================================================

function getConfigDir(): string {
  return path.join(homedir(), '.claude-mode');
}

function getConfigPath(): string {
  return path.join(getConfigDir(), 'claude-mode.json');
}

function getEnvPath(envPath?: string): string {
  if (envPath) return envPath;
  // Default global env file location
  return path.join(homedir(), '.claude-mode', '.env');
}

// Helper to ensure directory exists before writing env files
function ensureEnvDirExists(envPath: string): void {
  const dir = path.dirname(envPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ============================================================================
// SETUP STATUS DETECTION
// ============================================================================

export type SetupStatus = 'first-time' | 'incomplete' | 'complete';

export function detectSetupStatus(): SetupStatus {
  const configPath = getConfigPath();
  const envPath = getEnvPath();

  // No config file exists
  if (!existsSync(configPath)) {
    return 'first-time';
  }

  // Config exists but incomplete
  try {
    const config = loadConfig();
    const hasDefaults = !!(config.defaultProvider && config.defaultModel);
    const hasProviders = !!config.configuredProviders && config.configuredProviders.length > 0;

    if (!hasDefaults || !hasProviders) {
      return 'incomplete';
    }

    // Check if configured providers have required env vars
    if (config.configuredProviders) {
      for (const providerKey of config.configuredProviders) {
        const provider = getProvider(providerKey);
        if (provider) {
          const hasKey = !!provider.getAuthToken();
          const needsKey = providerKey === 'openrouter' || providerKey === 'ollama-cloud';
          if (needsKey && !hasKey) {
            return 'incomplete';
          }
        }
      }
    }

    return 'complete';
  } catch {
    return 'first-time';
  }
}

// ============================================================================
// UI DISPLAY FUNCTIONS
// ============================================================================

function printHeader(text: string): void {
  console.log('');
  console.log(chalk.bold.blue('╔════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║') + '  ' + chalk.cyan(text));
  console.log(chalk.bold.blue('╚════════════════════════════════════════╝'));
  console.log('');
}

function printSection(title: string): void {
  console.log('');
  console.log(chalk.bold.cyan('━━━ ' + title + ' ━━━'));
  console.log('');
}

function printProviderInfo(): void {
  console.log(chalk.bold('Available Providers:'));
  console.log('');
  console.log('  ' + chalk.green('OpenRouter') + ' - Access to Claude, GPT-5, DeepSeek, and more');
  console.log('    ' + chalk.gray('Requires: API key'));
  console.log('');
  console.log('  ' + chalk.green('Ollama Local') + ' - Run models locally on your machine');
  console.log('    ' + chalk.gray('Requires: Local Ollama instance'));
  console.log('');
  console.log('  ' + chalk.green('Ollama Cloud') + ' - Managed Ollama service');
  console.log('    ' + chalk.gray('Requires: API key'));
  console.log('');
  console.log('  ' + chalk.green('Ollama Custom') + ' - Connect to remote Ollama instance');
  console.log('    ' + chalk.gray('Requires: Custom URL'));
  console.log('');
}

export async function displayWelcome(isFirstTime: boolean): Promise<void> {
  console.clear();

  if (isFirstTime) {
    printHeader('Welcome to Claude Mode Setup');

    console.log(chalk.bold.cyan('Claude Mode') + ' is a CLI launcher for Claude Code');
    console.log('that supports multiple AI providers.');
    console.log('');
    console.log('This wizard will help you configure your providers');
    console.log('and set up your default settings.');
    console.log('');
  } else {
    printHeader('Claude Mode Configuration');

    console.log('Update your configuration or add new providers.');
    console.log('');
  }

  printProviderInfo();

  const ready = await confirm({
    message: 'Ready to configure?',
    default: true,
  });

  if (!ready) {
    throw setupCancelledError();
  }
}

export async function displayUpdatePrompt(): Promise<boolean> {
  console.clear();
  printHeader('Configuration Found');

  console.log('A configuration file already exists.');
  console.log('');
  console.log('You can:');
  console.log('  ' + chalk.cyan('•') + ' Re-run full setup to reconfigure all providers');
  console.log('  ' + chalk.cyan('•') + ' Configure a single provider');
  console.log('  ' + chalk.cyan('•') + ' Skip and use existing configuration');
  console.log('');

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Re-run full setup', value: 'full' },
      { name: 'Configure specific provider', value: 'single' },
      { name: 'Skip (use existing config)', value: 'skip' },
    ],
  });

  return action !== 'skip';
}

// ============================================================================
// PROVIDER SELECTION
// ============================================================================

export async function selectProviders(forceProvider?: string): Promise<string[]> {
  if (forceProvider) {
    const provider = getProvider(forceProvider);
    if (!provider) {
      console.error(chalk.red(`Unknown provider: ${forceProvider}`));
      throw setupIncompleteError(`Provider "${forceProvider}" not found`);
    }
    return [forceProvider];
  }

  const allProviders = getProviders();

  const choices = Object.entries(allProviders).map(([key, provider]) => ({
    name: provider.name,
    value: key,
    description: provider.getDescription(),
  }));

  const selected = await checkbox({
    message: 'Select providers to configure:',
    choices,
    validate: (value) => value.length > 0 ? true : 'Select at least one provider',
  });

  return selected;
}

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

export async function configureProvider(
  providerKey: string,
  skipValidation: boolean
): Promise<ProviderSetupConfig> {
  const provider = getProvider(providerKey);
  if (!provider) {
    throw setupIncompleteError(`Provider "${providerKey}" not found`);
  }

  printSection(`Configuring ${provider.name}`);

  const config: ProviderSetupConfig = {
    key: providerKey,
    name: provider.name,
    validated: false,
  };

  // Collect API key for providers that need it
  if (providerKey === 'openrouter' || providerKey === 'ollama-cloud') {
    const existingKey = provider.getAuthToken();
    const keyMsg = existingKey
      ? `Enter API key (current: ${existingKey.substring(0, 8)}...)`
      : 'Enter API key:';

    config.apiKey = await password({
      message: keyMsg,
      validate: (value) => {
        if (existingKey && !value) return true; // Allow keeping existing
        return value.length > 0 ? true : 'API key is required';
      },
    });

    if (config.apiKey) {
      // Set the environment variable for validation
      if (providerKey === 'openrouter') {
        process.env.ANTHROPIC_AUTH_TOKEN = config.apiKey;
      } else if (providerKey === 'ollama-cloud') {
        process.env.OLLAMA_API_KEY = config.apiKey;
      }
    }
  }

  // Collect custom URL for Ollama Custom
  if (providerKey === 'ollama-custom') {
    const existingUrl = provider.getBaseUrl();

    config.customUrl = await input({
      message: 'Enter Ollama URL:',
      default: existingUrl || '',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });

    if (config.customUrl) {
      process.env.OLLAMA_BASE_URL_CUSTOM = config.customUrl;
    }
  }

  // Validate provider if not skipped
  if (!skipValidation) {
    config.validated = await validateProvider(providerKey);
  } else {
    config.validated = true; // Assume valid when skipping
  }

  return config;
}

export async function validateProvider(providerKey: string): Promise<boolean> {
  console.log(chalk.gray('Validating provider connection...'));

  const result = await checkProviderHealth(providerKey);

  if (result.healthy) {
    const latency = result.latencyMs ? ` (${result.latencyMs}ms)` : '';
    console.log(chalk.green(`✓ ${providerKey} is reachable${latency}`));
    return true;
  } else {
    console.log(chalk.yellow(`⚠ ${providerKey} validation failed`));

    if (result.error) {
      console.log(chalk.gray(`  ${result.error.message}`));
    }

    const retry = await confirm({
      message: 'Continue anyway?',
      default: false,
    });

    return retry;
  }
}

// ============================================================================
// DEFAULT SELECTION
// ============================================================================

export async function selectDefaults(
  configuredProviders: string[],
  currentDefaults?: { provider: string; model: string }
): Promise<{ provider: string; model: string }> {
  printSection('Set Defaults');

  let defaultProvider: string;
  let defaultModel: string;

  // Select default provider
  if (currentDefaults && configuredProviders.includes(currentDefaults.provider)) {
    const useCurrent = await confirm({
      message: `Keep default provider as ${currentDefaults.provider}?`,
      default: true,
    });

    if (useCurrent) {
      defaultProvider = currentDefaults.provider;
    } else {
      defaultProvider = await select({
        message: 'Select default provider:',
        choices: configuredProviders.map((key) => ({
          name: getProvider(key)?.name || key,
          value: key,
        })),
      });
    }
  } else {
    defaultProvider = await select({
      message: 'Select default provider:',
      choices: configuredProviders.map((key) => ({
        name: getProvider(key)?.name || key,
        value: key,
      })),
    });
  }

  // Select default model
  const models = await getModels(defaultProvider);

  console.log('');
  console.log(chalk.gray('Available models for ' + getProvider(defaultProvider)?.name + ':'));

  if (models.length === 0) {
    console.log('  ' + chalk.gray('(no models found - will use manual input)'));
    console.log('');

    const modelInput = await input({
      message: 'Enter default model ID:',
      validate: (value) => value.length > 0 ? true : 'Model ID cannot be empty',
    });
    defaultModel = modelInput;
  } else {
    for (const model of models) {
      console.log(`  ${chalk.green(model.shortcut.padEnd(20))} ${chalk.gray(model.id)}`);
    }
    console.log('');

    defaultModel = await select({
      message: 'Select default model:',
      choices: models.map((model) => ({
        name: `${model.name} (${model.shortcut})`,
        value: model.id,
      })),
    });
  }

  return { provider: defaultProvider, model: defaultModel };
}

// ============================================================================
// CONFIGURATION REVIEW
// ============================================================================

function formatProviderConfig(config: ProviderSetupConfig): string {
  const lines: string[] = [];

  lines.push(chalk.cyan(`  ${config.name} (${config.key})`));

  if (config.apiKey) {
    const masked = config.apiKey.substring(0, 8) + '...' + config.apiKey.slice(-4);
    lines.push(`    API Key: ${chalk.gray(masked)}`);
  }

  if (config.customUrl) {
    lines.push(`    URL: ${chalk.gray(config.customUrl)}`);
  }

  if (config.validated) {
    lines.push(`    Status: ${chalk.green('✓ Validated')}`);
  } else {
    lines.push(`    Status: ${chalk.yellow('⚠ Not validated')}`);
  }

  return lines.join('\n');
}

export async function reviewAndConfirm(
  providerConfigs: ProviderSetupConfig[],
  defaults: { provider: string; model: string },
  currentConfig?: Config
): Promise<boolean> {
  printSection('Review Configuration');

  console.log(chalk.bold('Configured Providers:'));
  console.log('');

  for (const config of providerConfigs) {
    console.log(formatProviderConfig(config));
  }

  console.log('');
  console.log(chalk.bold('Defaults:'));
  console.log(`  ${chalk.cyan('Provider:')} ${defaults.provider}`);
  console.log(`  ${chalk.cyan('Model:')} ${defaults.model}`);
  console.log('');

  // Show file locations
  console.log(chalk.bold('Files to be created/updated:'));
  console.log(`  ${chalk.cyan('Config:')} ${getConfigPath()}`);
  console.log(`  ${chalk.cyan('Env:')} ${getEnvPath()}`);
  console.log('');

  const confirmed = await confirm({
    message: 'Save this configuration?',
    default: true,
  });

  return confirmed;
}

// ============================================================================
// CONFIGURATION SAVING
// ============================================================================

export function buildEnvVars(providerConfigs: ProviderSetupConfig[]): Record<string, string> {
  const envVars: Record<string, string> = {};

  for (const config of providerConfigs) {
    switch (config.key) {
      case 'openrouter':
        if (config.apiKey) {
          envVars.ANTHROPIC_BASE_URL = 'https://openrouter.ai/api';
          envVars.ANTHROPIC_AUTH_TOKEN = config.apiKey;
          envVars.OPEN_ROUTER_API_KEY = config.apiKey;
        }
        break;
      case 'ollama-cloud':
        if (config.apiKey) {
          envVars.OLLAMA_HOST = 'https://ollama.com';
          envVars.OLLAMA_API_KEY = config.apiKey;
        }
        break;
      case 'ollama-local':
        envVars.OLLAMA_BASE_URL_LOCAL = 'http://localhost:11434';
        break;
      case 'ollama-custom':
        if (config.customUrl && config.customUrl.trim()) {
          envVars.OLLAMA_BASE_URL_CUSTOM = config.customUrl;
        }
        break;
    }
  }

  return envVars;
}

export function formatEnvFile(envVars: Record<string, string>): string {
  const lines: string[] = [];

  lines.push('# claude-mode configuration');
  lines.push('# Generated by: claude-mode setup');
  lines.push(`# Date: ${new Date().toISOString()}`);
  lines.push('');

  // OpenRouter
  if (envVars.ANTHROPIC_BASE_URL || envVars.ANTHROPIC_AUTH_TOKEN) {
    lines.push('# OpenRouter');
    if (envVars.ANTHROPIC_BASE_URL) {
      lines.push(`ANTHROPIC_BASE_URL=${envVars.ANTHROPIC_BASE_URL}`);
    }
    if (envVars.ANTHROPIC_AUTH_TOKEN) {
      lines.push(`ANTHROPIC_AUTH_TOKEN=${envVars.ANTHROPIC_AUTH_TOKEN}`);
    }
    if (envVars.OPEN_ROUTER_API_KEY) {
      lines.push(`OPEN_ROUTER_API_KEY=${envVars.OPEN_ROUTER_API_KEY}`);
    }
    lines.push('');
  }

  // Ollama Cloud
  if (envVars.OLLAMA_HOST || envVars.OLLAMA_API_KEY) {
    lines.push('# Ollama Cloud');
    if (envVars.OLLAMA_HOST) {
      lines.push(`OLLAMA_HOST=${envVars.OLLAMA_HOST}`);
    }
    if (envVars.OLLAMA_API_KEY) {
      lines.push(`OLLAMA_API_KEY=${envVars.OLLAMA_API_KEY}`);
    }
    lines.push('');
  }

  // Ollama Local
  if (envVars.OLLAMA_BASE_URL_LOCAL) {
    lines.push('# Ollama Local');
    lines.push(`OLLAMA_BASE_URL_LOCAL=${envVars.OLLAMA_BASE_URL_LOCAL}`);
    lines.push('');
  }

  // Ollama Custom
  if (envVars.OLLAMA_BASE_URL_CUSTOM) {
    lines.push('# Ollama Custom');
    lines.push(`OLLAMA_BASE_URL_CUSTOM=${envVars.OLLAMA_BASE_URL_CUSTOM}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function mergeEnvFile(envVars: Record<string, string>, envPath?: string): void {
  const targetPath = getEnvPath(envPath);
  ensureEnvDirExists(targetPath);
  const existingVars = loadEnvFile(targetPath);

  // Merge new vars with existing (new vars take precedence)
  const merged = { ...existingVars, ...envVars };

  // Format as .env file
  const lines: string[] = [];

  lines.push('# claude-mode configuration');
  lines.push('# Generated by: claude-mode setup');
  lines.push(`# Date: ${new Date().toISOString()}`);
  lines.push('');

  // Add all merged vars
  for (const [key, value] of Object.entries(merged)) {
    if (!key.startsWith('_claude_mode_')) {
      lines.push(`${key}=${value}`);
    }
  }

  try {
    writeFileSync(targetPath, lines.join('\n') + '\n', 'utf-8');
  } catch (error) {
    const classified = classifyError(error);
    throw setupEnvWriteError(classified.message, classified.hint);
  }
}

export function saveEnvFile(envVars: Record<string, string>, envPath?: string): void {
  const targetPath = getEnvPath(envPath);
  ensureEnvDirExists(targetPath);

  try {
    const content = formatEnvFile(envVars);
    writeFileSync(targetPath, content + '\n', 'utf-8');
  } catch (error) {
    const classified = classifyError(error);
    throw setupEnvWriteError(classified.message, classified.hint);
  }
}

export function loadEnvFile(envPath?: string): Record<string, string> {
  const targetPath = getEnvPath(envPath);

  if (!existsSync(targetPath)) {
    return {};
  }

  try {
    const content = readFileSync(targetPath, 'utf-8');
    const vars: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        vars[key] = value;
      }
    }
    return vars;
  } catch {
    return {};
  }
}

export function saveConfiguration(
  providerConfigs: ProviderSetupConfig[],
  defaults: { provider: string; model: string },
  currentConfig?: Config
): void {
  const envVars = buildEnvVars(providerConfigs);
  let config: Config = currentConfig || loadConfig();

  config.defaultProvider = defaults.provider;
  config.defaultModel = defaults.model;
  config.configuredProviders = providerConfigs.map((c) => c.key);

  try {
    const configDir = getConfigDir();
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    const configPath = getConfigPath();
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    const classified = classifyError(error);
    throw setupConfigWriteError(classified.message, classified.hint);
  }

  if (existsSync(getEnvPath())) {
    mergeEnvFile(envVars);
  } else {
    saveEnvFile(envVars);
  }
}

// ============================================================================
// SUCCESS DISPLAY
// ============================================================================

export function displaySuccess(
  providerConfigs: ProviderSetupConfig[],
  defaults: { provider: string; model: string }
): void {
  console.clear();
  printHeader('Setup Complete!');

  console.log(chalk.green('✓') + ' Configuration saved successfully!');
  console.log('');

  console.log(chalk.bold('Configured Providers:'));
  for (const config of providerConfigs) {
    const status = config.validated ? chalk.green('✓') : chalk.yellow('⚠');
    console.log(`  ${status} ${config.name}`);
  }
  console.log('');

  console.log(chalk.bold('Default Configuration:'));
  console.log(`  Provider: ${chalk.cyan(defaults.provider)}`);
  console.log(`  Model: ${chalk.cyan(defaults.model)}`);
  console.log('');

  console.log(chalk.bold('Next Steps:'));
  console.log('  Run ' + chalk.cyan('claude-mode') + ' to start using Claude Code');
  console.log('  Run ' + chalk.cyan('claude-mode --list') + ' to see all available models');
  console.log('  Run ' + chalk.cyan('claude-mode -p "your prompt"') + ' for headless mode');
  console.log('');

  console.log(chalk.gray('Configuration files:'));
  console.log(chalk.gray(`  Config: ${getConfigPath()}`));
  console.log(chalk.gray(`  Env: ${getEnvPath()}`));
  console.log('');
}

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

export async function runSetup(options: SetupOptions = {}): Promise<void> {
  try {
    const { force = false, provider: forceProvider, skipValidation = false } = options;
    const status = detectSetupStatus();
    const isFirstTime = status === 'first-time';

    if (!force && !isFirstTime) {
      const shouldContinue = await displayUpdatePrompt();
      if (!shouldContinue) return;
    }

    await displayWelcome(isFirstTime);
    const providerKeys = await selectProviders(forceProvider);
    const providerConfigs: ProviderSetupConfig[] = [];
    const currentConfig = loadConfig();

    for (const providerKey of providerKeys) {
      try {
        const cfg = await configureProvider(providerKey, skipValidation);
        providerConfigs.push(cfg);
      } catch (error) {
        console.log('');
        const msg = error instanceof Error ? error.message : String(error);
        console.log(chalk.yellow(`Failed to configure ${providerKey}: ${msg}`));
        const cont = await confirm({ message: 'Continue with remaining providers?', default: true });
        if (!cont) throw setupCancelledError();
      }
    }

    if (providerConfigs.length === 0) throw setupIncompleteError('No providers were configured');

    let currentDefaults;
    if (currentConfig.defaultProvider && currentConfig.defaultModel) {
      currentDefaults = { provider: currentConfig.defaultProvider, model: currentConfig.defaultModel };
    }

    const defaults = await selectDefaults(providerConfigs.map(c => c.key), currentDefaults);
    const confirmed = await reviewAndConfirm(providerConfigs, defaults, currentConfig);
    if (!confirmed) throw setupCancelledError();

    console.log('');
    console.log(chalk.gray('Saving configuration...'));
    saveConfiguration(providerConfigs, defaults, currentConfig);
    displaySuccess(providerConfigs, defaults);
  } catch (error) {
    const classified = classifyError(error);
    if (classified.message === 'Setup cancelled') {
      console.log('');
      console.log(chalk.yellow('Setup cancelled.'));
      console.log('Run ' + chalk.cyan('claude-mode setup') + ' to try again.');
      console.log('');
      return;
    }
    console.log('');
    console.log(chalk.red('Setup failed:'));
    printError(classified);
    console.log('');
    console.log(chalk.gray('You can run ' + chalk.cyan('claude-mode setup') + ' to try again.'));
    console.log('');
    process.exit(1);
  }
}
