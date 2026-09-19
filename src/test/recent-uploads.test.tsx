import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';
import { renderWithProviders } from './helpers/render';
import { PricingDashboard } from '@/pages/PricingDashboard';

const API = 'http://test-api/api';

describe('Recent Uploads section', () => {
  it('hides section when no unresolved uploads', async () => {
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/active proposals/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/recent uploads/i)).not.toBeInTheDocument();
  });

  it('shows PENDING file with spinner text', async () => {
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([
          {
            fileId: 'f1',
            filename: 'supplier-prices.xlsx',
            parseStatus: 'PENDING',
            parseError: null,
            proposalId: null,
          },
        ]);
      }),
    );

    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/recent uploads/i)).toBeInTheDocument();
    });

    expect(screen.getByText('supplier-prices.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Detecting supplier format...')).toBeInTheDocument();
  });

  it('shows PARSING file with parsing text', async () => {
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([
          {
            fileId: 'f2',
            filename: 'benju-list.xlsx',
            parseStatus: 'PARSING',
            parseError: null,
            proposalId: null,
          },
        ]);
      }),
    );

    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('benju-list.xlsx')).toBeInTheDocument();
    });

    expect(screen.getByText('Parsing price list...')).toBeInTheDocument();
  });

  it('shows FAILED file with friendly error, retry, and dismiss buttons', async () => {
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([
          {
            fileId: 'f3',
            filename: 'bad-file.xlsx',
            parseStatus: 'FAILED',
            parseError: 'Unsupported supplier format',
            proposalId: null,
            uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          },
        ]);
      }),
    );

    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('bad-file.xlsx')).toBeInTheDocument();
    });

    // Friendly message shown instead of raw error
    expect(screen.getByText('Unrecognized file format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('retry button calls backend endpoint and shows spinner', async () => {
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([
          {
            fileId: 'f3',
            filename: 'bad-file.xlsx',
            parseStatus: 'FAILED',
            parseError: 'Parse error',
            proposalId: null,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      }),
      http.post(`${API}/pricing/files/:fileId/retry`, async () => {
        // Delay to keep the "Retrying..." state visible
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({
          fileId: 'f3',
          filename: 'bad-file.xlsx',
          parseStatus: 'PENDING',
          parseError: null,
          proposalId: null,
          uploadedAt: new Date().toISOString(),
        });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    // After clicking retry, the "Retrying..." text should appear while mutation is pending
    await waitFor(() => {
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });
  });

  it('dismiss button removes failed upload from list', async () => {
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([
          {
            fileId: 'f3',
            filename: 'bad-file.xlsx',
            parseStatus: 'FAILED',
            parseError: 'Parse error',
            proposalId: null,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('bad-file.xlsx')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    await waitFor(() => {
      expect(screen.queryByText('bad-file.xlsx')).not.toBeInTheDocument();
    });
  });
});
