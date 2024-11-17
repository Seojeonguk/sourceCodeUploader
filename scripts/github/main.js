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
