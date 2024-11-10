import { ACTIONS } from "./constants/actions.js";
import { authService } from "./services/authService.js";

export async function dispatch(action, payload) {
  const actions = {
    [ACTIONS.OPEN_OAUTH_PAGE]: () => authService.openOauthPage(),
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return handler();
}
