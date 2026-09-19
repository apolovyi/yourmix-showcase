import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getMarginRules,
  createMarginRule,
  updateMarginRule,
  deleteMarginRule,
  getAuditLog,
  revertProposal,
  getProductPriceHistory,
  getCategories,
  getUnmatchedCategories,
  getFailureSummary,
  getMultiSupplierProducts,
  getPricingFeedSummary,
} from '@/services/bff/pricing';
import { server } from '@/test/msw/server';

describe('Pricing service (MSW)', () => {
  it('getSuppliers returns supplier list with new fields', async () => {
    const suppliers = await getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
    expect(suppliers.length).toBe(2);
    expect(suppliers[0]).toHaveProperty('emailDomain');
    expect(suppliers[0]).toHaveProperty('parserType');
  });

  it('createSupplier returns created supplier', async () => {
    const result = await createSupplier({ name: 'New Sup', parserType: 'benju' });
    expect(result.id).toBe('sup-new-001');
    expect(result.name).toBe('New Sup');
  });

  it('updateSupplier returns updated supplier', async () => {
    const result = await updateSupplier('sup-001', {
      name: 'Updated',
      emailDomain: 'x.com',
      fileFormat: 'xlsx',
      parserType: 'benju',
      active: true,
    });
    expect(result.name).toBe('Updated');
  });

  it('deleteSupplier succeeds', async () => {
    await expect(deleteSupplier('sup-001')).resolves.toBeUndefined();
  });

  it('getMarginRules returns margin rule list', async () => {
    const rules = await getMarginRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBe(3);
    expect(rules[0]).toHaveProperty('marginPct');
  });

  it('createMarginRule returns created rule', async () => {
    const result = await createMarginRule({ marginPct: 25, effectiveFrom: '2026-03-01' });
    expect(result.id).toBe('mr-new-001');
    expect(result.marginPct).toBe(25);
  });

  it('updateMarginRule returns updated rule', async () => {
    const result = await updateMarginRule('mr-001', {
      marginPct: 30,
      effectiveFrom: '2026-03-01',
    });
    expect(result.marginPct).toBe(30);
  });

  it('deleteMarginRule succeeds', async () => {
    await expect(deleteMarginRule('mr-001')).resolves.toBeUndefined();
  });

  it('getAuditLog returns paginated audit entries', async () => {
    const result = await getAuditLog('supplier', 'sup-001');
    expect(result.content.length).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.content[0].entityType).toBe('supplier');
  });

  it('revertProposal returns revert counts', async () => {
    const result = await revertProposal('prop-001');
    expect(result.reverted).toBe(10);
    expect(result.failed).toBe(2);
  });

  it('getProductPriceHistory returns paginated history', async () => {
    const result = await getProductPriceHistory(1001);

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content!.length).toBeGreaterThan(0);
    expect(result.content![0]).toHaveProperty('proposalId');
    expect(result.content![0]).toHaveProperty('newPrice');
    expect(result.content![0]).toHaveProperty('previousPrice');
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('getCategories returns string array', async () => {
    const categories = await getCategories();

    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(typeof categories[0]).toBe('string');
    expect(categories).toContain('Clear Beer');
  });

  it('getUnmatchedCategories returns categories and default margin', async () => {
    const result = await getUnmatchedCategories();
    expect(result.categories).toBeDefined();
    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories.length).toBe(3);
    expect(result.categories[0]).toHaveProperty('category');
    expect(result.categories[0]).toHaveProperty('occurrences');
    expect(result.defaultMarginPct).toBe(15.0);
  });

  it('getFailureSummary returns failure counts', async () => {
    const result = await getFailureSummary();
    expect(result.proposalsWithFailures).toBe(1);
    expect(result.totalFailedItems).toBe(2);
  });

  it('getMultiSupplierProducts returns paginated products with quotes', async () => {
    const result = await getMultiSupplierProducts();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBe(2);
    expect(result.content[0]).toHaveProperty('cscartProductId');
    expect(result.content[0]).toHaveProperty('quotes');
    expect(result.content[0].quotes.length).toBeGreaterThan(1);
    expect(result.content[0].quotes[0]).toHaveProperty('supplierName');
    expect(result.content[0].quotes[0]).toHaveProperty('costPrice');
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('getPricingFeedSummary groups customers by effective tier', async () => {
    const result = await getPricingFeedSummary();

    expect(result.totalCustomers).toBe(4);
    expect(result.tiers).toEqual([
      {
        tier: 'WHOLESALE',
        count: 2,
        sampleCustomers: [
          { customerId: 'C-YM001', customerName: 'Shoppers II Maun' },
          { customerId: 'C-YM003', customerName: 'Cash Carry Depot' },
        ],
      },
      {
        tier: 'RETAIL',
        count: 1,
        sampleCustomers: [{ customerId: 'C-YM002', customerName: 'Airport Spar' }],
      },
      {
        tier: 'UNASSIGNED',
        count: 1,
        sampleCustomers: [{ customerId: 'C-YM004', customerName: 'Unclassified Account' }],
      },
    ]);
  });

  it('getPricingFeedSummary also accepts grouped pricing feed payloads', async () => {
    server.use(
      http.get('http://test-api/api/logistics/pricing-feed', () => {
        return HttpResponse.json({
          tiers: [
            {
              tier: 'KEY_ACCOUNT',
              count: 3,
              customers: [
                { customerId: 'C-1', customerName: 'Chain A' },
                { customerId: 'C-2', customerName: 'Chain B' },
                { customerId: 'C-3', customerName: 'Chain C' },
              ],
            },
          ],
        });
      }),
    );

    const result = await getPricingFeedSummary();

    expect(result.totalCustomers).toBe(3);
    expect(result.tiers).toEqual([
      {
        tier: 'KEY_ACCOUNT',
        count: 3,
        sampleCustomers: [
          { customerId: 'C-1', customerName: 'Chain A' },
          { customerId: 'C-2', customerName: 'Chain B' },
          { customerId: 'C-3', customerName: 'Chain C' },
        ],
      },
    ]);
  });
});
