#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import { spawn } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import {
  providers,
  models,
  resolveProvider,
  resolveModel,
  getProvider,
  getModels,
  getProviderKeys,
  type Provider,
  type Model,
} from './providers.js';

// Load .env from current directory
config();

// Also try to load from script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });

const program = new Command();

// Default allowed tools for headless mode
const ALLOWED_TOOLS = 'Read,Edit,Write,Bash,Glob,Grep';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function printHeader(text: string): void {
  console.log('');
  console.log(chalk.bold.blue('╔════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║') + '  ' + chalk.cyan(text));
  console.log(chalk.bold.blue('╚════════════════════════════════════════╝'));
  console.log('');
}

function printConfig(provider: Provider, modelId: string, mode: string): void {
  console.log(chalk.cyan('Provider:') + ' ' + provider.name);
  console.log(chalk.cyan('Model:') + ' ' + modelId);
  console.log(chalk.cyan('Base URL:') + ' ' + provider.baseUrl);
  console.log(chalk.cyan('Mode:') + ' ' + mode);
  console.log('');
}

async function runClaude(
  provider: Provider,
  modelId: string,
  headless: boolean,
  prompt?: string
): Promise<void> {
  // Set environment variables
  process.env.ANTHROPIC_BASE_URL = provider.baseUrl;
  process.env.ANTHROPIC_AUTH_TOKEN = provider.getAuthToken();
  process.env.ANTHROPIC_API_KEY = '';

  // Build command arguments
  const args: string[] = ['--model', modelId];

  if (headless && prompt) {
    args.push('-p', prompt, '--allowedTools', ALLOWED_TOOLS);
  }

  // Spawn claude process
  const claude = spawn('claude', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ANTHROPIC_BASE_URL: provider.baseUrl,
      ANTHROPIC_AUTH_TOKEN: provider.getAuthToken(),
      ANTHROPIC_API_KEY: '',
    },
  });

  return new Promise((resolve, reject) => {
    claude.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Claude exited with code ${code}`));
      }
    });
    claude.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// INTERACTIVE MODE
// ============================================================================

async function interactiveMode(): Promise<void> {
  console.clear();
  printHeader('Claude Mode');

  // Select provider
  const providerKey = await select({
    message: 'Select Provider:',
    choices: getProviderKeys().map((key) => ({
      name: providers[key].name,
      value: key,
      description: providers[key].description,
    })),
  });

  const provider = getProvider(providerKey)!;
  console.log(chalk.yellow('→ Selected:') + ' ' + provider.name);

  // Select model
  const providerModels = getModels(providerKey);
  const modelId = await select({
    message: 'Select Model:',
    choices: providerModels.map((model) => ({
      name: model.name,
      value: model.id,
      description: model.shortcut,
    })),
  });

  const selectedModel = providerModels.find((m) => m.id === modelId);
  console.log(chalk.yellow('→ Selected:') + ' ' + selectedModel?.name + ` (${modelId})`);

  // Select mode
  const mode = await select({
    message: 'Select Mode:',
    choices: [
      { name: 'Terminal (interactive)', value: 'terminal' },
      { name: 'Headless (single prompt)', value: 'headless' },
    ],
  });

  let prompt: string | undefined;
  if (mode === 'headless') {
    prompt = await input({
      message: 'Enter your prompt:',
      validate: (value) => (value.length > 0 ? true : 'Prompt cannot be empty'),
    });
  }

  // Execute
  const isHeadless = mode === 'headless';
  if (isHeadless) {
    printHeader('Executing Claude Code (Headless)');
  } else {
    printHeader('Launching Claude Code (Interactive)');
  }

  printConfig(provider, modelId, isHeadless ? 'Headless' : 'Interactive');

  try {
    await runClaude(provider, modelId, isHeadless, prompt);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// ============================================================================
// QUICK MODE
// ============================================================================

async function quickMode(
  providerArg: string,
  modelArg: string,
  modeArg?: string,
  promptArg?: string
): Promise<void> {
  // Resolve provider
  const providerKey = resolveProvider(providerArg);
  const provider = getProvider(providerKey);

  if (!provider) {
    console.error(chalk.red(`Unknown provider: ${providerArg}`));
    console.log(chalk.gray('Available providers: ' + getProviderKeys().join(', ')));
    process.exit(1);
  }

  // Resolve model
  const modelId = resolveModel(providerKey, modelArg);

  // Determine mode
  let isHeadless = false;
  let prompt = promptArg;

  if (modeArg) {
    const modeAliases: Record<string, boolean> = {
      terminal: false,
      t: false,
      interactive: false,
      i: false,
      headless: true,
      h: true,
      prompt: true,
      p: true,
    };

    if (modeArg in modeAliases) {
      isHeadless = modeAliases[modeArg];
    } else {
      // Treat modeArg as the prompt
      isHeadless = true;
      prompt = modeArg;
    }
  }

  // If headless but no prompt, ask for it
  if (isHeadless && !prompt) {
    prompt = await input({
      message: 'Enter your prompt:',
      validate: (value) => (value.length > 0 ? true : 'Prompt cannot be empty'),
    });
  }

  // Print config
  printConfig(provider, modelId, isHeadless ? 'Headless' : 'Interactive');

  try {
    await runClaude(provider, modelId, isHeadless, prompt);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// ============================================================================
// LIST COMMAND
// ============================================================================

function listModels(): void {
  console.log(chalk.bold('\nAvailable Models by Provider:\n'));

  for (const providerKey of getProviderKeys()) {
    const provider = providers[providerKey];
    const providerModels = models[providerKey];

    console.log(chalk.cyan(`${provider.name}:`));
    for (const model of providerModels) {
      console.log(`  ${chalk.green(model.shortcut.padEnd(14))} → ${model.id}`);
    }
    console.log('');
  }
}

// ============================================================================
// PROGRAM SETUP
// ============================================================================

program
  .name('claude-mode')
  .description(
    `
${chalk.bold('Claude Mode')} - Launch Claude Code with different providers

${chalk.bold('Providers:')}
  openrouter        OpenRouter API (Claude, Gemini, GPT-OSS, GLM)
  ollama-cloud      Ollama Cloud
  ollama-local      Ollama Local (localhost:11434)
  ollama-custom     Ollama Custom (192.168.86.101:11434)

${chalk.bold('Model shortcuts:')}
  OpenRouter: sonnet, haiku, gpt120, glm47, gemini-pro, gemini-flash
  Ollama Cloud: gpt120, glm47, deepseek, minimax
  Ollama Local/Custom: gpt20, qwen3, qwen14, llama, glm47-cloud

${chalk.bold('Mode shortcuts:')}
  terminal, t, interactive, i  - Interactive terminal mode
  headless, h, prompt, p       - Headless mode with prompt

${chalk.bold('Examples:')}
  claude-mode                                    Interactive menu
  claude-mode openrouter sonnet                  Interactive with Claude Sonnet
  claude-mode ollama-local qwen3 h "list files"  Headless with local Qwen3
  claude-mode --list                             List all available models
`
  )
  .version('1.0.0');

program
  .command('list', { isDefault: false })
  .description('List all available providers and models')
  .action(() => {
    listModels();
  });

program
  .option('-l, --list', 'List all available providers and models')
  .argument('[provider]', 'Provider (openrouter, ollama-cloud, ollama-local, ollama-custom)')
  .argument('[model]', 'Model ID or shortcut')
  .argument('[mode]', 'Mode (terminal/t, headless/h) or prompt for headless')
  .argument('[prompt]', 'Prompt for headless mode')
  .action(async (provider, model, mode, prompt, options) => {
    if (options.list) {
      listModels();
      return;
    }

    if (!provider) {
      await interactiveMode();
    } else if (!model) {
      console.error(chalk.red('Error: Model is required when provider is specified'));
      console.log(chalk.gray('Usage: claude-mode <provider> <model> [mode] [prompt]'));
      console.log(chalk.gray('Run claude-mode --list to see available models'));
      process.exit(1);
    } else {
      await quickMode(provider, model, mode, prompt);
    }
  });

program.parse();
