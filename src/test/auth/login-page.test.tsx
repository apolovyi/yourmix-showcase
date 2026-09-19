import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, Navigate } from 'react-router';
import { renderWithProviders } from '../helpers/render';
import { Login } from '@/pages/Login';
import { useAuth } from '@/contexts/AuthContext';

function LoginGuard(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}

function TestLoginApp(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginGuard />} />
      <Route path="/" element={<div>Dashboard</div>} />
    </Routes>
  );
}

describe('Login page', () => {
  it('renders email and password fields with submit button', async () => {
    renderWithProviders(<TestLoginApp />, { route: '/login' });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestLoginApp />, { route: '/login' });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/bad credentials/i)).toBeInTheDocument();
    });
  });

  it('redirects to dashboard on successful login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestLoginApp />, { route: '/login' });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), 'mark@yourmart.co.bw');
    await user.type(screen.getByLabelText(/password/i), 'goodpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('redirects authenticated users away from /login', async () => {
    renderWithProviders(<TestLoginApp />, { route: '/login', authenticated: true });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
