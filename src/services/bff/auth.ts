export interface AuthUser {
  employeeId: string;
  displayName: string;
  email: string;
  roles: string[];
}

interface BackendUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface BackendLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendUserDto;
}

interface BackendRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

let accessToken: string | null = null;

function mapUser(dto: BackendUserDto): AuthUser {
  return {
    employeeId: dto.id,
    displayName: dto.name,
    email: dto.email,
    roles: [dto.role.toLowerCase()],
  };
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Login failed');
  }

  const data: BackendLoginResponse = await response.json();
  accessToken = data.accessToken;
  localStorage.setItem('refreshToken', data.refreshToken);
  return mapUser(data.user);
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    if (refreshToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearTokens();
  }
}

let refreshPromise: Promise<AuthUser | null> | null = null;

export function refreshAuth(): Promise<AuthUser | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return Promise.resolve(null);

  refreshPromise = (async (): Promise<AuthUser | null> => {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data: BackendRefreshResponse = await response.json();
    accessToken = data.accessToken;
    localStorage.setItem('refreshToken', data.refreshToken);

    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
    return {
      employeeId: payload.sub,
      displayName: payload.email,
      email: payload.email,
      roles: [payload.role.toLowerCase()],
    };
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearTokens(): void {
  accessToken = null;
  localStorage.removeItem('refreshToken');
}
