import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';
import { renderWithProviders } from './helpers/render';
import { PricingDashboard } from '@/pages/PricingDashboard';

const API = 'http://test-api/api';

describe('Pricing dashboard tier foundation', () => {
  it('surfaces the customer pricing tier foundation on the pricing workflow page', async () => {
    renderWithProviders(<PricingDashboard />);

    expect(await screen.findByRole('button', { name: /upload file/i })).toBeInTheDocument();
    expect(await screen.findByText(/customer pricing tier foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/not a live product × tier price matrix/i)).toBeInTheDocument();
    expect(await screen.findByText(/unassigned tier spotlight/i)).toBeInTheDocument();
    expect(screen.getByText(/1 customer still needs explicit tier mapping/i)).toBeInTheDocument();
    expect(screen.getByText('Unclassified Account · C-YM004')).toBeInTheDocument();
    expect(screen.getByText(/tier assignment coverage/i)).toBeInTheDocument();
    expect(
      screen.getByText(/75% of customers already map to an explicit tier/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /tier assignment still needs cleanup before later product × tier pricing will be dependable/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/per-tier readiness scan/i)).toBeInTheDocument();
    expect(
      screen.getByText(/still foundation work only — not live product × tier sync/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/filter pricing tiers by readiness/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /samples visible/i })).toBeInTheDocument();
    expect(screen.getByText(/readiness focus:/i)).toBeInTheDocument();
    expect(screen.getByText('3 tiers with samples')).toBeInTheDocument();
    expect(screen.getByText('3 mapped')).toBeInTheDocument();
    expect(screen.getByText('25% of customers')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/active proposals/i)).toBeInTheDocument();
    });
  });

  it('keeps the proposal workflow visible when the pricing feed is unavailable', async () => {
    server.use(
      http.get(`${API}/logistics/pricing-feed`, () => {
        return HttpResponse.json(
          { message: 'Gateway timeout while loading pricing feed' },
          { status: 500 },
        );
      }),
    );

    renderWithProviders(<PricingDashboard />);

    expect(await screen.findByText(/pricing feed unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/gateway timeout while loading pricing feed/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/active proposals/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
  });
});
