import { getChromeStorage } from "../../scripts/common/utils/index.js";

export const initializeOnLoad = () => {
  checkPlatformsAuthentication();
  loadCachedDatabaseList();
  loadCachedRepositoryList();
};

/**
 * Checks authentication status for various platforms (e.g., GitHub, Notion).
 * Iterates through the platforms array and retrieves access tokens from Chrome storage.
 * If an access token is found for a platform, updates the UI accordingly by adding a green status class
 * and changing the text and style of the authentication button to indicate removal.
 */

const checkPlatformsAuthentication = () => {
  const platforms = ['github', 'notion'];

  platforms.forEach(async (platform) => {
    const accessToken = await getChromeStorage(`${platform}AccessToken`);
    if (accessToken) {
      $(`.${platform} .status`).addClass('green');
      $(`.${platform} .authentication-btn`).html('Remove');
      $(`.${platform} .authentication-btn`).addClass('delete');
    }
  });
};

/**
 * Load the database to upload to notion from chrome storage and display it on the popup page.
 */
const loadCachedDatabaseList = async () => {
  const uploadedDatabase = await getChromeStorage('notionUploadedDatabase');

  if (uploadedDatabase) {
    $('#uploaded-database').text(uploadedDatabase);
  }
};

/**
 * Load the repository to upload to github from Chrome storage and display it on the popup page.
 */

const loadCachedRepositoryList = async () => {
  const uploadedRepository = await getChromeStorage('githubUploadedRepository');

  if (uploadedRepository) {
    $('#uploaded-repository').text(uploadedRepository);
  }
};
