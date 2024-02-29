const buttonWrapper = createButtonWrapper();
createButton(buttonWrapper, "icon/githubIcon.png", () => {
  try {
    const problemId = parsingProblemID();
  } catch (e) {
    console.error(e);
  }
});

const codeMirror = $(".CodeMirror");
codeMirror.append(buttonWrapper);
