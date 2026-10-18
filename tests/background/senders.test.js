import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { isAllowedSender } from '../../scripts/senders.js';

const EXTENSION_ID = 'mfhbpmbchemfhijjamldbkidlegfmaff';
const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;
const PROBLEM_URL =
  'https://school.programmers.co.kr/learn/courses/30/lessons/1845';

// The messages that the popup and the GitHub login page send.
const EXTENSION_PAGE_MESSAGES = [
  ['github', 'openOauthPage'],
  ['github', 'startDeviceLogin'],
  ['github', 'pollDeviceLogin'],
  ['github', 'getRepositories'],
  ['github', 'logout'],
  ['notion', 'openOauthPage'],
  ['notion', 'getDatabases'],
  ['notion', 'takeLoginError'],
  ['notion', 'logout'],
];

// The messages that the Programmers content script sends.
const JUDGE_PAGE_MESSAGES = [
  ['github', 'commit'],
  ['github', 'getAutoUpload'],
  ['notion', 'upload'],
  ['notion', 'getAutoUpload'],
];

const popup = {
  id: EXTENSION_ID,
  url: `${EXTENSION_ORIGIN}/popup/html/index.html`,
};

const judgePage = (url = PROBLEM_URL, overrides = {}) => ({
  id: EXTENSION_ID,
  url,
  tab: { id: 1, url },
  frameId: 0,
  ...overrides,
});

describe('isAllowedSender', () => {
  beforeEach(() => {
    globalThis.chrome = {
      runtime: {
        id: EXTENSION_ID,
        getURL: (path) => `${EXTENSION_ORIGIN}/${path}`,
      },
    };
  });

  afterEach(() => {
    delete globalThis.chrome;
  });

  describe('extension pages', () => {
    [...EXTENSION_PAGE_MESSAGES, ...JUDGE_PAGE_MESSAGES].forEach(
      ([platform, action]) => {
        it(`allow ${platform}/${action} from the popup`, () => {
          assert.equal(isAllowedSender(platform, action, popup), true);
        });
      },
    );

    it('allow the GitHub login page opened in a tab', () => {
      const url = `${EXTENSION_ORIGIN}/popup/html/githubLogin.html`;

      assert.equal(
        isAllowedSender('github', 'pollDeviceLogin', {
          id: EXTENSION_ID,
          url,
          tab: { id: 2, url },
          frameId: 0,
        }),
        true,
      );
    });
  });

  describe('judge pages', () => {
    JUDGE_PAGE_MESSAGES.forEach(([platform, action]) => {
      it(`allow ${platform}/${action}`, () => {
        assert.equal(isAllowedSender(platform, action, judgePage()), true);
        assert.equal(
          isAllowedSender(
            platform,
            action,
            judgePage('https://programmers.co.kr/learn/courses/30/lessons/1'),
          ),
          true,
        );
      });
    });

    EXTENSION_PAGE_MESSAGES.forEach(([platform, action]) => {
      it(`refuse ${platform}/${action}`, () => {
        assert.equal(isAllowedSender(platform, action, judgePage()), false);
      });
    });

    it('refuse a frame inside the page', () => {
      assert.equal(
        isAllowedSender(
          'github',
          'commit',
          judgePage(PROBLEM_URL, { frameId: 3 }),
        ),
        false,
      );
    });
  });

  describe('other senders', () => {
    [
      ['github.com', 'https://github.com/'],
      ['a look-alike host', 'https://programmers.co.kr.example.com/lessons/1'],
      [
        'plain HTTP',
        'http://school.programmers.co.kr/learn/courses/30/lessons/1',
      ],
      ['an invalid URL', 'not a url'],
    ].forEach(([name, url]) => {
      it(`refuse ${name}`, () => {
        assert.equal(
          isAllowedSender('github', 'commit', judgePage(url)),
          false,
        );
      });
    });

    it('refuse another extension', () => {
      assert.equal(
        isAllowedSender('github', 'getRepositories', {
          id: 'otherextensionidotherextensionid',
          url: 'chrome-extension://otherextensionidotherextensionid/popup.html',
        }),
        false,
      );
    });

    it('refuse a message without a sender', () => {
      assert.equal(isAllowedSender('github', 'commit', undefined), false);
    });

    // In Node, `new URL(url).origin` is "null" for these URLs and for chrome-extension: ones,
    // so comparing origins would let them pass as extension pages.
    [
      ['about:blank', 'about:blank'],
      ['a data: URL', 'data:text/html,<p>page</p>'],
      [
        'a look-alike extension URL',
        `${EXTENSION_ORIGIN}x/popup/html/index.html`,
      ],
      ['no URL', undefined],
    ].forEach(([name, url]) => {
      it(`refuse ${name} from this extension's process as an extension page`, () => {
        assert.equal(
          isAllowedSender('github', 'getRepositories', {
            id: EXTENSION_ID,
            url,
          }),
          false,
        );
      });
    });
  });
});
