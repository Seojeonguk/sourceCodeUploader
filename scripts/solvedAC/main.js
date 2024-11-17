import { ACTIONS } from './constants/actions.js';
import { fetchProblemByID } from './services/problemService.js';

export async function dispatch(action, payload) {
  const actions = {
    [ACTIONS.GET_PROBLEM_INFO_BY_PROBLEM_ID]: async () => {
      return await fetchProblemByID(payload);
    },
  };

  const handler = actions[action];
  if (!handler) {
    throw new Error(`Unsupported action : ${action}`);
  }

  return handler();
}
