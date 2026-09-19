import { http, HttpResponse } from 'msw';
import type {
  AuditLogEntry,
  AuditPage,
  CatalogProduct,
  CategoryList,
  FailureSummaryResponse,
  FileStatusResponse,
  MarginRule,
  PriceHistoryPage,
  PricingSupplier,
  ProductPage,
  ProductSummary,
  Proposal,
  ProposalItem,
  RevertResponse,
  UnmatchedCategoryResponse,
  UploadResponse,
  VendorList,
} from '@/types';

const API = 'http://test-api/api';

function enrichProposals(proposals: Proposal[]): Proposal[] {
  return proposals.map((p) => ({
    ...p,
    failedItems:
      p.status === 'PARTIALLY_APPLIED'
        ? [
            {
              itemId: 'item-fail-001',
              productName: 'Castle Lager 340ml x 24',
              supplierCode: 'CL-340-24',
              errorMessage: 'CS-Cart API timeout',
              updateAttempts: 3,
              lastAttemptAt: '2026-02-28T10:30:00Z',
            },
            {
              itemId: 'item-fail-002',
              supplierCode: 'BL-500-12',
              errorMessage: 'Product not found in CS-Cart',
              updateAttempts: 1,
              lastAttemptAt: '2026-02-28T10:31:00Z',
            },
          ]
        : undefined,
  }));
}

/** Build a fake JWT with the given payload */
function fakeJwt(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

const TEST_USER_DTO = {
  id: 'EMP-001',
  email: 'test@yourmix.com',
  name: 'Test User',
  role: 'ADMIN',
};

const TEST_JWT = fakeJwt({
  sub: TEST_USER_DTO.id,
  email: TEST_USER_DTO.email,
  role: TEST_USER_DTO.role,
});

const allProducts: CatalogProduct[] = [
  {
    cscartProductId: 1,
    name: 'Castle Lager 340ml x 24',
    sku: 'CL-340-24',
    currentPrice: 155.0,
    listPrice: 170.0,
    costPrice: 120.0,
    status: 'ACTIVE',
    categoryIds: [2],
    stockLevel: 50,
    mainImageUrl: 'https://example.com/castle.jpg',
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
    sameDayDelivery: false,
    seoName: 'castle-lager',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    storefrontStatus: 'REACHABLE',
    availabilityIssues: [],
    vendorName: 'Benju (PTY) LTD',
    vendorStatus: 'A',
    mainCategoryName: 'Clear Beer',
    mainCategoryStatus: 'A',
  },
  {
    cscartProductId: 2,
    name: 'Hansa Pilsener 330ml x 24',
    sku: null,
    currentPrice: 80.0,
    listPrice: 80.0,
    costPrice: 100.0,
    status: 'ACTIVE',
    categoryIds: [2],
    stockLevel: 0,
    mainImageUrl: null,
    mainImageWidth: null,
    mainImageHeight: null,
    vendorId: 102,
    weight: null,
    trackingMode: 'B',
    minQty: 1,
    maxQty: null,
    qtyStep: 1,
    basePrice: 80.0,
    freeShipping: false,
    botswanaMade: false,
    discount: false,
    sameDayDelivery: false,
    seoName: 'hansa-pilsener',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    storefrontStatus: 'UNREACHABLE',
    availabilityIssues: ['VENDOR_INACTIVE', 'OOS_BLOCKED'],
    vendorName: 'The Liquor Shop',
    vendorStatus: 'D',
    mainCategoryName: 'Clear Beer',
    mainCategoryStatus: 'A',
  },
  {
    cscartProductId: 3,
    name: 'Coca-Cola 2L x 6',
    sku: 'CC-2L-6',
    currentPrice: 120.0,
    listPrice: 120.0,
    costPrice: 90.0,
    status: 'HIDDEN',
    categoryIds: [5],
    stockLevel: 200,
    mainImageUrl: 'https://example.com/coke.jpg',
    mainImageWidth: 600,
    mainImageHeight: 400,
    vendorId: 103,
    weight: 12.0,
    trackingMode: 'B',
    minQty: 1,
    maxQty: null,
    qtyStep: 1,
    basePrice: 120.0,
    freeShipping: false,
    botswanaMade: false,
    discount: false,
    sameDayDelivery: true,
    seoName: 'coca-cola-2l',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    storefrontStatus: 'HIDDEN',
    availabilityIssues: [],
    vendorName: 'Kgalagadi Breweries',
    vendorStatus: 'A',
    mainCategoryName: 'Soft Drinks',
    mainCategoryStatus: 'A',
  },
];

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop-001',
    supplierFileId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    supplierFileName: 'Benju Price Adjustment 2026-01-01.xlsx',
    supplierName: 'Benju (PTY) LTD',
    status: 'PENDING_REVIEW',
    totalItems: 15,
    matchedCount: 12,
    unmatchedCount: 2,
    flaggedCount: 3,
    appliedCount: 0,
    failedCount: 0,
    createdAt: '2026-02-20T10:30:00Z',
    reviewedBy: undefined,
    approvedAt: undefined,
  },
  {
    id: 'prop-002',
    supplierFileId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    supplierFileName: 'Spirits Workbook Dec 2025.xlsx',
    supplierName: 'Bacardi Import',
    status: 'APPLIED',
    totalItems: 32,
    matchedCount: 32,
    unmatchedCount: 0,
    flaggedCount: 1,
    appliedCount: 31,
    failedCount: 1,
    createdAt: '2026-02-08T14:00:00Z',
    reviewedBy: 'Mark',
    approvedAt: '2026-02-10T09:15:00Z',
  },
  {
    id: 'prop-003',
    supplierFileId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    supplierFileName: 'Benju Price List Dec 2025.xlsx',
    supplierName: 'Benju (PTY) LTD',
    status: 'REJECTED',
    totalItems: 45,
    matchedCount: 40,
    unmatchedCount: 5,
    flaggedCount: 8,
    appliedCount: 0,
    failedCount: 0,
    createdAt: '2026-01-28T11:00:00Z',
    reviewedBy: 'Mark',
    approvedAt: undefined,
  },
];

const MOCK_PROPOSAL_ITEMS: ProposalItem[] = [
  // 10 auto-approved matched items (normal price changes 5-18%)
  {
    id: 'item-01',
    proposalId: 'prop-001',
    supplierCode: 'PR150200',
    supplierProductName: 'Bacardi Carta Blanca Rum 750ml',
    supplierName: 'PERNOD - RICARD',
    category: 'White Rum',
    packing: '1x750ml',
    barcode: '5010677014205',
    cscartProductId: 4501,
    cscartProductName: 'Bacardi Carta Blanca Rum 750ml',
    costPrice: 265.0,
    currentPrice: 350.0,
    proposedPrice: 409.27,
    changePct: 16.9,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-02',
    proposalId: 'prop-001',
    supplierCode: '4303005560',
    supplierProductName: 'Bombay Sapphire Gin 750ml',
    supplierName: 'PERNOD - RICARD',
    category: 'Gin',
    packing: '1x750ml',
    barcode: '5010677711111',
    cscartProductId: 4502,
    cscartProductName: 'Bombay Sapphire London Dry Gin 750ml',
    costPrice: 352.0,
    currentPrice: 480.0,
    proposedPrice: 542.28,
    changePct: 13.0,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-03',
    proposalId: 'prop-001',
    supplierCode: 'PR180100',
    supplierProductName: 'Grey Goose Vodka 750ml',
    supplierName: 'PERNOD - RICARD',
    category: 'Vodka',
    packing: '1x750ml',
    barcode: '80480280024',
    cscartProductId: 4503,
    cscartProductName: 'Grey Goose Premium Vodka 750ml',
    costPrice: 680.0,
    currentPrice: 890.0,
    proposedPrice: 1048.68,
    changePct: 17.8,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-04',
    proposalId: 'prop-001',
    supplierCode: 'PR160300',
    supplierProductName: 'Martini Bianco Vermouth 750ml',
    supplierName: 'PERNOD - RICARD',
    category: 'Vermouth',
    packing: '1x750ml',
    barcode: '8000570000400',
    cscartProductId: 4504,
    cscartProductName: 'Martini Bianco 750ml',
    costPrice: 140.0,
    currentPrice: 185.0,
    proposedPrice: 215.46,
    changePct: 16.5,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-05',
    proposalId: 'prop-001',
    supplierCode: 'PR170200',
    supplierProductName: 'Absolut Vodka 750ml',
    supplierName: 'PERNOD - RICARD',
    category: 'Vodka',
    packing: '1x750ml',
    barcode: '7312040017072',
    cscartProductId: 4505,
    cscartProductName: 'Absolut Vodka Original 750ml',
    costPrice: 290.0,
    currentPrice: 385.0,
    proposedPrice: 446.37,
    changePct: 15.9,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-06',
    proposalId: 'prop-001',
    supplierCode: 'RGB3800-01-01',
    supplierProductName: 'Jack Daniels Tennessee Whiskey 750ml',
    supplierName: 'The Really Great Brands Company',
    category: 'American Whiskey',
    packing: '1x750ml',
    barcode: null,
    cscartProductId: 4506,
    cscartProductName: 'Jack Daniels Old No.7 750ml',
    costPrice: 550.0,
    currentPrice: 720.0,
    proposedPrice: 846.45,
    changePct: 17.6,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-07',
    proposalId: 'prop-001',
    supplierCode: 'SD001750',
    supplierProductName: 'Six Dogs Karoo Gin 750ml',
    supplierName: 'Six Dogs Distillery',
    category: 'Gin',
    packing: '1x750ml',
    barcode: '6009880712345',
    cscartProductId: 4507,
    cscartProductName: 'Six Dogs Karoo Gin 750ml',
    costPrice: 420.0,
    currentPrice: 550.0,
    proposedPrice: 646.38,
    changePct: 17.5,
    marginPct: 35,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-08',
    proposalId: 'prop-001',
    supplierCode: 'AB200100',
    supplierProductName: 'Hunters Gold Cider 330ml',
    supplierName: 'Alternative Beverage Company',
    category: 'Cider',
    packing: '6x330ml',
    barcode: '6001240100011',
    cscartProductId: 4508,
    cscartProductName: 'Hunters Gold 330ml (6-pack)',
    costPrice: 95.0,
    currentPrice: 120.0,
    proposedPrice: 135.09,
    changePct: 12.6,
    marginPct: 25,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-09',
    proposalId: 'prop-001',
    supplierCode: 'AB200200',
    supplierProductName: 'Savanna Dry Cider 330ml',
    supplierName: 'Alternative Beverage Company',
    category: 'Cider',
    packing: '6x330ml',
    barcode: '6001240200019',
    cscartProductId: 4509,
    cscartProductName: 'Savanna Dry Premium Cider 330ml (6-pack)',
    costPrice: 98.0,
    currentPrice: 125.0,
    proposedPrice: 139.47,
    changePct: 11.6,
    marginPct: 25,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-10',
    proposalId: 'prop-001',
    supplierCode: 'UB500100',
    supplierProductName: 'Hennessy VS Cognac 750ml',
    supplierName: 'Universal Brands',
    category: 'Cognac',
    packing: '1x750ml',
    barcode: '3245990250012',
    cscartProductId: 4510,
    cscartProductName: 'Hennessy VS 750ml',
    costPrice: 780.0,
    currentPrice: 1020.0,
    proposedPrice: 1200.42,
    changePct: 17.7,
    marginPct: 40,
    approvalStatus: 'AUTO_APPROVED',
    requiresReview: false,
    reviewReason: null,
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  // 2 unmatched items
  {
    id: 'item-11',
    proposalId: 'prop-001',
    supplierCode: 'XX99001',
    supplierProductName: 'New Import Blend Whisky 750ml',
    supplierName: 'Universal Brands',
    category: 'Blended Whisky',
    packing: '1x750ml',
    barcode: null,
    cscartProductId: null,
    cscartProductName: null,
    costPrice: 320.0,
    currentPrice: null,
    proposedPrice: 492.5,
    changePct: null,
    marginPct: 35,
    approvalStatus: 'PENDING_REVIEW',
    requiresReview: true,
    reviewReason: 'UNMATCHED',
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-12',
    proposalId: 'prop-001',
    supplierCode: 'XX99002',
    supplierProductName: 'Craft Botanical Gin 500ml',
    supplierName: 'Six Dogs Distillery',
    category: 'Gin',
    packing: '1x500ml',
    barcode: '6009880799999',
    cscartProductId: null,
    cscartProductName: null,
    costPrice: 380.0,
    currentPrice: null,
    proposedPrice: 585.06,
    changePct: null,
    marginPct: 35,
    approvalStatus: 'PENDING_REVIEW',
    requiresReview: true,
    reviewReason: 'UNMATCHED',
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  // 2 large price change items (>20%)
  {
    id: 'item-13',
    proposalId: 'prop-001',
    supplierCode: 'PR101550',
    supplierProductName: 'Jameson Irish Whiskey 1lt',
    supplierName: 'PERNOD - RICARD',
    category: 'Irish Whiskey',
    packing: '1x1000ml',
    barcode: '5011007003067',
    cscartProductId: 4511,
    cscartProductName: 'Jameson Irish Whiskey 1 Litre',
    costPrice: 573.45,
    currentPrice: 620.0,
    proposedPrice: 882.24,
    changePct: 42.3,
    marginPct: 35,
    approvalStatus: 'PENDING_REVIEW',
    requiresReview: true,
    reviewReason: 'LARGE_INCREASE',
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  {
    id: 'item-14',
    proposalId: 'prop-001',
    supplierCode: 'PR101600',
    supplierProductName: 'Chivas Regal 12yr 750ml',
    supplierName: 'PERNOD - RICARD',
    category: 'Scotch Whisky',
    packing: '1x750ml',
    barcode: '80432400395',
    cscartProductId: 4512,
    cscartProductName: 'Chivas Regal 12 Year Old 750ml',
    costPrice: 498.5,
    currentPrice: 520.0,
    proposedPrice: 767.19,
    changePct: 47.5,
    marginPct: 35,
    approvalStatus: 'PENDING_REVIEW',
    requiresReview: true,
    reviewReason: 'LARGE_INCREASE',
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
  // 1 negative margin item
  {
    id: 'item-15',
    proposalId: 'prop-001',
    supplierCode: 'AB300100',
    supplierProductName: 'Budget Mixer Tonic Water 1L',
    supplierName: 'Alternative Beverage Company',
    category: 'Mixers',
    packing: '12x1000ml',
    barcode: '6001240300016',
    cscartProductId: 4513,
    cscartProductName: 'Tonic Water 1L',
    costPrice: 45.0,
    currentPrice: 38.0,
    proposedPrice: 61.56,
    changePct: 62.0,
    marginPct: 20,
    approvalStatus: 'PENDING_REVIEW',
    requiresReview: true,
    reviewReason: 'NEGATIVE_MARGIN',
    updateStatus: 'PENDING',
    overridePrice: null,
    overrideReason: null,
    errorMessage: null,
    appliedAt: null,
    updateAttempts: 0,
    lastAttemptAt: null,
  },
];

export const handlers = [
  // Auth
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json({ message: 'Bad credentials' }, { status: 401 });
    }
    return HttpResponse.json({
      accessToken: TEST_JWT,
      refreshToken: 'test-refresh-token',
      user: {
        ...TEST_USER_DTO,
        email: body.email,
        name: body.email.split('@')[0] || TEST_USER_DTO.name,
      },
    });
  }),

  http.post(`${API}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    if (body.refreshToken === 'expired') {
      return HttpResponse.json({ message: 'Token expired' }, { status: 401 });
    }
    return HttpResponse.json({
      accessToken: TEST_JWT,
      refreshToken: 'new-refresh-token',
    });
  }),

  // Proposals
  http.get(`${API}/pricing/proposals`, ({ request }) => {
    const url = new URL(request.url);
    const product = url.searchParams.get('product');
    if (product) {
      return HttpResponse.json(
        enrichProposals(
          MOCK_PROPOSALS.filter(
            (p) =>
              (p.supplierFileName ?? '').toLowerCase().includes(product.toLowerCase()) ||
              (p.supplierName ?? '').toLowerCase().includes(product.toLowerCase()),
          ),
        ),
      );
    }
    return HttpResponse.json(enrichProposals(MOCK_PROPOSALS));
  }),

  http.get(`${API}/pricing/proposals/:id`, ({ params }) => {
    const proposal = MOCK_PROPOSALS.find((p) => p.id === params.id);
    return proposal
      ? HttpResponse.json(proposal)
      : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),

  http.get(`${API}/pricing/proposals/:id/items`, ({ params }) => {
    return HttpResponse.json(MOCK_PROPOSAL_ITEMS.filter((i) => i.proposalId === params.id));
  }),

  http.post(`${API}/pricing/proposals/:id/approve`, ({ params }) => {
    const proposal = MOCK_PROPOSALS.find((p) => p.id === params.id);
    return HttpResponse.json({ ...proposal, status: 'APPROVED' });
  }),

  http.post(`${API}/pricing/proposals/:id/reject`, ({ params }) => {
    const proposal = MOCK_PROPOSALS.find((p) => p.id === params.id);
    return HttpResponse.json({ ...proposal, status: 'REJECTED' });
  }),

  http.post(`${API}/pricing/proposals/:id/items/:itemId/approve`, ({ params }) => {
    const item = MOCK_PROPOSAL_ITEMS.find((i) => i.id === params.itemId);
    return HttpResponse.json({ ...item, approvalStatus: 'APPROVED', requiresReview: false });
  }),

  http.post(`${API}/pricing/proposals/:id/items/:itemId/reject`, ({ params }) => {
    const item = MOCK_PROPOSAL_ITEMS.find((i) => i.id === params.itemId);
    return HttpResponse.json({ ...item, approvalStatus: 'REJECTED', requiresReview: false });
  }),

  http.put(`${API}/pricing/proposals/:id/items/:itemId/override`, async ({ params, request }) => {
    const body = (await request.json()) as { price: number; reason: string };
    const item = MOCK_PROPOSAL_ITEMS.find((i) => i.id === params.itemId);
    return HttpResponse.json({
      ...item,
      overridePrice: body.price,
      overrideReason: body.reason,
      approvalStatus: 'APPROVED',
      requiresReview: false,
    });
  }),

  http.put(`${API}/pricing/proposals/:id/items/:itemId/map`, async ({ params, request }) => {
    const body = (await request.json()) as { cscartProductId: number };
    const item = MOCK_PROPOSAL_ITEMS.find((i) => i.id === params.itemId);
    return HttpResponse.json({
      ...item,
      cscartProductId: body.cscartProductId,
      cscartProductName: `Product #${body.cscartProductId}`,
      approvalStatus: 'AUTO_APPROVED',
      requiresReview: false,
      reviewReason: null,
    });
  }),

  // Recent uploads
  http.get(`${API}/pricing/files/recent`, () => {
    return HttpResponse.json([
      {
        fileId: 'file-pending-001',
        filename: 'supplier-a.xlsx',
        parseStatus: 'PENDING',
        parseError: null,
        proposalId: null,
        uploadedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        fileId: 'file-failed-001',
        filename: 'bad-file.xlsx',
        parseStatus: 'FAILED',
        parseError: 'Unsupported supplier format',
        proposalId: null,
        uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ] satisfies FileStatusResponse[]);
  }),

  // Retry file
  http.post(`${API}/pricing/files/:fileId/retry`, ({ params }) => {
    return HttpResponse.json({
      fileId: String(params.fileId),
      filename: 'bad-file.xlsx',
      parseStatus: 'PENDING',
      parseError: null,
      proposalId: null,
      uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    } satisfies FileStatusResponse);
  }),

  // Price history
  http.get(`${API}/pricing/products/:cscartId/history`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '0');
    return HttpResponse.json({
      content: [
        {
          proposalId: 'prop-001',
          proposalDate: '2026-02-15T10:00:00Z',
          supplierName: 'Benju (PTY) LTD',
          supplierProductName: 'Castle Lager 340ml x 24',
          costPrice: 120.0,
          previousPrice: 145.0,
          newPrice: 155.0,
          marginPct: 22.5,
          changePct: 6.9,
          approvalStatus: 'APPROVED',
          updateStatus: 'APPLIED',
          overridePrice: null,
          overrideReason: null,
          appliedAt: '2026-02-15T12:00:00Z',
        },
        {
          proposalId: 'prop-002',
          proposalDate: '2026-01-20T09:00:00Z',
          supplierName: 'Benju (PTY) LTD',
          supplierProductName: 'Castle Lager 340ml x 24',
          costPrice: 115.0,
          previousPrice: 140.0,
          newPrice: 145.0,
          marginPct: 20.7,
          changePct: 3.6,
          approvalStatus: 'APPROVED',
          updateStatus: 'APPLIED',
          overridePrice: null,
          overrideReason: null,
          appliedAt: '2026-01-20T11:00:00Z',
        },
      ],
      totalElements: 2,
      totalPages: 1,
      page,
      size: 20,
    } satisfies PriceHistoryPage);
  }),

  // Categories
  http.get(`${API}/pricing/categories`, () => {
    return HttpResponse.json({
      categories: [
        'Clear Beer',
        'Opaque Beer',
        'Spirits',
        'Wines',
        'Soft Drinks',
        'Energy Drinks',
        'Water',
      ],
    });
  }),

  // Suppliers
  http.get(`${API}/pricing/suppliers`, () => {
    return HttpResponse.json([
      {
        id: 'sup-001',
        name: 'Benju (PTY) LTD',
        emailDomain: 'benju.co.bw',
        fileFormat: 'xlsx',
        parserType: 'benju',
        active: true,
      },
      {
        id: 'sup-002',
        name: 'Bacardi Import',
        emailDomain: null,
        fileFormat: 'xlsx',
        parserType: 'spirits-workbook',
        active: true,
      },
    ] satisfies PricingSupplier[]);
  }),

  http.post(`${API}/pricing/suppliers`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'sup-new-001', ...body, active: true }, { status: 201 });
  }),

  http.put(`${API}/pricing/suppliers/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: params.id, ...body });
  }),

  http.delete(`${API}/pricing/suppliers/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Margin Rules
  http.get(`${API}/pricing/margins`, () => {
    return HttpResponse.json([
      {
        id: 'mr-001',
        category: null,
        supplierId: null,
        supplierName: null,
        marginPct: 15.0,
        effectiveFrom: '2026-01-01',
        createdBy: 'system',
      },
      {
        id: 'mr-002',
        category: 'Clear Beer',
        supplierId: null,
        supplierName: null,
        marginPct: 20.0,
        effectiveFrom: '2026-01-01',
        createdBy: 'system',
      },
      {
        id: 'mr-003',
        category: 'Clear Beer',
        supplierId: 'sup-001',
        supplierName: 'Benju (PTY) LTD',
        marginPct: 18.5,
        effectiveFrom: '2026-02-01',
        createdBy: 'mark@yourmart.co.bw',
      },
    ] satisfies MarginRule[]);
  }),

  http.post(`${API}/pricing/margins`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: 'mr-new-001', ...body, supplierName: null, createdBy: 'test@yourmix.com' },
      { status: 201 },
    );
  }),

  http.put(`${API}/pricing/margins/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: params.id,
      ...body,
      supplierName: null,
      createdBy: 'test@yourmix.com',
    });
  }),

  http.delete(`${API}/pricing/margins/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Audit
  http.get(`${API}/audit`, ({ request }) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get('entityType') ?? '';
    const entityId = url.searchParams.get('entityId');
    return HttpResponse.json({
      content: [
        {
          id: 'audit-001',
          domain: 'pricing',
          action: 'CREATED',
          entityType,
          entityId,
          userId: 'system',
          oldValue: null,
          newValue: { name: {} } as AuditLogEntry['newValue'],
          createdAt: '2026-01-15T10:00:00Z',
        },
        {
          id: 'audit-002',
          domain: 'pricing',
          action: 'UPDATED',
          entityType,
          entityId,
          userId: 'mark@yourmart.co.bw',
          oldValue: { name: {} } as AuditLogEntry['oldValue'],
          newValue: { name: {} } as AuditLogEntry['newValue'],
          createdAt: '2026-02-01T14:30:00Z',
        },
      ],
      totalElements: 2,
      totalPages: 1,
      page: 0,
      size: 10,
    } satisfies AuditPage);
  }),

  // Revert
  http.post(`${API}/pricing/proposals/:id/revert`, () => {
    return HttpResponse.json({ reverted: 10, failed: 2 } satisfies RevertResponse);
  }),

  // Unmatched categories
  http.get(`${API}/pricing/categories/unmatched`, () => {
    return HttpResponse.json({
      categories: [
        { category: 'Spirits', occurrences: 12, lastSeenAt: '2026-02-28T10:00:00Z' },
        { category: 'Wines', occurrences: 5, lastSeenAt: '2026-02-25T14:00:00Z' },
        { category: 'Energy Drinks', occurrences: 3, lastSeenAt: '2026-02-20T09:00:00Z' },
      ],
      defaultMarginPct: 15.0,
    } satisfies UnmatchedCategoryResponse);
  }),

  // Failure summary
  http.get(`${API}/pricing/failures/summary`, () => {
    return HttpResponse.json({
      proposalsWithFailures: 1,
      totalFailedItems: 2,
    } satisfies FailureSummaryResponse);
  }),

  // Multi-supplier products
  http.get(`${API}/pricing/products/multi-supplier`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '0');
    return HttpResponse.json({
      content: [
        {
          cscartProductId: 1001,
          productName: 'Castle Lager 340ml x 24',
          currentPrice: 155.0,
          quotes: [
            {
              supplierName: 'Benju (PTY) LTD',
              costPrice: 120.0,
              proposedPrice: 155.0,
              proposalDate: '2026-02-15T10:00:00Z',
              proposalId: 'prop-001',
            },
            {
              supplierName: 'Bacardi Import',
              costPrice: 125.0,
              proposedPrice: 160.0,
              proposalDate: '2026-02-20T09:00:00Z',
              proposalId: 'prop-003',
            },
          ],
        },
        {
          cscartProductId: 1002,
          productName: 'Hansa Pilsener 330ml x 24',
          currentPrice: 140.0,
          quotes: [
            {
              supplierName: 'Benju (PTY) LTD',
              costPrice: 108.0,
              proposedPrice: 140.0,
              proposalDate: '2026-02-15T10:00:00Z',
              proposalId: 'prop-001',
            },
            {
              supplierName: 'Bacardi Import',
              costPrice: 105.0,
              proposedPrice: 136.0,
              proposalDate: '2026-02-20T09:00:00Z',
              proposalId: 'prop-003',
            },
          ],
        },
      ],
      totalElements: 2,
      totalPages: 1,
      page,
      size: 20,
    });
  }),

  // Upload
  http.post(`${API}/pricing/upload`, () => {
    return HttpResponse.json(
      {
        fileId: 'file-001',
        filename: 'test-upload.xlsx',
        status: 'PENDING',
      } satisfies UploadResponse,
      { status: 200 },
    );
  }),

  // Product summary
  http.get(`${API}/catalog/products/summary`, () => {
    return HttpResponse.json({
      totalProducts: 3,
      storefrontCounts: {
        REACHABLE: 1,
        UNREACHABLE: 1,
        HIDDEN: 1,
        DISABLED: 0,
      },
      issueCounts: {
        BELOW_COST: 1,
        PRICE_EQUALS_COST: 0,
        OOS_ACTIVE: 1,
        LOW_STOCK: 0,
        NO_IMAGE: 1,
        NO_COST: 0,
        NO_CATEGORY: 0,
        NO_SKU: 1,
        ZERO_WEIGHT: 1,
        LIST_BELOW_CURRENT: 0,
        NO_LIST_PRICE: 0,
        STALE: 1,
      },
      avgMarginPct: 21.3,
      mostRecentUpdate: '2026-03-01T00:00:00Z',
      duplicateSkus: [],
      categoryMedianPrices: { '2': 117.5, '5': 120.0 },
    } satisfies ProductSummary);
  }),

  // Catalog products (enriched with new fields)
  http.get(`${API}/catalog/products`, ({ request }) => {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const storefrontFilter = url.searchParams.get('storefrontStatus');
    const searchFilter = url.searchParams.get('search');
    const issueFilter = url.searchParams.get('issue');
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50');

    let filtered = [...allProducts];

    if (statusFilter) {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    if (storefrontFilter) {
      filtered = filtered.filter((p) => p.storefrontStatus === storefrontFilter);
    }
    if (searchFilter) {
      const term = searchFilter.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) || (p.sku?.toLowerCase().includes(term) ?? false),
      );
    }
    if (issueFilter === 'BELOW_COST') {
      filtered = filtered.filter(
        (p) => p.costPrice != null && p.currentPrice < p.costPrice && p.costPrice > 0,
      );
    }
    if (issueFilter === 'OOS_ACTIVE') {
      filtered = filtered.filter((p) => p.stockLevel === 0 && p.status === 'ACTIVE');
    }

    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      products: paged,
      page,
      pageSize,
      totalItems: filtered.length,
    } satisfies ProductPage);
  }),

  http.get(`${API}/catalog/identities/summary`, () => {
    const projectedProducts = allProducts.filter((product) => Boolean(product.sku));
    const ambiguousRows = projectedProducts.filter((product) => {
      const sku = product.sku;
      if (!sku) return false;
      return allProducts.filter((candidate) => candidate.sku === sku).length > 1;
    }).length;

    return HttpResponse.json({
      totalProjectedRows: projectedProducts.length,
      provisionalRows: projectedProducts.length,
      ambiguousRows,
      distinctCatalogSkus: new Set(projectedProducts.map((product) => product.sku)).size,
      productStatusCounts: {
        ACTIVE: projectedProducts.filter((product) => product.status === 'ACTIVE').length,
        HIDDEN: projectedProducts.filter((product) => product.status === 'HIDDEN').length,
        DISABLED: projectedProducts.filter((product) => product.status === 'DISABLED').length,
      },
    });
  }),

  http.get(`${API}/catalog/identities/:cscartProductId`, ({ params }) => {
    const cscartProductId = Number(params.cscartProductId);
    const product = allProducts.find((item) => item.cscartProductId === cscartProductId) ?? {
      cscartProductId,
      name: 'Castle Lager 340ml x 24',
      sku: 'CL-340-24',
      status: 'ACTIVE',
      updatedAt: '2026-03-01T00:00:00Z',
    };

    if (!product.sku) {
      return new HttpResponse(null, { status: 404 });
    }

    const catalogSkuOccurrenceCount = allProducts.filter((item) => item.sku === product.sku).length;

    return HttpResponse.json({
      cscartProductId,
      productName: product.name,
      catalogSku: product.sku,
      provisionalAcumaticaInventoryId: product.sku,
      productStatus: product.status,
      mappingRule: 'SKU_EQUALS_ACUMATICA_INVENTORY_ID',
      verificationStatus: 'PROVISIONAL',
      catalogSkuOccurrenceCount,
      ambiguous: catalogSkuOccurrenceCount > 1,
      catalogUpdatedAt: product.updatedAt ?? null,
    });
  }),

  // Catalog categories
  http.get(`${API}/catalog/categories`, () => {
    return HttpResponse.json({
      categories: [
        {
          id: 1,
          name: 'Beverages',
          parentId: null,
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
        {
          id: 3,
          name: 'Spirits',
          parentId: 1,
          level: 1,
          productCount: 30,
          seoName: 'spirits',
          status: 'A',
        },
        {
          id: 4,
          name: 'Electronics',
          parentId: null,
          level: 0,
          productCount: 20,
          seoName: 'electronics',
          status: 'A',
        },
        {
          id: 5,
          name: 'Soft Drinks',
          parentId: 1,
          level: 1,
          productCount: 25,
          seoName: 'soft-drinks',
          status: 'A',
        },
      ],
    } satisfies CategoryList);
  }),

  // Catalog vendors
  http.get(`${API}/catalog/vendors`, () => {
    return HttpResponse.json({
      vendors: [
        { id: 101, name: 'Benju (PTY) LTD', status: 'A' },
        { id: 102, name: 'The Liquor Shop', status: 'A' },
        { id: 103, name: 'Kgalagadi Breweries', status: 'A' },
      ],
    } satisfies VendorList);
  }),

  // Logistics pricing feed (customer tier data)
  http.get(`${API}/logistics/pricing-feed`, () => {
    return HttpResponse.json({
      customers: [
        { customerId: 'C-YM001', customerName: 'Shoppers II Maun', effectiveTier: 'WHOLESALE' },
        { customerId: 'C-YM002', customerName: 'Airport Spar', effectiveTier: 'RETAIL' },
        { customerId: 'C-YM003', customerName: 'Cash Carry Depot', effectiveTier: 'WHOLESALE' },
        { customerId: 'C-YM004', customerName: 'Unclassified Account', effectiveTier: '' },
      ],
    });
  }),

  // File status (for polling after upload)
  http.get(`${API}/pricing/files/:fileId/status`, ({ params }) => {
    return HttpResponse.json({
      fileId: String(params.fileId),
      filename: 'test-upload.xlsx',
      parseStatus: 'PARSED',
      parseError: null,
      proposalId: 'prop-new-001',
      uploadedAt: new Date().toISOString(),
    } satisfies FileStatusResponse);
  }),
];
