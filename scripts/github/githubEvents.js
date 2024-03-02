const currentUri = window.location.href;
const code = currentUri.match(/code=([^&]*)/);
if (code) {
  const payload = { code: code[1] };
  chrome.runtime.sendMessage({
    platform: "github",
    action: "requestAndSaveAccessToken",
    payload,
  });

  window.close();
}
