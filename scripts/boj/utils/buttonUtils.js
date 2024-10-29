/**
 * Creates a div element to wrap buttons.
 *
 * @returns {HTMLElement} The div element wrapping buttons.
 */
const createActionButtonContainer = () => {
  return createElement('div', { className: 'btnWrapper' });
};

/**
 * Creates a button element with an image and attaches a click event handler.
 *
 * @param {HTMLElement} buttonWrapper - The div element wrapping buttons.
 * @param {string} imageUrl - The URL of the image to be displayed on the button.
 * @param {function} clickHandler - The function to be executed when the button is clicked.
 */
const createPlatformActionButton = (buttonWrapper, imageUrl, clickHandler) => {
  const button = createElement('button', { className: 'uploadBtn' });
  const img = createElement('img', {
    src: util.getResourceURL(imageUrl),
  });

  button.appendChild(img);
  button.addEventListener('click', clickHandler);
  buttonWrapper.appendChild(button);
};

const initializePlatformButtons = (isDark = false, payload, getSourceCode) => {
  const buttonWrapper = createActionButtonContainer();

  Object.entries(PLATFROMS).forEach(([key, value]) => {
    const { name, action, icon, darkIcon } = value;
    const iconPath = isDark ? icon : darkIcon;

    createPlatformActionButton(buttonWrapper, iconPath, async () =>
      handlePlatformAction(name, action, {
        ...payload,
        sourceCode: await getSourceCode(),
      }),
    );
  });

  return buttonWrapper;
};

const handlePlatformAction = async (platform, action, payload) => {
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
