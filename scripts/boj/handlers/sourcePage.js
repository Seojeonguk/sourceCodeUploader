const initSourcePage = () => {
  const theme = getActiveEditorTheme();
  const isDark = darkTheme[theme];
  const payload = {
    extension: getSubmissionLanguageFileExtension(),
    problemId: getProblemId(),
    type: 'BOJ',
    title: getProblemTitle(),
  };

  const codeMirror = $('.CodeMirror');
  const buttons = initializePlatformButtons(isDark, payload, () =>
    getSubmissionSourceCode(),
  );
  codeMirror.append(buttons);
};
