# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> admin can book, view, reroute and change destination of new cargo
- Location: test\acceptance\admin.spec.js:23:1

# Error details

```
TimeoutError: page.waitForURL: Timeout 8000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/show.html**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - heading "Cargo Booking and Routing" [level=1] [ref=e3]
    - list [ref=e4]:
      - listitem [ref=e5]:
        - link "List all cargos" [ref=e6] [cursor=pointer]:
          - /url: /views/admin/list.html
      - listitem [ref=e7]:
        - link "Book new cargo" [ref=e8] [cursor=pointer]:
          - /url: /views/admin/register.html
  - generic [ref=e9]:
    - heading "Possible routes for cargo 8E30D61A" [level=2] [ref=e10]
    - generic [ref=e11]:
      - table "Suggested Itineraries" [ref=e12]:
        - caption [ref=e13]: Suggested Itineraries
        - rowgroup [ref=e14]:
          - row "Select Voyage Load Unload" [ref=e15]:
            - cell "Select" [ref=e16]
            - cell "Voyage" [ref=e17]
            - cell "Load" [ref=e18]
            - cell "Unload" [ref=e19]
        - rowgroup [ref=e20]:
          - row "0300A NLRTM 7/1/2026 USCHI 7/2/2026" [ref=e21]:
            - cell [ref=e22]:
              - radio [ref=e23]
            - cell "0300A" [ref=e24]
            - cell "NLRTM" [ref=e25]
            - cell "7/1/2026" [ref=e26]
            - cell "USCHI" [ref=e27]
            - cell "7/2/2026" [ref=e28]
          - row "0200T USCHI 7/4/2026 CNSHA 7/5/2026" [ref=e29]:
            - cell "0200T" [ref=e30]
            - cell "USCHI" [ref=e31]
            - cell "7/4/2026" [ref=e32]
            - cell "CNSHA" [ref=e33]
            - cell "7/5/2026" [ref=e34]
          - row "0100S CNSHA 7/7/2026 FIHEL 7/8/2026" [ref=e35]:
            - cell "0100S" [ref=e36]
            - cell "CNSHA" [ref=e37]
            - cell "7/7/2026" [ref=e38]
            - cell "FIHEL" [ref=e39]
            - cell "7/8/2026" [ref=e40]
          - row "0200T FIHEL 7/10/2026 DEHAM 7/11/2026" [ref=e41]:
            - cell "0200T" [ref=e42]
            - cell "FIHEL" [ref=e43]
            - cell "7/10/2026" [ref=e44]
            - cell "DEHAM" [ref=e45]
            - cell "7/11/2026" [ref=e46]
          - row "0100S DEHAM 7/13/2026 AUMEL 7/14/2026" [ref=e47]:
            - cell "0100S" [ref=e48]
            - cell "DEHAM" [ref=e49]
            - cell "7/13/2026" [ref=e50]
            - cell "AUMEL" [ref=e51]
            - cell "7/14/2026" [ref=e52]
          - row [ref=e53]:
            - cell [ref=e54]:
              - separator [ref=e55]
          - row "0100S NLRTM 6/30/2026 USDAL 7/1/2026" [ref=e56]:
            - cell [ref=e57]:
              - radio [ref=e58]
            - cell "0100S" [ref=e59]
            - cell "NLRTM" [ref=e60]
            - cell "6/30/2026" [ref=e61]
            - cell "USDAL" [ref=e62]
            - cell "7/1/2026" [ref=e63]
          - row "0300A USDAL 7/3/2026 CNSHA 7/4/2026" [ref=e64]:
            - cell "0300A" [ref=e65]
            - cell "USDAL" [ref=e66]
            - cell "7/3/2026" [ref=e67]
            - cell "CNSHA" [ref=e68]
            - cell "7/4/2026" [ref=e69]
          - row "0400S CNSHA 7/7/2026 AUMEL 7/8/2026" [ref=e70]:
            - cell "0400S" [ref=e71]
            - cell "CNSHA" [ref=e72]
            - cell "7/7/2026" [ref=e73]
            - cell "AUMEL" [ref=e74]
            - cell "7/8/2026" [ref=e75]
          - row [ref=e76]:
            - cell [ref=e77]:
              - separator [ref=e78]
          - row "0200T NLRTM 7/1/2026 SESTO 7/1/2026" [ref=e79]:
            - cell [ref=e80]:
              - radio [ref=e81]
            - cell "0200T" [ref=e82]
            - cell "NLRTM" [ref=e83]
            - cell "7/1/2026" [ref=e84]
            - cell "SESTO" [ref=e85]
            - cell "7/1/2026" [ref=e86]
          - row "0300A SESTO 7/4/2026 CNHKG 7/4/2026" [ref=e87]:
            - cell "0300A" [ref=e88]
            - cell "SESTO" [ref=e89]
            - cell "7/4/2026" [ref=e90]
            - cell "CNHKG" [ref=e91]
            - cell "7/4/2026" [ref=e92]
          - row "0400S CNHKG 7/6/2026 AUMEL 7/8/2026" [ref=e93]:
            - cell "0400S" [ref=e94]
            - cell "CNHKG" [ref=e95]
            - cell "7/6/2026" [ref=e96]
            - cell "AUMEL" [ref=e97]
            - cell "7/8/2026" [ref=e98]
          - row [ref=e99]:
            - cell [ref=e100]:
              - separator [ref=e101]
          - row "0300A NLRTM 7/1/2026 CNHKG 7/2/2026" [ref=e102]:
            - cell [ref=e103]:
              - radio [ref=e104]
            - cell "0300A" [ref=e105]
            - cell "NLRTM" [ref=e106]
            - cell "7/1/2026" [ref=e107]
            - cell "CNHKG" [ref=e108]
            - cell "7/2/2026" [ref=e109]
          - row "0301S CNHKG 7/4/2026 CNSHA 7/4/2026" [ref=e110]:
            - cell "0301S" [ref=e111]
            - cell "CNHKG" [ref=e112]
            - cell "7/4/2026" [ref=e113]
            - cell "CNSHA" [ref=e114]
            - cell "7/4/2026" [ref=e115]
          - row "0100S CNSHA 7/7/2026 SESTO 7/8/2026" [ref=e116]:
            - cell "0100S" [ref=e117]
            - cell "CNSHA" [ref=e118]
            - cell "7/7/2026" [ref=e119]
            - cell "SESTO" [ref=e120]
            - cell "7/8/2026" [ref=e121]
          - row "0300A SESTO 7/10/2026 CNHGH 7/10/2026" [ref=e122]:
            - cell "0300A" [ref=e123]
            - cell "SESTO" [ref=e124]
            - cell "7/10/2026" [ref=e125]
            - cell "CNHGH" [ref=e126]
            - cell "7/10/2026" [ref=e127]
          - row "0400S CNHGH 7/13/2026 FIHEL 7/13/2026" [ref=e128]:
            - cell "0400S" [ref=e129]
            - cell "CNHGH" [ref=e130]
            - cell "7/13/2026" [ref=e131]
            - cell "FIHEL" [ref=e132]
            - cell "7/13/2026" [ref=e133]
          - row "0301S FIHEL 7/15/2026 AUMEL 7/16/2026" [ref=e134]:
            - cell "0301S" [ref=e135]
            - cell "FIHEL" [ref=e136]
            - cell "7/15/2026" [ref=e137]
            - cell "AUMEL" [ref=e138]
            - cell "7/16/2026" [ref=e139]
          - row [ref=e140]:
            - cell [ref=e141]:
              - separator [ref=e142]
          - row "0301S NLRTM 6/30/2026 CNHKG 7/1/2026" [ref=e143]:
            - cell [ref=e144]:
              - radio [ref=e145]
            - cell "0301S" [ref=e146]
            - cell "NLRTM" [ref=e147]
            - cell "6/30/2026" [ref=e148]
            - cell "CNHKG" [ref=e149]
            - cell "7/1/2026" [ref=e150]
          - row "0100S CNHKG 7/3/2026 JNTKO 7/4/2026" [ref=e151]:
            - cell "0100S" [ref=e152]
            - cell "CNHKG" [ref=e153]
            - cell "7/3/2026" [ref=e154]
            - cell "JNTKO" [ref=e155]
            - cell "7/4/2026" [ref=e156]
          - row "0301S JNTKO 7/6/2026 SEGOT 7/7/2026" [ref=e157]:
            - cell "0301S" [ref=e158]
            - cell "JNTKO" [ref=e159]
            - cell "7/6/2026" [ref=e160]
            - cell "SEGOT" [ref=e161]
            - cell "7/7/2026" [ref=e162]
          - row "0301S SEGOT 7/9/2026 DEHAM 7/11/2026" [ref=e163]:
            - cell "0301S" [ref=e164]
            - cell "SEGOT" [ref=e165]
            - cell "7/9/2026" [ref=e166]
            - cell "DEHAM" [ref=e167]
            - cell "7/11/2026" [ref=e168]
          - row "0200T DEHAM 7/13/2026 CNHGH 7/14/2026" [ref=e169]:
            - cell "0200T" [ref=e170]
            - cell "DEHAM" [ref=e171]
            - cell "7/13/2026" [ref=e172]
            - cell "CNHGH" [ref=e173]
            - cell "7/14/2026" [ref=e174]
          - row "0300A CNHGH 7/16/2026 AUMEL 7/17/2026" [ref=e175]:
            - cell "0300A" [ref=e176]
            - cell "CNHGH" [ref=e177]
            - cell "7/16/2026" [ref=e178]
            - cell "AUMEL" [ref=e179]
            - cell "7/17/2026" [ref=e180]
      - button "Assign cargo to route" [active] [ref=e181]
```

# Test source

```ts
  1  | 'use strict';
  2  | 
  3  | /**
  4  |  * CargoRoutingPage — Page Object for route selection.
  5  |  * Mirrors se.citerus.dddsample.acceptance.pages.CargoRoutingPage.
  6  |  */
  7  | function CargoRoutingPage(page) {
  8  |   return {
  9  |     /** Assert at least one candidate route is listed */
  10 |     async expectAtLeastOneRoute() {
  11 |       // routeForm is shown (visible) only after fetch returns candidates
  12 |       await page.waitForSelector('#routeForm', { state: 'visible', timeout: 6000 });
  13 |       const radios = page.locator('input[name="itineraryIdx"]');
  14 |       const count  = await radios.count();
  15 |       if (count === 0) throw new Error('Expected at least one route candidate, found none');
  16 |     },
  17 | 
  18 |     /** Select the first route and submit → CargoDetailsPage */
  19 |     async assignCargoToFirstRoute() {
  20 |       const CargoDetailsPage = require('./CargoDetailsPage');
  21 |       await page.click('button[type="submit"]');
  22 |       await page.waitForURL('**/show.html**', { timeout: 8000 });
  23 |       await page.waitForFunction(
> 24 |         () => {
     |                  ^ TimeoutError: page.waitForURL: Timeout 8000ms exceeded.
  25 |           const el = document.querySelector('#tableCaption');
  26 |           return el && el.textContent.trim().length > 0;
  27 |         },
  28 |         { timeout: 8000 },
  29 |       );
  30 |       return CargoDetailsPage(page);
  31 |     },
  32 |   };
  33 | }
  34 | 
  35 | module.exports = CargoRoutingPage;
  36 | 
```