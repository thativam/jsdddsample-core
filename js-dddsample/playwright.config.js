// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — mirrors the Java acceptance test setup.
 *
 * Java used MockMvcHtmlUnitDriver with Spring Boot random port.
 * Here we start the Express server on a fixed port before tests run.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/acceptance',
  testMatch: '**/*.spec.js',

  /* Run tests sequentially — the in-memory store is shared per server process */
  workers: 1,
  fullyParallel: false,

  /* Each test gets a fresh browser context, but shares the server */
  use: {
    baseURL: 'http://localhost:3939',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  /* Start the Express server before all tests (mirrors @SpringBootTest) */
  webServer: {
    command: 'node src/server/app.js',
    url: 'http://localhost:3939',
    reuseExistingServer: false,
    env: { PORT: '3939' },
    timeout: 10_000,
  },
});
