chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: dataload,
    });
});

async function dataload() {
    document.querySelectorAll("tbody tr").forEach((item) => {
        if (item.childNodes[3].firstChild.innerText === "맞았습니다!!") {
        }
    });
}
