(() => {
  const REQUEST_EVENT = 'SCU_PROGRAMMERS_SOURCE_REQUEST';
  const RESPONSE_EVENT = 'SCU_PROGRAMMERS_SOURCE_RESPONSE';

  const getSourceCode = () => {
    const monacoModel = window.monaco?.editor?.getModels?.()?.[0];
    if (monacoModel?.getValue) {
      return monacoModel.getValue();
    }

    const aceEditorElement = document.querySelector('.ace_editor[id]');
    if (window.ace?.edit && aceEditorElement?.id) {
      return window.ace.edit(aceEditorElement.id).getValue();
    }

    const codeMirrorElement = document.querySelector('.CodeMirror');
    if (codeMirrorElement?.CodeMirror?.getValue) {
      return codeMirrorElement.CodeMirror.getValue();
    }

    const textarea = [...document.querySelectorAll('textarea')].find(
      (element) => element.value.trim(),
    );
    if (textarea) {
      return textarea.value;
    }

    return '';
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
