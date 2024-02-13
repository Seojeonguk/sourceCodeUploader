// To do list
// 1. notion upload button
// 2. github upload button
// 3. all upload button
$(function () {
  const btnWrap = createBtnWrap();
  const theme = getTheme();
  createGithubBtn(btnWrap, theme);
  createNotionBtn(btnWrap, theme);
  createAllBtn(btnWrap, theme);
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

function createAllBtn(btnWrap, theme) {
  const allBtn = document.createElement("a");
  allBtn.href = "#";
  allBtn.style.cursor = "pointer";
  allBtn.onclick = function (e) {
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
        notionToken: value["notionToken"],
        notionDatabaseId: value["notionDatabaseId"],
        sourcecode: sourcecode,
        mime: mime,
        problemId: problemId,
      };

      const url = value["requestUrl"];
      $.post(`${url}/bojupload/all`, data)
        .done((v) => {
          alert("Success github and notion upload!");
        })
        .fail((e) => {
          alert(e.responseText);
        });
    });
  };

  var allURL = "icon/allIcon.png";
  if (isDarkmode(theme)) {
    allURL = "icon/allDarkIcon.png";
  }

  const allImg = document.createElement("img");
  allImg.src = chrome.runtime.getURL(allURL);
  allImg.alt = "all";
  allImg.style.width = "32px";
  allImg.style.height = "32px";

  allBtn.append(allImg);

  btnWrap.append(allBtn);
}

function createGithubBtn(btnWrap, theme) {
  const githubBtn = document.createElement("button");
  githubBtn.style.border = 0;
  githubBtn.style.background = "none";
  githubBtn.style.cursor = "pointer";
  githubBtn.onclick = function (e) {
    const textarea = document.querySelector("[name='source']");
    const sourceCode = textarea.value;
    const mime = textarea.getAttribute("data-mime");
    const problemId = document
      .querySelector("table")
      .querySelector("a[href^='/problem/']").innerHTML;

    const payload = {
      type: "BOJ",
      sourceCode: sourceCode,
      mime: mime,
      problemId: problemId,
    };

    chrome.runtime.sendMessage(
      {
        className: "github",
        action: "commit",
        payload: payload,
      },
      (responseStatus) => {
        if (responseStatus === 200 || responseStatus === 201) {
          alert(
            `Successfully uploaded the source code for ${problemId} problem.`
          );
        } else {
          alert(
            `An error occurred during the upload process of the source code for ${problemId} problem.`
          );
        }
      }
    );
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

function createNotionBtn(btnWrap, theme) {
  const notionBtn = document.createElement("a");
  notionBtn.href = "#";
  notionBtn.style.cursor = "pointer";
  notionBtn.onclick = function (e) {
    const textarea = document.querySelector("[name='source']");
    const sourcecode = textarea.value;
    const mime = textarea.getAttribute("data-mime");
    const problemId = document
      .querySelector("table")
      .querySelector("a[href^='/problem/']").innerHTML;

    chrome.storage.local.get().then((value) => {
      const data = {
        notionToken: value["notionToken"],
        notionDatabaseId: value["notionDatabaseId"],
        sourcecode: sourcecode,
        mime: mime,
        problemId: problemId,
      };

      const url = value["requestUrl"];
      $.post(`${url}/bojupload/notion`, data)
        .done((v) => {
          alert("Success notion upload!");
        })
        .fail((e) => {
          alert(e.responseText);
        });
    });
  };

  var notionURL = "icon/notionIcon.png";
  if (isDarkmode(theme)) {
    notionURL = "icon/notionDarkIcon.png";
  }

  const notionImg = document.createElement("img");
  notionImg.src = chrome.runtime.getURL(notionURL);
  notionImg.alt = "notion";
  notionImg.style.width = "32px";
  notionImg.style.height = "32px";

  notionBtn.append(notionImg);

  btnWrap.append(notionBtn);
}

function getTheme() {
  let theme = "cm-s-default";
  document.querySelector(".CodeMirror")?.classList.forEach((className) => {
    if (className.startsWith("cm-s")) theme = className;
  });
  return theme;
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
