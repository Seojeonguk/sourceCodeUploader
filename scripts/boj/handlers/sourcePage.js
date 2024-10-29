/**
 * Initializes the source page with the necessary functionality.
 */
const initSourcePage = () => {
  const theme = getActiveEditorTheme();
  const isDark = DARK_THEMES[theme];
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
