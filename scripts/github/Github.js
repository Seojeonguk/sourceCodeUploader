const GITHUB_BASE_URL = "https://github.com";
const GITHUB_API_BASE_URL = "https://api.github.com";
const CLIENT_ID = "2cfd0f1fae095d5a1684";
const CLIENT_SECRET = "d1b31e8c09708b856ecbe03d1f9e9223e472da89";
const REDIRECT_URL = "https://github.com";
const SCOPES = ["repo"];

const OPEN_GITHUB_OAUTH_PAGE = "openGithubOauthPage";

async function dispatch(action, payload) {
  if (action === OPEN_GITHUB_OAUTH_PAGE) {
    openGithubOauthPage();
  }
}

function openGithubOauthPage() {
  let parameters = `client_id=${CLIENT_ID}`;
  if (REDIRECT_URL) {
    parameters += `&redirect_url=${REDIRECT_URL}`;
  }
  if (SCOPES) {
    parameters += `&scope=${SCOPES[0]}`;
  }
  const url = `${GITHUB_BASE_URL}/login/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
}

export { dispatch };
export { OPEN_GITHUB_OAUTH_PAGE };
