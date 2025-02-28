import { NotFoundException } from "../../common/exception/index.js";
import { request } from "../../common/utils/index.js";
import { SOLVEDAC_CONFIG } from "../config/config.js";
import { LEVELS } from "../constants/levels.js";

/**
 * Asynchronous function to fetch problem information using the given problem ID.
 * @param {Object} param - Object containing the problem ID { problemId: string }
 * @returns {Object} - Object containing the fetched problem information
 *                    - { level: string, problemId: string, tags: Array<string>, title: string }
 * @throws {NotFoundException} - Throws an error if the problem ID is empty.
 */
export const fetchProblemByID = async ({ problemId }) => {
  if (!problemId) {
    throw new NotFoundException('solvedAC', 'problme ID');
  }
  const url = `${SOLVEDAC_CONFIG.API_BASE_URL}/problem/show?problemId=${problemId}`;
  const headers = {
    Accept: 'application/json',
  };

  const response = await request(url, 'GET', headers);
  return {
    level: LEVELS[response.level],
    problemId: response.problemId,
    tags: response.tags.map(
      (tag) =>
        tag.displayNames.find((displayName) => displayName.language === 'ko')
          .name,
    ),
    title: response.titleKo,
  };
};
