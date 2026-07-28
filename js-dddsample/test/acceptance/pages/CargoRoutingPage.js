import CargoDetailsPage from './CargoDetailsPage.js';

/**
 * CargoRoutingPage — Page Object for route selection.
 * Mirrors se.citerus.dddsample.acceptance.pages.CargoRoutingPage.
 */
function CargoRoutingPage(page) {
  return {
    /** Assert at least one candidate route is listed */
    async expectAtLeastOneRoute() {
      // routeForm is shown (visible) only after fetch returns candidates
      await page.waitForSelector('#routeForm', { state: 'visible', timeout: 6000 });
      const radios = page.locator('input[name="itineraryIdx"]');
      const count  = await radios.count();
      if (count === 0) throw new Error('Expected at least one route candidate, found none');
    },

    /** Select the first route and submit → CargoDetailsPage */
    async assignCargoToFirstRoute() {
      await page.click('input[name="itineraryIdx"][value="0"]');
      await page.click('button[type="submit"]');
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

export default CargoRoutingPage;
