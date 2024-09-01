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

const createButton = (imageUrl, clickEvent) => {
  const img = document.createElement("img");
  img.src = util.getResourceURL(imageUrl);

  const button = document.createElement("button");
  button.classList.add("uploadBtn");
  button.appendChild(img);
  button.addEventListener("click", clickEvent);

  return button;
};
