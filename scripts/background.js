import { PlatformDispatcherNotFoundException } from "./common/exception/index.js";
import { dispatch as githubDispatcher } from "./github/index.js";
import { dispatch as notionDispatcher } from "./notion/index.js";

const platformDispatchers = {
  github: githubDispatcher,
  notion: notionDispatcher,
};

const handleMessage = (request, sender, sendResponse) => {
  try {
    const { platform, action, payload } = request;

    const dispatcher = platformDispatchers[platform];
    if (!dispatcher) {
      throw new PlatformDispatcherNotFoundException(platform);
    }

    console.debug(`platform : ${platform}, request : ${action}`);

    dispatcher(action, payload)
      .then((res) => {
        sendResponse({ ok: true, message: res });
      })
      .catch((err) => sendResponse({ ok: false, message: err.message }));
  } catch (e) {
    sendResponse({ ok: false, message: e.message });
  } finally {
    return true;
  }
};

chrome.runtime.onMessage.addListener(handleMessage);
