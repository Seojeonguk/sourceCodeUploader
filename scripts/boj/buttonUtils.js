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
 * Creates a button element with an image and attaches a click event listener.
 *
 * @param {string} imageUrl - The URL or path to the image that will be displayed on the button.
 * @param {function} clickEvent - The event handler function to be called when the button is clicked.
 * @returns {HTMLElement} - The created button element containing the image and attached click event.
 *
 */
const createButton = (imageUrl, clickEvent) => {
  const img = document.createElement("img");
  img.src = util.getResourceURL(imageUrl);

  const button = document.createElement("button");
  button.classList.add("uploadBtn");
  button.appendChild(img);
  button.addEventListener("click", clickEvent);

  return button;
};
