export const CLIENT_ID = "b5800b4c-70d0-4838-ab55-c7067b51354e";
export const CLIENT_SECRET =
  "secret_uHXz1yQjYMGS5j4fhGl3aIeY88AouLzAwp8CN7hs1DO";
export const API_BASE_URL = "https://api.notion.com";
export const REDIRECT_URL = "https://github.com";

export const OPEN_OAUTH_PAGE = "openOauthPage";
export const REQUEST_AND_SAVE_ACCESS_TOKEN = "requestAndSaveAccessToken";
export const GET_DATABASES = "getDatabases";
export const UPLOAD = "upload";

// 오류 코드 정의
export const SUCCESS_CODE = "S200";

export const INVALID_PAYLOAD = "N100";
export const INVALID_CODE = "N101";
export const INVALID_ACCESS_TOKEN = "N102";

export const NOT_FOUND_ACCESS_TOKEN = "N200";

export const FETCH_API_FAILED = "N300";

// 오류 메시지 정의
export const ERROR = {
  [SUCCESS_CODE]: "Operation completed successfully.",

  [INVALID_PAYLOAD]:
    "The payload object is invalid for requesting the access token.",
  [INVALID_CODE]:
    "The code parameter is missing or invalid for requesting the access token.",
  [INVALID_ACCESS_TOKEN]: "The access token retrieved is invalid or missing.",

  [NOT_FOUND_ACCESS_TOKEN]: "Access token could not be found in the response.",

  [FETCH_API_FAILED]: "Failed to fetch data from the GitHub API.",
};
