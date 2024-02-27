async function getChromeStorage(token) {
  const obj = await chrome.storage.local.get([token]);
  return obj?.[token];
}

function removeChromeStorage(token) {
  chrome.storage.local.remove([token]);
}

function setChromeStorage(token, value) {
  chrome.storage.local.set({ [token]: value });
}
