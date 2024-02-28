import * as Github from "./constants.js";

async function dispatch(action, payload) {
  if (action === Github.OPEN_OAUTH_PAGE) {
    openGithubOauthPage();
  }
}

function openGithubOauthPage() {
  let parameters = `client_id=${Github.CLIENT_ID}`;
  if (Github.REDIRECT_URL) {
    parameters += `&redirect_url=${Github.REDIRECT_URL}`;
  }
  if (Github.SCOPES) {
    parameters += `&scope=${Github.SCOPES[0]}`;
  }
  const url = `${Github.BASE_URL}/login/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
}

export { dispatch };
