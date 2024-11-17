import { ACTIONS } from './constants/actions.js';

import {
  commit,
  getAuthenticatedUserRepositories,
} from './services/repoService.js';

import {
  getAccessToken,
  getUserInfo,
  openOauthPage,
  saveInfo,
} from './services/authService.js';

/**
 * Dispatches an action and executes the corresponding handler.
 * @param {string} action - The action to be executed.
 * @param {Object} payload - The payload associated with the action.
 * @throws {Error} If the action is not supported.
 * @returns {Promise<*>} The result of the action handler.
 */
export async function dispatch(action, payload) {
  const actions = {
    [ACTIONS.OPEN_OAUTH_PAGE]: () => openOauthPage(),
    [ACTIONS.REQUEST_AND_SAVE_ACCESS_TOKEN]: async () => {
      const accessToken = await getAccessToken(payload);
      const githubID = await getUserInfo(accessToken);
      saveInfo(accessToken, githubID);
    },
    [ACTIONS.GET_REPOSITORIES]: async () => {
      return await getAuthenticatedUserRepositories();
    },
    [ACTIONS.COMMIT]: async () => {
      return await commit(payload);
    },
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return handler();
}
