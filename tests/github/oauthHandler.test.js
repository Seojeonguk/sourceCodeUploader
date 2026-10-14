import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL('../../scripts/github/handlers/oauthHandler.js', import.meta.url),
  'utf8',
);

// Settles the promise returned by the mocked sendMessage.
const flush = () => new Promise(setImmediate);

/**
 * Runs oauthHandler.js, a classic content script, in a sandbox.
 * @param {string} url - The page URL.
 * @param {() => Promise<*>} [respond] - Answers the message, like the background.
 * @returns {{ messages: Object[], banners: Object[] }} The sent messages and the shown banners.
 */
const runOn = (url, respond = async () => ({ ok: true })) => {
  const messages = [];
  const banners = [];
  const { pathname, search } = new URL(url);

  vm.runInContext(
    source,
    vm.createContext({
      URLSearchParams,
      window: { location: { pathname, search } },
      document: {
        createElement: () => ({ style: {}, setAttribute() {} }),
        body: { appendChild: (element) => banners.push(element) },
      },
      chrome: {
        runtime: {
          sendMessage: (message) => {
            messages.push(message);
            return respond();
          },
        },
      },
    }),
  );
  return { messages, banners };
};

describe('oauthHandler', () => {
  it('sends the code and the state of the redirect page', () => {
    const { messages } = runOn('https://github.com/?code=abc&state=xyz');

    assert.equal(messages.length, 1);
    assert.equal(messages[0].platform, 'oauth');
    assert.equal(messages[0].action, 'complete');
    assert.deepEqual(
      { ...messages[0].payload },
      { code: 'abc', error: null, state: 'xyz' },
    );
  });

  it('sends the error of a canceled login', () => {
    const { messages } = runOn(
      'https://github.com/?error=access_denied&state=xyz',
    );

    assert.deepEqual(
      { ...messages[0].payload },
      { code: null, error: 'access_denied', state: 'xyz' },
    );
  });

  it('shows nothing when the login succeeds', async () => {
    const { banners } = runOn('https://github.com/?code=abc&state=xyz');
    await flush();

    assert.deepEqual(banners, []);
  });

  it('shows the error when the login fails', async () => {
    const { banners } = runOn(
      'https://github.com/?error=access_denied&state=xyz',
      async () => ({ ok: false, message: 'Access to Notion was not allowed.' }),
    );
    await flush();

    assert.equal(banners.length, 1);
    assert.match(banners[0].textContent, /Access to Notion was not allowed\./);
    assert.match(banners[0].textContent, /Authorize in the extension popup/);
  });

  it('shows an error when the background does not answer', async () => {
    const { banners } = runOn('https://github.com/?code=abc&state=xyz', () =>
      Promise.reject(new Error('Could not establish connection.')),
    );
    await flush();

    assert.equal(banners.length, 1);
    assert.match(banners[0].textContent, /Could not establish connection\./);
  });

  it('ignores the redirect page without a state', () => {
    assert.deepEqual(runOn('https://github.com/?code=abc').messages, []);
    assert.deepEqual(
      runOn('https://github.com/?error=access_denied').messages,
      [],
    );
  });

  it('ignores other GitHub pages with a code parameter', () => {
    assert.deepEqual(
      runOn('https://github.com/search?q=x&code=abc&state=xyz').messages,
      [],
    );
    assert.deepEqual(
      runOn('https://github.com/user/repo/blob/main/a.js?code=abc&state=xyz')
        .messages,
      [],
    );
  });
});
