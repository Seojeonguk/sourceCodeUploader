// To do list
// 1. notion upload button
// 2. github upload button
// 3. all upload button
$(function () {
  const btnWrap = createBtnWrap();
  createGithubBtn(btnWrap, 0);
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

function createGithubBtn(btnWrap, isDarkmode) {
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
  if (isDarkmode) {
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
