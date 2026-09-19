import { describe, it, expect } from 'vitest';
import {
  ApiError,
  AuthError,
  NetworkError,
  ServerError,
  NotFoundError,
  isApiError,
} from '@/services/errors';

describe('ApiError', () => {
  it('should store status, code, and message', () => {
    const err = new ApiError('something broke', 500, 'SERVER_ERROR');
    expect(err.message).toBe('something broke');
    expect(err.status).toBe(500);
    expect(err.code).toBe('SERVER_ERROR');
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('should store cause when provided', () => {
    const cause = new Error('original');
    const err = new ApiError('wrapped', 500, 'SERVER_ERROR', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('AuthError', () => {
  it('should default to 401 and AUTH_FAILED', () => {
    const err = new AuthError('bad credentials');
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.name).toBe('AuthError');
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe('NetworkError', () => {
  it('should default to status 0 and NETWORK_ERROR', () => {
    const err = new NetworkError('fetch failed');
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.name).toBe('NetworkError');
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe('ServerError', () => {
  it('should store the actual HTTP status', () => {
    const err = new ServerError('internal error', 503);
    expect(err.status).toBe(503);
    expect(err.code).toBe('SERVER_ERROR');
    expect(err.name).toBe('ServerError');
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe('NotFoundError', () => {
  it('should format resource name into message', () => {
    const err = new NotFoundError('Order SO-001');
    expect(err.message).toBe('Order SO-001 not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('NotFoundError');
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe('isApiError', () => {
  it('should return true for ApiError instances', () => {
    expect(isApiError(new ApiError('x', 500, 'X'))).toBe(true);
    expect(isApiError(new AuthError('x'))).toBe(true);
    expect(isApiError(new NetworkError('x'))).toBe(true);
    expect(isApiError(new ServerError('x', 500))).toBe(true);
    expect(isApiError(new NotFoundError('x'))).toBe(true);
  });

  it('should return false for non-ApiError values', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError('string')).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});
