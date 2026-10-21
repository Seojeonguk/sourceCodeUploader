import {
  getChromeStorage,
  sendMessage,
  t,
} from '../../scripts/common/utils/index.js';
import { showToast } from './toast.js';

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

export const initializeOnLoad = () => {
  checkPlatformInfos();
  loadCachedDatabaseList();
  loadCachedRepositoryList();
  showLastLoginError();
};

/**
 * Checks authentication status for various platforms (e.g., GitHub, Notion).
 * Iterates through the platforms array and retrieves access tokens from Chrome storage.
 * If an access token is found for a platform, updates the UI accordingly by adding a green status class
 * and changing the text and style of the authentication button to indicate removal.
 */

const checkPlatformInfos = () => {
  const platforms = ['github', 'notion'];

  platforms.forEach(async (platform) => {
    const accessToken = await getChromeStorage(`${platform}AccessToken`);
    if (accessToken) {
      document.querySelector(`.${platform} .status`).classList.add('green');
      const button = document.querySelector(`.${platform} .authentication-btn`);
      button.textContent = t('popupRemove');
      button.classList.add('delete');
    }

    const autoUpload = await getChromeStorage(`${platform}AutoUpload`);
    document.querySelector(`#${platform}-auto-upload`).checked =
      Boolean(autoUpload);
  });
};

/**
 * Load the database to upload to notion from chrome storage and display it on the popup page.
 */
const loadCachedDatabaseList = async () => {
  const uploadedDatabase = await getChromeStorage('notionUploadedDatabase');

  if (uploadedDatabase) {
    document.querySelector('#uploaded-database').textContent = uploadedDatabase;
  }
};

/**
 * Load the repository to upload to github from Chrome storage and display it on the popup page.
 */

const loadCachedRepositoryList = async () => {
  const uploadedRepository = await getChromeStorage('githubUploadedRepository');

  if (uploadedRepository) {
    document.querySelector('#uploaded-repository').textContent =
      uploadedRepository;
  }
};
