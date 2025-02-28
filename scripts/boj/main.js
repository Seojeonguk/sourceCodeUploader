let util;
let exceptions;
/**
 * Dynamically loads the util function and initializes the page based on the current URL.
 */
(async () => {
  const src = chrome.runtime.getURL('scripts/common/utils/index.js');
  const exception = chrome.runtime.getURL('scripts/common/exception/index.js');
  console.debug('[SCU] Loading util.js');
  util = await import(src);
  exceptions = await import(exception);

  const currentUrl = window.location.href;

  if (currentUrl.includes('status')) {
    initStatusPage();
  } else {
    initSourcePage();
  }
})();
