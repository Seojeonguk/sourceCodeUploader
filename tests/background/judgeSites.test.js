import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { JUDGE_SITES, originOf } from '../../scripts/judgeSites.js';

const manifest = JSON.parse(
  readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'),
);

const required = JUDGE_SITES.filter(({ optional }) => !optional);
const optional = JUDGE_SITES.filter(({ optional: isOptional }) => isOptional);

// The API hosts, which every user granted already.
const API_HOSTS = Object.freeze([
  'https://api.notion.com/*',
  'https://github.com/*',
]);

describe('the judge sites and the manifest', () => {
  it('uses match patterns of the form https://<host>/*', () => {
    JUDGE_SITES.flatMap(({ origins }) => origins).forEach((origin) =>
      assert.match(origin, /^https:\/\/[a-z0-9.-]+\/\*$/, origin),
    );
    assert.equal(
      originOf('https://programmers.co.kr/*'),
      'https://programmers.co.kr',
    );
  });

  it('adds no required host, which would disable the extension for existing users', () => {
    assert.deepEqual(
      [...manifest.host_permissions].sort(),
      [...API_HOSTS, ...required.flatMap(({ origins }) => origins)].sort(),
    );
    // The content scripts may match fewer pages, such as the lesson pages, but only on the
    // hosts of the required sites.
    const requiredOrigins = required.flatMap(({ origins }) =>
      origins.map(originOf),
    );
    manifest.content_scripts
      .flatMap(({ matches }) => matches)
      .forEach((match) =>
        assert.ok(
          requiredOrigins.includes(new URL(match.replace(/\*/g, 'x')).origin),
          match,
        ),
      );
  });

  it('declares the optional sites as optional host permissions', () => {
    assert.deepEqual(
      [...(manifest.optional_host_permissions ?? [])].sort(),
      optional.flatMap(({ origins }) => origins).sort(),
    );
  });

  it('has the scripting permission, which shows no warning, to register their scripts', () => {
    assert.ok(manifest.permissions.includes('scripting'));
  });

  it('keeps the chrome APIs out of the scripts in the page world, where they do not exist', () => {
    const pageWorld = optional
      .flatMap(({ contentScripts }) => contentScripts)
      .filter(({ world }) => world === 'MAIN');
    assert.ok(pageWorld.length > 0);
    pageWorld.forEach((script) => {
      assert.equal(script.css, undefined, script.id);
      script.js.forEach((file) =>
        assert.doesNotMatch(
          readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
          /\bchrome\./,
          `${script.id}: ${file}`,
        ),
      );
    });
  });

  it('gives each optional site scripts that run only on its pages', () => {
    optional.forEach((site) => {
      assert.ok(site.contentScripts?.length > 0, site.id);
      const origins = site.origins.map(originOf);
      site.contentScripts.forEach((script) =>
        script.matches.forEach((match) =>
          assert.ok(
            origins.includes(new URL(match.replace(/\*/g, 'x')).origin),
            `${site.id}: ${match}`,
          ),
        ),
      );
    });
  });
});
