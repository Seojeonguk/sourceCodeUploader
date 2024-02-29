function initializeButtonEvents() {
  toggleDarkMode();
  closeSelectListOnOutsideClick();
  showSelectList();
  handleAuthenticationButton();
  syncRepository();
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

/**
 * Shows the select list when the paragraph element inside select-list is clicked.
 * Adds the "is-active" class to the select list ul and the "overlay" class to the content wrapper.
 * Stops event propagation to prevent further event handling.
 */
function showSelectList() {
  $(".select-list p").on("click", function (e) {
    $(".select-list ul").addClass("is-active");
    $(".content-wrapper").addClass("overlay");
    e.stopPropagation();
  });
}

/**
 * Handles click event on the authentication button.
 * If the button has "delete" class, removes access token from Chrome storage and updates UI accordingly.
 * Otherwise, sends a message to open GitHub OAuth page.
 */
function handleAuthenticationButton() {
  $(".authentication-btn").on("click", function () {
    if ($(this).hasClass("delete")) {
      const platform = $(this).closest("li").attr("platform");
      removeChromeStorage(`${platform}AccessToken`);
      $(this).removeClass("delete");
      $(this).html("Authorize");
      $(this).closest("li").find(".status").removeClass("green");
    } else {
      sendMessage("github", "openGithubOauthPage");
    }
  });
}

/**
 * Handles click event on the sync repository button.
 * Sends a message to background script to get authenticated user repositories for GitHub.
 * Updates the repository list UI and stores the repositories in Chrome storage.
 */
function syncRepository() {
  $("#sync-repository").on("click", function (e) {
    chrome.runtime.sendMessage(
      {
        platform: "github",
        action: "getAuthenticatedUserRepositories",
      },
      (repositories) => {
        $("#repository-list li").remove();

        repositories.forEach((repository) => {
          $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
        });

        setChromeStorage("githubRepositories", repositories);
      }
    );
  });
}
