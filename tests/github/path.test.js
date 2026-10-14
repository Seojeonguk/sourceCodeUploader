import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createUploadPath,
  encodeGithubContentPath,
  sanitizePathSegment,
} from '../../scripts/github/utils/path.js';

describe('sanitizePathSegment', () => {
  it('keeps a normal title', () => {
    assert.equal(sanitizePathSegment('두 수의 합', '1000'), '두 수의 합');
  });

  it('replaces characters that are invalid in file names', () => {
    assert.equal(sanitizePathSegment('A/B: C?', '1000'), 'A_B_ C_');
  });

  it('replaces control characters', () => {
    assert.equal(sanitizePathSegment('a\u0000b\u001fc', '1000'), 'a_b_c');
  });

  it('collapses spaces and trims', () => {
    assert.equal(sanitizePathSegment('  a    b  ', '1000'), 'a b');
  });

  it('replaces tabs and line breaks as control characters', () => {
    assert.equal(sanitizePathSegment('a\tb\nc', '1000'), 'a_b_c');
  });

  it('removes leading and trailing dots', () => {
    assert.equal(sanitizePathSegment('..hidden..', '1000'), 'hidden');
  });

  it('uses the fallback when the value is empty', () => {
    assert.equal(sanitizePathSegment('', '1000'), '1000');
    assert.equal(sanitizePathSegment(undefined, '1000'), '1000');
    assert.equal(sanitizePathSegment('...', '1000'), '1000');
  });
});

describe('encodeGithubContentPath', () => {
  it('encodes each segment and keeps the slashes', () => {
    assert.equal(
      encodeGithubContentPath('Programmers/두 수의 합#1.py'),
      'Programmers/%EB%91%90%20%EC%88%98%EC%9D%98%20%ED%95%A9%231.py',
    );
  });
});

describe('createUploadPath', () => {
  it('creates {type}/{title}.{extension}', () => {
    assert.equal(
      createUploadPath({
        type: 'Programmers',
        title: '두 수의 합',
        problemId: '12345',
        extension: 'py',
      }),
      'Programmers/두 수의 합.py',
    );
  });

  it('uses the problem ID when the title is empty', () => {
    assert.equal(
      createUploadPath({
        type: 'Programmers',
        title: '',
        problemId: '12345',
        extension: 'java',
      }),
      'Programmers/12345.java',
    );
  });

  it('keeps an extension with + or #', () => {
    assert.equal(
      createUploadPath({
        type: 'Programmers',
        title: 'a',
        problemId: '1',
        extension: 'c++',
      }),
      'Programmers/a.c++',
    );
  });

  [
    '.github/workflows',
    '../Programmers',
    'Programmers/..',
    '',
    undefined,
  ].forEach((type) => {
    it(`refuses the type ${JSON.stringify(type)}`, () => {
      assert.throws(
        () =>
          createUploadPath({
            type,
            title: 'a',
            problemId: '1',
            extension: 'py',
          }),
        {
          name: 'InvalidRequestException',
          message: 'Invalid type for GitHub.',
        },
      );
    });
  });

  ['py/../../x', 'yml/', '', '.py', undefined].forEach((extension) => {
    it(`refuses the extension ${JSON.stringify(extension)}`, () => {
      assert.throws(
        () =>
          createUploadPath({
            type: 'Programmers',
            title: 'a',
            problemId: '1',
            extension,
          }),
        { name: 'InvalidRequestException' },
      );
    });
  });
});

describe('createUploadPath with an unsafe problem ID', () => {
  it('sanitizes the problem ID used as the file name', () => {
    assert.equal(
      createUploadPath({
        type: 'Programmers',
        title: '',
        problemId: '../.github/workflows/x',
        extension: 'py',
      }),
      'Programmers/_.github_workflows_x.py',
    );
  });

  it('falls back to solution without a title or a problem ID', () => {
    assert.equal(
      createUploadPath({
        type: 'Programmers',
        title: '',
        problemId: '',
        extension: 'py',
      }),
      'Programmers/solution.py',
    );
  });
});
