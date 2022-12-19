$(function () {
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
});