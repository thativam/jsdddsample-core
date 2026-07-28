/**
 * Admin acceptance tests — mirrors AdminAcceptanceTest.java.
 *
 * Java: @SpringBootTest + MockMvcHtmlUnitDriver
 * JS:   Playwright + Express server (started by webServer in playwright.config.js)
 */
import { test, expect } from '@playwright/test';
import AdminPage from './pages/AdminPage.js';
import CargoBookingPage from './pages/CargoBookingPage.js';

// ─── adminSiteCargoListContainsCannedCargo ────────────────────────────────────
test('admin cargo list contains sample cargos ABC123 and JKL567', async ({ page }) => {
  const adminPage = AdminPage(page);
  await adminPage.goto();

  expect(await adminPage.listedCargoContains('ABC123')).toBe(true);
  expect(await adminPage.listedCargoContains('JKL567')).toBe(true);
});

// ─── adminSiteCanBookNewCargo ─────────────────────────────────────────────────
test('admin can book, view, reroute and change destination of new cargo', async ({ page }) => {
  const adminPage = AdminPage(page);
  await adminPage.goto();

  // Book new cargo: NLRTM → USDAL, deadline 3 weeks from now
  const bookingPage = await adminPage.bookNewCargo();
  await bookingPage.selectOrigin('NLRTM');
  await bookingPage.selectDestination('USDAL');
  const deadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
  await bookingPage.selectArrivalDeadline(deadline);
  let detailsPage = await bookingPage.book();

  // Grab the new tracking ID from the details page
  const newTrackingId = await detailsPage.getTrackingId();
  expect(newTrackingId).toBeTruthy();

  // New cargo should appear in the list
  const listPage = await detailsPage.listAllCargo();
  expect(await listPage.listedCargoContains(newTrackingId)).toBe(true);

  // Open details and verify origin/destination
  detailsPage = await listPage.showDetailsFor(newTrackingId);
  await detailsPage.expectOriginOf('NLRTM');
  await detailsPage.expectDestinationOf('USDAL');

  // Change destination to AUMEL
  const destPage = await detailsPage.changeDestination();
  detailsPage = await destPage.selectDestinationTo('AUMEL');
  await detailsPage.expectDestinationOf('AUMEL');
  await detailsPage.expectArrivalDeadlineOf(deadline);

  // Route the cargo
  await detailsPage.expectRoutedOf('Not routed');
  const routingPage = await detailsPage.routeCargo();
  await routingPage.expectAtLeastOneRoute();
  const routedDetails = await routingPage.assignCargoToFirstRoute();
  await routedDetails.expectItinerary();
});
