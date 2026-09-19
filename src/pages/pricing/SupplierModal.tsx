import { useState, useEffect, type ReactElement, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/queries';
import type { PricingSupplier } from '@/types';

interface SupplierModalProps {
  supplier?: PricingSupplier;
  onClose: () => void;
}

export function SupplierModal({ supplier, onClose }: SupplierModalProps): ReactElement {
  const isEdit = !!supplier;

  const [name, setName] = useState(supplier?.name ?? '');
  const [emailDomain, setEmailDomain] = useState(supplier?.emailDomain ?? '');
  const [fileFormat, setFileFormat] = useState(supplier?.fileFormat ?? '');
  const [parserType, setParserType] = useState(supplier?.parserType ?? 'benju');
  const [active, setActive] = useState(supplier?.active ?? true);

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const mutation = isEdit ? updateMutation : createMutation;
  const isPending = mutation.isPending;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPending, onClose]);

  function handleBackdropClick(): void {
    if (!isPending) {
      onClose();
    }
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(
        {
          id: supplier.id,
          data: {
            name,
            emailDomain: emailDomain || undefined,
            fileFormat: fileFormat || undefined,
            parserType,
            active,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(
        {
          name,
          emailDomain: emailDomain || undefined,
          fileFormat: fileFormat || undefined,
          parserType,
        },
        { onSuccess: () => onClose() },
      );
    }
  }

  const inputClass =
    'w-full bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md mx-4 p-6 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          {isEdit ? 'Edit Supplier' : 'Add Supplier'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email Domain</label>
              <input
                type="text"
                className={inputClass}
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">File Format</label>
              <input
                type="text"
                className={inputClass}
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Parser Type</label>
              <select
                className={inputClass}
                value={parserType}
                onChange={(e) => setParserType(e.target.value)}
                required
                disabled={isPending}
              >
                <option value="benju">benju</option>
                <option value="spirits-workbook">spirits-workbook</option>
              </select>
            </div>
            {isEdit && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="supplier-active"
                  className="accent-amber-500"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={isPending}
                />
                <label htmlFor="supplier-active" className="text-xs text-slate-400">
                  Active
                </label>
              </div>
            )}
          </div>
          {mutation.isError && (
            <p className="text-red-400 text-xs mt-2">
              {mutation.error?.message ?? 'An error occurred'}
            </p>
          )}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              disabled={isPending}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin w-4 h-4 mr-2 inline" />}
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
