import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { renderWithProviders } from './helpers/render';
import { ProposalReview } from '@/pages/ProposalReview';

function renderProposalReview(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/pricing/proposals/:id" element={<ProposalReview />} />
    </Routes>,
    { route: '/pricing/proposals/prop-001' },
  );
}

describe('Proposal review manual queue spotlight', () => {
  it('surfaces manual review summary cards from deterministic proposal data', async () => {
    renderProposalReview();

    expect(await screen.findByText(/manual review queue/i)).toBeInTheDocument();
    expect(
      screen.getByText(/33% of this proposal still needs manual review before approval/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/unmatched supplier rows still need a manual product mapping/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/all reasons/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /\+62\.0% is the largest supplier-file move still waiting on manual review\./i,
      ),
    ).toBeInTheDocument();
  });

  it('updates the visible queue when a review reason is focused', async () => {
    const user = userEvent.setup();
    renderProposalReview();

    expect(await screen.findByText('New Import Blend Whisky 750ml')).toBeInTheDocument();

    const largeIncreaseButton = screen.getByRole('button', { name: /large price increase \(2\)/i });
    await user.click(largeIncreaseButton);

    await waitFor(() => {
      expect(largeIncreaseButton).toHaveAttribute('aria-pressed', 'true');
    });

    await waitFor(() => {
      expect(screen.queryByText('New Import Blend Whisky 750ml')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Jameson Irish Whiskey 1lt')).toBeInTheDocument();
    expect(screen.getAllByText(/large price increase/i).length).toBeGreaterThan(0);
  });

  it('lets operators narrow the manual review queue by supplier', async () => {
    const user = userEvent.setup();
    renderProposalReview();

    expect(await screen.findByText('New Import Blend Whisky 750ml')).toBeInTheDocument();

    const supplierGroup = screen.getByRole('group', { name: /filter manual review by supplier/i });
    const pernodButton = within(supplierGroup).getByRole('button', {
      name: /PERNOD - RICARD \(2\)/i,
    });

    await user.click(pernodButton);

    await waitFor(() => {
      expect(pernodButton).toHaveAttribute('aria-pressed', 'true');
    });

    await waitFor(() => {
      expect(screen.queryByText('New Import Blend Whisky 750ml')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Jameson Irish Whiskey 1lt')).toBeInTheDocument();
    expect(screen.getByText('Chivas Regal 12yr 750ml')).toBeInTheDocument();
    expect(screen.queryByText('Budget Mixer Tonic Water 1L')).not.toBeInTheDocument();

    await user.click(within(supplierGroup).getByRole('button', { name: /all suppliers \(5\)/i }));

    expect(await screen.findByText('Budget Mixer Tonic Water 1L')).toBeInTheDocument();
  });
});
