import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';
import { renderWithProviders } from './helpers/render';
import { PricingDashboard } from '@/pages/PricingDashboard';

const API = 'http://test-api/api';

describe('Proposal workflow snapshot panel', () => {
  it('renders all four snapshot metrics derived from loaded proposals', async () => {
    renderWithProviders(<PricingDashboard />);

    expect(
      await screen.findByRole('region', { name: /proposal workflow snapshot/i }),
    ).toBeInTheDocument();

    expect(screen.getByText('Proposal Workflow Snapshot')).toBeInTheDocument();
    expect(
      screen.getByText(/derived from loaded proposals — not a live erp or storefront sync/i),
    ).toBeInTheDocument();

    // Active: 1 (prop-001 is PENDING_REVIEW; prop-002 is APPLIED; prop-003 is REJECTED)
    const activeCard = screen.getByText('Active').closest('div')!.parentElement!;
    expect(activeCard).toHaveTextContent('1');
    expect(activeCard).toHaveTextContent('1 proposal in progress');

    // Match coverage: (12+32+40) / (15+32+45) = 84/92 ≈ 91%
    const matchCard = screen.getByText('Match Coverage').closest('div')!.parentElement!;
    expect(matchCard).toHaveTextContent('91%');

    // Review exposure: flagged items in active proposals only (prop-001 has 3 flagged)
    const reviewCard = screen.getByText('Review Exposure').closest('div')!.parentElement!;
    expect(reviewCard).toHaveTextContent('3');
    expect(reviewCard).toHaveTextContent('3 flagged items needing review');

    // Apply exceptions: from failure summary (2 total failed items)
    const exceptionsCard = screen.getByText('Apply Exceptions').closest('div')!.parentElement!;
    expect(exceptionsCard).toHaveTextContent('2');
    expect(exceptionsCard).toHaveTextContent('2 items failed to apply');
  });

  it('shows zero-state correctly when no proposals exist', async () => {
    server.use(
      http.get(`${API}/pricing/proposals`, () => {
        return HttpResponse.json([]);
      }),
      http.get(`${API}/pricing/failures/summary`, () => {
        return HttpResponse.json({ proposalsWithFailures: 0, totalFailedItems: 0 });
      }),
    );

    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Proposal Workflow Snapshot')).toBeInTheDocument();
    });

    const activeCard = screen.getByText('Active').closest('div')!.parentElement!;
    expect(activeCard).toHaveTextContent('0');
    expect(activeCard).toHaveTextContent('0 proposals in progress');

    const matchCard = screen.getByText('Match Coverage').closest('div')!.parentElement!;
    expect(matchCard).toHaveTextContent('0%');

    const reviewCard = screen.getByText('Review Exposure').closest('div')!.parentElement!;
    expect(reviewCard).toHaveTextContent('0');

    const exceptionsCard = screen.getByText('Apply Exceptions').closest('div')!.parentElement!;
    expect(exceptionsCard).toHaveTextContent('0');
    expect(exceptionsCard).toHaveTextContent('No failed apply attempts');
  });

  it('renders the snapshot even when failure summary endpoint fails', async () => {
    server.use(
      http.get(`${API}/pricing/failures/summary`, () => {
        return HttpResponse.json({ message: 'Internal error' }, { status: 500 });
      }),
    );

    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Proposal Workflow Snapshot')).toBeInTheDocument();
    });

    // Apply exceptions should fall back to 0
    const exceptionsCard = screen.getByText('Apply Exceptions').closest('div')!.parentElement!;
    expect(exceptionsCard).toHaveTextContent('0');
    expect(exceptionsCard).toHaveTextContent('No failed apply attempts');

    // Active proposals still shows correct data
    const activeCard = screen.getByText('Active').closest('div')!.parentElement!;
    expect(activeCard).toHaveTextContent('1');
  });
});
