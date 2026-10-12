import { InvalidRequestException } from '../common/exception/index.js';

const PENDING_STATES_KEY = 'oauthPendingStates';
// How long the user has to finish logging in.
const STATE_TTL = 10 * 60 * 1000;

// chrome.storage.session is cleared when the browser closes and, by default,
// cannot be read by content scripts. It also survives the service worker restarting
// while the user is logging in.
const getPendingStates = async () =>
  (await chrome.storage.session.get(PENDING_STATES_KEY))[PENDING_STATES_KEY] ??
  {};

const savePendingStates = (states) =>
  chrome.storage.session.set({ [PENDING_STATES_KEY]: states });

const isExpired = ({ createdAt }, now) => now - createdAt >= STATE_TTL;

/**
 * Opens the OAuth authorization page with a new `state`, and remembers which platform
 * and tab it belongs to until the redirect comes back.
 * @param {'github'|'notion'} platform - The platform to log in to.
 * @param {(state: string) => string} createUrl - Creates the authorization URL with the state.
 */
export const openOAuthPage = async (platform, createUrl) => {
  const now = Date.now();
  const state = crypto.randomUUID();

  const states = Object.fromEntries(
    Object.entries(await getPendingStates()).filter(
      ([, pending]) => !isExpired(pending, now),
    ),
  );
  states[state] = { platform, createdAt: now, tabId: null };
  await savePendingStates(states);

  const tab = await chrome.tabs.create({ url: createUrl(state) });

  const latestStates = await getPendingStates();
  if (latestStates[state]) {
    latestStates[state].tabId = tab.id;
    await savePendingStates(latestStates);
  }
};

/**
 * Checks the `state` of an OAuth redirect and returns its platform.
 * A state can be used only once, only before it expires, and only from the tab opened for it.
 * @param {string} state - The state from the redirect URL.
 * @param {number} [tabId] - The tab the redirect came from.
 * @throws {InvalidRequestException} If the state is unknown, used, expired or from another tab.
 * @returns {Promise<'github'|'notion'>} The platform the state was created for.
 */
export const consumeOAuthState = async (state, tabId) => {
  const states = await getPendingStates();
  const pending = states[state];

  if (pending) {
    delete states[state];
    await savePendingStates(states);
  }

  if (
    !pending ||
    isExpired(pending, Date.now()) ||
    (pending.tabId !== null && pending.tabId !== tabId)
  ) {
    throw new InvalidRequestException('OAuth', 'state');
  }

  return pending.platform;
};
