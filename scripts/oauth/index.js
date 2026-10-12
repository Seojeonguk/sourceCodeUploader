import { login as notionLogin } from '../notion/services/authService.js';
import { consumeOAuthState } from './state.js';

const ACTIONS = Object.freeze({
  COMPLETE: 'complete',
});

// GitHub logs in with the device flow, so only Notion uses the redirect.
const LOGINS = Object.freeze({
  notion: notionLogin,
});

/**
 * Completes the login after the OAuth redirect.
 * The platform comes from the saved `state`, not from the redirect URL.
 * @param {Object} payload
 * @param {string} payload.code - The authorization code.
 * @param {string} payload.state - The state sent with the authorization request.
 * @param {chrome.runtime.MessageSender} [sender] - The redirect tab.
 */
const complete = async ({ code, state } = {}, sender = undefined) => {
  const tabId = sender?.tab?.id;
  const platform = await consumeOAuthState(state, tabId);

  try {
    await LOGINS[platform](code);
  } finally {
    // Close the tab opened for the login, not whichever tab is active.
    if (tabId !== undefined) {
      await chrome.tabs.remove(tabId);
    }
  }
};

/**
 * Dispatches an OAuth action.
 * @param {string} action - The action to be executed.
 * @param {Object} payload - The payload associated with the action.
 * @param {chrome.runtime.MessageSender} sender - The sender of the message.
 * @throws {Error} If the action is not supported.
 * @returns {Promise<*>} The result of the action handler.
 */
export async function dispatch(action, payload, sender) {
  if (action !== ACTIONS.COMPLETE) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return complete(payload, sender);
}
