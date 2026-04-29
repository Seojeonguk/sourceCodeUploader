import { DARK_THEMES } from "../constants/index.js";

import {
  getActiveEditorTheme,
  getSubmissionLanguageFileExtension,
  getProblemId,
  getProblemTitle,
  initializePlatformButtons,
  getSubmissionSourceCode,
} from '../utils/index.js';


/**
 * Initializes the source page with the necessary functionality.
 */
export const initSourcePage = () => {
  console.debug('[SCU] Initializing source page...');
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
