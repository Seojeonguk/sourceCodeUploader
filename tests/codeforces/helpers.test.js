import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

import { JSDOM } from 'jsdom';

import {
  createSubmissionHtml,
  PROBLEM_339B_HTML,
  PROBLEM_HTML,
  STATUS_ROW_HTML,
  SUBMISSION_HTML,
  SUBMISSION_SOURCE,
} from '../fixtures/codeforces/pages.js';

// helpers.js is a classic content script, so it is run in a sandbox instead of imported.
// Objects created in the sandbox are copied before deepEqual, since their prototype differs.
const loadHelpers = () => {
  const source = readFileSync(
    new URL('../../scripts/codeforces/helpers.js', import.meta.url),
    'utf8',
  );
  const context = vm.createContext({ URL });
  vm.runInContext(source, context);
  return context.SCU_CODEFORCES;
};

const {
  formatRating,
  getExtensionFromLanguage,
  getLoggedInHandle,
  getProblemNameFromLink,
  parseProblemPage,
  parseProblemPath,
  parseStatusRow,
  parseSubmissionPage,
} = loadHelpers();

const copy = (value) => JSON.parse(JSON.stringify(value));
const documentOf = (html) => new JSDOM(html).window.document;

describe('getExtensionFromLanguage', () => {
  it('maps the Codeforces language names to file extensions', () => {
    [
      ['C++23 (GCC 14-64, msys2)', 'cpp'],
      ['GNU G++20 13.2 (64 bit, winlibs)', 'cpp'],
      ['Clang++20 Diagnostics', 'cpp'],
      ['GNU GCC C11 5.1.0', 'c'],
      ['C11 (GCC 14-64, msys2)', 'c'],
      ['C# 10, .NET SDK 6.0', 'cs'],
      ['Python 3', 'py'],
      ['PyPy 3-64', 'py'],
      ['Java 21 64bit', 'java'],
      ['JavaScript V8 4.8.0', 'js'],
      ['Node.js 15.8.0 (64bit)', 'js'],
      ['Kotlin 1.9', 'kt'],
      ['Rust 2021', 'rs'],
      ['Go 1.22.2', 'go'],
      ['Ruby 3.2.2', 'rb'],
      ['PHP 8.1.7', 'php'],
      ['Scala 2.12.8', 'scala'],
      ['Haskell GHC 9.2.5', 'hs'],
      ['OCaml 4.02.1', 'ml'],
      ['Perl 5.20.1', 'pl'],
      ['Delphi 7', 'pas'],
      ['D DMD32 v2.105.0', 'd'],
    ].forEach(([language, extension]) =>
      assert.equal(getExtensionFromLanguage(language), extension, language),
    );
  });

  it('falls back to txt for an unknown language', () => {
    assert.equal(getExtensionFromLanguage('Befunge'), 'txt');
    assert.equal(getExtensionFromLanguage(undefined), 'txt');
  });
});

describe('parseProblemPath', () => {
  it('gives the problemset and the contest page of a problem the same URL', () => {
    const expected = {
      contestId: '1850',
      index: 'F',
      problemId: '1850F',
      url: 'https://codeforces.com/contest/1850/problem/F',
    };

    assert.deepEqual(
      copy(parseProblemPath('/contest/1850/problem/F')),
      expected,
    );
    assert.deepEqual(
      copy(parseProblemPath('/problemset/problem/1850/F')),
      expected,
    );
  });

  it('keeps the index of a split problem and the gym', () => {
    assert.equal(
      parseProblemPath('/contest/2261/problem/F1').problemId,
      '2261F1',
    );
    assert.equal(
      parseProblemPath('/gym/104114/problem/a').url,
      'https://codeforces.com/gym/104114/problem/A',
    );
  });

  it('returns null for another page', () => {
    assert.equal(parseProblemPath('/contest/1850/standings'), null);
  });
});

describe('getProblemNameFromLink', () => {
  it('removes the problem ID or index before the name', () => {
    assert.equal(
      getProblemNameFromLink('1850F - We Were Both Children'),
      'We Were Both Children',
    );
    assert.equal(
      getProblemNameFromLink(
        '\n  F1 - Plegma II: Ask Me Any Cell (Easy Version)\n',
      ),
      'Plegma II: Ask Me Any Cell (Easy Version)',
    );
  });
});

describe('parseProblemPage', () => {
  it('reads the name, the rating and the tags of a real problem page', () => {
    assert.deepEqual(copy(parseProblemPage(documentOf(PROBLEM_HTML))), {
      name: 'We Were Both Children',
      rating: 1300,
      tags: ['brute force', 'implementation', 'math', 'number theory'],
    });
  });

  it('reads the real page of 339B', () => {
    assert.deepEqual(copy(parseProblemPage(documentOf(PROBLEM_339B_HTML))), {
      name: 'Xenia and Ringroad',
      rating: 1000,
      tags: ['implementation'],
    });
  });

  it('has no rating for a problem without one, such as in the gym', () => {
    const page = parseProblemPage(
      documentOf(
        '<div class="problem-statement"><div class="header"><div class="title">A. Gym</div></div></div>',
      ),
    );
    assert.equal(page.rating, null);
    assert.deepEqual(copy(page.tags), []);
  });
});

describe('getLoggedInHandle', () => {
  it('reads the handle in the header, or null when no one is logged in', () => {
    Object.values(SUBMISSION_HTML).forEach((html) =>
      assert.equal(getLoggedInHandle(documentOf(html)), 'seojeonguk'),
    );
    assert.equal(
      getLoggedInHandle(documentOf(createSubmissionHtml({ handle: null }))),
      null,
    );
  });
});

describe('parseSubmissionPage', () => {
  it('reads a real accepted submission and its numbered code', () => {
    const accepted = {
      author: 'seojeonguk',
      language: 'C++17 (GCC 7-32)',
      accepted: true,
      // The link shows `339B`; the name comes from its title.
      problemName: 'Xenia and Ringroad',
      sourceCode: SUBMISSION_SOURCE.contest,
    };

    assert.deepEqual(
      copy(parseSubmissionPage(documentOf(SUBMISSION_HTML.contest))),
      { ...accepted, problemPath: '/contest/339/problem/B' },
    );
    assert.deepEqual(
      copy(parseSubmissionPage(documentOf(SUBMISSION_HTML.problemset))),
      { ...accepted, problemPath: '/problemset/problem/339/B' },
    );
  });

  it('reads a real rejected submission in the gym', () => {
    assert.deepEqual(
      copy(parseSubmissionPage(documentOf(SUBMISSION_HTML.gym))),
      {
        author: 'seojeonguk',
        language: 'C++17 (GCC 7-32)',
        accepted: false,
        problemPath: '/gym/106556/problem/A',
        problemName: 'BFS = DFS?',
        sourceCode: SUBMISSION_SOURCE.gym,
      },
    );
  });

  it('tells a rejected submission', () => {
    assert.equal(
      parseSubmissionPage(
        documentOf(createSubmissionHtml({ verdict: 'WRONG_ANSWER' })),
      ).accepted,
      false,
    );
  });

  it('keeps the lines of the code as it was sent', () => {
    const sourceCode = '#include <cstdio>\n\nint main() {\n    return 0;\n}\n';

    assert.equal(
      parseSubmissionPage(
        documentOf(
          createSubmissionHtml({
            sourceCode: sourceCode.replace('<', '&lt;').replace('>', '&gt;'),
          }),
        ),
      ).sourceCode,
      sourceCode,
    );
  });

  it('keeps the lines of the code after the page numbered them', () => {
    // Codeforces runs prettify on the code, which puts each line in an `<li>`.
    const sourceCode =
      '<ol class="linenums">' +
      '<li class="L0"><span class="com">#include &lt;cstdio&gt;</span></li>' +
      '<li class="L1"><span class="pln"></span></li>' +
      '<li class="L2"><span class="kwd">int</span><span class="pln"> main</span><span class="pun">()</span><span class="pln"> </span><span class="pun">{</span></li>' +
      '<li class="L3"><span class="pln">    </span><span class="kwd">return</span><span class="pln"> </span><span class="lit">0</span><span class="pun">;</span></li>' +
      '<li class="L4"><span class="pun">}</span></li>' +
      '</ol>';

    assert.equal(
      parseSubmissionPage(documentOf(createSubmissionHtml({ sourceCode })))
        .sourceCode,
      '#include <cstdio>\n\nint main() {\n    return 0;\n}',
    );
  });

  it('returns null for a page without a submission, such as the Cloudflare check', () => {
    assert.equal(
      parseSubmissionPage(documentOf('<title>Just a moment...</title>')),
      null,
    );
  });
});

describe('parseStatusRow', () => {
  it('reads a real row of a status table', () => {
    const doc = documentOf(`<table>${STATUS_ROW_HTML}</table>`);

    assert.deepEqual(copy(parseStatusRow(doc.querySelector('tr'))), {
      id: '395033187',
      author: 'tourist',
      verdict: 'OK',
      waiting: false,
      submissionPath: '/contest/2261/submission/395033187',
      problemPath: '/contest/2261/problem/H',
      problemName: 'Oh Tree Tree Tree, No Need to Leave',
      language: 'C++23 (GCC 14-64, msys2)',
    });
  });
});

describe('formatRating', () => {
  it('formats the rating as the level', () => {
    assert.equal(formatRating(1300), 'Rating 1300');
    assert.equal(formatRating(null), null);
  });
});
