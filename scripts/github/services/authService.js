import { GITHUB_CONFIG } from "../config/config.js";

export const authService = {
  openOauthPage() {
    const params = new URLSearchParams({
      client_id: GITHUB_CONFIG.CLIENT_ID,
      redirect_uri: GITHUB_CONFIG.REDIRECT_URL,
      scope: GITHUB_CONFIG.SCOPES[0],
    });

    chrome.tabs.create({
      url: `${GITHUB_CONFIG.BASE_URL}/login/oauth/authorize?${params}`,
    });
  },
};
