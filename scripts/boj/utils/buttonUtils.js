/**
 * Creates a div element to wrap buttons.
 *
 * @returns {HTMLElement} The div element wrapping buttons.
 */
const createButtonWrapper = () => {
  const div = document.createElement('div');
  div.className = 'btnWrapper';
  return div;
};

/**
 * Creates a button element with an image and attaches a click event handler.
 *
 * @param {HTMLElement} buttonWrapper - The div element wrapping buttons.
 * @param {string} imageUrl - The URL of the image to be displayed on the button.
 * @param {function} clickHandler - The function to be executed when the button is clicked.
 */
const createButton = (buttonWrapper, imageUrl, clickHandler) => {
  const button = document.createElement('button');
  button.classList.add('uploadBtn');

  const img = document.createElement('img');
  img.src = util.getResourceURL(imageUrl);

  button.appendChild(img);
  button.addEventListener('click', clickHandler);

  buttonWrapper.appendChild(button);
};

const createButtons = (isDark = false, payload, getSourceCode) => {
  const buttonWrapper = createButtonWrapper();

  Object.entries(PLATFROMS).forEach(([key, value]) => {
    const name = value.name;
    const action = value.action;
    const iconPath = isDark ? value.icon : value.darkIcon;

    createButton(buttonWrapper, iconPath, async () =>
      buttonHandler(name, action, {
        ...payload,
        sourceCode: await getSourceCode(),
      }),
    );
  });

  return buttonWrapper;
};

const buttonHandler = async (platform, action, payload) => {
  try {
    const response = await util.sendMessage(platform, action, payload);
    alert(response?.message);
  } catch (e) {
    if (e instanceof parseException || e instanceof undefinedException) {
      console.warn(e);
    } else {
      console.error(e);
    }
  }
};
