import { createElement, safeGetText, safeQuerySelector } from "./domUtils.js";
import { fetchSourceCodeBySubmitNum } from "./fetchUtils.js";

import {
  createActionButtonContainer,
  createPlatformActionButton,
  handlePlatformAction,
  initializePlatformButtons,
} from './buttonUtils.js';
import {
  filterCorrectUserSubmissions,
  getActiveEditorTheme,
  getCurrentLoginId,
  getProblemId,
  getProblemTitle,
  getSubmissionLanguageFileExtension,
  getSubmissionSourceCode,
  getSubmissionStatusTable,
  parseSubmissionRowData,
} from './parseUtils.js';

export {
  fetchSourceCodeBySubmitNum,
  filterCorrectUserSubmissions,
  getActiveEditorTheme,
  getCurrentLoginId,
  getProblemId,
  getProblemTitle,
  getSubmissionLanguageFileExtension,
  getSubmissionSourceCode,
  getSubmissionStatusTable,
  parseSubmissionRowData,
  createActionButtonContainer,
  createPlatformActionButton,
  handlePlatformAction,
  initializePlatformButtons,
  createElement,
  safeGetText,
  safeQuerySelector,
};
