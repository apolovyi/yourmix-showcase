import createClient, { type Middleware } from 'openapi-fetch';
import * as Sentry from '@sentry/react';
import type { paths } from '@/generated/api';
import { getAccessToken } from './bff/auth';
import { AuthError, NetworkError, ServerError, NotFoundError, ApiError } from './errors';

const MAX_RETRIES = 3;

const apiUrl = (import.meta.env.VITE_API_URL || '').trim();
const baseUrl = apiUrl.replace(/\/api$/, '');

async function extractMessage(response: Response): Promise<string> {
  try {
    const json = await response.clone().json();
    return json.message || json.error?.message || JSON.stringify(json);
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

function retryDelay(attempt: number): Promise<void> {
  const ms = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Custom fetch that retries on network errors and 5xx responses.
 * Adds Sentry breadcrumbs for every request.
 */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method ?? 'GET';

  Sentry.addBreadcrumb({ category: 'http', message: `${method} ${url}`, level: 'info' });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await retryDelay(attempt);
        continue;
      }
      const error = new NetworkError(
        err instanceof Error ? err.message : 'Network request failed',
        err,
      );
      Sentry.captureException(error, { contexts: { request: { method, url, attempt } } });
      throw error;
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      await retryDelay(attempt);
      continue;
    }

    return response;
  }

  throw new NetworkError('Request failed after retries');
}

/** Injects JWT Bearer token into every request. */
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
};

/** Classifies HTTP error responses into typed error classes and throws. */
const errorMiddleware: Middleware = {
  async onResponse({ request, response }) {
    if (response.ok) return response;

    const url = request.url;
    const method = request.method;
    const msg = await extractMessage(response);

    if (response.status === 401) {
      const error = new AuthError(msg);
      Sentry.captureException(error, {
        level: 'warning',
        contexts: { request: { method, url, status: 401 } },
      });
      throw error;
    }

    if (response.status === 404) {
      throw new NotFoundError(msg);
    }

    if (response.status >= 500) {
      const error = new ServerError(msg, response.status);
      Sentry.captureException(error, {
        contexts: { request: { method, url, status: response.status } },
      });
      throw error;
    }

    const error = new ApiError(msg, response.status, 'CLIENT_ERROR');
    Sentry.captureException(error, {
      contexts: { request: { method, url, status: response.status } },
    });
    throw error;
  },
};

export const api = createClient<paths>({ baseUrl, fetch: fetchWithRetry });
api.use(authMiddleware);
api.use(errorMiddleware);
