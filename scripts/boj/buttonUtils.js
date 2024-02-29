/**
 * Creates a div element to wrap buttons.
 *
 * @returns {HTMLElement} The div element wrapping buttons.
 */
function createButtonWrapper() {
  const div = document.createElement("div");
  div.className = "btnWrapper";
  return div;
}

/**
 * Creates a button element with an image and attaches a click event handler.
 *
 * @param {HTMLElement} buttonWrapper - The div element wrapping buttons.
 * @param {string} imageUrl - The URL of the image to be displayed on the button.
 * @param {function} clickHandler - The function to be executed when the button is clicked.
 */
function createButton(buttonWrapper, imageUrl, clickHandler) {
  const button = document.createElement("button");
  button.classList.add("uploadBtn");

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL(imageUrl);

  button.appendChild(img);
  button.addEventListener("click", clickHandler);

  buttonWrapper.appendChild(button);
}
