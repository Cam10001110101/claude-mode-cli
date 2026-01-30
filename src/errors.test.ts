import { describe, it, expect } from 'vitest';
import {
  classifyError,
  formatError,
  providerNotFoundError,
  modelNotFoundError,
  authMissingError,
  claudeNotFoundError,
  ErrorCode,
} from './errors.js';

describe('Error Classification', () => {
  it('should classify connection refused errors', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:11434');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.CONNECTION_REFUSED);
    expect(classified.hint).toContain('server is running');
  });

  it('should classify timeout errors', () => {
    const error = new Error('request timed out');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.CONNECTION_TIMEOUT);
    expect(classified.hint).toContain('too long to respond');
  });

  it('should classify DNS errors', () => {
    const error = new Error('getaddrinfo ENOTFOUND unknown.host');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.DNS_RESOLUTION_FAILED);
    expect(classified.hint).toContain('resolve hostname');
  });

  it('should classify 401 unauthorized errors', () => {
    const error = new Error('Request failed with status 401 Unauthorized');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.AUTH_INVALID);
    expect(classified.hint).toContain('API key');
  });

  it('should classify 403 forbidden errors', () => {
    const error = new Error('HTTP 403 Forbidden');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.AUTH_INVALID);
  });

  it('should classify model not found errors', () => {
    const error = new Error('model not found: nonexistent');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.MODEL_NOT_FOUND);
    expect(classified.hint).toContain('--list');
  });

  it('should return unknown for unrecognized errors', () => {
    const error = new Error('Some random error message');
    const classified = classifyError(error);
    expect(classified.code).toBe(ErrorCode.UNKNOWN);
    expect(classified.message).toBe('Some random error message');
  });

  it('should handle non-Error objects', () => {
    const classified = classifyError('string error');
    expect(classified.code).toBe(ErrorCode.UNKNOWN);
    expect(classified.message).toBe('string error');
  });
});

describe('Error Formatting', () => {
  it('should format error with message', () => {
    const error = {
      code: ErrorCode.CONNECTION_REFUSED,
      message: 'Connection refused',
    };
    const formatted = formatError(error);
    expect(formatted).toContain('Connection refused');
  });

  it('should include hint if present', () => {
    const error = {
      code: ErrorCode.CONNECTION_REFUSED,
      message: 'Connection refused',
      hint: 'Check that the server is running',
    };
    const formatted = formatError(error);
    expect(formatted).toContain('Check that the server is running');
  });
});

describe('Specific Error Creators', () => {
  it('should create provider not found error', () => {
    const error = providerNotFoundError('unknown', ['openrouter', 'ollama-local']);
    expect(error.code).toBe(ErrorCode.PROVIDER_NOT_FOUND);
    expect(error.message).toContain('unknown');
    expect(error.hint).toContain('openrouter');
    expect(error.hint).toContain('ollama-local');
  });

  it('should create model not found error', () => {
    const error = modelNotFoundError('unknown-model', 'openrouter');
    expect(error.code).toBe(ErrorCode.MODEL_NOT_FOUND);
    expect(error.message).toContain('unknown-model');
    expect(error.hint).toContain('openrouter');
  });

  it('should create auth missing error', () => {
    const error = authMissingError('OpenRouter', 'OPENROUTER_API_KEY');
    expect(error.code).toBe(ErrorCode.AUTH_MISSING);
    expect(error.message).toContain('OpenRouter');
    expect(error.hint).toContain('OPENROUTER_API_KEY');
  });

  it('should create claude not found error', () => {
    const error = claudeNotFoundError();
    expect(error.code).toBe(ErrorCode.CLAUDE_NOT_FOUND);
    expect(error.hint).toContain('npm install');
  });
});
