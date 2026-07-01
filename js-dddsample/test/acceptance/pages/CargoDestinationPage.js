'use strict';

/**
 * CargoDestinationPage — Page Object for the change destination form.
 * Mirrors se.citerus.dddsample.acceptance.pages.CargoDestinationPage.
 */
function CargoDestinationPage(page) {
  return {
    /** Select a new destination and submit → CargoDetailsPage */
    async selectDestinationTo(unlocode) {
      const CargoDetailsPage = require('./CargoDetailsPage');
      // Wait for the locations fetch to populate the dropdown
      await page.waitForFunction(
        () => {
          const sel = document.querySelector('#destinationUnlocode');
          return sel && sel.options.length > 1;
        },
        { timeout: 6000 },
      );
      await page.selectOption('#destinationUnlocode', { value: unlocode });
      await page.click('button[type="submit"]');
      // Handler does window.location.href = /views/admin/show.html?trackingId=...
      await page.waitForURL('**/show.html**', { timeout: 8000 });
      await page.waitForFunction(
        () => {
          const el = document.querySelector('#tableCaption');
          return el && el.textContent.trim().length > 0;
        },
        { timeout: 8000 },
      );
      return CargoDetailsPage(page);
    },
  };
}

module.exports = CargoDestinationPage;
