import Github from "./scripts/Github.js";

const github = new Github();

function handleMessage(request, sender, sendResponse) {
  // Add more..
}

chrome.runtime.onMessage.addListener(handleMessage);
