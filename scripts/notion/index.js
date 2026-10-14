import { SetupRequiredException } from '../common/exception/index.js';
import { ACTIONS } from './constants/actions.js';
import {
  authorize,
  clearExpiredLogin,
  logout,
  saveLoginError,
  takeLoginError,
} from './services/authService.js';
import { getDatabases, upload } from './services/databaseService.js';

/**
 * Logs in, and keeps why it failed for the popup, which is closed by the login window.
 */
const loginAndKeepError = async () => {
  await saveLoginError(null);
  try {
    await authorize();
  } catch (e) {
    await saveLoginError(e.message);
    throw e;
  }
};

/**
 * Dispatches an action and executes the corresponding handler.
 * @param {string} action - The action to be executed.
 * @param {Object} payload - The payload associated with the action.
 * @throws {Error} If the action is not supported.
 * @throws {SetupRequiredException} If Notion rejected the access token. The login is removed.
 * @returns {Promise<*>} The result of the action handler.
 */
export async function dispatch(action, payload) {
  const actions = {
    [ACTIONS.OPEN_OAUTH_PAGE]: () => loginAndKeepError(),
    [ACTIONS.TAKE_LOGIN_ERROR]: () => takeLoginError(),
    [ACTIONS.GET_DATABASES]: async () => getDatabases(),
    // The content script sends the problem info read from the page.
    [ACTIONS.UPLOAD]: async () => upload(payload, payload.problemInfo),
    [ACTIONS.LOGOUT]: async () => logout(),
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  try {
    return await handler();
  } catch (e) {
    // 401: the access token has expired or the user removed the integration on Notion.
    if (e.status === 401) {
      await clearExpiredLogin();
      throw new SetupRequiredException('Notion', 'login-expired');
    }
    throw e;
  }
}
