import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { parseRetryAfter, request } from '../../scripts/common/utils/fetch.js';

const URL = 'https://api.example.com/items';

const jsonResponse = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

// Fails with the given responses first, then succeeds.
const fetchFailingWith = (...responses) => {
  let calls = 0;
  return mock.fn(async () => {
    calls += 1;
    return calls <= responses.length
      ? responses[calls - 1]()
      : jsonResponse({ ok: true });
  });
};

const networkError = () => new TypeError('Failed to fetch');

// A fetch that never responds, and rejects when the request is aborted.
const hangingFetch = async (url, { signal }) =>
  new Promise((resolve, reject) => {
    signal.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted.', 'AbortError')),
    );
  });

// No delay between retries in the tests.
const options = { retryDelay: 0 };

describe('parseRetryAfter', () => {
  it('reads seconds', () => {
    assert.equal(parseRetryAfter('3'), 3000);
    assert.equal(parseRetryAfter('0'), 0);
  });

  it('reads an HTTP date', () => {
    const date = new Date(Date.now() + 5000).toUTCString();

    const delay = parseRetryAfter(date);

    // The date has no milliseconds.
    assert.ok(delay > 3000 && delay <= 5000, `${delay}`);
  });

  it('does not wait for a past date or a negative number', () => {
    assert.equal(parseRetryAfter('Wed, 21 Oct 2015 07:28:00 GMT'), 0);
    assert.equal(parseRetryAfter('-1'), 0);
  });

  it('returns null without a valid value', () => {
    assert.equal(parseRetryAfter(null), null);
    assert.equal(parseRetryAfter(''), null);
    assert.equal(parseRetryAfter('soon'), null);
  });
});

describe('request', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
    mock.method(console, 'warn', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('responses', () => {
    it('returns the JSON body', async () => {
      globalThis.fetch = mock.fn(async () => jsonResponse({ id: 1 }));

      assert.deepEqual(await request(URL, 'GET'), { id: 1 });
    });

    it('returns the text body', async () => {
      globalThis.fetch = mock.fn(
        async () => new Response('access_token=abc&scope=repo'),
      );

      assert.equal(await request(URL, 'POST'), 'access_token=abc&scope=repo');
    });

    it('returns an empty string for 204 No Content', async () => {
      globalThis.fetch = mock.fn(
        async () => new Response(null, { status: 204 }),
      );

      assert.equal(await request(URL, 'DELETE'), '');
    });
  });

  describe('errors', () => {
    it('throws HttpException with the status and the JSON body', async () => {
      globalThis.fetch = mock.fn(async () =>
        jsonResponse({ message: 'Bad credentials' }, 401),
      );

      await assert.rejects(request(URL, 'GET'), {
        name: 'HttpException',
        status: 401,
        message: 'Bad credentials (HTTP 401)',
        body: { message: 'Bad credentials' },
      });
    });

    it('keeps the status when the error body is not JSON', async () => {
      globalThis.fetch = mock.fn(
        async () =>
          new Response('<html>Bad Gateway</html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      );

      await assert.rejects(request(URL, 'GET', undefined, undefined, options), {
        name: 'HttpException',
        status: 502,
        message:
          'The server could not handle the request. Try again later. (HTTP 502)',
        body: '<html>Bad Gateway</html>',
      });
    });

    it('keeps the status when a JSON error body is broken', async () => {
      globalThis.fetch = mock.fn(
        async () =>
          new Response('not json', {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      await assert.rejects(request(URL, 'GET', undefined, undefined, options), {
        status: 500,
      });
    });

    it('keeps no retryAfter without the Retry-After header', async () => {
      globalThis.fetch = mock.fn(async () => jsonResponse({}, 400));

      await assert.rejects(request(URL, 'GET'), {
        status: 400,
        retryAfter: null,
      });
    });

    [400, 401, 403, 404, 409].forEach((status) => {
      it(`does not retry ${status}`, async () => {
        globalThis.fetch = mock.fn(async () => jsonResponse({}, status));

        await assert.rejects(
          request(URL, 'GET', undefined, undefined, options),
          { status },
        );
        assert.equal(globalThis.fetch.mock.callCount(), 1);
      });
    });
  });

  describe('server errors', () => {
    [500, 502, 503, 504].forEach((status) => {
      it(`retries GET after ${status}`, async () => {
        globalThis.fetch = fetchFailingWith(() => jsonResponse({}, status));

        const response = await request(
          URL,
          'GET',
          undefined,
          undefined,
          options,
        );

        assert.deepEqual(response, { ok: true });
        assert.equal(globalThis.fetch.mock.callCount(), 2);
      });
    });

    it('does not retry POST after a server error, which may have been applied', async () => {
      globalThis.fetch = mock.fn(async () => jsonResponse({}, 503));

      await assert.rejects(request(URL, 'POST', undefined, '{}', options), {
        status: 503,
      });
      assert.equal(globalThis.fetch.mock.callCount(), 1);
    });

    it('gives up after the retries', async () => {
      globalThis.fetch = mock.fn(async () => jsonResponse({}, 502));

      await assert.rejects(
        request(URL, 'GET', undefined, undefined, { ...options, retries: 2 }),
        { status: 502 },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 3);
    });
  });

  describe('a POST that only reads (idempotent)', () => {
    const readOptions = { ...options, idempotent: true };

    it('is sent again after a server error', async () => {
      globalThis.fetch = fetchFailingWith(() => jsonResponse({}, 502));

      const response = await request(URL, 'POST', undefined, '{}', readOptions);

      assert.deepEqual(response, { ok: true });
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    });

    it('is sent again after a network error', async () => {
      globalThis.fetch = fetchFailingWith(() => {
        throw networkError();
      });

      const response = await request(URL, 'POST', undefined, '{}', readOptions);

      assert.deepEqual(response, { ok: true });
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    });

    it('reports a timeout as a read, which was not applied', async () => {
      globalThis.fetch = mock.fn(hangingFetch);

      await assert.rejects(
        request(URL, 'POST', undefined, '{}', {
          ...readOptions,
          retries: 0,
          timeout: 10,
        }),
        {
          name: 'TimeoutException',
          message: 'The request timed out. Try again later.',
          mayBeApplied: false,
        },
      );
    });
  });

  describe('rate limits', () => {
    ['GET', 'POST', 'PATCH'].forEach((method) => {
      it(`retries ${method} after 429, since it was not applied`, async () => {
        globalThis.fetch = fetchFailingWith(() =>
          jsonResponse({ code: 'rate_limited' }, 429, { 'Retry-After': '0' }),
        );

        const response = await request(URL, method, undefined, '{}', options);

        assert.deepEqual(response, { ok: true });
        assert.equal(globalThis.fetch.mock.callCount(), 2);
      });
    });

    it('retries after the secondary rate limit of GitHub (403 with Retry-After)', async () => {
      globalThis.fetch = fetchFailingWith(() =>
        jsonResponse({}, 403, { 'Retry-After': '0' }),
      );

      await request(URL, 'PUT', undefined, '{}', options);

      assert.equal(globalThis.fetch.mock.callCount(), 2);
    });

    it('gives up when Retry-After is longer than 10 seconds', async () => {
      globalThis.fetch = mock.fn(async () =>
        jsonResponse({}, 429, { 'Retry-After': '60' }),
      );

      await assert.rejects(request(URL, 'POST', undefined, '{}', options), {
        status: 429,
        retryAfter: 60000,
      });
      assert.equal(globalThis.fetch.mock.callCount(), 1);
    });

    it('gives up after the retries', async () => {
      globalThis.fetch = mock.fn(async () => jsonResponse({}, 429));

      await assert.rejects(
        request(URL, 'POST', undefined, '{}', { ...options, retries: 1 }),
        { status: 429 },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    });

    describe('waiting', () => {
      // Settles the pending promises after the fake timers fire.
      const flush = () => new Promise(setImmediate);

      beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
      });

      afterEach(() => {
        mock.timers.reset();
      });

      it('waits as long as Retry-After asks', async () => {
        globalThis.fetch = fetchFailingWith(() =>
          jsonResponse({}, 429, { 'Retry-After': '2' }),
        );

        const result = request(URL, 'POST', undefined, '{}', options);
        await flush();

        mock.timers.tick(1999);
        await flush();
        assert.equal(globalThis.fetch.mock.callCount(), 1);

        mock.timers.tick(1);
        assert.deepEqual(await result, { ok: true });
        assert.equal(globalThis.fetch.mock.callCount(), 2);
      });
    });
  });

  describe('retries', () => {
    it('retries GET after a network error', async () => {
      let calls = 0;
      globalThis.fetch = mock.fn(async () => {
        calls += 1;
        if (calls < 3) {
          throw networkError();
        }
        return jsonResponse({ ok: true });
      });

      const response = await request(URL, 'GET', undefined, undefined, options);

      assert.deepEqual(response, { ok: true });
      assert.equal(globalThis.fetch.mock.callCount(), 3);
    });

    it('gives up after the retries', async () => {
      globalThis.fetch = mock.fn(async () => {
        throw networkError();
      });

      await assert.rejects(
        request(URL, 'GET', undefined, undefined, { ...options, retries: 2 }),
        { name: 'TypeError' },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 3);
    });

    ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
      it(`does not retry ${method}, which may have been applied already`, async () => {
        globalThis.fetch = mock.fn(async () => {
          throw networkError();
        });

        await assert.rejects(request(URL, method, undefined, '{}', options), {
          name: 'TypeError',
        });
        assert.equal(globalThis.fetch.mock.callCount(), 1);
      });
    });
  });

  describe('timeout', () => {
    it('retries GET after a timeout, then reports the timeout', async () => {
      globalThis.fetch = mock.fn(hangingFetch);

      await assert.rejects(
        request(URL, 'GET', undefined, undefined, {
          ...options,
          retries: 1,
          timeout: 10,
        }),
        {
          name: 'TimeoutException',
          message: 'The request timed out. Try again later.',
          mayBeApplied: false,
        },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    });

    it('does not retry POST after a timeout', async () => {
      globalThis.fetch = mock.fn(hangingFetch);

      await assert.rejects(
        request(URL, 'POST', undefined, '{}', { ...options, timeout: 10 }),
        {
          name: 'TimeoutException',
          message:
            'The request timed out, but it may have been applied. Check the result before trying again.',
          mayBeApplied: true,
        },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 1);
    });

    describe('default', () => {
      // Settles the pending promises after the fake timers fire.
      const flush = () => new Promise(setImmediate);

      beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout'] });
        globalThis.fetch = mock.fn(hangingFetch);
      });

      afterEach(() => {
        mock.timers.reset();
      });

      it('gives up a GET after 5 seconds', async () => {
        const result = request(URL, 'GET', undefined, undefined, {
          ...options,
          retries: 0,
        }).catch((error) => error);

        mock.timers.tick(4999);
        await flush();
        assert.equal(
          globalThis.fetch.mock.calls[0].arguments[1].signal.aborted,
          false,
        );

        mock.timers.tick(1);
        assert.equal((await result).name, 'TimeoutException');
      });

      it('waits 30 seconds for a write', async () => {
        const result = request(URL, 'POST', undefined, '{}', options).catch(
          (error) => error,
        );

        mock.timers.tick(29999);
        await flush();
        assert.equal(
          globalThis.fetch.mock.calls[0].arguments[1].signal.aborted,
          false,
        );

        mock.timers.tick(1);
        assert.equal((await result).name, 'TimeoutException');
      });
    });
  });
});
