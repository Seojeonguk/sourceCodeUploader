import * as Notion from "./constants.js";

async function dispatch(action, payload) {
  try {
    if (action === Notion.OPEN_OAUTH_PAGE) {
      openOauthPage();
    }
  } catch (e) {
    throw e;
  }
}

function openOauthPage() {
  let parameters = `owner=user&client_id=${Notion.CLIENT_ID}&response_type=code`;
  if (Notion.REDIRECT_URL) {
    parameters += `&redirect_uri=${Notion.REDIRECT_URL}`;
  }

  const url = `${Notion.API_BASE_URL}/v1/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
}

export { dispatch };
