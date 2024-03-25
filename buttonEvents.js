import * as Util from "./scripts/util.js";

export function initializeButtonEvents() {
  closeSelectListOnOutsideClick();
  handleAuthenticationButton();
  handleNotionSyncBtn();
  handleUploadedRepositorySelection();
  showSelectList();
  handleGithubSyncBtn();
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
 * Handles the click event for the Notion sync button.
 * When the button is clicked, it sends a request to the Notion API to retrieve databases.
 * Upon receiving the response, it updates the UI with the list of databases.
 * It also formats the response data and stores it in Chrome storage.
 */
function handleNotionSyncBtn() {
  $("#notion-sync-btn").on("click", async function () {
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

    Util.setChromeStorage("notionDatabases", formattedDatabases);
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
 * Shows the select list when the paragraph element inside select-list is clicked.
 * Adds the "is-active" class to the select list ul and the "overlay" class to the content wrapper.
 * Stops event propagation to prevent further event handling.
 */
function showSelectList() {
  $(".select-list p").on("click", function (e) {
    $(this).next().addClass("is-active");
    $(this).next().addClass("overlay");
    //$(".select-list ul").addClass("is-active");
    //$(".content-wrapper").addClass("overlay");
    e.stopPropagation();
  });
}

/**
 * Handles click event on the GitHub sync repository button. Sends a message to
 * the background script to retrieve the authenticated user's GitHub repositories.
 * It then updates the UI by clearing the current repository list, iterating over
 * the retrieved repositories to append each one to the list, and finally stores
 * the repositories in Chrome storage for later use.
 */
function handleGithubSyncBtn() {
  $("#github-sync-btn").on("click", async function () {
    const repositories = await Util.sendMessage(
      "github",
      "getAuthenticatedUserRepositories"
    );

    if (!Array.isArray(repositories)) {
      alert(repositories.message);
      return;
    }

    $("#repository-list li").remove();

    repositories.forEach((repository) => {
      $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
    });

    Util.setChromeStorage("githubRepositories", repositories);
  });
}

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
