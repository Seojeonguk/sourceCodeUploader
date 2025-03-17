import { getChromeStorage } from "../../common/utils/index.js";
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
  const targetElements = document.querySelectorAll('.result-text');

  if (targetElements.length === 0) {
    console.debug('[SCU] No judging results found to observe.');
    return;
  }

  targetElements.forEach((element) => {
    if (
      !element.classList.contains('result-compile') &&
      !element.classList.contains('result-judging') &&
      !element.classList.contains('result-wait')
    ) {
      return;
    }

    const observer = new MutationObserver(async (mutations) => {
      const acceptedResults = mutations.find(
        (mutation) =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mutation.target.classList.contains('result-ac'),
      );

      if (acceptedResults) {
        const loginID = getCurrentLoginId();
        const changedAcceptedResults = acceptedResults?.target;
        const trElement = changedAcceptedResults.closest('tr');
        const rowData = parseSubmissionRowData(trElement);

        if (rowData?.submitId === loginID) {
          appendPlatformButtons(rowData);

          const uploadButtons = trElement.querySelectorAll('.uploadBtn');

          uploadButtons.forEach(async (uploadButton) => {
            const uploadButtonId = uploadButton.id;
            const autoUpload = await getChromeStorage(
              `${uploadButtonId}AutoUpload`,
            );
            if (autoUpload) {
              if (uploadButton) {
                uploadButton.click();
              }
            }
          });
        }
      }

      const isJudging = mutations.find(
        (mutation) =>
          mutation.target.classList.contains('result-judging') ||
          mutation.target.classList.contains('result-compile'),
      );

      if (!isJudging) {
        console.debug('disconnect this element : ', element);
        observer.disconnect();
      }
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
