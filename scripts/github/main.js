import * as Util from "../util.js";
import { ACTIONS } from "./constants/actions.js";
import { authService } from "./services/authService.js";
import { fileService } from "./services/fileService.js";
import { repoService } from "./services/repoService.js";

export async function dispatch(action, payload) {
  const actions = {
    [ACTIONS.OPEN_OAUTH_PAGE]: () => authService.openOauthPage(),
    [ACTIONS.REQUEST_AND_SAVE_ACCESS_TOKEN]: async () =>
      await authService.requestAndSaveAccessToken(payload),
    [ACTIONS.GET_REPOSITORIES]: async () => {
      return await repoService.getAuthenticatedUserRepositories();
    },
    [ACTIONS.COMMIT]: async () => {
      const response = await fileService.getShaForExistingFile(payload);
      if (response.content === Util.encodeBase64Unicode(payload.sourceCode)) {
        const message =
          'The upload source code and the existing content are the same.';
        return message;
      }
      return await repoService.commit({ ...payload, sha: response.sha });
    },
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return handler();
}
