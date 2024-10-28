const initSourcePage = () => {
  const theme = parsingCodeMirrorTheme();
  const isDark = darkTheme[theme];
  const payload = {
    extension: parsingExtension(),
    problemId: parsingProblemID(),
    type: 'BOJ',
    title: parsingTitle(),
  };

  const codeMirror = $('.CodeMirror');
  const buttons = createButtons(isDark, payload, () => parsingSourceCode());
  codeMirror.append(buttons);
};
