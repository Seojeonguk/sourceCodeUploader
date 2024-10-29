let util;
/**
 * Dynamically loads the util function and initializes the page based on the current URL.
 */
(async () => {
  const src = chrome.runtime.getURL('scripts/util.js');
  util = await import(src);

  const currentUrl = window.location.href;

  if (currentUrl.includes('status')) {
    initStatusPage();
  } else {
    initSourcePage();
  }
})();
