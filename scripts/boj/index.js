import { initSourcePage, initStatusPage } from "./handlers/index.js";

/**
 * Dynamically loads the util function and initializes the page based on the current URL.
 */

(async () => {
  console.debug('[SCU] Loading util.js');

  const currentUrl = window.location.href;

  if (currentUrl.includes('status')) {
    initStatusPage();
  } else {
    initSourcePage();
  }
})();
