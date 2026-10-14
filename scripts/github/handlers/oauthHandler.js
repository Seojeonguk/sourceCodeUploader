(() => {
  // The OAuth redirect page is `https://github.com/?code=...&state=...`,
  // or `https://github.com/?error=access_denied&state=...` when the user cancels.
  // Notion redirects here. Other GitHub pages are ignored.
  if (window.location.pathname !== '/') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  const state = params.get('state');
  if ((!code && !error) || !state) {
    return;
  }

  /**
   * Shows why the login failed at the top of the page.
   * The background closes the tab when the login succeeds, so this is shown only on a failure.
   * @param {string} [message] - The error from the background.
   */
  const showError = (message) => {
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    Object.assign(banner.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '2147483647',
      padding: '12px 16px',
      background: '#d1242f',
      color: '#ffffff',
      font: '14px/1.5 sans-serif',
      textAlign: 'center',
    });
    banner.textContent =
      `Source Code Uploader: the login failed. ${message || 'Something went wrong.'} ` +
      'Close this tab and click Authorize in the extension popup to try again.';
    document.body.appendChild(banner);
  };

  // The background checks the state, which also tells it the platform.
  chrome.runtime
    .sendMessage({
      platform: 'oauth',
      action: 'complete',
      payload: { code, error, state },
    })
    .then((response) => {
      if (!response?.ok) {
        showError(response?.message);
      }
    })
    .catch((e) => showError(e?.message));
})();
