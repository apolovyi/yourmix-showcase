/* eslint-disable react-refresh/only-export-components */
import * as Sentry from '@sentry/react';
import { lazy, type ReactElement } from 'react';
import { Navigate, useLocation, useRouteError } from 'react-router';
import { sentryCreateBrowserRouter } from './lib/sentry';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './app/Layout';
import { Login } from './pages/Login';

const Inventory = lazy(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })));
const Catalog = lazy(() => import('./pages/Catalog').then((m) => ({ default: m.Catalog })));
const PricingPage = lazy(() =>
  import('./pages/PricingDashboard').then((m) => ({ default: m.PricingPage })),
);
const ProposalReview = lazy(() =>
  import('./pages/ProposalReview').then((m) => ({ default: m.ProposalReview })),
);
const AIAssistant = lazy(() =>
  import('./pages/AIAssistant').then((m) => ({ default: m.AIAssistant })),
);

function RouteErrorPage(): ReactElement {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  Sentry.captureException(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-slate-700">
        <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 mb-4">{message}</p>
        <a href="/" className="text-blue-400 hover:text-blue-300">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

function AuthGuard(): ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout />;
}

function LoginGuard(): ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from;
    const returnTo = from ? from.pathname + (from.search || '') : '/';
    return <Navigate to={returnTo} replace />;
  }

  return <Login />;
}

export const router = sentryCreateBrowserRouter([
  {
    path: '/login',
    element: <LoginGuard />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <AuthGuard />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/inventory" replace /> },
      { path: 'inventory', element: <Inventory /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'pricing/proposals/:id', element: <ProposalReview /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'ai', element: <AIAssistant /> },
    ],
  },
]);
