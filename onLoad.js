import * as Util from "./scripts/util.js";

export function initializeOnLoad() {
  checkPlatformsAuthentication();
  loadCachedDatabaseList();
  loadCachedRepositoryList();
}

/**
 * Checks authentication status for various platforms (e.g., GitHub, Notion).
 * Iterates through the platforms array and retrieves access tokens from Chrome storage.
 * If an access token is found for a platform, updates the UI accordingly by adding a green status class
 * and changing the text and style of the authentication button to indicate removal.
 */

async function checkPlatformsAuthentication() {
  const platforms = ["github", "notion"];

  platforms.forEach(async (platform) => {
    const accessToken = await Util.getChromeStorage(`${platform}AccessToken`);
    if (accessToken) {
      $(`.${platform} .status`).addClass("green");
      $(`.${platform} .authentication-btn`).html("Remove");
      $(`.${platform} .authentication-btn`).addClass("delete");
    }
  });
}

/**
 * Load the database to upload to notion from chrome storage and display it on the popup page.
 */
async function loadCachedDatabaseList() {
  const uploadedDatabase = await Util.getChromeStorage(
    "notionUploadedDatabase"
  );

  if (!Util.isEmpty(uploadedDatabase)) {
    $("#uploaded-database").text(uploadedDatabase);
  }
}

/**
 * Load the repository to upload to github from Chrome storage and display it on the popup page.
 */
async function loadCachedRepositoryList() {
  const uploadedRepository = await Util.getChromeStorage(
    "githubUploadedRepository"
  );

  if (!Util.isEmpty(uploadedRepository)) {
    $("#uploaded-repository").text(uploadedRepository);
  }
}
