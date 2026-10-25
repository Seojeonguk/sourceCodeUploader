/**
 * Runs in the page's world of JUNGOL before the site's scripts (`document_start`), since the
 * site keeps its own reference to `fetch` from when it loads.
 *
 * The problem page sends the code to the judge and reads the verdict from the answer, a
 * stream of events. This script watches that one request through `fetch`: when the verdict
 * is accepted, it tells index.js (in the extension's world) with the code that was sent. It
 * reads a copy of the answer and never changes the request or the answer.
 */
(() => {
  const {
    JUDGE_URL,
    MESSAGE_TYPE,
    isAcceptedFinish,
    parseEventStream,
    parseJudgeRequest,
  } = globalThis.SCU_JUNGOL;
  const pageFetch = window.fetch;

  // A Request has `url`; a string or a URL gives its address as a string.
  const urlOf = (input) =>
    typeof input?.url === 'string' ? input.url : String(input);

  /**
   * Reads the judge stream until the verdict, and tells index.js if it is accepted.
   * @param {Response} response - A copy of the answer.
   * @param {Object} submission - From parseJudgeRequest.
   */
  const watchVerdict = async (response, submission) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    try {
      for (;;) {
        // eslint-disable-next-line no-await-in-loop -- the stream is read in order
        const { done, value } = await reader.read();
        if (done) {
          return;
        }
        const { events, rest } = parseEventStream(
          text + decoder.decode(value, { stream: true }),
        );
        text = rest;
        const finish = events.find(isAcceptedFinish);
        if (finish) {
          window.postMessage(
            {
              type: MESSAGE_TYPE,
              submission: {
                ...submission,
                submissionId: String(finish.data.data.id ?? ''),
              },
            },
            window.location.origin,
          );
          return;
        }
      }
    } finally {
      // Stops reading the copy only; the page keeps reading its answer.
      reader.cancel().catch(() => {});
    }
  };

  window.fetch = function fetch(...args) {
    // The page fetch is called on window, as the browser requires, whatever `this` is.
    const answer = pageFetch.apply(window, args);
    try {
      const [input, init] = args;
      const submission = urlOf(input).startsWith(JUDGE_URL)
        ? parseJudgeRequest(init?.body)
        : null;
      if (submission) {
        answer
          .then((response) =>
            response.body ? watchVerdict(response.clone(), submission) : null,
          )
          .catch(() => {});
      }
    } catch {
      // Watching must never break the page.
    }
    return answer;
  };
})();
