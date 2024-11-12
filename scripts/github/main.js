import * as Util from '../util.js';
import { ACTIONS } from './constants/actions.js';
import { getShaForExistingFile } from './services/fileService.js';
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
      const response = await getShaForExistingFile(payload);
      if (response.content === Util.encodeBase64Unicode(payload.sourceCode)) {
        const message =
          'The upload source code and the existing content are the same.';
        return message;
      }
      return await commit({ ...payload, sha: response.sha });
    },
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return handler();
}
