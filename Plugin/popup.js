const providePlatporms = ["github", "notion"];

$(function () {
  const toggleButton = document.querySelector(".dark-light");

  toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });
});

$(function () {
  chrome.storage.local
    .get(["repositories", "githubUploadedRepository"])
    .then((res) => {
      const repositories = res?.repositories;
      const githubUploadedRepository = res?.githubUploadedRepository;

      if (repositories) {
        $("#repository-list li").remove();
        repositories.forEach((repository) => {
          $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
        });
      }

      $("#selected-repository").text(githubUploadedRepository);
    });
});

$(function () {
  providePlatporms.forEach((providePlatporm) => {
    chrome.storage.local.get([`${providePlatporm}AccessToken`]).then((res) => {
      const accessToken = res?.[`${providePlatporm}AccessToken`];
      if (accessToken) {
        $(`.${providePlatporm} .status-circle`).addClass("green");
        $(`.${providePlatporm} .authentication-button`).html("인증제거");
        $(`.${providePlatporm} .authentication-button`).addClass("delete");
      }
    });
  });
});

$(function () {
  $(".authentication-button").on("click", function () {
    const platpromName = $(this).closest("li")[0].className;

    if ($(this).hasClass("delete")) {
      chrome.storage.local.remove([`${platpromName}AccessToken`]);
      $(this).removeClass("delete");
      $(this).html("인증하기");
      $(this).closest("li").find(".status-circle").removeClass("green");
    } else {
      sendMessageToBackground(platpromName, "authentication");
    }
  });
});

function sendMessageToBackground(className, action, payload) {
  chrome.runtime.sendMessage({
    className: className,
    action: action,
    payload: payload,
  });
}

$(function () {
  $("#sync-repository").on("click", () => {
    chrome.runtime.sendMessage(
      {
        className: "github",
        action: "getRepositories",
      },
      (repositories) => {
        $("#repository-list li").remove();
        chrome.storage.local.set({ githubRepositories: repositories });
        repositories.forEach((repository) => {
          $("#repository-list").append(`<li><p>${repository.name}</p></li>`);
        });
      }
    );
  });
});

$(function () {
  $("#selected-repository").on("click", function (e) {
    $("#repository-list").addClass("is-active");
    $(".content-wrapper").addClass("overlay");
    e.stopPropagation();
  });

  $(document).on("click", "#repository-list li p", function (e) {
    const uploadedRepository = e.target.innerHTML;

    chrome.storage.local
      .set({ githubUploadedRepository: uploadedRepository })
      .then(() => {
        $("#selected-repository").text(uploadedRepository);
      });
  });

  $(document).on("click", function (e) {
    $("#repository-list").removeClass("is-active");
    $(".content-wrapper").removeClass("overlay");
  });
});
