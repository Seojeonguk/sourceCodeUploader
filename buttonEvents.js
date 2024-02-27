function initializeButtonEvents() {
  toggleDarkMode();
  closeSelectListOnOutsideClick();
  showSelectList();
  handleAuthenticationButton();
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
      // Add more..
      setChromeStorage("githubAccessToken", "value");
    }
  });
}
