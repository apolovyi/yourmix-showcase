import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inventory } from '@/pages/Inventory';
import { renderWithProviders } from '@/test/helpers/render';

describe('Inventory page', () => {
  it('renders only reachable products by default', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    expect(screen.queryByText('Hansa Pilsener 330ml x 24')).not.toBeInTheDocument();
    expect(screen.queryByText('Coca-Cola 2L x 6')).not.toBeInTheDocument();
  });

  it('shows expand chevrons for each row', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    const expandButtons = screen.getAllByRole('button', { name: /expand row/i });
    expect(expandButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows storefront status "live" for reachable product', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    expect(screen.getByText('live')).toBeInTheDocument();
  });

  it('shows storefront status "unreachable" for unreachable product', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Switch from default "Live" to "All Statuses"
    await userEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const allOption = screen
      .getAllByText('All Statuses')
      .find((el) => el.closest('[data-combobox-option]'));
    await userEvent.click(allOption!);
    await waitFor(() => {
      expect(screen.getAllByText('Hansa Pilsener 330ml x 24').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('unreachable')).toBeInTheDocument();
  });

  it('shows availability issue chips for unreachable products', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Switch to All Statuses to see unreachable products
    await userEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const allOption = screen
      .getAllByText('All Statuses')
      .find((el) => el.closest('[data-combobox-option]'));
    await userEvent.click(allOption!);
    await waitFor(() => {
      expect(screen.getAllByText('Hansa Pilsener 330ml x 24').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Vendor inactive')).toBeInTheDocument();
  });

  it('shows negative margin with red color for below-cost product', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Switch to All Statuses to see Hansa (below-cost, unreachable)
    await userEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const allOption = screen
      .getAllByText('All Statuses')
      .find((el) => el.closest('[data-combobox-option]'));
    await userEvent.click(allOption!);
    await waitFor(() => {
      expect(screen.getByText('-25.0%')).toBeInTheDocument();
    });
  });

  it('shows margin with cost tooltip', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Switch to All Statuses to see Hansa (below-cost)
    await userEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const allOption = screen
      .getAllByText('All Statuses')
      .find((el) => el.closest('[data-combobox-option]'));
    await userEvent.click(allOption!);
    await waitFor(() => {
      const margin = screen.getByText('-25.0%');
      expect(margin).toHaveAttribute('title', 'Cost: P100.00');
    });
  });

  it('filters products by search term via server', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Search/);
    await userEvent.type(searchInput, 'Castle');
    // Search is debounced and sent to server; MSW handler filters by search param
    await waitFor(() => {
      expect(screen.queryByText('Hansa Pilsener 330ml x 24')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
  });

  it('filters products by storefront status', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Default is "Live" (REACHABLE); switch to "Unreachable"
    await userEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const options = screen.getAllByText('Unreachable');
    const comboboxOption = options.find((el) => el.closest('[data-combobox-option]'));
    await userEvent.click(comboboxOption!);
    await waitFor(() => {
      expect(screen.getAllByText('Hansa Pilsener 330ml x 24').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Castle Lager 340ml x 24')).not.toBeInTheDocument();
    expect(screen.queryByText('Coca-Cola 2L x 6')).not.toBeInTheDocument();
  });

  it('renders issue chips instead of quality dots', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Switch to All Statuses to see Hansa (BELOW_COST → "Loss" chip)
    await userEvent.click(screen.getByRole('button', { name: 'Live' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const allOption = screen
      .getAllByText('All Statuses')
      .find((el) => el.closest('[data-combobox-option]'));
    await userEvent.click(allOption!);
    await waitFor(() => {
      expect(screen.getByText('Loss')).toBeInTheDocument();
    });
  });

  it('shows product count', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    expect(screen.getByText('1 products')).toBeInTheDocument();
  });

  it('shows clear button when filters active', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // No clear button initially (REACHABLE is the default)
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    // Type to filter
    const searchInput = screen.getByPlaceholderText(/Search/);
    await userEvent.type(searchInput, 'Castle');
    // Wait for debounced search to trigger
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
    // Click to clear — resets to default (REACHABLE only)
    await userEvent.click(screen.getByText('Clear'));
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    expect(screen.queryByText('Hansa Pilsener 330ml x 24')).not.toBeInTheDocument();
    expect(screen.queryByText('Coca-Cola 2L x 6')).not.toBeInTheDocument();
  });

  it('expands row when chevron is clicked', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    const expandButtons = screen.getAllByRole('button', { name: /expand row/i });
    await userEvent.click(expandButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Edit in CS-Cart/i })).toBeInTheDocument();
    });
  });

  it('applies multiple query params simultaneously', async () => {
    renderWithProviders(<Inventory />, {
      route: '/inventory?status=UNREACHABLE&search=Hansa',
    });
    await waitFor(() => {
      expect(screen.getAllByText('Hansa Pilsener 330ml x 24').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Castle Lager 340ml x 24')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search/)).toHaveValue('Hansa');
  });

  it('seeds search from ?search query param on mount', async () => {
    renderWithProviders(<Inventory />, { route: '/inventory?search=Castle' });
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Search/);
    expect(searchInput).toHaveValue('Castle');
  });

  it('seeds status filter from ?status query param on mount', async () => {
    renderWithProviders(<Inventory />, { route: '/inventory?status=UNREACHABLE' });
    await waitFor(() => {
      expect(screen.getAllByText('Hansa Pilsener 330ml x 24').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Castle Lager 340ml x 24')).not.toBeInTheDocument();
  });

  it('seeds issue filter from ?issue query param on mount', async () => {
    renderWithProviders(<Inventory />, { route: '/inventory?issue=BELOW_COST' });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument();
    });
    expect(screen.getByText('Loss')).toBeInTheDocument();
    expect(screen.queryByText('Castle Lager 340ml x 24')).not.toBeInTheDocument();
  });

  it('hides vendor and category columns by default', async () => {
    renderWithProviders(<Inventory />);
    await waitFor(() => {
      expect(screen.getByText('Castle Lager 340ml x 24')).toBeInTheDocument();
    });
    // Vendor column header should not be visible
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent?.trim()).filter(Boolean);
    expect(headerTexts).not.toContain('Vendor');
    expect(headerTexts).not.toContain('Category');
    expect(headerTexts).not.toContain('Cost');
  });
});
