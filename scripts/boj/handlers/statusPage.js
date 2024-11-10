/**
 * Initializes the status page with the necessary functionality.
 */
const initStatusPage = () => {
  console.debug('[SCU] Start parsing submission status table...');
  try {
    const loginID = getCurrentLoginId();
    const statusTable = getSubmissionStatusTable();
    const rowSubmitInfos = filterCorrectUserSubmissions(statusTable, loginID);
    console.debug('[SCU] Selected row count:', rowSubmitInfos.length);

    const submitNums = rowSubmitInfos.map(({ submitNum }) => submitNum);
    console.debug('[SCU] submitNums:', submitNums);

    rowSubmitInfos.forEach(
      ({ submitNum, problemId, submitLanguage, resultTag, title }) => {
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
      },
    );
  } catch (e) {
    if (e instanceof parseException || e instanceof undefinedException) {
      console.warn('[SCU]', e);
    } else {
      console.error('[SCU]', e);
    }
  }
};
