import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { renderWithProviders } from '@/test/helpers/render';

interface TestRow {
  id: number;
  name: string;
}

const columnHelper = createColumnHelper<TestRow>();
const columns = [columnHelper.accessor('name', { header: 'Name' })] as ColumnDef<
  TestRow,
  unknown
>[];

function generateRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
}

describe('DataTable density mode', () => {
  it('uses compact cell padding when dense prop is true', () => {
    const { container } = renderWithProviders(
      <DataTable columns={columns} data={generateRows(5)} dense />,
    );
    const cells = container.querySelectorAll('td');
    expect(cells[0].className).not.toContain('p-4');
    expect(cells[0].className).toContain('px-3');
    expect(cells[0].className).toContain('py-1.5');
  });

  it('uses compact header padding when dense prop is true', () => {
    const { container } = renderWithProviders(
      <DataTable columns={columns} data={generateRows(5)} dense />,
    );
    const headers = container.querySelectorAll('th');
    expect(headers[0].className).not.toContain('p-4');
    expect(headers[0].className).toContain('px-3');
    expect(headers[0].className).toContain('py-2');
  });

  it('keeps default padding when dense is false', () => {
    const { container } = renderWithProviders(
      <DataTable columns={columns} data={generateRows(5)} />,
    );
    const cells = container.querySelectorAll('td');
    expect(cells[0].className).toContain('p-4');
  });
});

describe('DataTable page size selector', () => {
  it('renders page size selector when pageSizeOptions is provided', () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={generateRows(30)}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
      />,
    );
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('changes page size when a new option is selected', async () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={generateRows(30)}
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
      />,
    );
    expect(screen.getByText(/Showing 1–10 of 30/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByDisplayValue('10'), '25');
    expect(screen.getByText(/Showing 1–25 of 30/)).toBeInTheDocument();
  });

  it('does not render page size selector by default', () => {
    renderWithProviders(<DataTable columns={columns} data={generateRows(30)} pageSize={10} />);
    expect(screen.queryByDisplayValue('10')).not.toBeInTheDocument();
  });
});

describe('DataTable footer', () => {
  it('does not show footer row count when pagination is disabled', () => {
    renderWithProviders(<DataTable columns={columns} data={generateRows(5)} pageSize={Infinity} />);
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('shows footer with pagination info when data exceeds page size', () => {
    renderWithProviders(<DataTable columns={columns} data={generateRows(30)} pageSize={10} />);
    expect(screen.getByText(/Showing 1–10 of 30/)).toBeInTheDocument();
  });
});

describe('DataTable column resizing', () => {
  it('shows resize handles on headers when enableColumnResizing is true', () => {
    const { container } = renderWithProviders(
      <DataTable columns={columns} data={generateRows(5)} enableColumnResizing />,
    );
    const resizeHandles = container.querySelectorAll('[data-resize-handle]');
    expect(resizeHandles.length).toBeGreaterThan(0);
  });

  it('does not show resize handles by default', () => {
    const { container } = renderWithProviders(
      <DataTable columns={columns} data={generateRows(5)} />,
    );
    const resizeHandles = container.querySelectorAll('[data-resize-handle]');
    expect(resizeHandles.length).toBe(0);
  });
});
