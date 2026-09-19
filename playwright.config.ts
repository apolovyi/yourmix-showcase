import { readFileSync, existsSync } from 'fs';
import { defineConfig } from '@playwright/test';

if (existsSync('.env.e2e.local')) {
  for (const line of readFileSync('.env.e2e.local', 'utf-8').split('\n')) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const BACKEND_URL = process.env.E2E_BACKEND ?? 'http://localhost:8050';

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3050',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev',
    port: 3050,
    reuseExistingServer: true,
    env: {
      VITE_API_URL: '/api',
      E2E_BACKEND: BACKEND_URL,
    },
  },
});
