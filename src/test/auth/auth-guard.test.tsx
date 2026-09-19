import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route, Navigate, Outlet } from 'react-router';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../helpers/render';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://test-api/api';

function AuthGuard(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function TestApp(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route element={<AuthGuard />}>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/pricing" element={<div>Pricing Page</div>} />
      </Route>
    </Routes>
  );
}

describe('Auth guard', () => {
  it('redirects unauthenticated users to /login', async () => {
    server.use(
      http.post(`${API}/auth/refresh`, () => {
        return HttpResponse.json({ message: 'No token' }, { status: 401 });
      }),
    );

    renderWithProviders(<TestApp />, { route: '/pricing' });

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('shows loading state while auth resolves', () => {
    renderWithProviders(<TestApp />, { route: '/', authenticated: true });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', async () => {
    renderWithProviders(<TestApp />, { route: '/', authenticated: true });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('renders correct page for nested protected route', async () => {
    renderWithProviders(<TestApp />, { route: '/pricing', authenticated: true });

    await waitFor(() => {
      expect(screen.getByText('Pricing Page')).toBeInTheDocument();
    });
  });

  it('redirects to /login when refresh token is expired', async () => {
    localStorage.setItem('refreshToken', 'expired');

    renderWithProviders(<TestApp />, { route: '/' });

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
