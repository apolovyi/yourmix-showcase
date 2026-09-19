import { useEffect, type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onCancel]);

  function handleBackdropClick(): void {
    if (!isLoading) {
      onCancel();
    }
  }

  const confirmClasses =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50'
      : 'bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="button" className={confirmClasses} disabled={isLoading} onClick={onConfirm}>
            {isLoading && <Loader2 className="animate-spin w-4 h-4 mr-2 inline" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
