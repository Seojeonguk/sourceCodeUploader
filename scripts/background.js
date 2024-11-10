import { dispatch as githubDispatcher } from "./github/main.js";
import { dispatch as notionDispatch } from "./notion/Notion.js";

const platformDispatchers = {
  github: githubDispatcher,
};

const handleMessage = (request, sender, sendResponse) => {
  try {
    const { platform, action, payload } = request;
    if (platform === 'github') {
      const dispatcher = platformDispatchers[platform];
      if (!dispatcher) {
        throw new Error(`No dispatcher found for ${platform} platform.`);
      }

      dispatcher(action, payload).then((res) =>
        sendResponse({ ok: true, message: res }),
      );
    } else if (platform === 'notion') {
      notionDispatch(action, payload).then((res) => {
        sendResponse(res);
      });
    } else {
      throw new Error(`${platform} is not supported!`);
    }
  } catch (e) {
    sendResponse({ ok: false, message: e.message });
  } finally {
    return true;
  }
};

chrome.runtime.onMessage.addListener(handleMessage);
