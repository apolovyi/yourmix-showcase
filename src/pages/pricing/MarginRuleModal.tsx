import { useState, useEffect, useRef, type ReactElement, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useCreateMarginRule, useUpdateMarginRule, useCategories } from '@/hooks/queries';
import type { MarginRule, PricingSupplier } from '@/types';

interface MarginRuleModalProps {
  rule?: MarginRule;
  suppliers: PricingSupplier[];
  initialCategory?: string;
  onClose: () => void;
}

export function MarginRuleModal({
  rule,
  suppliers,
  initialCategory,
  onClose,
}: MarginRuleModalProps): ReactElement {
  const isEdit = !!rule;

  const [isDefault, setIsDefault] = useState(!rule?.category && !initialCategory);
  const [category, setCategory] = useState(rule?.category ?? initialCategory ?? '');
  const [supplierId, setSupplierId] = useState(rule?.supplierId ?? '');
  const [marginPct, setMarginPct] = useState(String(rule?.marginPct ?? ''));
  const [effectiveFrom, setEffectiveFrom] = useState(
    rule?.effectiveFrom ?? new Date().toISOString().split('T')[0],
  );

  const createMutation = useCreateMarginRule();
  const updateMutation = useUpdateMarginRule();
  const mutation = isEdit ? updateMutation : createMutation;
  const isPending = mutation.isPending;

  const { data: categories = [] } = useCategories();
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(category.toLowerCase()),
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPending, onClose]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleBackdropClick(): void {
    if (!isPending) {
      onClose();
    }
  }

  function handleDefaultChange(checked: boolean): void {
    setIsDefault(checked);
    if (checked) {
      setCategory('');
    }
  }

  function handleCategoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setShowDropdown(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filteredCategories.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      setCategory(filteredCategories[highlightIndex]);
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    const payload = {
      category: isDefault ? undefined : category || undefined,
      supplierId: supplierId || undefined,
      marginPct: parseFloat(marginPct),
      effectiveFrom,
    };

    if (isEdit) {
      updateMutation.mutate({ id: rule.id, data: payload }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose() });
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
          {isEdit ? 'Edit Margin Rule' : 'Add Margin Rule'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="margin-default"
                className="accent-amber-500"
                checked={isDefault}
                onChange={(e) => handleDefaultChange(e.target.checked)}
                disabled={isPending}
              />
              <label htmlFor="margin-default" className="text-xs text-slate-400">
                Default rule (applies to all)
              </label>
            </div>
            <div ref={dropdownRef}>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  className={inputClass}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setShowDropdown(true);
                    setHighlightIndex(-1);
                  }}
                  onFocus={() => !isDefault && setShowDropdown(true)}
                  onKeyDown={handleCategoryKeyDown}
                  disabled={isPending || isDefault}
                />
                {showDropdown && !isDefault && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat, i) => (
                        <div
                          key={cat}
                          className={`px-3 py-2 text-sm text-slate-300 cursor-pointer ${
                            i === highlightIndex ? 'bg-slate-700/50' : 'hover:bg-slate-700/50'
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCategory(cat);
                            setShowDropdown(false);
                            setHighlightIndex(-1);
                          }}
                          onMouseEnter={() => setHighlightIndex(i)}
                        >
                          {cat}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500 italic">
                        No matching categories
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Supplier</label>
              <select
                className={inputClass}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={isPending}
              >
                <option value="">&mdash; (any) &mdash;</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Margin %</label>
              <input
                type="number"
                className={inputClass}
                value={marginPct}
                onChange={(e) => setMarginPct(e.target.value)}
                min={0}
                step={0.1}
                required
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Effective From</label>
              <input
                type="date"
                className={inputClass}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
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
