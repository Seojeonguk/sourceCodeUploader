// To do list
// 1. notion upload button
// 2. github upload button
// 3. all upload button
$(function () {
  const btnWrap = createBtnWrap();
  createGithubBtn(btnWrap, theme);
});

function createBtnWrap() {
  const addingElement = $(".CodeMirror");

  const btnWrap = document.createElement("div");

  btnWrap.style.position = "absolute";
  btnWrap.style.top = 0;
  btnWrap.style.right = 0;
  btnWrap.style.zIndex = 9999;
  btnWrap.style.padding = "10px";

  addingElement.append(btnWrap);

  return btnWrap;
}

function createGithubBtn(btnWrap, theme) {
  const githubBtn = document.createElement("a");
  githubBtn.href = "#";
  githubBtn.style.cursor = "pointer";
  githubBtn.onclick = function (e) {
    const textarea = document.querySelector("[name='source']");
    const sourcecode = textarea.value;
    const mime = textarea.getAttribute("data-mime");
    const problemId = document
      .querySelector("table")
      .querySelector("a[href^='/problem/']").innerHTML;

    chrome.storage.local.get().then((value) => {
      const data = {
        githubToken: value["githubToken"],
        githubUserName: value["githubUserName"],
        githubRepo: value["githubRepository"],
        githubFolderPath: value["githubFolder"],
        sourcecode: sourcecode,
        mime: mime,
        problemId: problemId,
      };

      const url = value["requestUrl"];
      $.post(`${url}/bojupload/github`, data)
        .done((v) => {
          alert("Success github upload!");
        })
        .fail((e) => {
          alert(e.responseText);
        });
    });
  };

  var githubURL = "icon/githubIcon.png";
  if (isDarkmode(theme)) {
    githubURL = "icon/githubDarkIcon.png";
  }

  const githubImg = document.createElement("img");
  githubImg.src = chrome.runtime.getURL(githubURL);
  githubImg.alt = "github";
  githubImg.style.width = "32px";
  githubImg.style.height = "32px";

  githubBtn.append(githubImg);

  btnWrap.append(githubBtn);
}

function isDarkmode(theme) {
  const themeMap = {
    "cm-s-default": false,
    "cm-s-3024-day": false,
    "cm-s-3024-night": true,
    "cm-s-abcdef": true,
    "cm-s-ambiance": true,
    "cm-s-base16-dark": true,
    "cm-s-base16-light": false,
    "cm-s-bespin": true,
    "cm-s-blackboard": true,
    "cm-s-cobalt": true,
    "cm-s-colorforth": true,
    "cm-s-darcula": true,
    "cm-s-dracula": true,
    "cm-s-duotone-dark": true,
    "cm-s-duotone-light": false,
    "cm-s-eclipse": false,
    "cm-s-elegant": false,
    "cm-s-erlang-dark": true,
    "cm-s-gruvbox-dark": true,
    "cm-s-hopscotch": true,
    "cm-s-icecoder": true,
    "cm-s-idea": false,
    "cm-s-isotope": true,
    "cm-s-lesser-dark": true,
    "cm-s-liquibyte": true,
    "cm-s-lucario": true,
    "cm-s-material": true,
    "cm-s-mbo": true,
    "cm-s-mdn-like": false,
    "cm-s-midnight": true,
    "cm-s-monokai": true,
    "cm-s-neat": false,
    "cm-s-neo": false,
    "cm-s-night": true,
    "cm-s-nord": true,
    "cm-s-oceanic-next": true,
    "cm-s-panda-syntax": true,
    "cm-s-paraiso-dark": true,
    "cm-s-paraiso-light": false,
    "cm-s-pastel-on-dark": true,
    "cm-s-railscasts": true,
    "cm-s-rubyblue": true,
    "cm-s-seti": true,
    "cm-s-shadowfox": true,
    "cm-s-solarized dark": true,
    "cm-s-solarized light": false,
    "cm-s-the-matrix": true,
    "cm-s-tomorrow-night-bright": true,
    "cm-s-tomorrow-night-eighties": true,
    "cm-s-ttcn": false,
    "cm-s-twilight": true,
    "cm-s-vibrant-ink": true,
    "cm-s-xq-dark": true,
    "cm-s-xq-light": false,
    "cm-s-yeti": false,
    "cm-s-yonce": true,
    "cm-s-zenburn": true,
  };
  return themeMap[theme] ?? false;
}
