function initializeOnLoad() {
  checkPlatformsAuthentication();
  loadCachedRepositoryList();
}

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
