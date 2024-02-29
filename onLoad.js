function initializeOnLoad() {
  checkPlatformsAuthentication();
  syncRepositories();
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

async function syncRepositories() {
  const repositories = await getChromeStorage("githubRepositories");
  if (repositories) {
    $("#repository-list li").remove();

    repositories.forEach((repository) => {
      $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
    });
  }
}
