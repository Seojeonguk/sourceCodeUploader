import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchAllPages } from '../../scripts/common/utils/pagination.js';

describe('fetchAllPages', () => {
  it('returns the items of a single page', async () => {
    const items = await fetchAllPages(async () => ({
      items: [1, 2],
      nextCursor: null,
    }));

    assert.deepEqual(items, [1, 2]);
  });

  it('follows the cursor until the last page', async () => {
    const pages = {
      undefined: { items: [1, 2], nextCursor: 'a' },
      a: { items: [3, 4], nextCursor: 'b' },
      b: { items: [5], nextCursor: undefined },
    };
    const cursors = [];

    const items = await fetchAllPages(async (cursor) => {
      cursors.push(cursor);
      return pages[cursor];
    });

    assert.deepEqual(items, [1, 2, 3, 4, 5]);
    assert.deepEqual(cursors, [undefined, 'a', 'b']);
  });

  it('returns an empty array when there are no items', async () => {
    const items = await fetchAllPages(async () => ({
      items: [],
      nextCursor: null,
    }));

    assert.deepEqual(items, []);
  });
});
