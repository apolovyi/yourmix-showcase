import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ProductHealthReport } from '@/pages/inventory/ProductHealthReport';
import { renderWithProviders } from '@/test/helpers/render';
import { buildIssueContext } from '@/utils/catalog';
import type { CatalogProduct, CatalogCategory, CatalogVendor } from '@/types';

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    cscartProductId: 42,
    name: 'Castle Lager 340ml x 24',
    sku: 'CL-340-24',
    currentPrice: 155.0,
    listPrice: 170.0,
    costPrice: 120.0,
    status: 'ACTIVE',
    categoryIds: [2, 1],
    stockLevel: 50,
    mainImageUrl: 'https://example.com/img.jpg',
    mainImageWidth: 800,
    mainImageHeight: 600,
    vendorId: 101,
    weight: 8.5,
    trackingMode: 'B',
    minQty: 1,
    maxQty: 100,
    qtyStep: 1,
    basePrice: 155.0,
    freeShipping: false,
    botswanaMade: true,
    discount: false,
    sameDayDelivery: true,
    seoName: 'castle-lager-340ml-x-24',
    seoPath: '2',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    outOfStockActions: 'N',
    productType: 'P',
    ...overrides,
  } as CatalogProduct;
}

const CATEGORIES: CatalogCategory[] = [
  {
    id: 1,
    name: 'Beverages',
    parentId: undefined,
    level: 0,
    productCount: 150,
    seoName: 'beverages',
    status: 'A',
  },
  {
    id: 2,
    name: 'Clear Beer',
    parentId: 1,
    level: 1,
    productCount: 45,
    seoName: 'clear-beer',
    status: 'A',
  },
] as CatalogCategory[];

const VENDORS: CatalogVendor[] = [
  { id: 101, name: 'Benju (PTY) LTD', status: 'A' },
] as CatalogVendor[];

function renderReport(product: CatalogProduct = makeProduct()): void {
  const context = buildIssueContext([product]);
  renderWithProviders(
    <ProductHealthReport
      product={product}
      categories={CATEGORIES}
      vendors={VENDORS}
      issueContext={context}
    />,
  );
}

describe('ProductHealthReport', () => {
  // --- Action Bar ---

  it('shows vendor name', () => {
    renderReport();
    expect(screen.getByText(/Benju \(PTY\) LTD/)).toBeInTheDocument();
  });

  it('shows category path', () => {
    renderReport();
    expect(screen.getByText(/Beverages/)).toBeInTheDocument();
    expect(screen.getByText(/Clear Beer/)).toBeInTheDocument();
  });

  it('renders Edit in CS-Cart link with correct URL', () => {
    renderReport();
    const link = screen.getByRole('link', { name: /Edit in CS-Cart/i });
    expect(link).toHaveAttribute(
      'href',
      'https://dev.yourmart.co.bw/ym-admin.php?dispatch=products.update&product_id=42',
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders storefront link when seoName exists', () => {
    renderReport();
    const link = screen.getByRole('link', { name: /Storefront/i });
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('hides storefront link when no seoName', () => {
    renderReport(makeProduct({ seoName: undefined }));
    expect(screen.queryByRole('link', { name: /Storefront/i })).not.toBeInTheDocument();
  });

  // --- Issues ---

  it('shows issue list for product with issues', () => {
    renderReport(makeProduct({ costPrice: undefined, mainImageUrl: undefined }));
    expect(screen.getByText('No Cost')).toBeInTheDocument();
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('shows impact text for each issue', () => {
    renderReport(makeProduct({ costPrice: undefined }));
    expect(screen.getByText(/margin cannot be calculated/)).toBeInTheDocument();
  });

  it('shows specific value for each issue', () => {
    renderReport(makeProduct({ costPrice: undefined }));
    expect(screen.getByText(/costPrice: null/)).toBeInTheDocument();
  });

  it('hides issues section for clean product', () => {
    renderReport();
    expect(screen.queryByText('Issues')).not.toBeInTheDocument();
  });

  it('shows OOS action label for OOS_ACTIVE issue', () => {
    renderReport(makeProduct({ stockLevel: 0, outOfStockActions: 'S' }));
    expect(screen.getByText(/Sign up for notification/)).toBeInTheDocument();
  });

  // --- Metadata ---

  it('shows tracking mode', () => {
    renderReport();
    expect(screen.getByText(/Tracking/)).toBeInTheDocument();
  });

  it('shows product type', () => {
    renderReport(makeProduct({ productType: 'V' }));
    expect(screen.getByText(/Variant/)).toBeInTheDocument();
  });

  it('shows dimensions when present', () => {
    renderReport(makeProduct({ length: 54, width: 28, height: 21 }));
    expect(screen.getByText(/54 × 28 × 21/)).toBeInTheDocument();
  });

  it('shows created and updated dates', () => {
    renderReport();
    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });
});
