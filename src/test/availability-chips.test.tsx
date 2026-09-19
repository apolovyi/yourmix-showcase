import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { AvailabilityChips } from '@/pages/inventory/AvailabilityChips';
import { renderWithProviders } from '@/test/helpers/render';
import type { CatalogProduct } from '@/types';

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    cscartProductId: 1,
    name: 'Test Product',
    currentPrice: 100,
    status: 'ACTIVE',
    categoryIds: [1],
    freeShipping: false,
    botswanaMade: false,
    sameDayDelivery: false,
    vendorName: 'Test Vendor',
    vendorStatus: 'D',
    mainCategoryName: 'Beer',
    mainCategoryStatus: 'A',
    ...overrides,
  } as CatalogProduct;
}

describe('AvailabilityChips', () => {
  it('renders nothing when no issues', () => {
    const { container } = renderWithProviders(
      <AvailabilityChips issues={[]} product={makeProduct()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders chip for VENDOR_INACTIVE', () => {
    renderWithProviders(<AvailabilityChips issues={['VENDOR_INACTIVE']} product={makeProduct()} />);
    expect(screen.getByText('Vendor inactive')).toBeInTheDocument();
  });

  it('renders chip for OOS_BLOCKED', () => {
    renderWithProviders(<AvailabilityChips issues={['OOS_BLOCKED']} product={makeProduct()} />);
    expect(screen.getByText('OOS blocked')).toBeInTheDocument();
  });

  it('renders multiple chips', () => {
    renderWithProviders(
      <AvailabilityChips issues={['VENDOR_INACTIVE', 'ZERO_PRICE']} product={makeProduct()} />,
    );
    expect(screen.getByText('Vendor inactive')).toBeInTheDocument();
    expect(screen.getByText('Zero price')).toBeInTheDocument();
  });

  it('critical chips use red styling', () => {
    renderWithProviders(<AvailabilityChips issues={['VENDOR_INACTIVE']} product={makeProduct()} />);
    const chip = screen.getByText('Vendor inactive');
    expect(chip.className).toContain('red');
  });

  it('high-severity chips use amber styling', () => {
    renderWithProviders(<AvailabilityChips issues={['VIEW_ONLY']} product={makeProduct()} />);
    const chip = screen.getByText('View only');
    expect(chip.className).toContain('amber');
  });

  it('shows tooltip with vendor details', () => {
    renderWithProviders(
      <AvailabilityChips
        issues={['VENDOR_INACTIVE']}
        product={makeProduct({ vendorName: 'Jazellas', vendorStatus: 'D' })}
      />,
    );
    const chip = screen.getByText('Vendor inactive');
    expect(chip.getAttribute('title')).toContain('Jazellas');
    expect(chip.getAttribute('title')).toContain('disabled');
  });
});
