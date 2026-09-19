import type { ReactElement, ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { Catalog } from '@/pages/Catalog';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderCatalog(route = '/catalog'): void {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  render(<Catalog />, { wrapper: Wrapper });
}

describe('Catalog page', () => {
  it('hydrates the search box from the route query string', async () => {
    renderCatalog('/catalog?search=CL-340-24');

    expect(await screen.findByDisplayValue('CL-340-24')).toBeInTheDocument();
    expect(await screen.findByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    expect(screen.queryByText('Coca-Cola 2L x 6')).not.toBeInTheDocument();
  });
});
