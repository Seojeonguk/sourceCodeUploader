function initializeButtonEvents() {
  toggleDarkMode();
  closeSelectListOnOutsideClick();
  showSelectList();
  handleAuthenticationButton();
  syncRepository();
}

function closeSelectListOnOutsideClick() {
  $(document).on("click", function () {
    $(".select-list ul").removeClass("is-active");
    $(".content-wrapper").removeClass("overlay");
  });
}

function toggleDarkMode() {
  $(".dark-light").on("click", function (e) {
    $("body").toggleClass("light-mode");
    e.stopPropagation();
  });
}

function showSelectList() {
  $(".select-list p").on("click", function (e) {
    $(".select-list ul").addClass("is-active");
    $(".content-wrapper").addClass("overlay");
    e.stopPropagation();
  });
}

function handleAuthenticationButton() {
  $(".authentication-btn").on("click", function () {
    if ($(this).hasClass("delete")) {
      const platform = $(this).closest("li").attr("platform");
      removeChromeStorage(`${platform}AccessToken`);
      $(this).removeClass("delete");
      $(this).html("Authroize");
      $(this).closest("li").find(".status").removeClass("green");
    } else {
      sendMessage("github", "openGithubOauthPage");
    }
  });
}

function syncRepository() {
  $("#sync-repository").on("click", function (e) {
    console.log("sync button click!");
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
