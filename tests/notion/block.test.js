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

  it('does not cut an emoji in half at the end of a chunk', () => {
    // The emoji takes two UTF-16 code units, at positions 1999 and 2000.
    const text = `${'a'.repeat(1999)}😀${'b'.repeat(10)}`;
    const contents = contentsOf(createRichTextArrayByLength(text));

    assert.deepEqual(
      contents.map((content) => content.length),
      [1999, 12],
    );
    assert.ok(contents[1].startsWith('😀'));
    assert.equal(contents.join(''), text);
  });

  it('keeps every chunk at 2000 characters or less with many emoji', () => {
    // The leading `a` puts every 2000th code unit in the middle of an emoji.
    const text = `a${'😀'.repeat(3000)}`;
    const contents = contentsOf(createRichTextArrayByLength(text));

    assert.ok(contents.every((content) => content.length <= 2000));
    // No chunk starts or ends in the middle of an emoji.
    assert.ok(contents.every((content) => /^a?(?:😀)+$/u.test(content)));
    assert.equal(contents.join(''), text);
  });

  it('keeps a Korean or other single-unit character at the boundary', () => {
    const text = '가'.repeat(2001);

    assert.deepEqual(
      contentsOf(createRichTextArrayByLength(text)).map(
        (content) => content.length,
      ),
      [2000, 1],
    );
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
