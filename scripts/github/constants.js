export const BASE_URL = "https://github.com";
export const API_BASE_URL = "https://api.github.com";
export const CLIENT_ID = "2cfd0f1fae095d5a1684";
export const CLIENT_SECRET = "d1b31e8c09708b856ecbe03d1f9e9223e472da89";
export const REDIRECT_URL = "https://github.com";
export const SCOPES = ["repo"];

export const COMMIT = "commit";
export const GET_REPOSITORIES = "getRepositories";
export const OPEN_OAUTH_PAGE = "openOauthPage";
export const REQUEST_AND_SAVE_ACCESS_TOKEN = "requestAndSaveAccessToken";

// 오류 코드 정의
export const SUCCESS_CODE = "S200";

export const INVALID_PAYLOAD = "G100";
export const INVALID_CODE = "G101";
export const INVALID_ACCESS_TOKEN = "G102";
export const INVALID_GITHUB_ID = "G103";
export const INVALID_UPLOADED_REPOSITORY = "G104";

export const NOT_FOUND_ACCESS_TOKEN = "G200";
export const NOT_FOUND_GITHUB_ID = "G201";

export const FETCH_API_FAILED = "G300";

// 오류 메시지 정의
export const ERROR = {
  [SUCCESS_CODE]: "Operation completed successfully.",

  [INVALID_PAYLOAD]:
    "The payload object is invalid for requesting the access token.",
  [INVALID_CODE]:
    "The code parameter is missing or invalid for requesting the access token.",
  [INVALID_ACCESS_TOKEN]: "The access token retrieved is invalid or missing.",
  [INVALID_GITHUB_ID]:
    "The GitHub ID is missing or invalid for requesting the commit.",
  [INVALID_UPLOADED_REPOSITORY]:
    "The uploaded repository information is missing or invalid for requesting the commit.",

  [NOT_FOUND_ACCESS_TOKEN]: "Access token could not be found in the response.",
  [NOT_FOUND_GITHUB_ID]: "GitHub ID not found in the response.",

  [FETCH_API_FAILED]: "Failed to fetch data from the GitHub API.",
};
