chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: dataload,
  });
});

async function dataload() {
  // Todo
}