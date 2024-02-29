const buttonWrapper = createButtonWrapper();
createButton(buttonWrapper, "icon/githubIcon.png", () => {
  // Add more..
});

const codeMirror = $(".CodeMirror");
codeMirror.append(buttonWrapper);
