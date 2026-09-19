import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { IssueChips } from '@/pages/inventory/IssueChips';
import { renderWithProviders } from '@/test/helpers/render';

describe('IssueChips', () => {
  it('renders nothing when no issues', () => {
    const { container } = renderWithProviders(<IssueChips issues={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a chip for each issue (up to 2)', () => {
    renderWithProviders(<IssueChips issues={['NO_SKU', 'NO_IMAGE']} />);
    expect(screen.getByText('No SKU')).toBeInTheDocument();
    expect(screen.getByText('No Img')).toBeInTheDocument();
  });

  it('renders critical issues (OOS_ACTIVE) with red styling', () => {
    renderWithProviders(<IssueChips issues={['OOS_ACTIVE']} />);
    const oosChip = screen.getByText('OOS');
    expect(oosChip.className).toContain('bg-red');
  });

  it('renders warning issues (NO_IMAGE) with amber styling', () => {
    renderWithProviders(<IssueChips issues={['NO_IMAGE']} />);
    const imgChip = screen.getByText('No Img');
    expect(imgChip.className).toContain('bg-amber');
  });

  it('renders info issues (NO_SKU) with slate styling', () => {
    renderWithProviders(<IssueChips issues={['NO_SKU']} />);
    const skuChip = screen.getByText('No SKU');
    expect(skuChip.className).toContain('bg-slate');
  });

  it('truncates to first 2 chips + count badge, sorted by severity', () => {
    renderWithProviders(<IssueChips issues={['NO_SKU', 'NO_IMAGE', 'NO_COST', 'OOS_ACTIVE']} />);
    const plusBadge = screen.getByText('+2');
    expect(plusBadge).toBeInTheDocument();
    // Critical first (OOS), then warnings (IMG or COST), infos last
    expect(screen.getByText('OOS')).toBeInTheDocument();
    expect(screen.queryByText('No SKU')).not.toBeInTheDocument(); // info, pushed out
  });

  it('shows all chips when exactly 2 issues', () => {
    renderWithProviders(<IssueChips issues={['NO_SKU', 'NO_IMAGE']} />);
    expect(screen.getByText('No SKU')).toBeInTheDocument();
    expect(screen.getByText('No Img')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('maps issue keys to short abbreviations from registry', () => {
    renderWithProviders(<IssueChips issues={['NO_COST']} />);
    expect(screen.getByText('No Cost')).toBeInTheDocument();
  });

  it('renders STALE chip with shortLabel Stale', () => {
    renderWithProviders(<IssueChips issues={['STALE']} />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });
});
