const initStatusPage = () => {
  console.debug('[SCU] Start Parse Table!');
  try {
    const loginID = getCurrentLoginId();
    const statusTable = getSubmissionStatusTable();
    const rowSubmitInfos = filterCorrectUserSubmissions(statusTable, loginID);
    console.debug('Select Row Count : ', rowSubmitInfos.length);

    rowSubmitInfos.forEach(
      ({ submitNum, problemId, submitLanguage, resultTag, title }) => {
        const payload = {
          extension: languages[submitLanguage],
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
      console.warn(e);
    } else {
      console.error(e);
    }
  }
};
