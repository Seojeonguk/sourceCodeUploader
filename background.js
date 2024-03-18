import { dispatch as githubDispatch } from "./scripts/github/Github.js";
import { dispatch as notionDispatch } from "./scripts/notion/Notion.js";

function handleMessage(request, sender, sendResponse) {
  try {
    const { platform, action, payload } = request;
    if (platform === "github") {
      githubDispatch(action, payload)
        .then((res) => {
          sendResponse(res);
        })
        .catch((e) => {
          sendResponse({ ok: false, message: e.message });
        });
    } else if (platform === "notion") {
      notionDispatch(action, payload)
        .then((res) => {
          sendResponse(res);
        })
        .catch((e) => {
          sendResponse({ ok: false, message: e.message });
        });
    } else {
      throw new Error(`${platform} is not supported!`);
    }
  } catch (e) {
    sendResponse({ ok: false, message: e.message });
  } finally {
    return true;
  }
}

chrome.runtime.onMessage.addListener(handleMessage);
