export const SUCCESS_CODE = 'S200';

export const INVALID_PAYLOAD = 'N100';
export const INVALID_CODE = 'N101';
export const INVALID_ACCESS_TOKEN = 'N102';

export const NOT_FOUND_ACCESS_TOKEN = 'N200';

export const FETCH_API_FAILED = 'N300';

export const ERROR = {
  [SUCCESS_CODE]: 'Operation completed successfully.',
  [INVALID_PAYLOAD]:
    'The payload object is invalid for requesting the access token.',
  [INVALID_CODE]:
    'The code parameter is missing or invalid for requesting the access token.',
  [INVALID_ACCESS_TOKEN]: 'The access token retrieved is invalid or missing.',

  [NOT_FOUND_ACCESS_TOKEN]: 'Access token could not be found in the response.',

  [FETCH_API_FAILED]: 'Failed to fetch data from the GitHub API.',
};
