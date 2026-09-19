import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { server as sharedServer } from '../msw/server';
// Note: we check error names instead of instanceof because vi.resetModules()
// creates separate module instances for the test and the api-client.

const API_URL = 'http://test-api';
const server = setupServer();

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', `${API_URL}/api`);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  server.resetHandlers();
});

// Close shared server to avoid handler conflicts, use local strict server
beforeAll(() => {
  sharedServer.close();
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
  sharedServer.listen({ onUnhandledRequest: 'bypass' });
});

describe('api-client', () => {
  it('makes GET request with correct base URL', async () => {
    server.use(
      http.get(`${API_URL}/api/pricing/proposals`, () =>
        HttpResponse.json([{ id: '1', status: 'DRAFT' }]),
      ),
    );
    const { api } = await import('@/services/api-client');
    const { data } = await api.GET('/api/pricing/proposals');
    expect(data).toEqual([{ id: '1', status: 'DRAFT' }]);
  });

  it('injects Authorization header', async () => {
    let capturedAuth = '';
    server.use(
      http.get(`${API_URL}/api/pricing/proposals`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization') || '';
        return HttpResponse.json([]);
      }),
    );
    vi.doMock('@/services/bff/auth', () => ({
      getAccessToken: () => 'test-jwt-token',
      clearTokens: vi.fn(),
    }));
    const { api } = await import('@/services/api-client');
    await api.GET('/api/pricing/proposals');
    expect(capturedAuth).toBe('Bearer test-jwt-token');
  });

  it('throws AuthError on 401 without clearing tokens', async () => {
    server.use(
      http.get(`${API_URL}/api/pricing/proposals`, () =>
        HttpResponse.json({ message: 'Token expired' }, { status: 401 }),
      ),
    );
    const clearTokens = vi.fn();
    vi.doMock('@/services/bff/auth', () => ({
      getAccessToken: () => 'expired-token',
      clearTokens,
    }));
    const { api } = await import('@/services/api-client');
    await expect(api.GET('/api/pricing/proposals')).rejects.toThrow(
      expect.objectContaining({ name: 'AuthError', status: 401 }),
    );
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it('throws NotFoundError on 404', async () => {
    server.use(
      http.get(`${API_URL}/api/pricing/proposals/:id`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    const { api } = await import('@/services/api-client');
    await expect(
      api.GET('/api/pricing/proposals/{id}', { params: { path: { id: 'fake' } } }),
    ).rejects.toThrow(expect.objectContaining({ name: 'NotFoundError', status: 404 }));
  });

  it('throws ServerError on 500 after retries', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/api/pricing/proposals`, () => {
        attempts++;
        return HttpResponse.json({ message: 'Internal error' }, { status: 500 });
      }),
    );
    const { api } = await import('@/services/api-client');
    await expect(api.GET('/api/pricing/proposals')).rejects.toThrow(
      expect.objectContaining({ name: 'ServerError' }),
    );
    expect(attempts).toBe(3); // 1 original + 2 retries
  });

  it('retries on 500 and succeeds', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/api/pricing/proposals`, () => {
        attempts++;
        if (attempts < 2) {
          return HttpResponse.json({ message: 'error' }, { status: 500 });
        }
        return HttpResponse.json([]);
      }),
    );
    const { api } = await import('@/services/api-client');
    const { data } = await api.GET('/api/pricing/proposals');
    expect(data).toEqual([]);
    expect(attempts).toBe(2);
  });

  it('throws ApiError on 400', async () => {
    server.use(
      http.post(`${API_URL}/api/pricing/margin/calculate`, () =>
        HttpResponse.json({ message: 'Invalid request' }, { status: 400 }),
      ),
    );
    const { api } = await import('@/services/api-client');
    await expect(api.POST('/api/pricing/margin/calculate', { body: {} as never })).rejects.toThrow(
      expect.objectContaining({ name: 'ApiError', status: 400 }),
    );
  });

  it('handles 204 No Content', async () => {
    server.use(
      http.delete(
        `${API_URL}/api/pricing/suppliers/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const { api } = await import('@/services/api-client');
    const { response } = await api.DELETE('/api/pricing/suppliers/{id}', {
      params: { path: { id: 'some-uuid' } },
    });
    expect(response.status).toBe(204);
  });
});
