import CargoDetailsPage from './CargoDetailsPage.js';

/**
 * CargoBookingPage — Page Object for the new cargo booking form.
 * Mirrors se.citerus.dddsample.acceptance.pages.CargoBookingPage.
 */
function CargoBookingPage(page) {
  return {
    async selectOrigin(unlocode) {
      await page.selectOption('#originUnlocode', { value: unlocode });
    },

    async selectDestination(unlocode) {
      await page.selectOption('#destinationUnlocode', { value: unlocode });
    },

    async selectArrivalDeadline(date) {
      const iso = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
      await page.fill('#arrivalDeadline', iso);
    },

    /** Submit the booking form → waits for redirect to show.html and content load */
    async book() {
      await page.click('button[type="submit"]');
      // The form handler does window.location.href = /views/admin/show.html?trackingId=...
      await page.waitForURL('**/show.html**', { timeout: 8000 });
      // Wait for the loadCargo() fetch to populate the caption
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

export default CargoBookingPage;
