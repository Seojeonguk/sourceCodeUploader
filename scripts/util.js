function isEmpty(value) {
  return (
    !value || (typeof value === "object" && Object.keys(value).length === 0)
  );
}

async function readLocalStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (res) {
      if (!res[key]) {
        reject();
      } else {
        resolve(res[key]);
      }
    });
  });
}

async function request(url, method, headers, body) {
  return await fetch(url, {
    method: method,
    headers: headers,
    body: body,
  });
}

function throwIfFalsy(value, errorMessage) {
  if (isEmpty(value)) {
    throw new Error(errorMessage);
  }
}

export { isEmpty, request, readLocalStorage, throwIfFalsy };
