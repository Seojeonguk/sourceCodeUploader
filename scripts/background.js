import {
  ForbiddenSenderException,
  PlatformDispatcherNotFoundException,
} from './common/exception/index.js';
import { logger } from './common/utils/index.js';
import { dispatch as githubDispatcher } from './github/index.js';
import { dispatch as notionDispatcher } from './notion/index.js';
import { isAllowedSender } from './senders.js';

// Only the extension itself (the service worker and its pages) may read the access tokens.
// Content scripts run on the judge pages next to the site's own scripts, so they ask the
// background for what they need instead. It is set on every start, like the default it replaces.
chrome.storage.local
  .setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
  .catch((e) =>
    logger.warn('Failed to hide the storage from content scripts.', e.message),
  );

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
    if (!isAllowedSender(platform, action, sender)) {
      throw new ForbiddenSenderException(platform, action);
    }

    logger.debug(`platform : ${platform}, request : ${action}`);

    dispatcher(action, payload, sender)
      .then((res) => {
        sendResponse({ ok: true, message: res });
      })
      .catch((err) => sendResponse({ ok: false, message: err.message }));
  } catch (e) {
    sendResponse({ ok: false, message: e.message });
  }

  // Keep the message channel open for the asynchronous sendResponse.
  return true;
};

chrome.runtime.onMessage.addListener(handleMessage);
