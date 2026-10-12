import { SetupRequiredException } from '../common/exception/index.js';
import { ACTIONS } from './constants/actions.js';

import {
  clearExpiredLogin,
  commit,
  getAuthenticatedUserRepositories,
  logout,
  openOauthPage,
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
    [ACTIONS.OPEN_OAUTH_PAGE]: () => openOauthPage(),
    [ACTIONS.GET_REPOSITORIES]: async () => getAuthenticatedUserRepositories(),
    [ACTIONS.COMMIT]: async () => commit(payload),
    [ACTIONS.LOGOUT]: async () => logout(),
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
