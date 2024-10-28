const statusPage = () => {
  console.debug('[SCU] Start Parse Table!');
  try {
    const loginID = parsingLoginID();
    const statusTable = parsingStatusTable();
    const rowSubmitInfos = processRows(statusTable, loginID);
    console.debug('Select Row Count : ', rowSubmitInfos.length);

    rowSubmitInfos.forEach(
      ({ submitNum, problemId, submitLanguage, resultTag, title }) => {
        const extension = languages[submitLanguage];
        const buttonWrapper = createButtonWrapper();

        const handler = async (platform) => {
          try {
            const sourceCode = await fetchSourceCodeBySubmitNum(submitNum);

            const response = await util.sendMessage(platform, 'commit', {
              extension,
              problemId,
              sourceCode,
              type: 'BOJ',
              title,
            });

            alert(response?.message);
          } catch (e) {
            console.error(e);
          }
        };

        const githubIconPath = GITHUB_ICON_PATH;
        const notionIconPath = NOTION_ICON_DARK_PATH;

        createButton(buttonWrapper, githubIconPath, () => handler('github'));
        createButton(buttonWrapper, notionIconPath, () => handler('notion'));

        resultTag.appendChild(buttonWrapper);
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
