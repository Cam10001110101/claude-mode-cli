import chalk from 'chalk';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
  // Connection errors
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',

  // Auth errors
  AUTH_MISSING = 'AUTH_MISSING',
  AUTH_INVALID = 'AUTH_INVALID',

  // Provider errors
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',

  // Model errors
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_FETCH_FAILED = 'MODEL_FETCH_FAILED',

  // CLI errors
  CLAUDE_NOT_FOUND = 'CLAUDE_NOT_FOUND',
  CLAUDE_FAILED = 'CLAUDE_FAILED',

  // Config errors
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',

  // Setup errors
  SETUP_CONFIG_WRITE_FAILED = 'SETUP_CONFIG_WRITE_FAILED',
  SETUP_ENV_WRITE_FAILED = 'SETUP_ENV_WRITE_FAILED',
  SETUP_VALIDATION_FAILED = 'SETUP_VALIDATION_FAILED',
  SETUP_CANCELLED = 'SETUP_CANCELLED',
  SETUP_INCOMPLETE = 'SETUP_INCOMPLETE',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

export interface ClaudeModeError {
  code: ErrorCode;
  message: string;
  hint?: string;
  cause?: Error;
}

// ============================================================================
// ERROR DETECTION
// ============================================================================

export function classifyError(error: unknown): ClaudeModeError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Connection errors
    if (msg.includes('econnrefused') || msg.includes('connection refused')) {
      return {
        code: ErrorCode.CONNECTION_REFUSED,
        message: 'Connection refused',
        hint: 'Check that the server is running and the URL is correct.',
        cause: error,
      };
    }

    if (msg.includes('etimedout') || msg.includes('timeout') || msg.includes('timed out')) {
      return {
        code: ErrorCode.CONNECTION_TIMEOUT,
        message: 'Connection timed out',
        hint: 'The server took too long to respond. Check network connectivity or increase timeout in config.',
        cause: error,
      };
    }

    if (msg.includes('enotfound') || msg.includes('getaddrinfo')) {
      return {
        code: ErrorCode.DNS_RESOLUTION_FAILED,
        message: 'DNS resolution failed',
        hint: 'Could not resolve hostname. Check the URL and your internet connection.',
        cause: error,
      };
    }

    // Auth errors (HTTP 401/403)
    if (msg.includes('401') || msg.includes('unauthorized')) {
      return {
        code: ErrorCode.AUTH_INVALID,
        message: 'Authentication failed',
        hint: 'Check that your API key is valid and correctly set in .env file.',
        cause: error,
      };
    }

    if (msg.includes('403') || msg.includes('forbidden')) {
      return {
        code: ErrorCode.AUTH_INVALID,
        message: 'Access forbidden',
        hint: 'Your API key may not have access to this resource.',
        cause: error,
      };
    }

    // Model errors
    if (msg.includes('model') && (msg.includes('not found') || msg.includes('404'))) {
      return {
        code: ErrorCode.MODEL_NOT_FOUND,
        message: 'Model not found',
        hint: 'The specified model does not exist on this provider. Use --list to see available models.',
        cause: error,
      };
    }

    // Claude CLI errors
    if (msg.includes('enoent') && msg.includes('claude')) {
      return {
        code: ErrorCode.CLAUDE_NOT_FOUND,
        message: 'Claude CLI not found',
        hint: 'Install Claude Code CLI: npm install -g @anthropic-ai/claude-code',
        cause: error,
      };
    }
  }

  return {
    code: ErrorCode.UNKNOWN,
    message: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error ? error : undefined,
  };
}

// ============================================================================
// ERROR FORMATTING
// ============================================================================

export function formatError(error: ClaudeModeError): string {
  const lines: string[] = [];

  lines.push(chalk.red(`Error: ${error.message}`));

  if (error.hint) {
    lines.push(chalk.yellow(`Hint: ${error.hint}`));
  }

  if (process.env.DEBUG && error.cause) {
    lines.push(chalk.gray(`Debug: ${error.cause.stack || error.cause.message}`));
  }

  return lines.join('\n');
}

export function printError(error: ClaudeModeError): void {
  console.error(formatError(error));
}

// ============================================================================
// SPECIFIC ERROR CREATORS
// ============================================================================

export function providerNotFoundError(providerKey: string, available: string[]): ClaudeModeError {
  return {
    code: ErrorCode.PROVIDER_NOT_FOUND,
    message: `Unknown provider: ${providerKey}`,
    hint: `Available providers: ${available.join(', ')}`,
  };
}

export function modelNotFoundError(modelKey: string, providerKey: string): ClaudeModeError {
  return {
    code: ErrorCode.MODEL_NOT_FOUND,
    message: `Unknown model: ${modelKey}`,
    hint: `Use 'claude-mode --list' to see available models for ${providerKey}.`,
  };
}

export function authMissingError(providerName: string, envVar: string): ClaudeModeError {
  return {
    code: ErrorCode.AUTH_MISSING,
    message: `No API key configured for ${providerName}`,
    hint: `Set the ${envVar} environment variable in your .env file.`,
  };
}

export function claudeNotFoundError(): ClaudeModeError {
  return {
    code: ErrorCode.CLAUDE_NOT_FOUND,
    message: 'Claude CLI not found in PATH',
    hint: 'Install Claude Code CLI: npm install -g @anthropic-ai/claude-code\nOr check that it is in your PATH.',
  };
}

// ============================================================================
// SETUP ERROR CREATORS
// ============================================================================

export const SETUP_CONFIG_WRITE_FAILED = ErrorCode.SETUP_CONFIG_WRITE_FAILED;
export const SETUP_ENV_WRITE_FAILED = ErrorCode.SETUP_ENV_WRITE_FAILED;
export const SETUP_VALIDATION_FAILED = ErrorCode.SETUP_VALIDATION_FAILED;
export const SETUP_CANCELLED = ErrorCode.SETUP_CANCELLED;
export const SETUP_INCOMPLETE = ErrorCode.SETUP_INCOMPLETE;

export function setupConfigWriteError(message: string, hint?: string): ClaudeModeError {
  return {
    code: ErrorCode.SETUP_CONFIG_WRITE_FAILED,
    message: `Failed to write config: ${message}`,
    hint: hint || 'Check file permissions and try again, or use a different config location.',
  };
}

export function setupEnvWriteError(message: string, hint?: string): ClaudeModeError {
  return {
    code: ErrorCode.SETUP_ENV_WRITE_FAILED,
    message: `Failed to write .env file: ${message}`,
    hint: hint || 'Check file permissions or specify a different location.',
  };
}

export function setupValidationError(message?: string, hint?: string): ClaudeModeError {
  return {
    code: ErrorCode.SETUP_VALIDATION_FAILED,
    message: message || 'Provider validation failed',
    hint: hint || 'Check your API keys and network connectivity.',
  };
}

export function setupCancelledError(): ClaudeModeError {
  return {
    code: ErrorCode.SETUP_CANCELLED,
    message: 'Setup cancelled',
  };
}

export function setupIncompleteError(message: string): ClaudeModeError {
  return {
    code: ErrorCode.SETUP_INCOMPLETE,
    message: message,
    hint: 'Run claude-mode setup to complete configuration.',
  };
}
