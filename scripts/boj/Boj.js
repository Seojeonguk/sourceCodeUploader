const buttonWrapper = createButtonWrapper();
createButton(buttonWrapper, "icon/githubIcon.png", async () => {
  try {
    const problemId = parsingProblemID();
    const sourceCode = parsingSourceCode();
    const extension = parsingExtension();

    chrome.runtime.sendMessage(
      {
        platform: "github",
        action: "commit",
        payload: {
          extension: extension,
          problemId: problemId,
          sourceCode: sourceCode,
          type: "BOJ",
        },
      },
      (response) => {
        // Add more..
      }
    );
  } catch (e) {
    console.error(e);
  }
});

const codeMirror = $(".CodeMirror");
codeMirror.append(buttonWrapper);
