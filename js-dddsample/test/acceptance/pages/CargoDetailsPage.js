import CargoDestinationPage from './CargoDestinationPage.js';
import CargoRoutingPage from './CargoRoutingPage.js';
import AdminPage from './AdminPage.js';

/**
 * CargoDetailsPage — Page Object for the cargo detail view.
 * Mirrors se.citerus.dddsample.acceptance.pages.CargoDetailsPage.
 */
function CargoDetailsPage(page) {

  /** Wait for the page's loadCargo() fetch to populate #tableCaption */
  async function waitForContent() {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#tableCaption');
        return el && el.textContent.trim().length > 0;
      },
      { timeout: 6000 },
    );
  }

  /** Wait until a link's href is no longer a same-page anchor */
  async function waitForHref(selector) {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.getAttribute('href') && !el.getAttribute('href').startsWith('#');
      },
      selector,
      { timeout: 6000 },
    );
  }

  return {
    /** @returns {string} tracking ID from the page caption */
    async getTrackingId() {
      await waitForContent();
      const caption = await page.textContent('#tableCaption');
      return caption.trim().split(' ').pop();
    },

    async expectOriginOf(unlocode) {
      await waitForContent();
      const text = await page.textContent('#origin');
      if (!text.includes(unlocode)) {
        throw new Error(`Expected origin to contain "${unlocode}", got "${text}"`);
      }
    },

    async expectDestinationOf(unlocode) {
      await waitForContent();
      const text = await page.textContent('#finalDestination');
      if (!text.includes(unlocode)) {
        throw new Error(`Expected destination to contain "${unlocode}", got "${text}"`);
      }
    },

    async expectArrivalDeadlineOf(date) {
      await waitForContent();
      const iso = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
      const text = await page.textContent('#arrivalDeadline');
      if (!text.includes(iso)) {
        throw new Error(`Expected deadline to contain "${iso}", got "${text}"`);
      }
    },

    async expectRoutedOf(expectedText) {
      await waitForContent();
      const noIt  = page.locator('#noItinerarySection');
      const itSec = page.locator('#itinerarySection');
      const noItVisible = await noIt.isVisible();
      const itVisible   = await itSec.isVisible();
      if (expectedText === 'Not routed' && !noItVisible) {
        throw new Error('Expected cargo to be "Not routed" but itinerary section is visible');
      }
      if (expectedText !== 'Not routed' && !itVisible) {
        throw new Error(`Expected routing "${expectedText}" but no itinerary section visible`);
      }
    },

    async expectItinerary() {
      await page.waitForSelector('#itinerarySection', { state: 'visible', timeout: 6000 });
      const rows = page.locator('#legBody tr');
      const count = await rows.count();
      if (count === 0) throw new Error('Expected itinerary legs to be shown');
    },

    /** Click "Change destination" → CargoDestinationPage */
    async changeDestination() {
      // href starts as "#"; set async by loadCargo() — wait for the real path
      await waitForHref('#changeDestLink');
      await page.click('#changeDestLink');
      await page.waitForSelector('#destForm', { state: 'visible', timeout: 6000 });
      return CargoDestinationPage(page);
    },

    /** Click "Route this cargo" → CargoRoutingPage */
    async routeCargo() {
      await waitForHref('#routeLink');
      await page.click('#routeLink');
      // Wait for routing page fetch to finish: form visible (routes found) or no-routes visible
      await Promise.race([
        page.waitForSelector('#routeForm', { state: 'visible', timeout: 8000 }),
        page.waitForSelector('#noRoutes',  { state: 'visible', timeout: 8000 }),
      ]);
      return CargoRoutingPage(page);
    },

    /** Click "List all cargos" → AdminPage */
    async listAllCargo() {
      await page.click('a[href*="list.html"]');
      await page.waitForSelector('#cargoBody tr', { timeout: 6000 });
      return AdminPage(page);
    },
  };
}

export default CargoDetailsPage;
