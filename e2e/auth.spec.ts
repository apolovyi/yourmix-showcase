import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('auth lifecycle', () => {
  test('login redirects to inventory', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/inventory');
  });

  test('reload preserves session without flicker', async ({ page }) => {
    await login(page);

    const urlsDuringReload: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        urlsDuringReload.push(new URL(frame.url()).pathname);
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/inventory');
    expect(urlsDuringReload).not.toContain('/login');
  });

  test('multiple reloads stay stable', async ({ page }) => {
    await login(page);

    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/inventory');
    }
  });

  test('logout clears session', async ({ page }) => {
    await login(page);

    await page.locator('button:has(.lucide-log-out)').click();
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    await page.goto('/inventory');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('expired refresh token redirects to login gracefully', async ({ page }) => {
    await login(page);

    await page.route('**/api/auth/refresh', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"message":"Token expired"}',
      });
    });

    await page.evaluate(() => localStorage.removeItem('refreshToken'));
    await page.reload();
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('deep link redirects back after login', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForURL('**/login');

    const email = process.env.E2E_EMAIL!;
    const password = process.env.E2E_PASSWORD!;
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/pricing');
    expect(page.url()).toContain('/pricing');
  });
});
