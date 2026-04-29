import {
  initSourcePage,
  initStatusPage,
  observeJudgingResults,
} from './handlers/index.js';

/**
 * Dynamically loads the util function and initializes the page based on the current URL.
 */

(async () => {
  console.debug('[SCU] Start init!');
  const currentUrl = window.location.href;

  if (currentUrl.includes('status')) {
    initStatusPage();
    observeJudgingResults();
  } else {
    initSourcePage();
  }
})();
