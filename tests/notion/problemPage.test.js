import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createProblemPageData,
  createSourceCodeBlock,
  findSourceCodeBlock,
  getCodeLanguage,
  getPlainText,
  isSameSourceCode,
} from '../../scripts/notion/objects/problemPage.js';

const names = (property) => property.multi_select.map(({ name }) => name);

const programmersProblem = {
  databaseId: 'database-id',
  type: 'Programmers',
  problemId: '1845',
  title: '폰켓몬',
  level: 'Lv. 1',
  tags: ['해시'],
  url: 'https://school.programmers.co.kr/learn/courses/30/lessons/1845',
  extension: 'py',
  sourceCode: 'def solution(nums):\n    return 0',
  createdAt: new Date('2026-10-12T00:00:00Z'),
};

describe('getCodeLanguage', () => {
  it('maps file extensions to Notion code languages', () => {
    assert.equal(getCodeLanguage('py'), 'python');
    assert.equal(getCodeLanguage('java'), 'java');
    assert.equal(getCodeLanguage('cpp'), 'c++');
    assert.equal(getCodeLanguage('cs'), 'c#');
    assert.equal(getCodeLanguage('kt'), 'kotlin');
    assert.equal(getCodeLanguage('JS'), 'javascript');
  });

  it('falls back to plain text', () => {
    assert.equal(getCodeLanguage('txt'), 'plain text');
    assert.equal(getCodeLanguage(undefined), 'plain text');
  });
});

describe('createProblemPageData', () => {
  it('creates the page in the selected database', () => {
    assert.deepEqual(createProblemPageData(programmersProblem).parent, {
      database_id: 'database-id',
    });
  });

  it('uses the problem info from the page', () => {
    const { properties } = createProblemPageData(programmersProblem);

    assert.equal(properties.title.title[0].text.content, '폰켓몬');
    assert.deepEqual(names(properties.info), ['Programmers', 'Lv. 1', '1845']);
    assert.deepEqual(names(properties.tags), ['해시']);
    assert.equal(properties.URL.url, programmersProblem.url);
    assert.equal(properties.mime.select.name, 'py');
  });

  it('sets the code block language from the extension (not always java)', () => {
    const { children } = createProblemPageData(programmersProblem);
    const codeBlock = children.find((block) => block.type === 'code');

    assert.equal(codeBlock.code.language, 'python');
    assert.equal(
      codeBlock.code.rich_text.map((text) => text.text.content).join(''),
      programmersProblem.sourceCode,
    );
  });

  it('leaves out an empty level', () => {
    const { properties } = createProblemPageData({
      ...programmersProblem,
      level: null,
    });

    assert.deepEqual(names(properties.info), ['Programmers', '1845']);
  });

  it('defaults to the BOJ problem URL', () => {
    const { properties } = createProblemPageData({
      ...programmersProblem,
      type: 'BOJ',
      problemId: '1000',
      url: undefined,
    });

    assert.equal(properties.URL.url, 'acmicpc.net/problem/1000');
  });
});

describe('findSourceCodeBlock', () => {
  const heading = (text) => ({
    id: text,
    type: 'heading_1',
    heading_1: { rich_text: [{ plain_text: text }] },
  });
  const code = (id, text) => ({
    id,
    type: 'code',
    code: { rich_text: [{ plain_text: text }] },
  });

  it('finds the code block below the Source Code heading', () => {
    const blocks = [
      heading('How to resolve?'),
      code('note', 'a code block in the notes'),
      heading('Source Code'),
      code('source', 'print(1)'),
    ];

    assert.equal(findSourceCodeBlock(blocks).id, 'source');
  });

  it('falls back to the first code block if the heading was removed', () => {
    assert.equal(findSourceCodeBlock([code('only', 'print(1)')]).id, 'only');
  });

  it('returns null if the page has no code block', () => {
    assert.equal(findSourceCodeBlock([heading('Source Code')]), null);
  });
});

describe('getPlainText', () => {
  it('joins the text split by the 2000 character limit (#145)', () => {
    const source = 'a'.repeat(4500);
    const { code } = createSourceCodeBlock({
      sourceCode: source,
      extension: 'py',
    });

    assert.equal(code.rich_text.length, 3);
    assert.equal(getPlainText(code.rich_text), source);
  });

  it('returns an empty string for an empty array', () => {
    assert.equal(getPlainText([]), '');
    assert.equal(getPlainText(undefined), '');
  });
});

describe('isSameSourceCode', () => {
  it('ignores the line endings', () => {
    assert.equal(isSameSourceCode('a\r\nb', 'a\nb'), true);
  });

  it('detects changed code', () => {
    assert.equal(isSameSourceCode('print(1)', 'print(2)'), false);
  });
});
