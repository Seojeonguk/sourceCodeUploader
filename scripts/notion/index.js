import { SetupRequiredException } from '../common/exception/index.js';
import { ACTIONS as NOTION_ACTIONS } from '../solvedAC/constants/actions.js';
import { dispatch as solvedAC } from '../solvedAC/index.js';
import { ACTIONS } from './constants/actions.js';
import {
  clearExpiredLogin,
  logout,
  openOauthPage,
} from './services/authService.js';
import { getDatabases, upload } from './services/databaseService.js';

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
    [ACTIONS.OPEN_OAUTH_PAGE]: () => openOauthPage(),
    [ACTIONS.GET_DATABASES]: async () => getDatabases(),
    [ACTIONS.UPLOAD]: async () => {
      // Programmers sends the problem info from the page. BOJ problems are looked up on solved.ac.
      const problemInfo =
        payload.problemInfo ??
        (await solvedAC(
          NOTION_ACTIONS.GET_PROBLEM_INFO_BY_PROBLEM_ID,
          payload,
        ));
      return upload(payload, problemInfo);
    },
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
