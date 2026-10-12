import { setChromeStorage } from '../common/utils/index.js';
import { ACTIONS as NOTION_ACTIONS } from '../solvedAC/constants/actions.js';
import { dispatch as solvedAC } from '../solvedAC/index.js';
import { ACTIONS } from './constants/actions.js';
import { getAccessToken, openOauthPage } from './services/authService.js';
import { getDatabases, upload } from './services/databaseService.js';

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
      setChromeStorage('notionAccessToken', accessToken);
      return 'success';
    },
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
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return handler();
}
