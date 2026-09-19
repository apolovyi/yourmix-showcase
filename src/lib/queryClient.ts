import { QueryCache, QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { AuthError, NotFoundError } from '@/services/errors';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.captureException(error, {
        contexts: {
          query: { queryKey: JSON.stringify(query.queryKey) },
        },
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof AuthError || error instanceof NotFoundError) return false;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
