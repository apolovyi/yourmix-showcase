import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ProductDetailPanel } from '@/pages/inventory/ProductDetailPanel';
import { renderWithProviders } from '@/test/helpers/render';
import type { CatalogProduct, CatalogCategory, CatalogVendor } from '@/types';

const MOCK_PRODUCT: CatalogProduct = {
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
} as CatalogProduct;

const MOCK_CATEGORIES: CatalogCategory[] = [
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

const MOCK_VENDORS: CatalogVendor[] = [
  { id: 101, name: 'Benju (PTY) LTD', status: 'A' },
] as CatalogVendor[];

describe('ProductDetailPanel', () => {
  it('shows vendor name', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText('Benju (PTY) LTD')).toBeInTheDocument();
  });

  it('shows category path', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText(/Beverages/)).toBeInTheDocument();
    expect(screen.getByText(/Clear Beer/)).toBeInTheDocument();
  });

  it('shows weight', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText('8.5 kg')).toBeInTheDocument();
  });

  it('shows Botswana Made badge when true', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText('Botswana Made')).toBeInTheDocument();
  });

  it('shows Same-Day Delivery badge when true', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText('Same-Day Delivery')).toBeInTheDocument();
  });

  it('shows storefront link with correct URL', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    const link = screen.getByRole('link', { name: /View on storefront/i });
    expect(link).toHaveAttribute(
      'href',
      'https://dev.yourmart.co.bw/beverages/clear-beer/castle-lager-340ml-x-24/',
    );
  });

  it('shows timestamps', () => {
    renderWithProviders(
      <ProductDetailPanel
        product={MOCK_PRODUCT}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('shows dash for unknown vendor', () => {
    const product = { ...MOCK_PRODUCT, vendorId: 999 };
    renderWithProviders(
      <ProductDetailPanel
        product={product as CatalogProduct}
        categories={MOCK_CATEGORIES}
        vendors={MOCK_VENDORS}
      />,
    );
    expect(screen.getByText('Vendor #999')).toBeInTheDocument();
  });
});
