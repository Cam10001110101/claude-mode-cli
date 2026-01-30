#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import { spawn, execSync } from 'child_process';
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
  getProviders,
  checkAllProvidersHealth,
  type Provider,
  type Model,
  type HealthCheckResult,
} from './providers.js';

import {
  loadConfig,
  getConfig,
  initConfig,
} from './config.js';

import {
  claudeNotFoundError,
  printError,
  classifyError,
} from './errors.js';

// Load .env from current directory
config();

// Also try to load from script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '..', '.env') });

const program = new Command();

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
  console.log(chalk.cyan('Base URL:') + ' ' + provider.getBaseUrl());
  console.log(chalk.cyan('Mode:') + ' ' + mode);
  console.log('');
}

// ============================================================================
// CLAUDE CLI VALIDATION
// ============================================================================

function isClaudeInstalled(): boolean {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch {
    // Try 'where' on Windows
    try {
      execSync('where claude', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

function validateClaudeCLI(): void {
  if (!isClaudeInstalled()) {
    printError(claudeNotFoundError());
    process.exit(1);
  }
}

// ============================================================================
// RUN CLAUDE
// ============================================================================

async function runClaude(
  provider: Provider,
  modelId: string,
  headless: boolean,
  skipPermissions: boolean,
  prompt?: string
): Promise<void> {
  // Validate claude is installed
  validateClaudeCLI();

  const baseUrl = provider.getBaseUrl();

  // Set environment variables
  process.env.ANTHROPIC_BASE_URL = baseUrl;
  process.env.ANTHROPIC_AUTH_TOKEN = provider.getAuthToken();
  process.env.ANTHROPIC_API_KEY = '';

  // Build command arguments
  const args: string[] = ['--model', modelId];

  if (skipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  if (headless && prompt) {
    args.push('-p', prompt);
    const allowedTools = getConfig('headlessAllowedTools');
    if (allowedTools) {
      args.push('--allowedTools', allowedTools);
    }
  }

  // Spawn claude process
  const claude = spawn('claude', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ANTHROPIC_BASE_URL: baseUrl,
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
      const classified = classifyError(err);
      printError(classified);
      reject(err);
    });
  });
}

// ============================================================================
// HEALTH CHECK DISPLAY
// ============================================================================

function formatHealthStatus(result: HealthCheckResult): string {
  const allProviders = getProviders();
  const provider = allProviders[result.provider];
  const name = provider?.name || result.provider;

  if (result.healthy) {
    const latency = result.latencyMs ? ` (${result.latencyMs}ms)` : '';
    return `${chalk.green('✓')} ${name}${chalk.gray(latency)}`;
  } else {
    const error = result.error?.message || 'unavailable';
    return `${chalk.red('✗')} ${name} ${chalk.gray(`- ${error}`)}`;
  }
}

async function displayHealthCheck(): Promise<void> {
  const skipHealthCheck = getConfig('skipHealthCheck');
  if (skipHealthCheck) return;

  console.log(chalk.gray('Checking provider availability...'));

  const results = await checkAllProvidersHealth();

  console.log('');
  for (const result of results) {
    console.log('  ' + formatHealthStatus(result));
  }
  console.log('');
}

// ============================================================================
// INTERACTIVE MODE
// ============================================================================

async function interactiveMode(skipPermissions: boolean): Promise<void> {
  console.clear();
  printHeader('Claude Mode');

  // Show health check
  await displayHealthCheck();

  // Get all providers
  const allProviders = getProviders();

  // Select provider
  const providerKey = await select({
    message: 'Select Provider:',
    choices: getProviderKeys().map((key) => ({
      name: allProviders[key].name,
      value: key,
      description: allProviders[key].getDescription(),
    })),
  });

  const provider = getProvider(providerKey)!;
  console.log(chalk.yellow('→ Selected:') + ' ' + provider.name);

  // Select model
  const providerModels = await getModels(providerKey);

  if (providerModels.length === 0) {
    console.log(chalk.yellow('No models available for this provider.'));
    console.log(chalk.gray('You can enter a model ID manually.'));

    const modelId = await input({
      message: 'Enter model ID:',
      validate: (value) => (value.length > 0 ? true : 'Model ID cannot be empty'),
    });

    console.log(chalk.yellow('→ Model:') + ' ' + modelId);

    // Continue with manual model
    await continueInteractiveMode(provider, modelId, skipPermissions);
    return;
  }

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

  await continueInteractiveMode(provider, modelId, skipPermissions);
}

async function continueInteractiveMode(
  provider: Provider,
  modelId: string,
  skipPermissions: boolean
): Promise<void> {
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

  // Ask about skipping permissions (only if not already set via CLI flag)
  if (!skipPermissions) {
    skipPermissions = await select({
      message: 'Skip permission prompts when executing commands?',
      choices: [
        { name: 'No (ask for permission)', value: false },
        { name: 'Yes (skip all prompts)', value: true },
      ],
    });
  }
  console.log(
    chalk.yellow('→ Skip permissions:') +
      ' ' +
      (skipPermissions ? chalk.red('Yes (⚠️ auto-approve)') : chalk.green('No (ask)'))
  );

  // Execute
  const isHeadless = mode === 'headless';
  if (isHeadless) {
    printHeader('Executing Claude Code (Headless)');
  } else {
    printHeader('Launching Claude Code (Interactive)');
  }

  printConfig(provider, modelId, isHeadless ? 'Headless' : 'Interactive');

  try {
    await runClaude(provider, modelId, isHeadless, skipPermissions, prompt);
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
  skipPermissions: boolean,
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
  const modelId = await resolveModel(providerKey, modelArg);

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
    await runClaude(provider, modelId, isHeadless, skipPermissions, prompt);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// ============================================================================
// LIST COMMAND
// ============================================================================

async function listModels(): Promise<void> {
  console.log(chalk.bold('\nAvailable Models by Provider:\n'));

  const allProviders = getProviders();

  for (const providerKey of getProviderKeys()) {
    const provider = allProviders[providerKey];

    // Get models (dynamic for Ollama, static for others)
    const providerModels = await getModels(providerKey);

    console.log(chalk.cyan(`${provider.name}:`));
    console.log(chalk.gray(`  ${provider.getDescription()}`));

    if (providerModels.length === 0) {
      console.log(`  ${chalk.gray('(no models found)')}`);
    } else {
      for (const model of providerModels) {
        console.log(`  ${chalk.green(model.shortcut.padEnd(14))} → ${model.id}`);
      }
    }
    console.log('');
  }
}

// ============================================================================
// CONFIG COMMAND
// ============================================================================

function showConfig(): void {
  const config = loadConfig();
  console.log(chalk.bold('\nCurrent Configuration:\n'));
  console.log(JSON.stringify(config, null, 2));
  console.log('');
}

function initConfigCommand(): void {
  const configPath = initConfig();
  console.log(chalk.green(`Config file created at: ${configPath}`));
  console.log(chalk.gray('Edit this file to customize your settings.'));
}

// ============================================================================
// SHELL COMPLETIONS
// ============================================================================

function generateBashCompletion(): string {
  const providerKeys = getProviderKeys();
  const providerAliases = ['or', 'open', 'oc', 'cloud', 'ol', 'local', 'custom', 'remote'];
  const allProviders = [...providerKeys, ...providerAliases].join(' ');

  const modeOptions = 'terminal t interactive i headless h prompt p';

  return `# claude-mode bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   eval "$(claude-mode completion bash)"

_claude_mode_completions() {
    local cur prev
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # First argument: provider or option
    if [[ \${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "${allProviders} --list --help --prompt -l -p" -- "\${cur}") )
        return 0
    fi

    # Second argument: model (depends on provider, show generic)
    if [[ \${COMP_CWORD} -eq 2 ]]; then
        # For now, just show common shortcuts
        COMPREPLY=( $(compgen -W "sonnet haiku opus gpt120 glm47 deepseek" -- "\${cur}") )
        return 0
    fi

    # Third argument: mode
    if [[ \${COMP_CWORD} -eq 3 ]]; then
        COMPREPLY=( $(compgen -W "${modeOptions}" -- "\${cur}") )
        return 0
    fi
}

complete -F _claude_mode_completions claude-mode
`;
}

function generateZshCompletion(): string {
  const providerKeys = getProviderKeys();

  return `#compdef claude-mode
# claude-mode zsh completion
# Add to ~/.zshrc:
#   eval "$(claude-mode completion zsh)"

_claude_mode() {
    local -a providers modes

    providers=(
        'openrouter:OpenRouter API'
        'ollama-cloud:Ollama Cloud'
        'ollama-local:Ollama Local'
        'ollama-custom:Ollama Custom'
        'or:OpenRouter (alias)'
        'oc:Ollama Cloud (alias)'
        'ol:Ollama Local (alias)'
        'custom:Ollama Custom (alias)'
    )

    modes=(
        'terminal:Interactive terminal mode'
        't:Interactive terminal mode (alias)'
        'interactive:Interactive terminal mode (alias)'
        'i:Interactive terminal mode (alias)'
        'headless:Single prompt execution'
        'h:Single prompt execution (alias)'
        'prompt:Single prompt execution (alias)'
        'p:Single prompt execution (alias)'
    )

    case \$CURRENT in
        2)
            _describe 'provider' providers
            _arguments '--list[List all models]' '--help[Show help]' '--prompt[Headless mode with prompt]' '-l[List all models]' '-p[Headless mode with prompt]'
            ;;
        3)
            _message 'model shortcut or ID'
            ;;
        4)
            _describe 'mode' modes
            ;;
        5)
            _message 'prompt (for headless mode)'
            ;;
    esac
}

_claude_mode "\$@"
`;
}

function generateFishCompletion(): string {
  return `# claude-mode fish completion
# Add to ~/.config/fish/completions/claude-mode.fish

# Providers
complete -c claude-mode -n "__fish_is_first_arg" -a "openrouter" -d "OpenRouter API"
complete -c claude-mode -n "__fish_is_first_arg" -a "ollama-cloud" -d "Ollama Cloud"
complete -c claude-mode -n "__fish_is_first_arg" -a "ollama-local" -d "Ollama Local"
complete -c claude-mode -n "__fish_is_first_arg" -a "ollama-custom" -d "Ollama Custom"
complete -c claude-mode -n "__fish_is_first_arg" -a "or" -d "OpenRouter (alias)"
complete -c claude-mode -n "__fish_is_first_arg" -a "oc" -d "Ollama Cloud (alias)"
complete -c claude-mode -n "__fish_is_first_arg" -a "ol" -d "Ollama Local (alias)"
complete -c claude-mode -n "__fish_is_first_arg" -a "custom" -d "Ollama Custom (alias)"

# Options
complete -c claude-mode -s l -l list -d "List all models"
complete -c claude-mode -s p -l prompt -d "Headless mode with prompt"
complete -c claude-mode -s d -l dangerously-skip-permissions -d "Skip permission prompts"

# Modes (third argument)
complete -c claude-mode -n "__fish_seen_argument" -a "terminal t interactive i" -d "Interactive mode"
complete -c claude-mode -n "__fish_seen_argument" -a "headless h prompt p" -d "Headless mode"
`;
}

function printCompletion(shell: string): void {
  switch (shell) {
    case 'bash':
      console.log(generateBashCompletion());
      break;
    case 'zsh':
      console.log(generateZshCompletion());
      break;
    case 'fish':
      console.log(generateFishCompletion());
      break;
    default:
      console.error(chalk.red(`Unknown shell: ${shell}`));
      console.log(chalk.gray('Supported shells: bash, zsh, fish'));
      process.exit(1);
  }
}

// ============================================================================
// HEALTH COMMAND
// ============================================================================

async function healthCommand(): Promise<void> {
  console.log(chalk.bold('\nProvider Health Check:\n'));

  const results = await checkAllProvidersHealth();

  for (const result of results) {
    console.log('  ' + formatHealthStatus(result));
  }

  console.log('');

  const healthy = results.filter((r) => r.healthy).length;
  const total = results.length;

  if (healthy === total) {
    console.log(chalk.green(`All ${total} providers are healthy.`));
  } else {
    console.log(chalk.yellow(`${healthy}/${total} providers are healthy.`));
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
  openrouter        OpenRouter API
  ollama-cloud      Ollama Cloud (OLLAMA_HOST)
  ollama-local      Ollama Local (OLLAMA_BASE_URL_LOCAL)
  ollama-custom     Ollama Custom (OLLAMA_BASE_URL_CUSTOM)

${chalk.bold('Model shortcuts:')}
  OpenRouter (Premium): gpt52, gpt52-pro, gpt52-codex, opus, grok
  OpenRouter (Value): deepseek, zai-glm47-flash, seed16, sonnet, haiku
  OpenRouter (Existing): gpt120, glm47, gemini-pro, gemini-flash
  Ollama: Models discovered dynamically via API

${chalk.bold('Mode shortcuts:')}
  terminal, t, interactive, i  - Interactive terminal mode
  headless, h, prompt, p       - Headless mode with prompt

${chalk.bold('Options:')}
  -p, --prompt <prompt>               Headless mode (uses defaults if provider/model not set)
  -d, --dangerously-skip-permissions  Skip permission prompts (⚠️ use with caution)

${chalk.bold('Default Provider/Model:')}
  Set in ~/.claude-mode/claude-mode.json:
    { "defaultProvider": "openrouter", "defaultModel": "sonnet" }

${chalk.bold('Examples:')}
  claude-mode                                    Interactive menu
  claude-mode -p "perform a code review"         Headless with default provider/model
  claude-mode openrouter sonnet                  Interactive with Claude Sonnet
  claude-mode or sonnet -p "list files"          Headless with specified provider/model
  claude-mode ollama-local qwen3 h "list files"  Headless with local Qwen3 (legacy syntax)
  claude-mode --dangerously-skip-permissions     Skip all permission prompts
  claude-mode --list                             List all available models
  claude-mode health                             Check provider availability
  claude-mode config init                        Create config file
  claude-mode completion bash                    Generate shell completions
`
  )
  .version('1.2.0');

// List command
program
  .command('list')
  .description('List all available providers and models')
  .action(async () => {
    await listModels();
  });

// Health command
program
  .command('health')
  .description('Check health/availability of all providers')
  .action(async () => {
    await healthCommand();
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action: show, init')
  .action((action) => {
    switch (action) {
      case 'init':
        initConfigCommand();
        break;
      case 'show':
      default:
        showConfig();
        break;
    }
  });

// Completion command
program
  .command('completion')
  .description('Generate shell completion scripts')
  .argument('<shell>', 'Shell type: bash, zsh, fish')
  .action((shell) => {
    printCompletion(shell);
  });

// Main command
program
  .option('-d, --dangerously-skip-permissions', 'Skip permission prompts when executing commands')
  .option('-l, --list', 'List all available providers and models')
  .option('-p, --prompt <prompt>', 'Run in headless mode with the given prompt (uses defaults if provider/model not specified)')
  .argument('[provider]', 'Provider (openrouter, ollama-cloud, ollama-local, ollama-custom)')
  .argument('[model]', 'Model ID or shortcut')
  .argument('[mode]', 'Mode (terminal/t, headless/h) or prompt for headless')
  .argument('[promptArg]', 'Prompt for headless mode')
  .action(async (provider, model, mode, promptArg, options) => {
    if (options.list) {
      await listModels();
      return;
    }

    const skipPermissions = options.dangerouslySkipPermissions || false;

    // If -p flag is used, run in headless mode
    if (options.prompt) {
      // Use provided provider/model or fall back to defaults from config
      const defaultProvider = getConfig('defaultProvider');
      const defaultModel = getConfig('defaultModel');

      const effectiveProvider = provider || defaultProvider;
      const effectiveModel = model || defaultModel;

      if (!effectiveProvider || !effectiveModel) {
        console.error(chalk.red('Error: Provider and model are required'));
        if (!effectiveProvider && !effectiveModel) {
          console.log(chalk.gray('Set defaults in config: claude-mode config init'));
          console.log(chalk.gray('Then edit ~/.claude-mode/claude-mode.json to set defaultProvider and defaultModel'));
        } else if (!effectiveProvider) {
          console.log(chalk.gray('Missing: provider (set defaultProvider in config or pass as argument)'));
        } else {
          console.log(chalk.gray('Missing: model (set defaultModel in config or pass as argument)'));
        }
        process.exit(1);
      }

      await quickMode(effectiveProvider, effectiveModel, skipPermissions, 'headless', options.prompt);
      return;
    }

    if (!provider) {
      await interactiveMode(skipPermissions);
    } else if (!model) {
      // Check if we have a default model we can use
      const defaultModel = getConfig('defaultModel');
      if (defaultModel) {
        await quickMode(provider, defaultModel, skipPermissions, mode, promptArg);
      } else {
        console.error(chalk.red('Error: Model is required when provider is specified'));
        console.log(chalk.gray('Usage: claude-mode <provider> <model> [mode] [prompt]'));
        console.log(chalk.gray('Or set defaultModel in ~/.claude-mode/claude-mode.json'));
        console.log(chalk.gray('Run claude-mode --list to see available models'));
        process.exit(1);
      }
    } else {
      await quickMode(provider, model, skipPermissions, mode, promptArg);
    }
  });

program.parse();
