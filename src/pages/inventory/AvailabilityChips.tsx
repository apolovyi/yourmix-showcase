import type { ReactElement } from 'react';
import { AVAILABILITY_ISSUE_CONFIG, type AvailabilityIssue } from '@/utils/catalog';
import type { CatalogProduct } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-900/60 text-red-300 border-red-800/50',
  high: 'bg-amber-900/60 text-amber-300 border-amber-800/50',
};

interface AvailabilityChipsProps {
  issues: string[];
  product: CatalogProduct;
}

export function AvailabilityChips({
  issues,
  product,
}: AvailabilityChipsProps): ReactElement | null {
  if (issues.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {issues.map((issue) => {
        const config = AVAILABILITY_ISSUE_CONFIG[issue as AvailabilityIssue];
        if (!config) return null;
        return (
          <span
            key={issue}
            className={`text-[10px] font-medium px-1 py-0.5 rounded border ${SEVERITY_COLORS[config.severity]}`}
            title={config.tooltip(product)}
          >
            {config.label}
          </span>
        );
      })}
    </div>
  );
}
