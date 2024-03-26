let util;
/**
 * Load the util function dynamically.
 * Attach the icon according to the code theme.
 */
(async () => {
  const src = chrome.runtime.getURL("scripts/util.js");
  util = await import(src);

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
})();
