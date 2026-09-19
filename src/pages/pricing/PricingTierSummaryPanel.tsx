import { useMemo, useState, type ChangeEvent, type ReactElement } from 'react';
import { BarChart3, Layers3, Search, Users, X } from 'lucide-react';
import { Badge, Card, ErrorBanner, Skeleton } from '@/components/ui';
import { usePricingFeedSummary } from '@/hooks/queries/usePricing';

function getTierBadgeColor(tier: string): 'amber' | 'blue' | 'green' | 'slate' {
  if (tier === 'UNASSIGNED') return 'amber';
  if (tier.toUpperCase().includes('RETAIL')) return 'blue';
  if (tier.toUpperCase().includes('KEY')) return 'green';
  return 'slate';
}

function getTierReadiness(
  tier: string,
  sampleCustomerCount: number,
): {
  key: 'samples-visible' | 'counts-only' | 'needs-mapping';
  label: string;
  color: 'amber' | 'blue' | 'slate';
  detail: string;
} {
  if (tier === 'UNASSIGNED') {
    return {
      key: 'needs-mapping',
      label: 'Needs mapping',
      color: 'amber',
      detail:
        'Accounts still land here and need explicit mapping before later tier-aware pricing checks.',
    };
  }

  if (sampleCustomerCount > 0) {
    return {
      key: 'samples-visible',
      label: 'Samples visible',
      color: 'blue',
      detail:
        'Feed includes sample accounts for operator review of this provisional foundation tier.',
    };
  }

  return {
    key: 'counts-only',
    label: 'Counts only',
    color: 'slate',
    detail:
      'Feed currently shows counts only, so this tier remains provisional until sample accounts appear.',
  };
}

type ReadinessFilter = 'all' | 'samples-visible' | 'counts-only' | 'needs-mapping';
type TierSortMode = 'readiness-priority' | 'largest-coverage' | 'alphabetical';

const READINESS_PRIORITY_ORDER: Record<Exclude<ReadinessFilter, 'all'>, number> = {
  'needs-mapping': 0,
  'counts-only': 1,
  'samples-visible': 2,
};

function compareTierLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function compareTierGroups(
  a: {
    tier: string;
    count: number;
    sampleCustomers: Array<{ customerId: string; customerName: string }>;
  },
  b: {
    tier: string;
    count: number;
    sampleCustomers: Array<{ customerId: string; customerName: string }>;
  },
  sortMode: TierSortMode,
): number {
  if (sortMode === 'largest-coverage') {
    return b.count - a.count || compareTierLabels(a.tier, b.tier);
  }

  if (sortMode === 'alphabetical') {
    return compareTierLabels(a.tier, b.tier);
  }

  const aReadiness = getTierReadiness(a.tier, a.sampleCustomers.length);
  const bReadiness = getTierReadiness(b.tier, b.sampleCustomers.length);

  return (
    READINESS_PRIORITY_ORDER[aReadiness.key] - READINESS_PRIORITY_ORDER[bReadiness.key] ||
    b.count - a.count ||
    compareTierLabels(a.tier, b.tier)
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactElement;
}): ReactElement {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-slate-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function PricingTierSummaryPanel(): ReactElement {
  const { data, isLoading, error, refetch, isFetching } = usePricingFeedSummary();
  const [searchQuery, setSearchQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const [tierSort, setTierSort] = useState<TierSortMode>('readiness-priority');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const readinessCounts = useMemo(() => {
    if (!data) {
      return {
        all: 0,
        'samples-visible': 0,
        'counts-only': 0,
        'needs-mapping': 0,
      } satisfies Record<ReadinessFilter, number>;
    }

    return data.tiers.reduce<Record<ReadinessFilter, number>>(
      (counts, tierGroup) => {
        const readiness = getTierReadiness(tierGroup.tier, tierGroup.sampleCustomers.length);

        counts.all += 1;
        counts[readiness.key] += 1;

        return counts;
      },
      {
        all: 0,
        'samples-visible': 0,
        'counts-only': 0,
        'needs-mapping': 0,
      },
    );
  }, [data]);
  const filteredTiers = useMemo(() => {
    if (!data) return [];

    return data.tiers.filter((tierGroup) => {
      const readiness = getTierReadiness(tierGroup.tier, tierGroup.sampleCustomers.length);
      const matchesReadiness = readinessFilter === 'all' || readiness.key === readinessFilter;

      if (!matchesReadiness) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      if (tierGroup.tier.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      return tierGroup.sampleCustomers.some(
        (customer) =>
          customer.customerName.toLowerCase().includes(normalizedQuery) ||
          customer.customerId.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [data, normalizedQuery, readinessFilter]);
  const sortedFilteredTiers = useMemo(
    () => [...filteredTiers].sort((a, b) => compareTierGroups(a, b, tierSort)),
    [filteredTiers, tierSort],
  );

  const matchingCustomerCount = sortedFilteredTiers.reduce(
    (sum, tierGroup) => sum + tierGroup.count,
    0,
  );
  const unassignedTierGroup = useMemo(
    () => data?.tiers.find((tierGroup) => tierGroup.tier === 'UNASSIGNED'),
    [data],
  );
  const mappedCustomerCount = data
    ? Math.max(data.totalCustomers - (unassignedTierGroup?.count ?? 0), 0)
    : 0;
  const mappedCoverageShare =
    data && data.totalCustomers > 0
      ? Math.round((mappedCustomerCount / Math.max(data.totalCustomers, 1)) * 100)
      : 0;
  const tierGroupsWithSamples = data
    ? data.tiers.filter((tierGroup) => tierGroup.sampleCustomers.length > 0).length
    : 0;
  const tierGroupsWithoutSamples = data
    ? data.tiers.filter((tierGroup) => tierGroup.sampleCustomers.length === 0).length
    : 0;
  const unassignedShare =
    data && unassignedTierGroup
      ? Math.round((unassignedTierGroup.count / Math.max(data.totalCustomers, 1)) * 100)
      : 0;
  const coverageReadinessNote =
    mappedCoverageShare === 100
      ? 'Every customer in the current feed already lands in an explicit pricing tier.'
      : mappedCoverageShare >= 80
        ? 'Most customers are mapped. Finish the remaining account mappings before leaning on later product × tier pricing.'
        : 'Tier assignment still needs cleanup before later product × tier pricing will be dependable.';

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
  };

  const readinessFilterMeta: Array<{
    value: ReadinessFilter;
    label: string;
    countLabel: string;
  }> = [
    {
      value: 'all',
      label: 'All readiness states',
      countLabel: `${readinessCounts.all} total`,
    },
    {
      value: 'samples-visible',
      label: 'Samples visible',
      countLabel: `${readinessCounts['samples-visible']} tier${readinessCounts['samples-visible'] === 1 ? '' : 's'}`,
    },
    {
      value: 'counts-only',
      label: 'Counts only',
      countLabel: `${readinessCounts['counts-only']} tier${readinessCounts['counts-only'] === 1 ? '' : 's'}`,
    },
    {
      value: 'needs-mapping',
      label: 'Needs mapping',
      countLabel: `${readinessCounts['needs-mapping']} tier${readinessCounts['needs-mapping'] === 1 ? '' : 's'}`,
    },
  ];
  const activeReadinessLabel =
    readinessFilterMeta.find((option) => option.value === readinessFilter)?.label ??
    'All readiness states';
  const tierSortMeta: Array<{
    value: TierSortMode;
    label: string;
  }> = [
    {
      value: 'readiness-priority',
      label: 'Readiness priority',
    },
    {
      value: 'largest-coverage',
      label: 'Largest customer coverage',
    },
    {
      value: 'alphabetical',
      label: 'Alphabetical',
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <BarChart3 size={18} className="text-cyan-400" /> Customer Pricing Tier Foundation
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Distribution of effective customer tiers from the logistics pricing feed. This is a
            customer-tier foundation only — not a live product × tier price matrix.
          </p>
        </div>

        {data && data.totalCustomers > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge color="blue">{data.totalCustomers} customers</Badge>
            <Badge color="slate">{data.tiers.length} active tiers</Badge>
          </div>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div aria-label="Loading pricing tier summary" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <p className="text-sm text-slate-500">Loading pricing tier feed…</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <ErrorBanner
              title="Pricing feed unavailable"
              message={error.message || 'Could not load the customer pricing feed.'}
              onRetry={() => {
                void refetch();
              }}
            />
            <p className="text-sm text-slate-500">
              Reports remain available, but this panel needs the logistics pricing feed to load.
            </p>
          </div>
        ) : !data || data.totalCustomers === 0 || data.tiers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-6">
            <p className="text-base font-medium text-slate-200">
              No customers are available in the current pricing feed.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Once the feed includes customer tier records, this panel will show tier counts and
              sample accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {unassignedTierGroup ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                      Unassigned tier spotlight
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-amber-50">
                      {unassignedTierGroup.count} customer
                      {unassignedTierGroup.count === 1
                        ? ' still needs explicit tier mapping'
                        : 's still need explicit tier mapping'}
                    </h4>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-100/80">
                      These accounts are still landing in the{' '}
                      <span className="font-semibold text-amber-50">UNASSIGNED</span> tier in this
                      customer-tier foundation feed, so they still need an explicit CS-Cart /
                      pricing-group mapping before later product-by-tier pricing work.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge color="amber">{unassignedTierGroup.count} unassigned</Badge>
                    <Badge color="slate">{unassignedShare}% of customers</Badge>
                  </div>
                </div>

                {unassignedTierGroup.sampleCustomers.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                      Examples from current feed
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {unassignedTierGroup.sampleCustomers.map((customer) => (
                        <li key={`unassigned-${customer.customerId}`}>
                          <span className="inline-flex rounded-full border border-amber-400/20 bg-slate-950/40 px-3 py-1 text-sm text-amber-50/90">
                            {customer.customerName} · {customer.customerId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-amber-100/70">
                    The feed shows unassigned customer counts, but no sample account names yet.
                  </p>
                )}
              </div>
            ) : null}

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    Tier assignment coverage
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-100">
                    {mappedCoverageShare}% of customers already map to an explicit tier
                  </h4>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    {coverageReadinessNote}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge color="blue">{mappedCustomerCount} mapped</Badge>
                  <Badge color="amber">{unassignedTierGroup?.count ?? 0} unassigned</Badge>
                </div>
              </div>

              <div
                aria-label="Tier assignment coverage progress"
                className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-cyan-400/80 transition-[width]"
                  style={{ width: `${Math.max(mappedCoverageShare, 8)}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {mappedCustomerCount} of {data.totalCustomers} customers are ready for downstream
                tier-aware pricing checks.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Per-tier readiness scan
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-100">
                    Compact operator view of how each tier group is showing up in the current feed
                  </h4>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Use this as a provisional customer-tier coverage check. It is still foundation
                    work only — not live product × tier sync.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge color="blue">
                    {tierGroupsWithSamples} tier{tierGroupsWithSamples === 1 ? '' : 's'} with
                    samples
                  </Badge>
                  <Badge color="slate">
                    {tierGroupsWithoutSamples} counts-only group
                    {tierGroupsWithoutSamples === 1 ? '' : 's'}
                  </Badge>
                  {unassignedTierGroup ? <Badge color="amber">1 needs mapping</Badge> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div
                  role="group"
                  aria-label="Filter pricing tiers by readiness"
                  className="flex flex-wrap gap-2"
                >
                  {readinessFilterMeta.map((option) => {
                    const isActive = readinessFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setReadinessFilter(option.value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                            : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                        }`}
                      >
                        <span>{option.label}</span>
                        <span className="text-xs text-current/70">{option.countLabel}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="flex flex-col gap-2 text-sm text-slate-300 lg:min-w-[16rem]">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Foundation sort
                  </span>
                  <select
                    aria-label="Sort pricing tier foundation views"
                    value={tierSort}
                    onChange={(event) => setTierSort(event.target.value as TierSortMode)}
                    className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {tierSortMeta.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Reorders this provisional foundation-only view using the loaded tier groups. It does
                not change backend tier mappings or future product × tier behavior.
              </p>

              <div
                role="list"
                aria-label="Pricing tier readiness results"
                className="mt-4 space-y-3"
              >
                {sortedFilteredTiers.map((tierGroup, idx) => {
                  const share = Math.round((tierGroup.count / data.totalCustomers) * 100);
                  const readiness = getTierReadiness(
                    tierGroup.tier,
                    tierGroup.sampleCustomers.length,
                  );

                  return (
                    <div
                      key={`readiness-${tierGroup.tier}-${idx}`}
                      role="listitem"
                      aria-label={tierGroup.tier}
                      className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge color={getTierBadgeColor(tierGroup.tier)}>
                              {tierGroup.tier}
                            </Badge>
                            <Badge color={readiness.color}>{readiness.label}</Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {readiness.detail}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                            {tierGroup.count} customer{tierGroup.count === 1 ? '' : 's'} · {share}%
                          </span>
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                            {tierGroup.sampleCustomers.length === 0
                              ? 'No samples yet'
                              : `${tierGroup.sampleCustomers.length} sample${tierGroup.sampleCustomers.length === 1 ? '' : 's'} visible`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SummaryStat
                label="Customers in feed"
                value={data.totalCustomers}
                icon={<Users size={18} />}
              />
              <SummaryStat
                label="Tier groups"
                value={data.tiers.length}
                icon={<Layers3 size={18} />}
              />
              <SummaryStat
                label="Largest tier"
                value={`${data.tiers[0]?.tier ?? 'UNASSIGNED'} · ${data.tiers[0]?.count ?? 0}`}
                icon={<BarChart3 size={18} />}
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex w-full flex-col gap-3 lg:max-w-2xl">
                <div className="relative w-full lg:max-w-sm">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleFilterChange}
                    aria-label="Filter pricing tiers"
                    placeholder="Filter tiers or sample customers"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      aria-label="Clear tier filter"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-200"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                <p className="text-xs text-slate-500">
                  Readiness focus: <span className="text-slate-300">{activeReadinessLabel}</span>
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Showing {filteredTiers.length} of {data.tiers.length} tier group
                {data.tiers.length === 1 ? '' : 's'} · {matchingCustomerCount} customer
                {matchingCustomerCount === 1 ? '' : 's'} in matching groups
              </p>
            </div>

            {sortedFilteredTiers.length > 0 ? (
              <div
                role="list"
                aria-label="Pricing tier foundation cards"
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              >
                {sortedFilteredTiers.map((tierGroup, idx) => {
                  const share = Math.round((tierGroup.count / data.totalCustomers) * 100);
                  return (
                    <div
                      key={`${tierGroup.tier}-${idx}`}
                      role="listitem"
                      aria-label={tierGroup.tier}
                      className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge color={getTierBadgeColor(tierGroup.tier)}>{tierGroup.tier}</Badge>
                          <p className="mt-3 text-sm text-slate-400">
                            Effective customer tier currently present in the backend feed.
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-3xl font-semibold text-slate-100">{tierGroup.count}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            customers · {share}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-400/80"
                          style={{ width: `${Math.max(share, 8)}%` }}
                        />
                      </div>

                      {tierGroup.sampleCustomers.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Sample customers
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {tierGroup.sampleCustomers.map((customer) => (
                              <li key={`${tierGroup.tier}-${customer.customerId}`}>
                                <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                                  {customer.customerName}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">
                          Feed returned counts for this tier without customer name samples.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-6">
                <p className="text-base font-medium text-slate-200">
                  No tier groups match the current readiness focus and search.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {searchQuery.trim()
                    ? `Try a different readiness state or adjust “${searchQuery.trim()}”.`
                    : `Try a different readiness state or return to ${activeReadinessLabel.toLowerCase()}.`}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
                    >
                      Clear search
                    </button>
                  ) : null}
                  {readinessFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => setReadinessFilter('all')}
                      className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
                    >
                      Show all readiness states
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4 text-sm text-slate-400">
              Use this panel to confirm customer-tier coverage before any future product-level tier
              pricing work.{' '}
              {isFetching ? <span className="text-slate-300">Refreshing…</span> : null}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
