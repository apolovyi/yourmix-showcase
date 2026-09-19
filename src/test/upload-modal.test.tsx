import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server';
import { renderWithProviders } from './helpers/render';
import { PricingDashboard } from '@/pages/PricingDashboard';

const API = 'http://test-api/api';

function mockFileStatusSequence(
  statuses: Array<{ parseStatus: string; parseError?: string; proposalId?: string }>,
): void {
  let callCount = 0;
  server.use(
    http.get(`${API}/pricing/files/:fileId/status`, ({ params }) => {
      const status = statuses[Math.min(callCount, statuses.length - 1)];
      callCount++;
      return HttpResponse.json({
        fileId: params.fileId,
        filename: 'test-upload.xlsx',
        parseStatus: status.parseStatus,
        parseError: status.parseError ?? null,
        proposalId: status.proposalId ?? null,
      });
    }),
  );
}

async function uploadFile(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  // Click "Upload File" button to open modal
  const uploadButton = screen.getByRole('button', { name: /upload file/i });
  await user.click(uploadButton);

  // Create and drop a fake file
  const file = new File(['test'], 'prices.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);

  // Click Upload button
  const submitButton = screen.getByRole('button', { name: /^upload$/i });
  await user.click(submitButton);
}

describe('Upload modal processing flow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Suppress the Recent Uploads section so its status text doesn't collide with modal assertions
    server.use(
      http.get(`${API}/pricing/files/recent`, () => {
        return HttpResponse.json([]);
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows processing spinner after upload succeeds', async () => {
    mockFileStatusSequence([{ parseStatus: 'PENDING' }]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText('Processing your file...')).toBeInTheDocument();
      expect(screen.getByText('Detecting supplier format...')).toBeInTheDocument();
    });
  });

  it('shows "Parsing price list..." when status is PARSING', async () => {
    mockFileStatusSequence([{ parseStatus: 'PARSING' }]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText('Parsing price list...')).toBeInTheDocument();
    });
  });

  it('transitions to success with proposalId when PARSED', async () => {
    mockFileStatusSequence([
      { parseStatus: 'PENDING' },
      { parseStatus: 'PARSED', proposalId: 'prop-123' },
    ]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });

    await uploadFile(user);

    // Wait for polling to pick up PARSED status (polling interval is 2s, need longer timeout)
    await waitFor(
      () => {
        expect(
          screen.getByText('Your price list has been parsed successfully.'),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByRole('button', { name: /view proposal/i })).toBeInTheDocument();
  });

  it('transitions to error when FAILED', { timeout: 10000 }, async () => {
    mockFileStatusSequence([{ parseStatus: 'FAILED', parseError: 'Unsupported file format' }]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });

    await uploadFile(user);

    // First confirm we're in processing phase
    await waitFor(() => {
      expect(screen.getByText('Processing your file...')).toBeInTheDocument();
    });

    // Wait for the FAILED status to be picked up by polling
    await waitFor(
      () => {
        expect(screen.getByText('Processing failed')).toBeInTheDocument();
        expect(screen.getByText('Unsupported file format')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('shows timeout message after 30 seconds', async () => {
    mockFileStatusSequence([{ parseStatus: 'PENDING' }]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<PricingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });

    await uploadFile(user);

    await waitFor(() => {
      expect(screen.getByText('Processing your file...')).toBeInTheDocument();
    });

    // Advance past the 30s timeout
    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    await waitFor(() => {
      expect(screen.getByText('Taking longer than expected')).toBeInTheDocument();
    });
  });
});
