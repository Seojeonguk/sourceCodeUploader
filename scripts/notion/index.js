import { SetupRequiredException } from '../common/exception/index.js';
import { getChromeStorage } from '../common/utils/index.js';
import { ACTIONS } from './constants/actions.js';
import {
  authorize,
  clearExpiredLogin,
  logout,
  saveLoginError,
  takeLoginError,
} from './services/authService.js';
import { getDataSources, upload } from './services/databaseService.js';

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
  // Another login started meanwhile may have failed and kept its error, so clear it now
  // that the user is logged in.
  await saveLoginError(null);
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
    // The content scripts cannot read the storage, so they ask here.
    [ACTIONS.GET_AUTO_UPLOAD]: async () =>
      Boolean(await getChromeStorage('notionAutoUpload')),
    // The popup lists the data sources as the databases to upload to.
    [ACTIONS.GET_DATABASES]: async () => getDataSources(),
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
