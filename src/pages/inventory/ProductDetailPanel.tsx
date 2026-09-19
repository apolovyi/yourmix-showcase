import type { ReactElement } from 'react';
import { ExternalLink, Tag, Truck, MapPin, Scale, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatDate } from '@/utils/date';
import { buildStorefrontUrl } from '@/utils/storefront-url';
import type { CatalogProduct, CatalogCategory, CatalogVendor } from '@/types';

interface ProductDetailPanelProps {
  product: CatalogProduct;
  categories: CatalogCategory[];
  vendors: CatalogVendor[];
}

function buildCategoryPath(categoryIds: number[], categories: CatalogCategory[]): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const names: string[] = [];

  for (const id of categoryIds) {
    const cat = categoryMap.get(id);
    if (cat) {
      // Walk up to root via parentId
      const chain: string[] = [];
      let current: CatalogCategory | undefined = cat;
      while (current) {
        chain.unshift(current.name);
        current = current.parentId != null ? categoryMap.get(current.parentId) : undefined;
      }
      names.push(chain.join(' > '));
    }
  }

  // Deduplicate — a product in "Clear Beer" (child of "Beverages") may list both IDs
  const unique = [...new Set(names)];
  return unique.join(', ') || '\u2014';
}

function getVendorName(vendorId: number | undefined, vendors: CatalogVendor[]): string {
  if (vendorId === undefined) return '\u2014';
  const vendor = vendors.find((v) => v.id === vendorId);
  return vendor?.name ?? `Vendor #${vendorId}`;
}

export function ProductDetailPanel({
  product,
  categories,
  vendors,
}: ProductDetailPanelProps): ReactElement {
  const vendorName = getVendorName(product.vendorId ?? undefined, vendors);
  const categoryPath = buildCategoryPath(product.categoryIds, categories);
  const storefrontUrl = buildStorefrontUrl(product, categories);

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-5">
      <h4 className="text-sm font-semibold text-slate-300 mb-4">Product Details</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {/* Vendor */}
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Vendor</p>
            <p className="text-slate-300">{vendorName}</p>
          </div>
        </div>

        {/* Category */}
        <div className="flex items-start gap-2">
          <Tag size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Category</p>
            <p className="text-slate-300">{categoryPath}</p>
          </div>
        </div>

        {/* Weight */}
        <div className="flex items-start gap-2">
          <Scale size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Weight</p>
            <p className="text-slate-300">
              {product.weight !== undefined && product.weight !== null
                ? `${product.weight} kg`
                : '\u2014'}
            </p>
          </div>
        </div>

        {/* Tracking Mode */}
        <div className="flex items-start gap-2">
          <Truck size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Tracking</p>
            <p className="text-slate-300">{product.trackingMode ?? '\u2014'}</p>
          </div>
        </div>

        {/* Order Constraints */}
        <div className="flex items-start gap-2">
          <Tag size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Order Qty</p>
            <p className="text-slate-300">
              Min: {product.minQty ?? '\u2014'} / Max: {product.maxQty ?? '\u2014'} / Step:{' '}
              {product.qtyStep ?? '\u2014'}
            </p>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-start gap-2">
          <Calendar size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Created</p>
            <p className="text-slate-300">
              {product.createdAt ? formatDate(product.createdAt) : '\u2014'}
            </p>
            <p className="text-xs text-slate-500 uppercase font-medium mt-1">Updated</p>
            <p className="text-slate-300">
              {product.updatedAt ? formatDate(product.updatedAt) : '\u2014'}
            </p>
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-2 mt-4">
        {product.botswanaMade && <Badge color="green">Botswana Made</Badge>}
        {product.discount && <Badge color="amber">On Discount</Badge>}
        {product.sameDayDelivery && <Badge color="blue">Same-Day Delivery</Badge>}
        {product.freeShipping && <Badge color="slate">Free Shipping</Badge>}
      </div>

      {/* Storefront Link */}
      {storefrontUrl && (
        <div className="mt-4">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ExternalLink size={14} />
            View on storefront
          </a>
        </div>
      )}
    </div>
  );
}
