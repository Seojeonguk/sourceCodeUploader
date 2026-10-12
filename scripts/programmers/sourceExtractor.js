(() => {
  const REQUEST_EVENT = 'SCU_PROGRAMMERS_SOURCE_REQUEST';
  const RESPONSE_EVENT = 'SCU_PROGRAMMERS_SOURCE_RESPONSE';

  /**
   * Rebuilds the code of a fill-in-the-blank problem: the blanks are inputs holding the answers.
   * @param {Node} node - The element that contains the code.
   * @returns {string} The code with the answers filled in.
   */
  const reconstructFillBlankCode = (node) =>
    [...node.childNodes]
      .map((child) => {
        if (child.tagName === 'INPUT') {
          return child.value;
        }
        if (child.childNodes?.length) {
          return reconstructFillBlankCode(child);
        }
        return child.textContent;
      })
      .join('');

  const readCodeMirror = () =>
    document.querySelector('.CodeMirror')?.CodeMirror?.getValue?.();

  const readCodeTextarea = () => document.querySelector('textarea#code')?.value;

  const readFillBlankCode = () => {
    const pre = document
      .querySelector('input[name^="input_code"]')
      ?.closest('pre');
    return pre ? reconstructFillBlankCode(pre) : null;
  };

  // Reads the focused editor, not just the first model: the page can have more than one.
  const readMonaco = () => {
    const monacoEditor = window.monaco?.editor;
    const editors = monacoEditor?.getEditors?.() ?? [];
    const editor = editors.find((e) => e.hasTextFocus?.()) ?? editors[0];
    const model = editor?.getModel?.() ?? monacoEditor?.getModels?.()?.[0];
    return model?.getValue?.();
  };

  const readAce = () => {
    const aceEditorElement = document.querySelector('.ace_editor[id]');
    if (!window.ace?.edit || !aceEditorElement?.id) {
      return null;
    }
    return window.ace.edit(aceEditorElement.id).getValue();
  };

  const readAnyTextarea = () =>
    [...document.querySelectorAll('textarea')].find((element) =>
      element.value.trim(),
    )?.value;

  // Programmers uses CodeMirror (or `textarea#code`, and inputs for fill-in-the-blank problems).
  // The other editors are kept as fallbacks in case the page changes.
  const SOURCE_READERS = Object.freeze([
    readCodeMirror,
    readCodeTextarea,
    readFillBlankCode,
    readMonaco,
    readAce,
    readAnyTextarea,
  ]);

  const getSourceCode = () => {
    let sourceCode = '';

    SOURCE_READERS.some((read) => {
      const value = read();
      if (typeof value === 'string' && value.trim()) {
        sourceCode = value;
        return true;
      }
      return false;
    });

    return sourceCode;
  };

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== REQUEST_EVENT) {
      return;
    }

    window.postMessage(
      {
        type: RESPONSE_EVENT,
        requestId: event.data.requestId,
        sourceCode: getSourceCode(),
      },
      window.location.origin,
    );
  });
})();
