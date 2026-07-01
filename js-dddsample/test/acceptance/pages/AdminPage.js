'use strict';

/**
 * AdminPage — Page Object for the admin cargo list.
 * Mirrors se.citerus.dddsample.acceptance.pages.AdminPage.
 */
function AdminPage(page) {
  return {
    async goto() {
      await page.goto('/admin');
      // Wait for the cargo list fetch to populate the table body
      await page.waitForSelector('#cargoBody tr', { timeout: 6000 }).catch(() => {});
    },

    /** @returns {boolean} whether the cargo table contains a row with the given tracking ID */
    async listedCargoContains(trackingId) {
      const cells = page.locator('#cargoBody td a');
      const texts = await cells.allTextContents();
      return texts.some(t => t.trim() === trackingId);
    },

    /** Click "Book new cargo" → CargoBookingPage */
    async bookNewCargo() {
      const CargoBookingPage = require('./CargoBookingPage');
      await page.click('a[href*="register.html"]');
      await page.waitForSelector('#bookForm', { state: 'visible', timeout: 6000 });
      // Wait for the location dropdowns to be populated
      await page.waitForFunction(
        () => {
          const sel = document.querySelector('#originUnlocode');
          return sel && sel.options.length > 1;
        },
        { timeout: 6000 },
      );
      return CargoBookingPage(page);
    },

    /** Click a tracking ID link → CargoDetailsPage */
    async showDetailsFor(trackingId) {
      const CargoDetailsPage = require('./CargoDetailsPage');
      await page.click(`a[href*="trackingId=${trackingId}"]`);
      await page.waitForURL('**/show.html**', { timeout: 6000 });
      // Wait for fetch to populate caption
      await page.waitForFunction(
        () => {
          const el = document.querySelector('#tableCaption');
          return el && el.textContent.trim().length > 0;
        },
        { timeout: 6000 },
      );
      return CargoDetailsPage(page);
    },
  };
}

module.exports = AdminPage;
