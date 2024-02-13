import Github from "./scripts/Github.js";
import SolvedAC from "./scripts/SolvedAC.js";

const github = new Github();
const solvedAC = new SolvedAC();

function handleMessage(request, sender, sendResponse) {
  try {
    const { className, action, payload } = request;
    if (className === "github") {
      github.handleAction(action, payload, solvedAC).then((res) => {
        sendResponse(res);
      });
      return true;
    } else {
      throw new Error(`${className} is not supported!`);
    }
  } catch (e) {
    console.error(e);
  }
}

async function notionPatch() {
  const value = await fetch("https://api.notion.com/v1/users", {
    method: "GET",
    headers: {
      Authorization:
        "Bearer secret_KXcsaoMosbahPcIlhuBUaHMWjdy9JAfdlsG4AQOn2sN",
      "Notion-Version": "2022-06-28",
    },
  });

  const text = await value.text();
  console.log(text);
}
chrome.runtime.onMessage.addListener(handleMessage);
