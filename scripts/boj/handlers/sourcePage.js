const sourcePage = () => {
  const buttonWrapper = createButtonWrapper();
  const theme = parsingCodeMirrorTheme();
  const isDark = darkTheme[theme];

  const handler = async (platform) => {
    try {
      const problemId = parsingProblemID();
      const sourceCode = parsingSourceCode();
      const extension = parsingExtension();
      const title = parsingTitle();

      const response = await util.sendMessage(platform, 'commit', {
        extension,
        problemId,
        sourceCode,
        type: 'BOJ',
        title,
      });

      alert(response?.message);
    } catch (e) {
      console.error(e);
    }
  };

  const githubIconPath = isDark ? GITHUB_ICON_PATH : GITHUB_ICON_DARK_PATH;
  const notionIconPath = isDark ? NOTION_ICON_PATH : NOTION_ICON_DARK_PATH;

  createButton(buttonWrapper, githubIconPath, () => handler('github'));
  createButton(buttonWrapper, notionIconPath, () => handler('notion'));

  const codeMirror = $('.CodeMirror');
  codeMirror.append(buttonWrapper);
};
