$(function () {
  chrome.storage.local.get().then((value) => {
    Object.keys(value).forEach((v) => {
      const input = $(`input[name=${v}]`);
      input[0].value = value[v];
    });
  });

  $("#saveBtn").on("click", () => {
    const setData = {};
    $("input[type=text]").each(function () {
      setData[this.name] = this.value;
    });

    chrome.storage.local
      .set(setData)
      .then(() => {
        console.log("Successfully saved the data.");
      })
      .catch((err) => {
        console.error(err);
      });
  });

  $("#init").on("click", () => {
    chrome.storage.local.clear();

    $("input[type=text]").each(function () {
      this.value = "";
    });
  });

  $("#confirm").on("click", () => {
    chrome.storage.local.get().then((value) => {
      console.log(value);
    });
  });
});
