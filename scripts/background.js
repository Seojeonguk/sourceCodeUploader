import { dispatch as githubDispatch } from "./github/Github.js";
import { dispatch as notionDispatch } from "./notion/Notion.js";

function handleMessage(request, sender, sendResponse) {
  try {
    const { platform, action, payload } = request;
    if (platform === "github") {
      githubDispatch(action, payload).then(res => { sendResponse(res); })
    } else if (platform === "notion") {
      notionDispatch(action, payload).then(res => { sendResponse(res); })
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
