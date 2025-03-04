import { LANGUAGES } from "../constants/index.js";

import {
  ParseException,
  UndefinedException,
} from '../../common/exception/index.js';

import {
  getCurrentLoginId,
  getSubmissionStatusTable,
  filterCorrectUserSubmissions,
  initializePlatformButtons,
  fetchSourceCodeBySubmitNum,
  parseSubmissionRowData,
} from '../utils/index.js';

/**
 * Initializes the status page with the necessary functionality.
 */
export const initStatusPage = () => {
  console.debug('[SCU] Start parsing submission status table...');
  try {
    const loginID = getCurrentLoginId();
    const statusTable = getSubmissionStatusTable();
    const rowSubmitInfos = filterCorrectUserSubmissions(statusTable, loginID);
    console.debug('[SCU] Selected row count:', rowSubmitInfos.length);

    const submitNums = rowSubmitInfos.map(({ submitNum }) => submitNum);
    console.debug('[SCU] submitNums:', submitNums);

    rowSubmitInfos.forEach(appendPlatformButtons);
  } catch (e) {
    if (e instanceof ParseException || e instanceof UndefinedException) {
      console.warn('[SCU]', e);
    } else {
      console.error('[SCU]', e);
    }
  }
};

export const observeJudgingResults = () => {
  // const targetElements = document.querySelectorAll(
  //   '.result-judging, .result-compile, .result-wait',
  // );

  const targetElements = document.querySelectorAll('.result-text');

  if (targetElements.length === 0) {
    console.debug('[SCU] No judging results found to observe.');
    return;
  }

  console.log(targetElements);
  targetElements.forEach((element) => {
    const observer = new MutationObserver((mutations) => {
      const acceptedResults = mutations.find(
        (mutation) =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mutation.target.classList.contains('result-ac'),
      );

      if (acceptedResults) {
        const loginID = getCurrentLoginId();

        const changedAcceptedResults = acceptedResults?.target;

        console.debug('[SCU] Change detected: ', changedAcceptedResults);

        const trElement = changedAcceptedResults.closest('tr');
        console.debug('[SCU] closest: ', trElement);

        const rowData = parseSubmissionRowData(trElement);
        if (rowData?.submitId === loginID) {
          appendPlatformButtons(rowData);
        }
      }

      observer.disconnect();
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
  });
};

/**
 * Creates and appends platform buttons based on submission data.
 */
const appendPlatformButtons = ({
  submitNum,
  problemId,
  submitLanguage,
  resultTag,
  title,
}) => {
  const payload = {
    extension: LANGUAGES[submitLanguage],
    problemId,
    type: 'BOJ',
    title,
  };
  const buttons = initializePlatformButtons(true, payload, () =>
    fetchSourceCodeBySubmitNum(submitNum),
  );
  resultTag.appendChild(buttons);
};
