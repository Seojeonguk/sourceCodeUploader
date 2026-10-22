import {
  getChromeStorage,
  sendMessage,
} from '../../scripts/common/utils/index.js';
import {
  PLATFORMS,
  selectFirstUnfinishedTab,
  showLoggedIn,
  showLoggedOut,
  showSelected,
} from './platformState.js';
import { showJudgeSites } from './judgeSiteList.js';
import { applyLightMode } from './theme.js';
import { showToast } from './toast.js';

// The saved repository / database of each platform.
const TARGET_KEYS = Object.freeze({
  github: 'githubUploadedRepository',
  notion: 'notionUploadedDatabase',
});

/**
 * Shows why the last Notion login failed. The login window closes the popup,
 * so the popup could not show it when it happened.
 */
const showLastLoginError = async () => {
  const response = await sendMessage('notion', 'takeLoginError');
  if (response?.ok && response.message) {
    showToast(response.message, 'error');
  }
};

/**
 * Shows the login, the selected repository or database, and the auto upload option of a
 * platform from Chrome storage.
 * @param {'github'|'notion'} platform
 */
const loadPlatform = async (platform) => {
  const [accessToken, target, autoUpload, account] = await Promise.all([
    getChromeStorage(`${platform}AccessToken`),
    getChromeStorage(TARGET_KEYS[platform]),
    getChromeStorage(`${platform}AutoUpload`),
    // Notion has no user name to show, so it shows "Connected".
    platform === 'github' ? getChromeStorage('githubID') : null,
  ]);

  if (accessToken) {
    showLoggedIn(platform, account);
  }
  if (target) {
    showSelected(platform, target);
  }
  document.querySelector(`#${platform}-auto-upload`).checked =
    Boolean(autoUpload);
};

/**
 * Shows the changes that the background saves while the popup is open, such as a login that
 * finishes after its window closed, or an expired login.
 * @param {Object} changes - The changed storage keys, as `{ newValue, oldValue }`.
 * @param {string} area - The storage area.
 */
const showStorageChanges = async (changes, area) => {
  if (area !== 'local') {
    return;
  }

  await Promise.all(
    PLATFORMS.map(async (platform) => {
      const tokenKey = `${platform}AccessToken`;
      if (
        tokenKey in changes ||
        (platform === 'github' && 'githubID' in changes)
      ) {
        if (await getChromeStorage(tokenKey)) {
          showLoggedIn(
            platform,
            platform === 'github' ? await getChromeStorage('githubID') : null,
          );
        } else {
          showLoggedOut(platform);
        }
      }

      const target = changes[TARGET_KEYS[platform]];
      if (target?.newValue) {
        showSelected(platform, target.newValue);
      }

      const autoUpload = changes[`${platform}AutoUpload`];
      if (autoUpload) {
        document.querySelector(`#${platform}-auto-upload`).checked = Boolean(
          autoUpload.newValue,
        );
      }
    }),
  );
};

/**
 * Loads the saved state into the popup, and opens the tab of what is left to set up.
 * @returns {Promise<void>} Settles when the platforms are shown.
 */
export const initializeOnLoad = async () => {
  showJudgeSites();
  showLastLoginError();
  chrome.storage.onChanged.addListener(showStorageChanges);
  applyLightMode(Boolean(await getChromeStorage('popupLightMode')));
  await Promise.all(PLATFORMS.map(loadPlatform));
  selectFirstUnfinishedTab();
};
