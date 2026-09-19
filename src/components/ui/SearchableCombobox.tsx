import { useState, useRef, useEffect, type ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder,
}: SearchableComboboxProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = value ? options.find((o) => o.value === value)?.label : undefined;

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Total items = "All" option + filtered options
  const totalItems = filtered.length + 1;

  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearch('');
    }
  }, [open]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  function scrollToHighlighted(index: number): void {
    const listEl = listRef.current;
    if (!listEl) return;
    const items = listEl.querySelectorAll('[data-combobox-option]');
    const item = items[index];
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (highlightedIndex + 1) % totalItems;
      setHighlightedIndex(next);
      scrollToHighlighted(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (highlightedIndex - 1 + totalItems) % totalItems;
      setHighlightedIndex(next);
      scrollToHighlighted(next);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        // "All" option
        handleSelect('');
      } else {
        const option = filtered[highlightedIndex - 1];
        if (option) handleSelect(option.value);
      }
    }
  }

  function handleSelect(val: string): void {
    onChange(val);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm min-w-[140px] hover:border-slate-500 transition-colors"
      >
        <span className={`flex-1 text-left truncate ${!selectedLabel ? 'text-slate-400' : ''}`}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-slate-100 px-2 py-1 rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div ref={listRef} className="max-h-[300px] overflow-y-auto">
            <button
              type="button"
              data-combobox-option
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                highlightedIndex === 0 ? 'bg-slate-700' : ''
              } ${!value ? 'text-amber-400 font-medium' : 'text-slate-400'}`}
              onMouseEnter={() => setHighlightedIndex(0)}
            >
              {placeholder}
            </button>
            {filtered.map((option, idx) => (
              <button
                key={option.value}
                type="button"
                data-combobox-option
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  highlightedIndex === idx + 1 ? 'bg-slate-700' : ''
                } ${option.value === value ? 'text-amber-400 font-medium' : 'text-slate-300'}`}
                onMouseEnter={() => setHighlightedIndex(idx + 1)}
              >
                {option.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
