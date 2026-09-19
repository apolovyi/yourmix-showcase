import { useState, type ReactElement } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Pencil, Power, Trash2, Plus, AlertTriangle } from 'lucide-react';
import type { PricingSupplier, MarginRule } from '@/types';
import {
  useSuppliers,
  useMarginRules,
  useDeleteSupplier,
  useUpdateSupplier,
  useDeleteMarginRule,
  useUnmatchedCategories,
} from '@/hooks/queries';
import { DataTable, Badge, Skeleton, ErrorBanner } from '@/components/ui';
import { ConfirmDialog } from './ConfirmDialog';
import { AuditHistory } from './AuditHistory';
import { SupplierModal } from './SupplierModal';
import { MarginRuleModal } from './MarginRuleModal';
import { formatDateCompact } from '@/utils/date';

interface ConfirmAction {
  type: 'deactivate-supplier' | 'delete-rule';
  id: string;
  name: string;
}

const supplierColumnHelper = createColumnHelper<PricingSupplier>();
const ruleColumnHelper = createColumnHelper<MarginRule>();

const supplierColumns = [
  supplierColumnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  supplierColumnHelper.accessor('emailDomain', {
    header: 'Email Domain',
    cell: (info) => <span className="text-slate-400">{info.getValue() ?? '\u2014'}</span>,
  }),
  supplierColumnHelper.accessor('parserType', {
    header: 'Parser Type',
    cell: (info) => info.getValue(),
  }),
  supplierColumnHelper.display({
    id: 'active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge color={row.original.active ? 'green' : 'slate'}>
        {row.original.active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  }),
] as ColumnDef<PricingSupplier, unknown>[];

const ruleColumns = [
  ruleColumnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => info.getValue() ?? <span className="text-amber-400">Default (all)</span>,
  }),
  ruleColumnHelper.accessor('supplierName', {
    header: 'Supplier',
    cell: (info) => <span className="text-slate-400">{info.getValue() ?? '\u2014'}</span>,
  }),
  ruleColumnHelper.accessor('marginPct', {
    header: 'Margin %',
    cell: (info) => `${info.getValue()}%`,
  }),
  ruleColumnHelper.accessor('effectiveFrom', {
    header: 'Effective From',
    cell: (info) => formatDateCompact(info.getValue()),
  }),
] as ColumnDef<MarginRule, unknown>[];

export function PricingConfiguration(): ReactElement {
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [supplierModal, setSupplierModal] = useState<PricingSupplier | 'create' | null>(null);
  const [ruleModal, setRuleModal] = useState<MarginRule | 'create' | { preset: string } | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const {
    data: suppliers,
    isLoading: suppliersLoading,
    isError: suppliersError,
    refetch: refetchSuppliers,
  } = useSuppliers();
  const {
    data: marginRules,
    isLoading: rulesLoading,
    isError: rulesError,
    refetch: refetchRules,
  } = useMarginRules();
  const {
    data: unmatchedData,
    isLoading: unmatchedLoading,
    isError: unmatchedError,
  } = useUnmatchedCategories();
  const deleteSup = useDeleteSupplier();
  const updateSup = useUpdateSupplier();
  const deleteRule = useDeleteMarginRule();

  // Build supplier columns with actions (needs access to state setters and mutations)
  const supplierColumnsWithActions: ColumnDef<PricingSupplier, unknown>[] = [
    ...supplierColumns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 p-1"
            onClick={(e) => {
              e.stopPropagation();
              setSupplierModal(row.original);
            }}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="text-slate-400 hover:text-amber-400 p-1"
            onClick={(e) => {
              e.stopPropagation();
              if (row.original.active) {
                setConfirmAction({
                  type: 'deactivate-supplier',
                  id: row.original.id,
                  name: row.original.name,
                });
              } else {
                updateSup.mutate({
                  id: row.original.id,
                  data: {
                    name: row.original.name,
                    parserType: row.original.parserType,
                    active: true,
                  },
                });
              }
            }}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      ),
    } as ColumnDef<PricingSupplier, unknown>,
  ];

  const ruleColumnsWithActions: ColumnDef<MarginRule, unknown>[] = [
    ...ruleColumns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 p-1"
            onClick={(e) => {
              e.stopPropagation();
              setRuleModal(row.original);
            }}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="text-slate-400 hover:text-red-400 p-1"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmAction({
                type: 'delete-rule',
                id: row.original.id,
                name: row.original.category ?? 'Default',
              });
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    } as ColumnDef<MarginRule, unknown>,
  ];

  function handleConfirm(): void {
    if (!confirmAction) return;
    if (confirmAction.type === 'deactivate-supplier') {
      const sup = suppliers?.find((s) => s.id === confirmAction.id);
      if (sup) {
        deleteSup.mutate(confirmAction.id, {
          onSuccess: () => setConfirmAction(null),
        });
      }
    } else {
      deleteRule.mutate(confirmAction.id, {
        onSuccess: () => setConfirmAction(null),
      });
    }
  }

  return (
    <div className="space-y-8">
      {/* Unmatched Category Warnings */}
      {unmatchedLoading ? (
        <Skeleton className="h-20 rounded-lg" />
      ) : unmatchedError ? (
        <p className="text-xs text-red-400 mb-4">Could not load unmatched categories</p>
      ) : unmatchedData && unmatchedData.categories.length > 0 ? (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Unmatched Categories</span>
            {unmatchedData.defaultMarginPct !== null && (
              <span className="text-xs text-slate-500 ml-auto">
                Using default {unmatchedData.defaultMarginPct}% margin
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {unmatchedData.categories.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-300">{cat.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">seen {cat.occurrences} times</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    onClick={() => setRuleModal({ preset: cat.category })}
                  >
                    Create Rule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Suppliers Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Suppliers
          </h3>
          <button
            type="button"
            onClick={() => setSupplierModal('create')}
            className="flex items-center gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {suppliersLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ) : suppliersError ? (
          <ErrorBanner
            title="Failed to load suppliers"
            message="Could not retrieve supplier configuration."
            onRetry={() => void refetchSuppliers()}
          />
        ) : (
          <>
            <DataTable
              columns={supplierColumnsWithActions}
              data={suppliers ?? []}
              pageSize={Infinity}
              emptyMessage="No suppliers configured"
              onRowClick={(row) =>
                setExpandedSupplierId(expandedSupplierId === row.id ? null : row.id)
              }
            />
            {expandedSupplierId && (
              <div className="mt-2">
                <AuditHistory entityType="SUPPLIER" entityId={expandedSupplierId} />
              </div>
            )}
          </>
        )}
      </section>

      {/* Margin Rules Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Margin Rules
          </h3>
          <button
            type="button"
            onClick={() => setRuleModal('create')}
            className="flex items-center gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {rulesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ) : rulesError ? (
          <ErrorBanner
            title="Failed to load margin rules"
            message="Could not retrieve margin rule configuration."
            onRetry={() => void refetchRules()}
          />
        ) : (
          <>
            <DataTable
              columns={ruleColumnsWithActions}
              data={marginRules ?? []}
              pageSize={Infinity}
              emptyMessage="No margin rules configured"
              onRowClick={(row) => setExpandedRuleId(expandedRuleId === row.id ? null : row.id)}
            />
            {expandedRuleId && (
              <div className="mt-2">
                <AuditHistory entityType="MARGIN_RULE" entityId={expandedRuleId} />
              </div>
            )}
          </>
        )}
      </section>

      {/* Modals */}
      {supplierModal && (
        <SupplierModal
          supplier={supplierModal === 'create' ? undefined : supplierModal}
          onClose={() => setSupplierModal(null)}
        />
      )}
      {ruleModal && (
        <MarginRuleModal
          rule={
            ruleModal === 'create' || (typeof ruleModal === 'object' && 'preset' in ruleModal)
              ? undefined
              : ruleModal
          }
          suppliers={suppliers ?? []}
          initialCategory={
            typeof ruleModal === 'object' && 'preset' in ruleModal ? ruleModal.preset : undefined
          }
          onClose={() => setRuleModal(null)}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === 'deactivate-supplier' ? 'Deactivate Supplier' : 'Delete Rule'
          }
          message={`Are you sure you want to ${confirmAction.type === 'deactivate-supplier' ? 'deactivate' : 'delete'} "${confirmAction.name}"?`}
          confirmLabel={confirmAction.type === 'deactivate-supplier' ? 'Deactivate' : 'Delete'}
          confirmVariant="danger"
          isLoading={deleteSup.isPending || deleteRule.isPending}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
