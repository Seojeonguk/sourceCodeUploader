import * as Util from "./scripts/util.js";
import { GET_REPOSITORIES } from "./scripts/github/constants.js";

export function initializeButtonEvents() {
  closeSelectListOnOutsideClick();
  handleAuthenticationButton();
  handleUploadedDatabaseSelection();
  handleUploadedRepositorySelection();
  showDatabases();
  showRepositories();
  toggleDarkMode();
}

/**
 * Closes the select list when clicking outside of it.
 */
function closeSelectListOnOutsideClick() {
  $(document).on("click", function () {
    $(".select-list ul").removeClass("is-active");
    $(".content-wrapper").removeClass("overlay");
  });
}

/**
 * Handles click event on the authentication button.
 * If the button has the "delete" class, it removes associated data from Chrome storage.
 * This includes access token, repository, and uploaded repository data.
 * Otherwise, sends a message to open GitHub OAuth page.
 */
function handleAuthenticationButton() {
  $(".authentication-btn").on("click", function () {
    const platform = $(this).closest("li").attr("platform");

    if ($(this).hasClass("delete")) {
      const platform = $(this).closest("li").attr("platform");
      Util.removeChromeStorage(`${platform}AccessToken`);
      Util.removeChromeStorage(`${platform}Repositories`);
      Util.removeChromeStorage(`${platform}UploadedRepository`);
      location.reload(true);
    } else {
      Util.sendMessage(platform, "openOauthPage");
    }
  });
}

/**
 * Handles the click event when a database is selected from the list.
 * When a database is clicked, it retrieves the database name and ID from the clicked element.
 * It then updates the UI to display the selected database name and stores both the name and ID in Chrome storage.
 */
function handleUploadedDatabaseSelection() {
  $(document).on("click", "#notion-database-list li p", function (e) {
    const uploadedDatabase = $(this).text();
    const uploadedDatabaseId = $(this).attr("database-id");

    $("#uploaded-database").text(uploadedDatabase);

    Util.setChromeStorage("notionUploadedDatabase", uploadedDatabase);
    Util.setChromeStorage("notionUploadedDatabaseId", uploadedDatabaseId);
  });
}

/**
 * Handles click event on the repository list items to select the repository for upload.
 * Upon selection, updates the uploaded repository display and stores the selected repository in Chrome storage.
 */
function handleUploadedRepositorySelection() {
  $(document).on("click", "#repository-list li p", function (e) {
    const uploadedRepository = e.target.innerHTML;

    $("#uploaded-repository").text(uploadedRepository);

    Util.setChromeStorage("githubUploadedRepository", uploadedRepository);
  });
}

/**
 * Handles click event to display the list of databases for Notion.
 */
const showDatabases = () => {
  $("#uploaded-database").on("click", async () => {
    const response = await Util.sendMessage("notion", "getDatabases");

    if (!Array.isArray(response)) {
      alert(response.message);
      return;
    }

    $("#notion-database-list li").remove();

    response.forEach((database) => {
      $("#notion-database-list").append(
        `<li><p database-id=${database.id}>${database.title[0].plain_text}</p></li>`
      );
    });

    const formattedDatabases = response.map((database) => {
      return {
        databaseId: database.id,
        title: database.title[0].plain_text,
      };
    });

    $("#notion-database-list").addClass("is-active");
    $(".content-wrapper").addClass("overlay");

    Util.setChromeStorage("notionDatabases", formattedDatabases);
  });
};

/**
 * Handles click event to display the list of repositories for GitHub.
 */
const showRepositories = () => {
  $("#uploaded-repository").on("click", async () => {
    const response = await Util.sendMessage("github", GET_REPOSITORIES);

    if (!Array.isArray(response)) {
      alert(response.message);
      return;
    }

    $("#repository-list li").remove();

    response.forEach((repository) => {
      $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
    });

    $("#repository-list").addClass("is-active");
    $(".content-wrapper").addClass("overlay");

    Util.setChromeStorage("githubRepositories", response);
  });
};

/**
 * Toggles dark mode when the dark-light element is clicked.
 * Adds or removes the "light-mode" class from the body element based on its current state.
 * Stops event propagation to prevent further event handling.
 */
function toggleDarkMode() {
  $(".dark-light").on("click", function (e) {
    $("body").toggleClass("light-mode");
    e.stopPropagation();
  });
}
