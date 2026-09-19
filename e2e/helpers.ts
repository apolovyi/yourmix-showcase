import { type Page, expect } from '@playwright/test';

export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_EMAIL and E2E_PASSWORD must be set in .env.e2e');
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await expect(page.getByLabel('Email')).toHaveValue(email);

  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/inventory');
  expect(page.url()).toContain('/inventory');
}
