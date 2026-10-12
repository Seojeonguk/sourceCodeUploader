import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createRichTextArray,
  createRichTextArrayByLength,
} from '../../scripts/notion/objects/block.js';

const contentsOf = (richTexts) =>
  richTexts.map((richText) => richText.text.content);

describe('createRichTextArrayByLength', () => {
  it('keeps text of 2000 characters or less in one rich text object', () => {
    const text = 'a'.repeat(2000);

    assert.deepEqual(contentsOf(createRichTextArrayByLength(text)), [text]);
  });

  it('splits longer text into chunks of 2000 characters (#145)', () => {
    const text = 'a'.repeat(4500);
    const contents = contentsOf(createRichTextArrayByLength(text));

    assert.deepEqual(
      contents.map((content) => content.length),
      [2000, 2000, 500],
    );
    assert.equal(contents.join(''), text);
  });

  it('returns an empty array for empty text', () => {
    assert.deepEqual(createRichTextArrayByLength(''), []);
  });

  it('creates text-type rich text objects', () => {
    const [richText] = createRichTextArrayByLength('code');

    assert.equal(richText.type, 'text');
    assert.equal(richText.plain_text, 'code');
  });
});

describe('createRichTextArray', () => {
  it('splits text by line and keeps the line breaks', () => {
    assert.deepEqual(contentsOf(createRichTextArray('a\nb\nc')), [
      'a\n',
      'b\n',
      'c',
    ]);
  });

  it('keeps text without line breaks in one rich text object', () => {
    assert.deepEqual(contentsOf(createRichTextArray('title')), ['title']);
  });
});
