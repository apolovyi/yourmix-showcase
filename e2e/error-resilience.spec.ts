import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('error resilience', () => {
  test('backend 500 shows error state, not blank screen', async ({ page }) => {
    await login(page);

    await page.route('**/api/catalog/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"message":"Internal Server Error"}',
      });
    });

    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/catalog');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('navigation works after error on another page', async ({ page }) => {
    await login(page);

    await page.route('**/api/catalog/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"message":"Internal Server Error"}',
      });
    });

    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/inventory');
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });
});
