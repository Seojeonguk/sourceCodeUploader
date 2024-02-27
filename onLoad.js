function initializeOnLoad() {
  checkPlatformsAuthentication();
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
