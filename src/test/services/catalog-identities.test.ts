import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getCatalogIdentity, getCatalogIdentitySummary } from '@/services/bff/catalog';
import { server } from '@/test/msw/server';

describe('catalog identities service', () => {
  it('returns the shared catalog identity projection when present', async () => {
    await expect(getCatalogIdentity(1)).resolves.toMatchObject({
      cscartProductId: 1,
      catalogSku: 'CL-340-24',
      provisionalAcumaticaInventoryId: 'CL-340-24',
      mappingRule: 'SKU_EQUALS_ACUMATICA_INVENTORY_ID',
      verificationStatus: 'PROVISIONAL',
      ambiguous: false,
    });
  });

  it('returns the shared catalog identity summary when present', async () => {
    await expect(getCatalogIdentitySummary()).resolves.toEqual({
      totalProjectedRows: 2,
      provisionalRows: 2,
      ambiguousRows: 0,
      distinctCatalogSkus: 2,
      productStatusCounts: {
        ACTIVE: 1,
        HIDDEN: 1,
        DISABLED: 0,
      },
    });
  });

  it('returns null when no shared catalog identity projection exists', async () => {
    server.use(
      http.get('http://test-api/api/catalog/identities/:cscartProductId', () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    await expect(getCatalogIdentity(999)).resolves.toBeNull();
  });
});
