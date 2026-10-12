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
  $(document).on('click', () => {
    $('.select-list ul').removeClass('is-active');
    $('.content-wrapper').removeClass('overlay');
  });
};

/**
 *
 */
const handleAutoUploadBtn = () => {
  $('.auto-upload-opt').on('click', (e) => {
    const platform = $(e.currentTarget).closest('li').attr('platform');

    const isChecked = $(`#${platform}-auto-upload`).prop('checked');
    saveSettings({ [`${platform}AutoUpload`]: isChecked });
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
 * @param {'github'|'notion'} platform
 */
const openLoginPage = async (platform) => {
  const response = await sendMessage(platform, 'openOauthPage');
  if (!response?.ok) {
    showToast(response?.message, 'error');
  }
};

/**
 * If the delete class does not exist on github authentication button, open the github oauth page.
 * Otherwise, clear the information related to github.
 */
const handleGithubAuthenticationBtn = () => {
  $('#github-authentication').on('click', (e) => {
    if (!$(e.currentTarget).hasClass('delete')) {
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
  $('#notion-authentication').on('click', (e) => {
    if (!$(e.currentTarget).hasClass('delete')) {
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
  $(document).on(
    'click',
    '#notion-database-list li p',
    function handleDatabaseClick() {
      const uploadedDatabase = $(this).text();
      const uploadedDatabaseId = $(this).attr('database-id');

      $('#uploaded-database').text(uploadedDatabase);

      saveSettings({
        notionUploadedDatabase: uploadedDatabase,
        notionUploadedDatabaseId: uploadedDatabaseId,
      });
    },
  );
};

/**
 * Handles click event on the repository list items to select the repository for upload.
 * Upon selection, updates the uploaded repository display and stores the selected repository in Chrome storage.
 */
const handleUploadedRepositorySelection = () => {
  $(document).on('click', '#repository-list li p', (e) => {
    const uploadedRepository = $(e.currentTarget).text();

    $('#uploaded-repository').text(uploadedRepository);

    saveSettings({ githubUploadedRepository: uploadedRepository });
  });
};

/**
 * Creates an item of the repository / database list.
 * The text is set with `.text()`, not as HTML, since it comes from GitHub / Notion.
 * @param {string} text - The text to show.
 * @param {Object} [attributes={}] - The attributes of the text element.
 * @returns {jQuery} The `<li>` element.
 */
const createListItem = (text, attributes = {}) =>
  $('<li>').append($('<p>').attr(attributes).text(text));

/**
 * Handles click event to display the list of databases for Notion.
 */
const showDatabases = () => {
  $('#uploaded-database').on('click', async () => {
    const response = await sendMessage('notion', 'getDatabases');

    if (!Array.isArray(response?.message)) {
      logger.debug(response);
      showToast(response?.message, 'error');
      return;
    }

    $('#notion-database-list li').remove();

    response.message.forEach((database) => {
      $('#notion-database-list').append(
        createListItem(getDatabaseTitle(database), {
          'database-id': database.id,
        }),
      );
    });

    $('#notion-database-list').addClass('is-active');
    $('.content-wrapper').addClass('overlay');
  });
};

/**
 * Handles click event to display the list of repositories for GitHub.
 */
const showRepositories = () => {
  $('#uploaded-repository').on('click', async () => {
    const response = await sendMessage('github', ACTIONS.GET_REPOSITORIES);

    if (!response.ok || !Array.isArray(response.message)) {
      showToast(response?.message, 'error');
      return;
    }

    $('#repository-list li').remove();

    response.message.forEach((repository) => {
      $('#repository-list').append(createListItem(repository.name));
    });

    $('#repository-list').addClass('is-active');
    $('.content-wrapper').addClass('overlay');
  });
};

/**
 * Toggles dark mode when the dark-light element is clicked.
 * Adds or removes the "light-mode" class from the body element based on its current state.
 * Stops event propagation to prevent further event handling.
 */
const toggleDarkMode = () => {
  $('.dark-light').on('click', (e) => {
    $('body').toggleClass('light-mode');
    e.stopPropagation();
  });
};
