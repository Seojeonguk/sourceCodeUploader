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
