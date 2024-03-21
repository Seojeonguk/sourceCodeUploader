const currentUri = window.location.href;
const code = currentUri.match(/code=([^&]*)/);
if (code) {
  const payload = { code: code[1] };

  chrome.runtime.sendMessage({
    platform: currentUri.includes("state") ? "notion" : "github",
    action: "requestAndSaveAccessToken",
    payload,
  });
}
