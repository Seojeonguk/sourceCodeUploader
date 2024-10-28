let util;
/**
 * Load the util function dynamically.
 * Attach the icon according to the code theme.
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
