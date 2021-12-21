chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: dataload,
    });
});

async function dataload() {
    document.querySelectorAll("tbody tr").forEach((tr) => {
        if (tr.childNodes[3].firstChild.innerText === "맞았습니다!!") {
            let newTd = document.createElement("td");
            let newBtn = doucment.createElement("button");
            newBtn.innerText = "Upload";
            newBtn.setAttribute("submissionNum", tr.firstChild.innerText);
            newBtn.setAttribute("problemNum", tr.childNodes[2].lastChild.innerText);
            newBtn.onclick = function() {
              // todo
            }
            newTd.appendChild(newBtn);
            tr.appendChild(newTd);
        }
    });
}
