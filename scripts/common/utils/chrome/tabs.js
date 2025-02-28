export const closeLatestTab = () => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.remove(tab.id);
    });
  });
};
