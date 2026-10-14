import { SetupRequiredException } from '../common/exception/index.js';
import { getChromeStorage } from '../common/utils/index.js';
import { ACTIONS } from './constants/actions.js';

import {
  clearExpiredLogin,
  commit,
  getAuthenticatedUserRepositories,
  logout,
  openLoginPage,
  pollDeviceLogin,
  startDeviceLogin,
} from './services/index.js';

/**
 * Dispatches an action and executes the corresponding handler.
 * @param {string} action - The action to be executed.
 * @param {Object} payload - The payload associated with the action.
 * @throws {Error} If the action is not supported.
 * @throws {SetupRequiredException} If GitHub rejected the access token. The login is removed.
 * @returns {Promise<*>} The result of the action handler.
 */
export async function dispatch(action, payload) {
  const actions = {
    [ACTIONS.OPEN_OAUTH_PAGE]: async () => openLoginPage(),
    [ACTIONS.START_DEVICE_LOGIN]: async () => startDeviceLogin(),
    [ACTIONS.POLL_DEVICE_LOGIN]: async () => pollDeviceLogin(),
    [ACTIONS.GET_REPOSITORIES]: async () => getAuthenticatedUserRepositories(),
    [ACTIONS.COMMIT]: async () => commit(payload),
    [ACTIONS.LOGOUT]: async () => logout(),
    // The content scripts cannot read the storage, so they ask here.
    [ACTIONS.GET_AUTO_UPLOAD]: async () =>
      Boolean(await getChromeStorage('githubAutoUpload')),
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  try {
    return await handler();
  } catch (e) {
    // 401: the access token has expired or the user revoked the access on GitHub.
    if (e.status === 401) {
      await clearExpiredLogin();
      throw new SetupRequiredException('GitHub', 'login-expired');
    }
    throw e;
  }
}
