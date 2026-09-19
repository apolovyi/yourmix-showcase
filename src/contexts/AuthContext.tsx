import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import * as Sentry from '@sentry/react';
import {
  login as serviceLogin,
  logout as serviceLogout,
  refreshAuth,
  type AuthUser,
} from '@/services';

const AUTH_CACHE_KEY = 'ym_auth_user';

function getCachedUser(): AuthUser | null {
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    return cached ? (JSON.parse(cached) as AuthUser) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: AuthUser | null): void {
  if (user) {
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
  }
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [state, setState] = useState<AuthState>(() => {
    const cached = getCachedUser();
    return {
      isAuthenticated: !!cached,
      isLoading: !cached,
      error: null,
      user: cached,
    };
  });

  useEffect(() => {
    let ignore = false;
    const cached = getCachedUser();

    if (cached) {
      Sentry.setUser({ id: cached.employeeId, username: cached.displayName });
    }

    refreshAuth()
      .then((user) => {
        if (ignore) return;
        if (user) {
          cacheUser(user);
          Sentry.setUser({ id: user.employeeId, username: user.displayName });
          if (!cached || user.employeeId !== cached.employeeId) {
            setState({ isAuthenticated: true, isLoading: false, error: null, user });
          } else {
            setState((s) => (s.isLoading ? { ...s, isLoading: false } : s));
          }
        } else {
          cacheUser(null);
          setState({ isAuthenticated: false, isLoading: false, error: null, user: null });
        }
      })
      .catch(() => {
        if (ignore) return;
        if (!cached) {
          setState({ isAuthenticated: false, isLoading: false, error: null, user: null });
        }
      });

    return (): void => {
      ignore = true;
    };
  }, []);

  const handleLogin = useCallback(async (email: string, password: string): Promise<void> => {
    setState((s) => ({ ...s, error: null }));
    const user = await serviceLogin(email, password);
    cacheUser(user);
    setState({ isAuthenticated: true, isLoading: false, error: null, user });
    Sentry.setUser({ id: user.employeeId, username: user.displayName });
  }, []);

  const handleLogout = useCallback((): void => {
    Sentry.setUser(null);
    cacheUser(null);
    serviceLogout();
    setState({ isAuthenticated: false, isLoading: false, error: null, user: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, login: handleLogin, logout: handleLogout }),
    [state, handleLogin, handleLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
