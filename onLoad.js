function initializeOnLoad() {
  checkPlatformsAuthentication();
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
    const accessToken = await getChromeStorage(`${platform}AccessToken`);
    if (accessToken) {
      $(`.${platform} .status`).addClass("green");
      $(`.${platform} .authentication-btn`).html("Remove");
      $(`.${platform} .authentication-btn`).addClass("delete");
    }
  });
}

/**
 * Loads cached repository list from Chrome storage and displays it as a list.
 * If cached repositories exist, removes existing list items and appends new ones
 * based on the retrieved repository data.
 */
async function loadCachedRepositoryList() {
  const repositories = await getChromeStorage("githubRepositories");
  if (repositories) {
    $("#repository-list li").remove();

    repositories.forEach((repository) => {
      $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
    });
  }
}
