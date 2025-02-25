/**
 * Creates a wrapper div element to contain action buttons.
 * @returns {HTMLElement} The div element containing the buttons.
 */
const createActionButtonContainer = () => {
  return createElement('div', { className: 'btnWrapper' });
};

/**
 * Creates a button with an image and attaches a click event handler.
 * @param {HTMLElement} buttonWrapper - The div element containing the buttons.
 * @param {string} imageUrl - The URL of the image to display on the button.
 * @param {function} clickHandler - The function to execute when the button is clicked.
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

/**
 * Initializes platform action buttons with click handlers.
 * @param {boolean} isDark - Determines whether to use dark or light icons.
 * @param {object} payload - The data to pass to the platform action handler.
 * @param {function} getSourceCode - A function to retrieve the source code.
 * @returns {HTMLElement} The div element containing the platform buttons.
 */
const initializePlatformButtons = (isDark = false, payload, getSourceCode) => {
  console.debug('[SCU] Initializing platform buttons');
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

/**
 * Handles a platform action by sending a message to the specified platform.
 * @param {string} platform - The name of the platform.
 * @param {string} action - The action to perform.
 * @param {object} payload - The data to send with the message.
 */
const handlePlatformAction = async (platform, action, payload) => {
  try {
    console.debug(`[SCU] Handling platform action for ${platform} (${action})`);
    const response = await util.sendMessage(platform, action, payload);
    alert(response?.message);
  } catch (e) {
    if (e instanceof ParseException || e instanceof UndefinedException) {
      console.warn(e);
    } else {
      console.error(e);
    }
  }
};
