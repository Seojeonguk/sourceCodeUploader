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

  const githubIcon = createButton(githubIconPath, async () => {
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

  buttonWrapper.appendChild(githubIcon);

  const notionIconPath = isDark
    ? "icon/notionIcon.png"
    : "icon/notionDarkIcon.png";
  const notionIcon = createButton(notionIconPath, async () => {
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

  buttonWrapper.appendChild(notionIcon);

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

        const extension = languages[submitLanguage];

        const buttonWrapper = createButtonWrapper();
        const githubIconPath = "icon/githubIcon.png";
        const githubUploadBtn = createButton(githubIconPath, async () => {
          const sourceCode = await fetchSourceCodeBySubmitNum(submitNum);

          const response = await util.sendMessage("github", "commit", {
            extension,
            problemId,
            sourceCode,
            type: "BOJ",
            title,
          });

          alert(response.message);
        });

        buttonWrapper.appendChild(githubUploadBtn);

        const notionIconPath = "icon/notionIcon.png";
        const notionUploadIcon = createButton(notionIconPath, async () => {
          const sourceCode = await fetchSourceCodeBySubmitNum(submitNum);

          const response = await util.sendMessage("notion", "upload", {
            extension,
            problemId,
            sourceCode,
            type: "BOJ",
            title,
          });

          alert(response.message);
        });

        buttonWrapper.appendChild(notionUploadIcon);

        resultTag.appendChild(buttonWrapper);
      }
    );
  } catch (e) {
    console.error(e);
  }
};
