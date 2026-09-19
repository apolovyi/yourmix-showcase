import { describe, it, expect, beforeEach } from 'vitest';
import { login, logout, refreshAuth, getAccessToken, clearTokens } from '@/services/bff/auth';

describe('Auth service (MSW)', () => {
  beforeEach(() => {
    clearTokens();
    localStorage.clear();
  });

  describe('login', () => {
    it('should store tokens and return mapped user on success', async () => {
      const user = await login('mark@yourmart.co.bw', 'password123');

      expect(user.email).toBe('mark@yourmart.co.bw');
      expect(user.roles).toEqual(['admin']);
      expect(user.employeeId).toBe('EMP-001');
      expect(getAccessToken()).toBeTruthy();
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
    });

    it('should throw on invalid credentials', async () => {
      await expect(login('admin@test.com', 'wrong')).rejects.toThrow('Bad credentials');
      expect(getAccessToken()).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear tokens and call logout endpoint', async () => {
      await login('admin@test.com', 'pass');
      expect(getAccessToken()).toBeTruthy();

      await logout();

      expect(getAccessToken()).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('refreshAuth', () => {
    it('should refresh access token when refresh token exists', async () => {
      localStorage.setItem('refreshToken', 'valid-token');

      const user = await refreshAuth();

      expect(user).not.toBeNull();
      expect(user!.email).toBe('test@yourmix.com');
      expect(getAccessToken()).toBeTruthy();
    });

    it('should return null when no refresh token stored', async () => {
      const user = await refreshAuth();

      expect(user).toBeNull();
    });

    it('should clear tokens and return null on 401', async () => {
      localStorage.setItem('refreshToken', 'expired');

      const user = await refreshAuth();

      expect(user).toBeNull();
      expect(getAccessToken()).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens', async () => {
      await login('admin@test.com', 'pass');
      expect(getAccessToken()).toBeTruthy();

      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });
});
