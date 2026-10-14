import { ACTIONS } from '../../scripts/github/constants/actions.js';
import { getDatabaseTitle } from '../../scripts/notion/objects/database.js';

import {
  setChromeStorage,
  sendMessage,
  logger,
} from '../../scripts/common/utils/index.js';
import { showToast } from './toast.js';

/**
 * Saves the settings selected in the popup, and shows an error if saving fails.
 * @param {Object} values - The values to save, keyed by the storage key.
 */
const saveSettings = async (values) => {
  try {
    await Promise.all(
      Object.entries(values).map(([key, value]) =>
        setChromeStorage(key, value),
      ),
    );
  } catch (e) {
    logger.error('Failed to save the settings.', e);
    showToast('Failed to save the setting. Try again.', 'error');
  }
};

export function initializeButtonEvents() {
  closeSelectListOnOutsideClick();
  handleAutoUploadBtn();
  handleGithubAuthenticationBtn();
  handleNotionAuthenticationBtn();
  handleUploadedDatabaseSelection();
  handleUploadedRepositorySelection();
  showDatabases();
  showRepositories();
  toggleDarkMode();
}

/**
 * Closes the select list when clicking outside of it.
 */
const closeSelectListOnOutsideClick = () => {
  document.addEventListener('click', () => {
    document
      .querySelectorAll('.select-list ul')
      .forEach((list) => list.classList.remove('is-active'));
    document.querySelector('.content-wrapper').classList.remove('overlay');
  });
};

/**
 * Saves the auto upload option of the platform when its switch is clicked.
 */
const handleAutoUploadBtn = () => {
  document.querySelectorAll('.auto-upload-opt').forEach((input) => {
    input.addEventListener('click', (e) => {
      const platform = e.currentTarget
        .closest('li[platform]')
        .getAttribute('platform');

      saveSettings({ [`${platform}AutoUpload`]: e.currentTarget.checked });
    });
  });
};

/**
 * Logs out of the platform in the background and reloads the popup.
 * GitHub cannot revoke the token without the client secret, so its authorized apps page
 * is opened for the user to revoke the access there.
 * @param {'github'|'notion'} platform
 */
const logout = async (platform) => {
  const response = await sendMessage(platform, 'logout');

  const authorizedAppsUrl = response?.message?.authorizedAppsUrl;
  if (authorizedAppsUrl) {
    chrome.tabs.create({ url: authorizedAppsUrl });
  }

  window.location.reload();
};

/**
 * Opens the login page of the platform, and shows why if it cannot be opened.
 * The Notion login window usually closes the popup first. Then the background keeps the error,
 * and the popup shows it the next time it opens.
 * @param {'github'|'notion'} platform
 */
const openLoginPage = async (platform) => {
  const response = await sendMessage(platform, 'openOauthPage');
  if (!response?.ok) {
    showToast(response?.message, 'error');
    if (platform === 'notion') {
      // Shown already, so do not show it again next time.
      sendMessage('notion', 'takeLoginError');
    }
  }
};

/**
 * If the delete class does not exist on github authentication button, open the github oauth page.
 * Otherwise, clear the information related to github.
 */
const handleGithubAuthenticationBtn = () => {
  document
    .querySelector('#github-authentication')
    .addEventListener('click', (e) => {
      if (!e.currentTarget.classList.contains('delete')) {
        openLoginPage('github');
        return;
      }

      logout('github');
    });
};

/**
 * If the delete class does not exist on notion authentication button, open the notion oauth page.
 * Otherwise, clear the information related to notion.
 */
const handleNotionAuthenticationBtn = () => {
  document
    .querySelector('#notion-authentication')
    .addEventListener('click', (e) => {
      if (!e.currentTarget.classList.contains('delete')) {
        openLoginPage('notion');
        return;
      }

      logout('notion');
    });
};

/**
 * Handles the click event when a database is selected from the list.
 * When a database is clicked, it retrieves the database name and ID from the clicked element.
 * It then updates the UI to display the selected database name and stores both the name and ID in Chrome storage.
 */
const handleUploadedDatabaseSelection = () => {
  // The items are added later, so the click is handled on the document.
  document.addEventListener('click', (e) => {
    const item = e.target.closest('#notion-database-list li p');
    if (!item) {
      return;
    }

    const uploadedDatabase = item.textContent;
    const uploadedDataSourceId = item.getAttribute('data-source-id');

    document.querySelector('#uploaded-database').textContent = uploadedDatabase;

    saveSettings({
      notionUploadedDatabase: uploadedDatabase,
      notionUploadedDataSourceId: uploadedDataSourceId,
    });
  });
};

/**
 * Handles click event on the repository list items to select the repository for upload.
 * Upon selection, updates the uploaded repository display and stores the selected repository in Chrome storage.
 */
const handleUploadedRepositorySelection = () => {
  // The items are added later, so the click is handled on the document.
  document.addEventListener('click', (e) => {
    const item = e.target.closest('#repository-list li p');
    if (!item) {
      return;
    }

    const uploadedRepository = item.textContent;

    document.querySelector('#uploaded-repository').textContent =
      uploadedRepository;

    saveSettings({ githubUploadedRepository: uploadedRepository });
  });
};

/**
 * Creates an item of the repository / database list.
 * The text is set with `textContent`, not as HTML, since it comes from GitHub / Notion.
 * @param {string} text - The text to show.
 * @param {Object} [attributes={}] - The attributes of the text element.
 * @returns {HTMLLIElement} The `<li>` element.
 */
const createListItem = (text, attributes = {}) => {
  const paragraph = document.createElement('p');
  Object.entries(attributes).forEach(([name, value]) =>
    paragraph.setAttribute(name, value),
  );
  paragraph.textContent = text;

  const item = document.createElement('li');
  item.append(paragraph);
  return item;
};

/**
 * Replaces the items of a select list, and opens it.
 * @param {string} listSelector - The selector of the `<ul>`.
 * @param {HTMLLIElement[]} items - The new items.
 */
const openSelectList = (listSelector, items) => {
  const list = document.querySelector(listSelector);
  list.replaceChildren(...items);
  list.classList.add('is-active');
  document.querySelector('.content-wrapper').classList.add('overlay');
};

/**
 * Handles click event to display the list of databases for Notion.
 */
const showDatabases = () => {
  document
    .querySelector('#uploaded-database')
    .addEventListener('click', async () => {
      const response = await sendMessage('notion', 'getDatabases');

      if (!Array.isArray(response?.message)) {
        logger.debug(response);
        showToast(response?.message, 'error');
        return;
      }

      openSelectList(
        '#notion-database-list',
        response.message.map((database) =>
          createListItem(getDatabaseTitle(database), {
            'data-source-id': database.id,
          }),
        ),
      );
    });
};

/**
 * Handles click event to display the list of repositories for GitHub.
 */
const showRepositories = () => {
  document
    .querySelector('#uploaded-repository')
    .addEventListener('click', async () => {
      const response = await sendMessage('github', ACTIONS.GET_REPOSITORIES);

      if (!response?.ok || !Array.isArray(response?.message)) {
        showToast(response?.message, 'error');
        return;
      }

      openSelectList(
        '#repository-list',
        response.message.map((repository) => createListItem(repository.name)),
      );
    });
};

/**
 * Toggles dark mode when the dark-light element is clicked.
 * Adds or removes the "light-mode" class from the body element based on its current state.
 * Stops event propagation to prevent further event handling.
 */
const toggleDarkMode = () => {
  document.querySelector('.dark-light').addEventListener('click', (e) => {
    document.body.classList.toggle('light-mode');
    e.stopPropagation();
  });
};
