let util;
/**
 * Load the util function dynamically.
 * Attach the icon according to the code theme.
 */
(async () => {
  const src = chrome.runtime.getURL("scripts/util.js");
  util = await import(src);

  const currentUrl = window.location.href;

  if (currentUrl.includes("status")) {
    statusPage();
  } else {
    sourcePage();
  }
})();

const sourcePage = () => {
  const buttonWrapper = createButtonWrapper();
  const theme = parsingCodeMirrorTheme();
  const isDark = darkTheme[theme];
  const githubIconPath = isDark
    ? "icon/githubIcon.png"
    : "icon/githubDarkIcon.png";

  createButton(buttonWrapper, githubIconPath, async () => {
    try {
      const problemId = parsingProblemID();
      const sourceCode = parsingSourceCode();
      const extension = parsingExtension();
      const title = parsingTitle();

      const response = await util.sendMessage("github", "commit", {
        extension,
        problemId,
        sourceCode,
        type: "BOJ",
        title,
      });

      alert(response.message);
    } catch (e) {
      console.error(e);
    }
  });

  const notionIconPath = isDark
    ? "icon/notionIcon.png"
    : "icon/notionDarkIcon.png";
  createButton(buttonWrapper, notionIconPath, async () => {
    try {
      const problemId = parsingProblemID();
      const sourceCode = parsingSourceCode();
      const extension = parsingExtension();
      const title = parsingTitle();

      const response = await util.sendMessage("notion", "upload", {
        extension,
        problemId,
        sourceCode,
        type: "BOJ",
        title,
      });

      alert(response.message);
    } catch (e) {
      console.error(e);
    }
  });

  const codeMirror = $(".CodeMirror");
  codeMirror.append(buttonWrapper);
};

const statusPage = () => {
  console.log("SCU START PARSE TABLE!");
  try {
    const loginID = parsingLoginID();
    const statusTable = parsingStatusTable();
    const rowSubmitInfos = processRows(statusTable);

    if (rowSubmitInfos.length === 0) {
      return;
    }

    rowSubmitInfos.forEach(
      ({
        submitNum,
        submitId,
        problemId,
        isCorrect,
        submitLanguage,
        resultTag,
        title,
      }) => {
        if (!isCorrect || submitId !== loginID) {
          return;
        }

        const buttonWrapper = createButtonWrapper();
        const githubIconPath = "icon/githubIcon.png";
        createButton(buttonWrapper, githubIconPath, async () => {
          const sourceCode = await fetchSourceCodeBySubmitNum(submitNum);
          const extension = languages[submitLanguage];

          const response = await util.sendMessage("github", "commit", {
            extension,
            problemId,
            sourceCode,
            type: "BOJ",
            title,
          });

          alert(response.message);
        });

        resultTag.appendChild(buttonWrapper);
      }
    );
  } catch (e) {
    console.error(e);
  }
};
