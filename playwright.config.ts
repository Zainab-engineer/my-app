import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 180000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 60000,
    reuseExistingServer: true,
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
    },
  },
});
