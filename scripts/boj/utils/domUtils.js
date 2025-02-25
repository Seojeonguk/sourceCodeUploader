/**
 * Safely selects a DOM element using a CSS selector.
 * @param {string} selector - The CSS selector to find the element.
 * @param {Document|Element} context - The search context (default: document).
 * @throws {ParseException} If the element is not found.
 * @returns {JQuery<HTMLElement>} The selected DOM element.
 */
const safeQuerySelector = (selector, context = document) => {
  const element = $(selector, context);
  if (!element || element.length === 0) {
    throw new ParseException(`Element not found for selector: ${selector}`);
  }
  return element;
};

/**
 * Safely retrieves the text content of a DOM element.
 * @param {JQuery<HTMLElement>} element - The jQuery-wrapped DOM element.
 * @param {string} errorMessage - The error message to throw if the text is empty.
 * @throws {ParseException} If the text is empty.
 * @returns {string} The text content of the element.
 */
const safeGetText = (element, errorMessage) => {
  const text = element.text();
  if (!text) {
    throw new ParseException(errorMessage);
  }
  return text;
};

/**
 * Creates a DOM element with the specified tag, attributes, and children.
 * @param {string} tag - The HTML tag name.
 * @param {Object} attributes - The attributes to set on the element.
 * @param {Array|Element} children - The child elements to append.
 * @returns {HTMLElement} The created DOM element.
 */
const createElement = (tag, attributes = {}, children = []) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  });

  if (Array.isArray(children)) {
    children.forEach((child) => element.appendChild(child));
  } else if (children) {
    element.appendChild(children);
  }

  return element;
};
