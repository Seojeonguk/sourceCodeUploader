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
    default: false,
    "3024-day": false,
    "3024-night": true,
    abcdef: true,
    ambiance: true,
    "base16-dark": true,
    "base16-light": false,
    bespin: true,
    blackboard: true,
    cobalt: true,
    colorforth: true,
    darcula: true,
    dracula: true,
    "duotone-dark": true,
    "duotone-light": false,
    eclipse: false,
    elegant: false,
    "erlang-dark": true,
    "gruvbox-dark": true,
    hopscotch: true,
    icecoder: true,
    idea: false,
    isotope: true,
    "lesser-dark": true,
    liquibyte: true,
    lucario: true,
    material: true,
    mbo: true,
    "mdn-like": false,
    midnight: true,
    monokai: true,
    neat: false,
    neo: false,
    night: true,
    nord: true,
    "oceanic-next": true,
    "panda-syntax": true,
    "paraiso-dark": true,
    "paraiso-light": false,
    "pastel-on-dark": true,
    railscasts: true,
    rubyblue: true,
    seti: true,
    shadowfox: true,
    "solarized dark": true,
    "solarized light": false,
    "the-matrix": true,
    "tomorrow-night-bright": true,
    "tomorrow-night-eighties": true,
    ttcn: false,
    twilight: true,
    "vibrant-ink": true,
    "xq-dark": true,
    "xq-light": false,
    yeti: false,
    yonce: true,
    zenburn: true,
  };
  return themeMap[theme] ?? false;
}
