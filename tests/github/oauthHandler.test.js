import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
  new URL('../../scripts/github/handlers/oauthHandler.js', import.meta.url),
  'utf8',
);

// oauthHandler.js is a classic content script, so it is run in a sandbox.
const runOn = (url) => {
  const messages = [];
  const { pathname, search } = new URL(url);
  vm.runInContext(
    source,
    vm.createContext({
      URLSearchParams,
      window: { location: { pathname, search } },
      chrome: { runtime: { sendMessage: (message) => messages.push(message) } },
    }),
  );
  return messages;
};

describe('oauthHandler', () => {
  it('sends the code and the state of the redirect page', () => {
    const messages = runOn('https://github.com/?code=abc&state=xyz');

    assert.equal(messages.length, 1);
    assert.equal(messages[0].platform, 'oauth');
    assert.equal(messages[0].action, 'complete');
    assert.deepEqual({ ...messages[0].payload }, { code: 'abc', state: 'xyz' });
  });

  it('ignores the redirect page without a state', () => {
    assert.deepEqual(runOn('https://github.com/?code=abc'), []);
  });

  it('ignores other GitHub pages with a code parameter', () => {
    assert.deepEqual(
      runOn('https://github.com/search?q=x&code=abc&state=xyz'),
      [],
    );
    assert.deepEqual(
      runOn('https://github.com/user/repo/blob/main/a.js?code=abc&state=xyz'),
      [],
    );
  });
});
