import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingTierSummaryPanel } from '@/pages/pricing/PricingTierSummaryPanel';
import { usePricingFeedSummary } from '@/hooks/queries/usePricing';

vi.mock('@/hooks/queries/usePricing', () => ({
  usePricingFeedSummary: vi.fn(),
}));

const mockedUsePricingFeedSummary = vi.mocked(usePricingFeedSummary);

function mockQueryState(state: Partial<ReturnType<typeof usePricingFeedSummary>>): void {
  mockedUsePricingFeedSummary.mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...state,
  } as ReturnType<typeof usePricingFeedSummary>);
}

function getTierOrderFromList(listLabel: RegExp, tierNames: string[]): string[] {
  return within(screen.getByRole('list', { name: listLabel }))
    .getAllByRole('listitem')
    .filter((item) => item.hasAttribute('aria-label'))
    .map((item) => {
      const tierName = item.getAttribute('aria-label');

      if (!tierName || !tierNames.includes(tierName)) {
        throw new Error(`Could not match tier name for list item: ${item.textContent ?? ''}`);
      }

      return tierName;
    });
}

describe('PricingTierSummaryPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading state', () => {
    mockQueryState({ isLoading: true });

    render(<PricingTierSummaryPanel />);

    expect(screen.getByLabelText(/loading pricing tier summary/i)).toBeInTheDocument();
    expect(screen.getByText(/loading pricing tier feed/i)).toBeInTheDocument();
  });

  it('renders an unavailable state', () => {
    mockQueryState({ error: new Error('Gateway timeout while loading pricing feed') });

    render(<PricingTierSummaryPanel />);

    expect(screen.getByText(/pricing feed unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/gateway timeout while loading pricing feed/i)).toBeInTheDocument();
  });

  it('renders an empty state when no customers are returned', () => {
    mockQueryState({
      data: {
        totalCustomers: 0,
        tiers: [],
      },
    });

    render(<PricingTierSummaryPanel />);

    expect(
      screen.getByText(/no customers are available in the current pricing feed/i),
    ).toBeInTheDocument();
  });

  it('renders tier groups and an unassigned-tier spotlight when data exists', () => {
    mockQueryState({
      data: {
        totalCustomers: 5,
        tiers: [
          {
            tier: 'WHOLESALE',
            count: 3,
            sampleCustomers: [
              { customerId: 'C-1', customerName: 'Shoppers II Maun' },
              { customerId: 'C-2', customerName: 'Airport Spar' },
            ],
          },
          {
            tier: 'UNASSIGNED',
            count: 2,
            sampleCustomers: [{ customerId: 'C-3', customerName: 'Walk-in Customer' }],
          },
        ],
      },
    });

    render(<PricingTierSummaryPanel />);

    expect(screen.getByText(/customer pricing tier foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/not a live product × tier price matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/unassigned tier spotlight/i)).toBeInTheDocument();
    expect(screen.getByText(/2 customers still need explicit tier mapping/i)).toBeInTheDocument();
    expect(screen.getByText(/explicit cs-cart \/ pricing-group mapping/i)).toBeInTheDocument();
    expect(screen.getByText('Walk-in Customer · C-3')).toBeInTheDocument();
    expect(screen.getByText(/tier assignment coverage/i)).toBeInTheDocument();
    expect(
      screen.getByText(/60% of customers already map to an explicit tier/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /tier assignment still needs cleanup before later product × tier pricing will be dependable/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('3 mapped')).toBeInTheDocument();
    expect(screen.getAllByText('2 unassigned')).not.toHaveLength(0);
    expect(screen.getByText('40% of customers')).toBeInTheDocument();
    expect(
      screen.getByText(/3 of 5 customers are ready for downstream tier-aware pricing checks/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/per-tier readiness scan/i)).toBeInTheDocument();
    expect(
      screen.getByText(/still foundation work only — not live product × tier sync/i),
    ).toBeInTheDocument();
    expect(screen.getByText('2 tiers with samples')).toBeInTheDocument();
    expect(screen.getByText('0 counts-only groups')).toBeInTheDocument();
    expect(screen.getByText('1 needs mapping')).toBeInTheDocument();
    expect(screen.getAllByText('Samples visible')).not.toHaveLength(0);
    expect(screen.getByLabelText(/tier assignment coverage progress/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^filter pricing tiers$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter pricing tiers by readiness/i)).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /sort pricing tier foundation views/i }),
    ).toHaveValue('readiness-priority');
    expect(
      screen.getByText(
        /reorders this provisional foundation-only view using the loaded tier groups/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/readiness focus:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/showing 2 of 2 tier groups · 5 customers in matching groups/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('WHOLESALE')).not.toHaveLength(0);
    expect(screen.getAllByText('UNASSIGNED')).not.toHaveLength(0);
    expect(screen.getByText('Shoppers II Maun')).toBeInTheDocument();
    expect(screen.getByText('5 customers')).toBeInTheDocument();
  });

  it('marks counts-only tiers as provisional inside the readiness scan', () => {
    mockQueryState({
      data: {
        totalCustomers: 6,
        tiers: [
          {
            tier: 'WHOLESALE',
            count: 3,
            sampleCustomers: [{ customerId: 'C-1', customerName: 'Shoppers II Maun' }],
          },
          {
            tier: 'RETAIL',
            count: 2,
            sampleCustomers: [],
          },
          {
            tier: 'UNASSIGNED',
            count: 1,
            sampleCustomers: [],
          },
        ],
      },
    });

    render(<PricingTierSummaryPanel />);

    expect(screen.getByText('1 tier with samples')).toBeInTheDocument();
    expect(screen.getByText('2 counts-only groups')).toBeInTheDocument();
    expect(screen.getByText('1 needs mapping')).toBeInTheDocument();
    expect(screen.getAllByText('Counts only')).not.toHaveLength(0);
    expect(
      screen.getByText(
        /feed currently shows counts only, so this tier remains provisional until sample accounts appear/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('No samples yet')).not.toHaveLength(0);
  });

  it('sorts the filtered readiness scan and tier cards with the foundation sort control', async () => {
    const user = userEvent.setup();
    const tierNames = ['UNASSIGNED', 'RETAIL', 'BETA', 'ALPHA KEY', 'WHOLESALE'];

    mockQueryState({
      data: {
        totalCustomers: 23,
        tiers: [
          {
            tier: 'WHOLESALE',
            count: 3,
            sampleCustomers: [{ customerId: 'C-1', customerName: 'Shoppers II Maun' }],
          },
          {
            tier: 'BETA',
            count: 6,
            sampleCustomers: [],
          },
          {
            tier: 'UNASSIGNED',
            count: 2,
            sampleCustomers: [{ customerId: 'C-9', customerName: 'Walk-in Customer' }],
          },
          {
            tier: 'ALPHA KEY',
            count: 5,
            sampleCustomers: [{ customerId: 'C-2', customerName: 'Airport Spar' }],
          },
          {
            tier: 'RETAIL',
            count: 7,
            sampleCustomers: [],
          },
        ],
      },
    });

    render(<PricingTierSummaryPanel />);

    expect(getTierOrderFromList(/pricing tier readiness results/i, tierNames)).toEqual([
      'UNASSIGNED',
      'RETAIL',
      'BETA',
      'ALPHA KEY',
      'WHOLESALE',
    ]);
    expect(getTierOrderFromList(/pricing tier foundation cards/i, tierNames)).toEqual([
      'UNASSIGNED',
      'RETAIL',
      'BETA',
      'ALPHA KEY',
      'WHOLESALE',
    ]);

    const sort = screen.getByRole('combobox', { name: /sort pricing tier foundation views/i });

    await user.selectOptions(sort, 'largest-coverage');

    expect(getTierOrderFromList(/pricing tier readiness results/i, tierNames)).toEqual([
      'RETAIL',
      'BETA',
      'ALPHA KEY',
      'WHOLESALE',
      'UNASSIGNED',
    ]);
    expect(getTierOrderFromList(/pricing tier foundation cards/i, tierNames)).toEqual([
      'RETAIL',
      'BETA',
      'ALPHA KEY',
      'WHOLESALE',
      'UNASSIGNED',
    ]);

    await user.selectOptions(sort, 'alphabetical');

    expect(getTierOrderFromList(/pricing tier readiness results/i, tierNames)).toEqual([
      'ALPHA KEY',
      'BETA',
      'RETAIL',
      'UNASSIGNED',
      'WHOLESALE',
    ]);
    expect(getTierOrderFromList(/pricing tier foundation cards/i, tierNames)).toEqual([
      'ALPHA KEY',
      'BETA',
      'RETAIL',
      'UNASSIGNED',
      'WHOLESALE',
    ]);
  });

  it('does not render the spotlight when there is no unassigned tier group', () => {
    mockQueryState({
      data: {
        totalCustomers: 4,
        tiers: [
          {
            tier: 'WHOLESALE',
            count: 3,
            sampleCustomers: [{ customerId: 'C-1', customerName: 'Shoppers II Maun' }],
          },
          {
            tier: 'RETAIL',
            count: 1,
            sampleCustomers: [{ customerId: 'C-2', customerName: 'Airport Spar' }],
          },
        ],
      },
    });

    render(<PricingTierSummaryPanel />);

    expect(screen.queryByText(/unassigned tier spotlight/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/still need explicit tier mapping/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tier assignment coverage/i)).toBeInTheDocument();
    expect(
      screen.getByText(/100% of customers already map to an explicit tier/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /every customer in the current feed already lands in an explicit pricing tier/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('4 mapped')).toBeInTheDocument();
    expect(screen.getByText('0 unassigned')).toBeInTheDocument();
  });

  it('filters tier groups by readiness state and combines with the text filter', async () => {
    const user = userEvent.setup();

    mockQueryState({
      data: {
        totalCustomers: 9,
        tiers: [
          {
            tier: 'WHOLESALE',
            count: 5,
            sampleCustomers: [
              { customerId: 'C-1', customerName: 'Shoppers II Maun' },
              { customerId: 'C-2', customerName: 'Airport Spar' },
            ],
          },
          {
            tier: 'RETAIL',
            count: 3,
            sampleCustomers: [],
          },
          {
            tier: 'UNASSIGNED',
            count: 1,
            sampleCustomers: [{ customerId: 'C-3', customerName: 'Walk-in Customer' }],
          },
        ],
      },
    });

    render(<PricingTierSummaryPanel />);

    await user.click(screen.getByRole('button', { name: /counts only/i }));

    expect(screen.getByText(/readiness focus:/i)).toHaveTextContent(/counts only/i);
    expect(screen.getAllByText('RETAIL')).not.toHaveLength(0);
    expect(screen.queryAllByText('WHOLESALE')).toHaveLength(0);
    expect(screen.getByText(/1 customer still needs explicit tier mapping/i)).toBeInTheDocument();
    expect(
      screen.getByText(/showing 1 of 3 tier groups · 3 customers in matching groups/i),
    ).toBeInTheDocument();

    const filter = screen.getByRole('textbox', { name: /filter pricing tiers/i });
    await user.type(filter, 'airport');

    expect(
      screen.getByText(/no tier groups match the current readiness focus and search/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/try a different readiness state or adjust “airport”/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    await user.click(screen.getByRole('button', { name: /all readiness states/i }));

    expect(screen.getAllByText('UNASSIGNED')).not.toHaveLength(0);
    expect(
      screen.getByText(/showing 3 of 3 tier groups · 9 customers in matching groups/i),
    ).toBeInTheDocument();
  });
});
