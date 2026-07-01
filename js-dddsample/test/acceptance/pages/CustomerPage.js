'use strict';

/**
 * CustomerPage — Page Object for the public cargo tracking UI.
 * Mirrors se.citerus.dddsample.acceptance.pages.CustomerPage.
 */
function CustomerPage(page) {
  return {
    async goto() {
      await page.goto('/');
      await page.waitForSelector('#idInput');
    },

    /** Enter tracking ID and click Track */
    async trackCargoWithIdOf(trackingId) {
      await page.fill('#idInput', trackingId);
      await page.click('button');
      // Wait for either a result or an error
      await page.waitForSelector('#result, #errorMsg:visible', { timeout: 5000 });
    },

    /**
     * Assert that the status/location text contains the expected string.
     * Mirrors customerPage.expectCargoLocation("New York").
     */
    async expectCargoLocation(locationName) {
      await page.waitForSelector('#result', { state: 'visible', timeout: 3000 });
      const statusText = await page.textContent('#statusText');
      if (!statusText.includes(locationName)) {
        throw new Error(`Expected status to contain "${locationName}", got "${statusText}"`);
      }
    },

    /**
     * Assert an error message is shown containing the expected text.
     * Mirrors customerPage.expectErrorFor("Unknown tracking id").
     */
    async expectErrorFor(expectedText) {
      await page.waitForSelector('#errorMsg', { state: 'visible', timeout: 3000 });
      const errorText = await page.textContent('#errorMsg');
      if (!errorText.includes(expectedText)) {
        throw new Error(`Expected error to contain "${expectedText}", got "${errorText}"`);
      }
    },

    /**
     * Assert a notification (misdirected, etc.) is visible.
     * Mirrors customerPage.expectNotificationOf("Cargo is misdirected").
     */
    async expectNotificationOf(expectedText) {
      await page.waitForSelector('#result', { state: 'visible', timeout: 3000 });
      const misdirectedMsg = page.locator('#misdirectedMsg');
      const isVisible = await misdirectedMsg.isVisible();
      if (!isVisible) {
        throw new Error(`Expected notification "${expectedText}" to be visible`);
      }
      const text = await misdirectedMsg.textContent();
      if (!text.includes('misdirected')) {
        throw new Error(`Expected notification to contain "${expectedText}", got "${text}"`);
      }
    },
  };
}

module.exports = CustomerPage;
