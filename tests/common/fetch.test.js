import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { request } from '../../scripts/common/utils/fetch.js';

const URL = 'https://api.example.com/items';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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
        message: 'HTTP error! Status: 401',
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

      await assert.rejects(request(URL, 'GET'), {
        name: 'HttpException',
        status: 502,
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

      await assert.rejects(request(URL, 'GET'), { status: 500 });
    });

    it('does not retry HTTP errors', async () => {
      globalThis.fetch = mock.fn(async () => jsonResponse({}, 500));

      await assert.rejects(request(URL, 'GET', undefined, undefined, options));
      assert.equal(globalThis.fetch.mock.callCount(), 1);
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
        { message: 'Request timed out' },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 2);
    });

    it('does not retry POST after a timeout', async () => {
      globalThis.fetch = mock.fn(hangingFetch);

      await assert.rejects(
        request(URL, 'POST', undefined, '{}', { ...options, timeout: 10 }),
        { message: 'Request timed out' },
      );
      assert.equal(globalThis.fetch.mock.callCount(), 1);
    });
  });
});
