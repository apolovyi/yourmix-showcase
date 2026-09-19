import type { ReactElement } from 'react';
import { ISSUE_REGISTRY, compareIssueSeverity, type QualityIssue } from '@/utils/catalog';

const MAX_VISIBLE = 2;
const PREVALENCE_THRESHOLD = 0.8;

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-900/60 text-red-300 border-red-800/50',
  warning: 'bg-amber-900/60 text-amber-300 border-amber-800/50',
  info: 'bg-slate-700/60 text-slate-300 border-slate-600/50',
};

interface IssueChipsProps {
  issues: QualityIssue[];
  prevalence?: Map<QualityIssue, number>;
}

export function IssueChips({ issues, prevalence }: IssueChipsProps): ReactElement | null {
  if (issues.length === 0) return null;

  const actionable = prevalence
    ? issues.filter((i) => (prevalence.get(i) ?? 0) < PREVALENCE_THRESHOLD)
    : issues;
  const suppressed = issues.length - actionable.length;

  if (actionable.length === 0) {
    return null;
  }

  // Sort by severity (critical first)
  const sorted = [...actionable].sort(compareIssueSeverity);
  const visible = sorted.length > MAX_VISIBLE ? sorted.slice(0, MAX_VISIBLE) : sorted;
  const hiddenCount = (sorted.length > MAX_VISIBLE ? sorted.length - MAX_VISIBLE : 0) + suppressed;

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {visible.map((issue) => {
        const config = ISSUE_REGISTRY[issue];
        return (
          <span
            key={issue}
            className={`text-[10px] font-semibold uppercase px-1 py-0.5 rounded border ${SEVERITY_COLORS[config.severity]}`}
          >
            {config.shortLabel}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span
          className="text-[10px] font-semibold text-slate-400 px-1 py-0.5"
          title={issues.map((i) => ISSUE_REGISTRY[i].label).join(', ')}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
