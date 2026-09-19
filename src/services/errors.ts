export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {
  constructor(message: string, cause?: unknown) {
    super(message, 401, 'AUTH_FAILED', cause);
    this.name = 'AuthError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, cause?: unknown) {
    super(message, 0, 'NETWORK_ERROR', cause);
    this.name = 'NetworkError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string, status: number, cause?: unknown) {
    super(message, status, 'SERVER_ERROR', cause);
    this.name = 'ServerError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
