import Github from "./scripts/Github.js";

const github = new Github();

function handleMessage(request, sender, sendResponse) {
  try {
    const { platform, action, payload } = request;
    if (platform === "github") {
      github.dispatch(action, payload).then((res) => {
        sendResponse(res);
      });
      return true;
    } else {
      throw new Error(`${platform} is not supported!`);
    }
  } catch (e) {
    console.error(e);
  }
}

chrome.runtime.onMessage.addListener(handleMessage);
