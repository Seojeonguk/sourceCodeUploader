import { getResourceURL, sendMessage } from "./chrome/runtime.js";
import { closeLatestTab } from "./chrome/tabs.js";
import { encodeBase64Unicode } from "./encoding.js";
import { createGithubAuthHeader, request } from "./fetch.js";

import {
  setChromeStorage,
  getChromeStorage,
  removeChromeStorage,
} from './chrome/storage.js';

/**
 * 유틸리티 함수들을 모아놓은 모듈입니다.
 *
 * @module utils/index
 */

export {
  createGithubAuthHeader,
  request,
  setChromeStorage,
  getChromeStorage,
  removeChromeStorage,
  closeLatestTab,
  getResourceURL,
  sendMessage,
  encodeBase64Unicode,
};
