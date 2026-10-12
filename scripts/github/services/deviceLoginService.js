import { NotFoundException } from '../../common/exception/index.js';
import { request } from '../../common/utils/index.js';
import { GITHUB_CONFIG } from '../config/config.js';
import { getUserInfo, saveInfo } from './authService.js';

// The device code waiting for the user, kept until the login finishes.
// chrome.storage.session survives the service worker restarting while the user enters the code.
const DEVICE_LOGIN_KEY = 'githubDeviceLogin';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';
// GitHub asks to wait 5 more seconds after `slow_down`.
const SLOW_DOWN_SECONDS = 5;

export const DEVICE_LOGIN_STATUS = Object.freeze({
  PENDING: 'pending',
  DONE: 'done',
  EXPIRED: 'expired',
  DENIED: 'denied',
});

// The OAuth endpoints take a form body, and answer in JSON with `Accept: application/json`.
const postToGithub = (path, body) =>
  request(
    `${GITHUB_CONFIG.BASE_URL}${path}`,
    'POST',
    {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    new URLSearchParams(body).toString(),
  );

const getDeviceLogin = async () =>
  (await chrome.storage.session.get(DEVICE_LOGIN_KEY))[DEVICE_LOGIN_KEY];

const saveDeviceLogin = (deviceLogin) =>
  chrome.storage.session.set({ [DEVICE_LOGIN_KEY]: deviceLogin });

const removeDeviceLogin = () => chrome.storage.session.remove(DEVICE_LOGIN_KEY);

/**
 * Starts the GitHub device flow, which needs only the client ID (no client secret).
 * @returns {Promise<{userCode: string, verificationUri: string, interval: number, expiresIn: number}>}
 *   The code the user enters on `verificationUri`, and how often to poll in seconds.
 */
export const startDeviceLogin = async () => {
  const response = await postToGithub('/login/device/code', {
    client_id: GITHUB_CONFIG.CLIENT_ID,
    scope: GITHUB_CONFIG.SCOPES.join(' '),
  });

  const deviceCode = response?.device_code;
  const userCode = response?.user_code;
  if (!deviceCode || !userCode) {
    throw new NotFoundException('GitHub', 'device code');
  }

  const { interval } = response;
  const expiresIn = response.expires_in;

  await saveDeviceLogin({
    deviceCode,
    interval,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return {
    userCode,
    verificationUri: response.verification_uri,
    interval,
    expiresIn,
  };
};

/**
 * Checks once whether the user has entered the code, and saves the login when they have.
 * @returns {Promise<{status: string, interval?: number}>} The status, and the seconds to wait
 *   before the next check while it is pending.
 */
export const pollDeviceLogin = async () => {
  const deviceLogin = await getDeviceLogin();
  if (!deviceLogin || Date.now() >= deviceLogin.expiresAt) {
    await removeDeviceLogin();
    return { status: DEVICE_LOGIN_STATUS.EXPIRED };
  }

  const response = await postToGithub('/login/oauth/access_token', {
    client_id: GITHUB_CONFIG.CLIENT_ID,
    device_code: deviceLogin.deviceCode,
    grant_type: DEVICE_GRANT_TYPE,
  });

  if (response?.access_token) {
    const githubID = await getUserInfo(response.access_token);
    saveInfo(response.access_token, githubID);
    await removeDeviceLogin();
    return { status: DEVICE_LOGIN_STATUS.DONE };
  }

  switch (response?.error) {
    case 'authorization_pending':
      return {
        status: DEVICE_LOGIN_STATUS.PENDING,
        interval: deviceLogin.interval,
      };
    case 'slow_down': {
      const interval =
        response.interval ?? deviceLogin.interval + SLOW_DOWN_SECONDS;
      await saveDeviceLogin({ ...deviceLogin, interval });
      return { status: DEVICE_LOGIN_STATUS.PENDING, interval };
    }
    case 'expired_token':
      await removeDeviceLogin();
      return { status: DEVICE_LOGIN_STATUS.EXPIRED };
    case 'access_denied':
      await removeDeviceLogin();
      return { status: DEVICE_LOGIN_STATUS.DENIED };
    default:
      await removeDeviceLogin();
      throw new Error(
        response?.error_description ??
          response?.error ??
          'Failed to log in to GitHub.',
      );
  }
};
