import { test, expect, type ConsoleMessage } from '@playwright/test';
import { login } from './helpers';

const routes = [
  { path: '/inventory', name: 'Inventory' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/catalog', name: 'Catalog' },
  { path: '/ai', name: 'AI Assistant' },
];

const IGNORED_ERRORS = [/download the react devtools/i, /\[vite\]/i];

test.describe('route smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of routes) {
    test(`${route.name} page loads`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!IGNORED_ERRORS.some((re) => re.test(text))) {
            consoleErrors.push(text);
          }
        }
      });

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain(route.path);
      await expect(page.getByText('Something went wrong')).not.toBeVisible();
      expect(
        consoleErrors,
        `Console errors on ${route.path}:\n${consoleErrors.join('\n')}`,
      ).toHaveLength(0);
    });
  }
});
