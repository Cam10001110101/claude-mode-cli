# Advanced Model Configuration Design

**Date:** 2026-01-30
**Status:** Design Complete

## Overview

Add an interactive menu option to configure each Claude Code model type (Opus, Sonnet, Haiku, Subagent) with different providers and models. The design preserves the existing simple behavior while adding an "Advanced Configuration" path for power users who want to mix providers/models for cost, speed, or performance optimization.

## Goals

- Allow per-model-type provider/model configuration
- Preserve existing simple behavior for most users
- Support saving and reusing advanced configurations
- Clear separation between interactive mode (uses config) and CLI mode (uses arguments)

## Design

### 1. Main Menu Structure

```
Claude Mode Main Menu
├─ Quick Launch (default)
│  ├─ Select Provider
│  ├─ Select Model
│  └─ Launch (uses same model for all 4 types)
└─ Advanced Configuration
   ├─ Configure Opus Model
   ├─ Configure Sonnet Model
   ├─ Configure Haiku Model
   └─ Configure Subagent Model
```

**Key points:**
- Health check shows at top as before
- "Quick Launch" is the default (first option)
- Advanced Configuration is a dedicated flow for power users
- When advanced config exists, Quick Launch skips prompts and uses saved settings

### 2. Quick Launch Flow

**No advanced config:**
- Prompt for provider selection
- Prompt for model selection
- Apply same model to all four model types
- Proceed to mode selection (Terminal/Headless)

**With advanced config:**
- Display summary of saved configuration
- Skip provider/model prompts
- Proceed directly to mode selection

### 3. Advanced Configuration Flow

For each of the four model types (Opus, Sonnet, Haiku, Subagent):

1. Select provider for this type
2. Select model from that provider's available models
3. Display confirmation (e.g., "→ Sonnet: Ollama Local / qwen3:4b")

**Features:**
- "Use same as [previous]" option after first model is configured
- Ability to go back and change previous selections
- Summary screen before saving

### 4. Configuration Summary

After all four models are configured:

```
Configuration Summary
─────────────────────
Opus Model:     OpenRouter / anthropic/claude-opus-4.5
Sonnet Model:   Ollama Local / qwen3:4b
Haiku Model:    Ollama Local / glm-4.7-flash:latest
Subagent Model: Ollama Local / qwen3:4b

Save this configuration?
  → Yes, save and return to main menu
    No, discard and return to main menu
```

### 5. Config File Structure

```json
{
  "defaultProvider": "openrouter",
  "defaultModel": "anthropic/claude-sonnet-4.5",

  "modelTypes": {
    "opus": {
      "provider": "openrouter",
      "model": "anthropic/claude-opus-4.5"
    },
    "sonnet": {
      "provider": "ollama-local",
      "model": "qwen3:4b"
    },
    "haiku": {
      "provider": "ollama-local",
      "model": "glm-4.7-flash:latest"
    },
    "subagent": {
      "provider": "ollama-local",
      "model": "qwen3:4b"
    }
  }
}
```

**Notes:**
- Existing `defaultProvider`/`defaultModel` remain for backward compatibility
- `modelTypes` section is optional
- Individual type configs are optional (allow partial configuration)

### 6. Environment Variable Application

When launching Claude Code, set environment variables based on configuration:

```typescript
ANTHROPIC_DEFAULT_OPUS_MODEL = config.modelTypes.opus?.model || defaultModel
ANTHROPIC_DEFAULT_SONNET_MODEL = config.modelTypes.sonnet?.model || defaultModel
ANTHROPIC_DEFAULT_HAIKU_MODEL = config.modelTypes.haiku?.model || defaultModel
CLAUDE_CODE_SUBAGENT_MODEL = config.modelTypes.subagent?.model || defaultModel
```

**Constraint (initial implementation):**
- All model types must use the same provider
- This simplifies auth (single `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`)
- Multi-provider support can be added in future if needed

### 7. New CLI Command

```bash
claude-mode configure
```

Directly enters the Advanced Configuration flow, bypassing the main menu. Useful for one-time setup followed by repeated quick launches.

### 8. Type Definitions

```typescript
export interface ModelTypeConfig {
  provider: string;
  model: string;
}

export interface Config {
  // Existing fields
  defaultProvider?: string;
  defaultModel?: string;
  modelDiscoveryTimeout?: number;
  healthCheckTimeout?: number;
  cacheTTL?: number;
  customProviders?: CustomProvider[];
  skipHealthCheck?: boolean;
  offlineMode?: boolean;
  headlessAllowedTools?: string;

  // New: Per-model-type configuration
  modelTypes?: {
    opus?: ModelTypeConfig;
    sonnet?: ModelTypeConfig;
    haiku?: ModelTypeConfig;
    subagent?: ModelTypeConfig;
  };
}
```

### 9. New Helper Functions

```typescript
// Check if advanced config exists
export function hasAdvancedModelConfig(): boolean;

// Get config for a specific model type
export function getModelTypeConfig(
  type: 'opus' | 'sonnet' | 'haiku' | 'subagent'
): ModelTypeConfig | null;

// Set config for a specific model type
export function setModelTypeConfig(
  type: string,
  provider: string,
  model: string
): void;

// Clear all model type configs
export function clearModelTypeConfigs(): void;
```

### 10. Interactive Mode Structure

```typescript
async function interactiveMode(skipPermissions: boolean): Promise<void> {
  // Show health check
  await displayHealthCheck();

  // Main menu: Quick Launch vs Advanced Configuration
  const action = await select({
    message: 'Select Action:',
    choices: [
      {
        name: hasAdvancedModelConfig()
          ? 'Quick Launch (using saved config)'
          : 'Quick Launch',
        value: 'quick',
        description: hasAdvancedModelConfig()
          ? 'Launch with configured models'
          : 'Select one provider/model for all types',
      },
      {
        name: 'Advanced Configuration',
        value: 'advanced',
        description: 'Configure each model type separately',
      },
    ],
  });

  if (action === 'quick') {
    if (hasAdvancedModelConfig()) {
      await launchWithAdvancedConfig(skipPermissions);
    } else {
      await quickLaunch(skipPermissions);
    }
  } else {
    await advancedConfiguration(skipPermissions);
  }
}
```

**New functions:**
- `quickLaunch()` - Existing provider/model selection flow
- `advancedConfiguration()` - Per-model-type configuration flow
- `launchWithAdvancedConfig()` - Summary display then proceed to mode selection

### 11. Error Handling

**Provider unavailability:**
- Show warning but allow proceeding
- Offer to reconfigure that specific model type

**Model not found:**
- Prompt to select a replacement from available models
- Graceful fallback to provider's model list

**Partial config:**
- Unconfigured types fall back to `defaultProvider`/`defaultModel`
- Show which types are using defaults in the summary

**Config validation:**
- Validate provider keys exist in the provider registry
- Validate model IDs are non-empty strings
- On invalid config, show error and prompt to reconfigure

**CLI mode interaction:**
- Quick mode (`claude-mode provider model`) ignores advanced config
- Forces single provider/model as explicitly requested
- Clear separation: interactive uses config, CLI uses arguments

### 12. Files to Modify

| File | Changes |
|------|---------|
| `src/index.ts` | New menu structure, flows, and helper functions |
| `src/config.ts` | New types and helper functions for model types |
| `src/index.test.ts` | New tests for interactive flows (create this file) |

### 13. Testing Strategy

**Unit tests:**
- `hasAdvancedModelConfig()` - test with/without `modelTypes`
- `getModelTypeConfig()` - test retrieval and null cases
- `setModelTypeConfig()` - test saving and updating

**Integration tests:**
- Mock `@inquirer/prompts` to simulate user selections
- Test quick launch path (no advanced config)
- Test quick launch path (with saved advanced config)
- Test advanced configuration flow
- Test partial config handling

**Config file tests:**
- Test loading config with `modelTypes` section
- Test saving and reloading per-model-type configs
- Test config validation and error cases

**Environment variable tests:**
- Mock `spawn` and verify correct env vars are set
- Test that all four model type env vars are populated correctly
- Test fallback behavior when config is incomplete

**Edge case tests:**
- Unhealthy provider in saved config
- Saved model no longer available
- Invalid config (bad provider key, empty model ID)
- Partial config (only some types configured)

## Breaking Changes

None - existing behavior is preserved under Quick Launch.

## Future Enhancements

- Multi-provider support with wrapper script
- Named profiles for different use cases (dev, prod, testing)
- Import/export configurations
- Per-model-type timeout settings
- Model alias system for easier reference