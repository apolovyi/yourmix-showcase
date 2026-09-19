import type { ReactElement } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export function FullPageLoader({ message = 'Loading...' }: { message?: string }): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-slate-400 text-sm">{message}</p>
    </div>
  );
}
