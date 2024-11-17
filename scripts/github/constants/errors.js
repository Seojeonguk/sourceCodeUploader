export const SUCCESS_CODE = 'S200';

export const INVALID_CODE = 'G100';
export const INVALID_ACCESS_TOKEN = 'G101';
export const INVALID_GITHUB_ID = 'G102';
export const INVALID_UPLOADED_REPOSITORY = 'G103';

export const NOT_FOUND_ACCESS_TOKEN = 'G200';
export const NOT_FOUND_GITHUB_ID = 'G201';

export const ERROR = {
  [SUCCESS_CODE]: 'Operation completed successfully.',
  [INVALID_CODE]:
    'The code parameter is missing or invalid for requesting the access token.',
  [INVALID_ACCESS_TOKEN]: 'The access token retrieved is invalid or missing.',
  [INVALID_GITHUB_ID]:
    'The GitHub ID is missing or invalid for requesting the commit.',
  [INVALID_UPLOADED_REPOSITORY]:
    'The uploaded repository information is missing or invalid for requesting the commit.',

  [NOT_FOUND_ACCESS_TOKEN]: 'Access token could not be found in the response.',
  [NOT_FOUND_GITHUB_ID]: 'GitHub ID not found in the response.',
};
