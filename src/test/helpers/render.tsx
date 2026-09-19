import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/contexts/AuthContext';

interface ProviderOptions {
  /** Initial route path (default: '/') */
  route?: string;
  /** Pre-set a refresh token in localStorage so AuthProvider auto-authenticates via MSW */
  authenticated?: boolean;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    authenticated = false,
    ...renderOptions
  }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
): RenderResult {
  if (authenticated) {
    localStorage.setItem('refreshToken', 'valid-refresh-token');
  } else {
    localStorage.removeItem('refreshToken');
  }

  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { createTestQueryClient };
