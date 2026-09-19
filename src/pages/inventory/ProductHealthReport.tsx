import { useState, type ReactElement } from 'react';
import { ExternalLink, Pencil, AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import {
  computeProductIssues,
  compareIssueSeverity,
  getIssueValue,
  ISSUE_REGISTRY,
  formatRelativeTime,
  type IssueDetectionContext,
} from '@/utils/catalog';
import { buildStorefrontUrl } from '@/utils/storefront-url';
import { PriceHistoryPanel } from '@/pages/pricing/PriceHistoryPanel';
import { formatDate } from '@/utils/date';
import type { CatalogProduct, CatalogCategory, CatalogVendor } from '@/types';

interface ProductHealthReportProps {
  product: CatalogProduct;
  categories: CatalogCategory[];
  vendors: CatalogVendor[];
  issueContext: IssueDetectionContext;
}

const SEVERITY_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const SEVERITY_COLORS = {
  critical: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
} as const;

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  P: 'Product',
  V: 'Variant',
};

const OOS_ACTION_SHORT: Record<string, string> = {
  N: 'Block',
  S: 'Notification',
  B: 'Backorder',
};

function buildCategoryPath(categoryIds: number[], categories: CatalogCategory[]): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const names: string[] = [];

  for (const id of categoryIds) {
    const cat = categoryMap.get(id);
    if (cat) {
      const chain: string[] = [];
      let current: CatalogCategory | undefined = cat;
      while (current) {
        chain.unshift(current.name);
        current = current.parentId != null ? categoryMap.get(current.parentId) : undefined;
      }
      names.push(chain.join(' > '));
    }
  }

  const unique = [...new Set(names)];
  return unique.join(', ') || '\u2014';
}

function getVendorName(vendorId: number | undefined, vendors: CatalogVendor[]): string {
  if (vendorId === undefined) return '\u2014';
  const vendor = vendors.find((v) => v.id === vendorId);
  return vendor?.name ?? `Vendor #${vendorId}`;
}

export function ProductHealthReport({
  product,
  categories,
  vendors,
  issueContext,
}: ProductHealthReportProps): ReactElement {
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  const issues = computeProductIssues(product, issueContext).sort(compareIssueSeverity);
  const vendorName = getVendorName(product.vendorId ?? undefined, vendors);
  const categoryPath = buildCategoryPath(product.categoryIds, categories);
  const storefrontUrl = buildStorefrontUrl(product, categories);
  const cscartUrl = `https://dev.yourmart.co.bw/ym-admin.php?dispatch=products.update&product_id=${product.cscartProductId}`;

  const productTypeLabel = product.productType
    ? (PRODUCT_TYPE_LABELS[product.productType] ?? product.productType)
    : null;

  const oosActionLabel = product.outOfStockActions
    ? (OOS_ACTION_SHORT[product.outOfStockActions] ?? product.outOfStockActions)
    : null;

  const hasDimensions =
    (product.length !== null && product.length !== undefined) ||
    (product.width !== null && product.width !== undefined) ||
    (product.height !== null && product.height !== undefined);

  return (
    <div className="px-4 py-3 space-y-3 bg-slate-900/30">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-400 truncate">
          <span>{vendorName}</span>
          <span className="mx-1.5 text-slate-600">&middot;</span>
          <span>{categoryPath}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={cscartUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Pencil size={13} />
            Edit in CS-Cart
          </a>
          {storefrontUrl && (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              <ExternalLink size={13} />
              Storefront
            </a>
          )}
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-700/50">
            <span className="text-xs font-medium text-slate-400 uppercase">
              Issues ({issues.length})
            </span>
          </div>
          <div className="divide-y divide-slate-700/30">
            {issues.map((issue) => {
              const config = ISSUE_REGISTRY[issue];
              const Icon = SEVERITY_ICONS[config.severity];
              const value = getIssueValue(issue, product);
              return (
                <div key={issue} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={`shrink-0 ${SEVERITY_COLORS[config.severity]}`} />
                    <span className="text-sm font-medium text-slate-200">{config.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 ml-[22px]">{config.impact}</p>
                  <p className="text-xs text-slate-600 font-mono mt-0.5 ml-[22px]">{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-slate-500 space-y-0.5">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <span>Created {product.createdAt ? formatDate(product.createdAt) : '\u2014'}</span>
          <span>
            Updated {product.updatedAt ? formatRelativeTime(product.updatedAt) : '\u2014'}
          </span>
          <span>Tracking: {product.trackingMode ?? '\u2014'}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <span>
            Qty: min {product.minQty ?? '\u2014'} / max {product.maxQty ?? '\u2014'} / step{' '}
            {product.qtyStep ?? '\u2014'}
          </span>
          {productTypeLabel && <span>Type: {productTypeLabel}</span>}
          {oosActionLabel && <span>OOS action: {oosActionLabel}</span>}
          {hasDimensions && (
            <span>
              Dimensions: {product.length ?? '\u2014'} &times; {product.width ?? '\u2014'} &times;{' '}
              {product.height ?? '\u2014'}
            </span>
          )}
        </div>
      </div>

      {/* Price History (collapsible) */}
      <div>
        <button
          type="button"
          onClick={(): void => setShowPriceHistory(!showPriceHistory)}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <ChevronRight
            size={14}
            className={`transition-transform duration-150 ${showPriceHistory ? 'rotate-90' : ''}`}
          />
          Price History
        </button>
        {showPriceHistory && (
          <div className="mt-2">
            <PriceHistoryPanel
              cscartProductId={product.cscartProductId}
              productName={product.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}
