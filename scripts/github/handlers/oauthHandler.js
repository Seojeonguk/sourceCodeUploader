(() => {
  // The OAuth redirect page is `https://github.com/?code=...&state=...`.
  // Notion redirects here. Other GitHub pages are ignored.
  if (window.location.pathname !== '/') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    return;
  }

  // The background checks the state, which also tells it the platform.
  chrome.runtime.sendMessage({
    platform: 'oauth',
    action: 'complete',
    payload: { code, state },
  });
})();
