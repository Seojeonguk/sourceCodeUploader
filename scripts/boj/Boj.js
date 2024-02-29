const buttonWrapper = createButtonWrapper();
createButton(buttonWrapper, "icon/githubIcon.png", () => {
  try {
    const problemId = parsingProblemID();
    const sourceCode = parsingSourceCode();
    const extension = parsingExtension();
    // Add more..
  } catch (e) {
    console.error(e);
  }
});

const codeMirror = $(".CodeMirror");
codeMirror.append(buttonWrapper);
