import * as SolvedAC from './constants.js';
import * as Util from '../util.js';

/**
 * Asynchronous function to fetch problem information using the given problem ID.
 * @param {Object} param - Object containing the problem ID { problemId: string }
 * @returns {Object} - Object containing the fetched problem information
 *                    - { level: string, problemId: string, tags: Array<string>, title: string }
 * @throws {Error} - Throws an error if the problem ID is empty.
 */
export async function fetchProblemByID({ problemId }) {
  if (Util.isEmpty(problemId)) {
    throw new Error('Invalid problem ID for requesting solvedAC.');
  }
  const url = `${SolvedAC.API_BASE_URL}/problem/show?problemId=${problemId}`;
  const headers = {
    Accept: 'application/json',
  };

  const response = await Util.request(url, 'GET', headers);
  if (!response.ok) {
    throw new Error('Failed to fetch solvedAC.');
  }
  const data = await response.json();

  return {
    level: SolvedAC.LEVELS[data.level],
    problemId: data.problemId,
    tags: data.tags.map(
      (tag) =>
        tag.displayNames.find((displayName) => displayName.language === 'ko')
          .name,
    ),
    title: data.titleKo,
  };
}
