import { ACTIONS } from "../../scripts/github/constants/actions.js";

import {
  removeChromeStorage,
  setChromeStorage,
  sendMessage,
} from '../../scripts/common/utils/index.js';

export function initializeButtonEvents() {
  closeSelectListOnOutsideClick();
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
  $(document).on('click', function () {
    $('.select-list ul').removeClass('is-active');
    $('.content-wrapper').removeClass('overlay');
  });
};

/**
 * If the delete class does not exist on github authentication button, open the github oauth page.
 * Otherwise, clear the information related to github.
 */
const handleGithubAuthenticationBtn = () => {
  $('#github-authentication').on('click', (e) => {
    if (!$(e.currentTarget).hasClass('delete')) {
      sendMessage('github', 'openOauthPage');
      return;
    }

    removeChromeStorage('githubAccessToken');
    removeChromeStorage('githubUploadedRepository');
    location.reload(true);
  });
};

/**
 * If the delete class does not exist on notion authentication button, open the notion oauth page.
 * Otherwise, clear the information related to notion.
 */
const handleNotionAuthenticationBtn = () => {
  $('#notion-authentication').on('click', (e) => {
    if (!$(e.currentTarget).hasClass('delete')) {
      sendMessage('notion', 'openOauthPage');
      return;
    }

    removeChromeStorage(`notionAccessToken`);
    removeChromeStorage(`notionUploadedDatabase`);
    removeChromeStorage(`notionUploadedDatabases`);
    removeChromeStorage(`notionUploadedDatabaseId`);
    location.reload(true);
  });
};

/**
 * Handles the click event when a database is selected from the list.
 * When a database is clicked, it retrieves the database name and ID from the clicked element.
 * It then updates the UI to display the selected database name and stores both the name and ID in Chrome storage.
 */
const handleUploadedDatabaseSelection = () => {
  $(document).on('click', '#notion-database-list li p', function (e) {
    const uploadedDatabase = $(this).text();
    const uploadedDatabaseId = $(this).attr('database-id');

    $('#uploaded-database').text(uploadedDatabase);

    setChromeStorage('notionUploadedDatabase', uploadedDatabase);
    setChromeStorage('notionUploadedDatabaseId', uploadedDatabaseId);
  });
};

/**
 * Handles click event on the repository list items to select the repository for upload.
 * Upon selection, updates the uploaded repository display and stores the selected repository in Chrome storage.
 */
const handleUploadedRepositorySelection = () => {
  $(document).on('click', '#repository-list li p', function (e) {
    const uploadedRepository = e.target.innerHTML;

    $('#uploaded-repository').text(uploadedRepository);

    setChromeStorage('githubUploadedRepository', uploadedRepository);
  });
};

/**
 * Handles click event to display the list of databases for Notion.
 */
const showDatabases = () => {
  $('#uploaded-database').on('click', async () => {
    const response = await sendMessage('notion', 'getDatabases');

    if (!Array.isArray(response?.message)) {
      console.debug(response);
      alert(response.message);
      return;
    }

    $('#notion-database-list li').remove();

    response.message.forEach((database) => {
      $('#notion-database-list').append(
        `<li><p database-id=${database.id}>${database.title[0].plain_text}</p></li>`,
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
      alert(response.message);
      return;
    }

    $('#repository-list li').remove();

    response.message.forEach((repository) => {
      $('#repository-list').append(`<li><p>${repository.name}</p></li>`);
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
  $('.dark-light').on('click', function (e) {
    $('body').toggleClass('light-mode');
    e.stopPropagation();
  });
};
