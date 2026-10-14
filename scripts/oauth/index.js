import {
  InvalidRequestException,
  OAuthException,
} from '../common/exception/index.js';
import { login as notionLogin } from '../notion/services/authService.js';
import { consumeOAuthState } from './state.js';

const ACTIONS = Object.freeze({
  COMPLETE: 'complete',
});

// GitHub logs in with the device flow, so only Notion uses the redirect.
const LOGINS = Object.freeze({
  notion: { name: 'Notion', login: notionLogin },
});

/**
 * Checks the state, and turns its error into one that the redirect page can show.
 * @throws {OAuthException} If the state is unknown, used, expired or from another tab.
 * @returns {Promise<'notion'>} The platform the state was created for.
 */
const checkState = async (state, tabId) => {
  try {
    return await consumeOAuthState(state, tabId);
  } catch (e) {
    if (e instanceof InvalidRequestException) {
      throw new OAuthException('OAuth', 'state');
    }
    throw e;
  }
};

/**
 * Completes the login after the OAuth redirect.
 * The platform comes from the saved `state`, not from the redirect URL.
 * The tab is closed only when the login succeeds. Otherwise the error is returned
 * to the redirect page, which shows it to the user.
 * @param {Object} payload
 * @param {string} [payload.code] - The authorization code.
 * @param {string} [payload.error] - The error, such as `access_denied` when the user cancels.
 * @param {string} payload.state - The state sent with the authorization request.
 * @param {chrome.runtime.MessageSender} [sender] - The redirect tab.
 * @throws {OAuthException} If the state is invalid or the platform sent an error.
 */
const complete = async ({ code, error, state } = {}, sender = undefined) => {
  const tabId = sender?.tab?.id;
  const platform = await checkState(state, tabId);
  const { name, login } = LOGINS[platform];

  if (error || !code) {
    throw new OAuthException(name, error || 'no_code');
  }

  await login(code);

  // Close the tab opened for the login, not whichever tab is active.
  if (tabId !== undefined) {
    await chrome.tabs.remove(tabId);
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
