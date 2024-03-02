let util;
(async () => {
  const src = chrome.runtime.getURL("scripts/util.js");
  util = await import(src);

  const buttonWrapper = createButtonWrapper();
  createButton(buttonWrapper, "icon/githubIcon.png", async () => {
    try {
      const problemId = parsingProblemID();
      const sourceCode = parsingSourceCode();
      const extension = parsingExtension();
      const title = parsingTitle();

      const response = await util.sendMessage("github", "commit", {
        extension: extension,
        problemId: problemId,
        sourceCode: sourceCode,
        type: "BOJ",
        title: title,
      });

      // Add more..
    } catch (e) {
      console.error(e);
    }
  });

  const codeMirror = $(".CodeMirror");
  codeMirror.append(buttonWrapper);
})();
