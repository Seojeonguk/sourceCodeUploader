const uri = window.location.href;
const code = uri.match(/code=([^&]*)/)?.[1];
if (!!code) {
  chrome.runtime.sendMessage({
    className: "github",
    action: "getAccessToken",
    payload: {
      code: code,
    },
  });

  window.close();
}
