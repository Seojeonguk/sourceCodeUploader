import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDatabaseTitle } from '../../scripts/notion/objects/database.js';

describe('getDatabaseTitle', () => {
  it('joins every rich text of the title', () => {
    const database = {
      title: [{ plain_text: '알고리즘 ' }, { plain_text: '풀이' }],
    };

    assert.equal(getDatabaseTitle(database), '알고리즘 풀이');
  });

  it('returns Untitled for an untitled database', () => {
    assert.equal(getDatabaseTitle({ title: [] }), 'Untitled');
    assert.equal(
      getDatabaseTitle({ title: [{ plain_text: '  ' }] }),
      'Untitled',
    );
    assert.equal(getDatabaseTitle({}), 'Untitled');
  });

  it('keeps HTML in the title as text', () => {
    const database = {
      title: [{ plain_text: '<img src=x onerror=alert(1)>' }],
    };

    assert.equal(getDatabaseTitle(database), '<img src=x onerror=alert(1)>');
  });
});
