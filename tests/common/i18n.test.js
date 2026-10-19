import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { JSDOM } from 'jsdom';

import {
  DatabasePropertyException,
  SetupRequiredException,
} from '../../scripts/common/exception/index.js';
import { localizePage, t } from '../../scripts/common/utils/i18n.js';
import { chromeI18n, createChromeI18n, MESSAGES } from '../helpers/i18n.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const readRepoFile = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const listFiles = (dir) =>
  readdirSync(path.join(ROOT, dir), { recursive: true })
    .map((file) => path.join(dir, file).split(path.sep).join('/'))
    .filter((file) => /\.(js|html)$/.test(file));

const placeholderNames = ({ message }) =>
  [...message.matchAll(/\$([A-Za-z0-9_@]+)\$/g)]
    .map(([, name]) => name.toLowerCase())
    .sort();

// The message keys that the extension uses: t('key'), data-i18n attributes, __MSG_key__ in the
// manifest, and the `notionType_<type>` keys of DatabasePropertyException.
const usedKeys = () => {
  const keys = new Set();
  [...listFiles('scripts'), ...listFiles('popup')].forEach((file) => {
    const content = readRepoFile(file);
    [
      ...content.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g),
      ...content.matchAll(/data-i18n(?:-aria-label)?="([A-Za-z0-9_]+)"/g),
    ].forEach(([, key]) => keys.add(key));
  });
  [
    ...readRepoFile('manifest.json').matchAll(/__MSG_([A-Za-z0-9_]+)__/g),
  ].forEach(([, key]) => keys.add(key));
  const exception = readRepoFile(
    'scripts/common/exception/DatabasePropertyException.js',
  );
  const namedTypes = exception.match(
    /NAMED_TYPES = Object\.freeze\(\[([^\]]*)\]/,
  )[1];
  [...namedTypes.matchAll(/'([a-z_]+)'/g)].forEach(([, type]) =>
    keys.add(`notionType_${type}`),
  );
  return keys;
};

describe('the messages', () => {
  it('has the same keys and placeholders in English and Korean', () => {
    assert.deepEqual(Object.keys(MESSAGES.ko), Object.keys(MESSAGES.en));
    Object.keys(MESSAGES.en).forEach((key) => {
      assert.deepEqual(
        placeholderNames(MESSAGES.ko[key]),
        placeholderNames(MESSAGES.en[key]),
        key,
      );
      assert.deepEqual(
        MESSAGES.ko[key].placeholders,
        MESSAGES.en[key].placeholders,
        key,
      );
    });
  });

  it('has a translation for every message', () => {
    Object.entries(MESSAGES.ko).forEach(([key, { message }]) =>
      assert.ok(message.trim() !== '', key),
    );
  });

  it('has every message the extension uses, and no other', () => {
    const used = usedKeys();

    assert.deepEqual(
      [...used].filter((key) => !(key in MESSAGES.en)),
      [],
      'used but missing',
    );
    assert.deepEqual(
      Object.keys(MESSAGES.en).filter((key) => !used.has(key)),
      [],
      'not used',
    );
  });

  it('uses the English messages as the default locale', () => {
    const manifest = JSON.parse(readRepoFile('manifest.json'));

    assert.equal(manifest.default_locale, 'en');
    assert.equal(manifest.description, '__MSG_extDescription__');
    assert.ok(MESSAGES.en.extDescription.message.length <= 132);
    assert.ok(MESSAGES.ko.extDescription.message.length <= 132);
  });
});

describe('t', () => {
  afterEach(() => {
    globalThis.chrome = { i18n: chromeI18n };
  });

  it('fills in the placeholders in order', () => {
    assert.equal(
      t('oauthOther', 'Notion', 'invalid_grant'),
      'Notion could not complete the login (invalid_grant).',
    );
  });

  it('returns the key of an unknown message, instead of nothing', () => {
    assert.equal(t('noSuchMessage'), 'noSuchMessage');
  });

  it('uses the language of the browser', () => {
    globalThis.chrome = { i18n: createChromeI18n('ko') };

    assert.equal(
      new SetupRequiredException('Notion', 'login').message,
      '먼저 확장 프로그램 팝업에서 Notion에 로그인해 주세요.',
    );
    assert.equal(
      new DatabasePropertyException('Notion', [
        { name: 'URL', type: 'rich_text', expected: 'url' },
      ]).message,
      'Notion 데이터베이스에 유형이 다른 속성이 있어요: "URL"은(는) URL이 아니라 텍스트. 유형을 바꾸거나, 확장 프로그램이 새로 추가할 수 있게 이름을 바꿔 주세요.',
    );
  });
});

describe('localizePage', () => {
  afterEach(() => {
    globalThis.chrome = { i18n: chromeI18n };
  });

  const load = (file) => new JSDOM(readRepoFile(file)).window.document;

  it('translates the popup into Korean', () => {
    globalThis.chrome = { i18n: createChromeI18n('ko') };
    const doc = load('popup/html/index.html');

    localizePage(doc);

    assert.equal(doc.documentElement.lang, 'ko');
    assert.equal(
      doc.querySelector('#uploaded-repository').textContent,
      '저장소 선택',
    );
    assert.equal(
      doc.querySelector('#uploaded-database').textContent,
      '데이터베이스 선택',
    );
    assert.equal(
      doc.querySelector('#github-auto-upload').getAttribute('aria-label'),
      'GitHub 자동 업로드',
    );
    assert.equal(
      doc.querySelector('#repository-list').getAttribute('aria-label'),
      '저장소',
    );
    assert.equal(
      doc.querySelector('.dark-light').getAttribute('aria-label'),
      '라이트 모드',
    );
  });

  it('keeps the English texts of the HTML in English', () => {
    ['popup/html/index.html', 'popup/html/githubLogin.html'].forEach((file) => {
      const doc = load(file);
      const before = [...doc.querySelectorAll('[data-i18n]')].map((element) =>
        element.textContent.trim(),
      );

      localizePage(doc);

      assert.equal(doc.documentElement.lang, 'en');
      assert.deepEqual(
        [...doc.querySelectorAll('[data-i18n]')].map(
          (element) => element.textContent,
        ),
        before,
        file,
      );
    });
  });

  it('translates the GitHub login page into Korean', () => {
    globalThis.chrome = { i18n: createChromeI18n('ko') };
    const doc = load('popup/html/githubLogin.html');

    localizePage(doc);

    assert.equal(doc.title, 'GitHub 로그인 - Source Code Uploader');
    assert.equal(doc.querySelector('#copy-code').textContent, '복사');
    assert.equal(
      doc.querySelector('#status').textContent,
      '코드를 요청하는 중...',
    );
  });
});
