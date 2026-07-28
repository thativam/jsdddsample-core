/**
 * Customer acceptance tests — mirrors CustomerAcceptanceTest.java.
 *
 * Java: @SpringBootTest + MockMvcHtmlUnitDriver
 * JS:   Playwright + Express server (started by webServer in playwright.config.js)
 */
import { test, expect } from '@playwright/test';
import CustomerPage from './pages/CustomerPage.js';

test.beforeEach(async ({ page }) => {
  const customerPage = CustomerPage(page);
  await customerPage.goto();
});

// ─── customerSiteCanTrackValidCargo ──────────────────────────────────────────
test('customer can track a valid cargo and see its current location', async ({ page }) => {
  const customerPage = CustomerPage(page);

  await customerPage.trackCargoWithIdOf('ABC123');

  // ABC123 was last unloaded in New York (from sample data)
  await customerPage.expectCargoLocation('New York');
});

// ─── customerSiteErrorsOnInvalidCargo ────────────────────────────────────────
test('customer sees error message for unknown tracking ID', async ({ page }) => {
  const customerPage = CustomerPage(page);

  await customerPage.trackCargoWithIdOf('XXX999');

  await customerPage.expectErrorFor('Unknown tracking id');
});

// ─── customerSiteNotifiesOnMisdirectedCargo ───────────────────────────────────
test('customer sees misdirected notification for JKL567', async ({ page }) => {
  const customerPage = CustomerPage(page);

  await customerPage.trackCargoWithIdOf('JKL567');

  await customerPage.expectNotificationOf('Cargo is misdirected');
});
