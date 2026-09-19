import type { ReactElement } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  title?: string;
  onRetry?: () => void;
}

export function ErrorBanner({
  message,
  title = 'Error loading data',
  onRetry,
}: ErrorBannerProps): ReactElement {
  return (
    <div
      role="alert"
      className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="text-red-400 h-5 w-5" />
        <div>
          <p className="text-red-200 font-medium">{title}</p>
          <p className="text-red-300 text-sm">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}
