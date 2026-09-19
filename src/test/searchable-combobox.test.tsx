import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { renderWithProviders } from '@/test/helpers/render';

const OPTIONS = [
  { value: '1', label: 'Beverages' },
  { value: '2', label: 'Clear Beer' },
  { value: '3', label: 'Spirits' },
  { value: '4', label: 'Electronics' },
  { value: '5', label: 'Soft Drinks' },
];

describe('SearchableCombobox', () => {
  it('renders with placeholder text', () => {
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="All Categories"
      />,
    );
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('shows selected option label', () => {
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value="2"
        onChange={() => {}}
        placeholder="All Categories"
      />,
    );
    expect(screen.getByText('Clear Beer')).toBeInTheDocument();
  });

  it('opens dropdown on click and shows all options', async () => {
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('All Categories'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    expect(screen.getByText('Beverages')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('filters options as user types', async () => {
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('All Categories'));
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'beer');
    expect(screen.getByText('Clear Beer')).toBeInTheDocument();
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
  });

  it('calls onChange when option is selected', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={onChange}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('All Categories'));
    await userEvent.click(screen.getByText('Spirits'));
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('closes dropdown on Escape', async () => {
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('All Categories'));
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });
  });

  it('shows "All" option that resets selection', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value="2"
        onChange={onChange}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('Clear Beer'));
    const allOption = screen.getAllByText('All Categories');
    await userEvent.click(allOption[allOption.length - 1]);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('navigates options with ArrowDown and selects with Enter', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={onChange}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('All Categories'));
    // ArrowDown from "All" (index 0) to "Beverages" (index 1)
    await userEvent.keyboard('{ArrowDown}');
    // ArrowDown to "Clear Beer" (index 2)
    await userEvent.keyboard('{ArrowDown}');
    // Enter to select
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('wraps around when navigating past last option', async () => {
    const onChange = vi.fn();
    const shortOptions = [{ value: '1', label: 'Alpha' }];
    renderWithProviders(
      <SearchableCombobox options={shortOptions} value="" onChange={onChange} placeholder="All" />,
    );
    await userEvent.click(screen.getByText('All'));
    // Down to Alpha (index 1), Down wraps to All (index 0)
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    // Index 0 = "All" option which selects ''
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('highlights options on ArrowUp', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SearchableCombobox
        options={OPTIONS}
        value=""
        onChange={onChange}
        placeholder="All Categories"
      />,
    );
    await userEvent.click(screen.getByText('All Categories'));
    // ArrowUp from index 0 wraps to last option (Soft Drinks = index 5)
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('5');
  });
});
