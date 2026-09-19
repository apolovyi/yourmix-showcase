import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './msw/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock environment variables for tests
// IMPORTANT: VITE_API_URL must be set so services make real HTTP calls (MSW intercepts them)
// Use vi.stubEnv so the values propagate across all module scopes (Object.defineProperty
// on import.meta only affects the setup module's own import.meta).
vi.stubEnv('VITE_API_URL', 'http://test-api/api');
vi.stubEnv('VITE_USE_ACUMATICA', 'false');
vi.stubEnv('VITE_ACUMATICA_URL', 'https://mock.acumatica.local');
vi.stubEnv('VITE_ACUMATICA_ENDPOINT_VERSION', '24.200.001');
vi.stubEnv('MODE', 'test');

// Suppress console during tests unless explicitly needed
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('act(')) return;
  originalError.apply(console, args);
};
