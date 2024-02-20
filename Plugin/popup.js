const providePlatporms = ["github", "notion"];

$(function () {
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdowns.forEach((c) => c.classList.remove("is-active"));
      dropdown.classList.add("is-active");
    });
  });
});

$(document).click(function (e) {
  var container = $(".status-button");
  var dd = $(".dropdown");
  if (!container.is(e.target) && container.has(e.target).length === 0) {
    dd.removeClass("is-active");
  }
});

$(function () {
  $(".dropdown").on("click", function (e) {
    $(".content-wrapper").addClass("overlay");
    e.stopPropagation();
  });
  $(document).on("click", function (e) {
    if ($(e.target).is(".dropdown") === false) {
      $(".content-wrapper").removeClass("overlay");
    }
  });
});

$(function () {
  const toggleButton = document.querySelector(".dark-light");

  toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });
});

$(function () {
  chrome.storage.local
    .get(["repositories", "uploadedRepository"])
    .then((res) => {
      const repositories = res?.repositories;
      const uploadedRepository = res?.uploadedRepository;
      if (repositories) {
        $("#repository option").remove();
        repositories.forEach((repository) => {
          $("#repository").append(
            `<option ${
              repository.name === uploadedRepository ? "selected" : ""
            }>${repository.name}</option>`
          );
        });
      }
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

$("#sync-repository").on("click", () => {
  $("#repository option").remove();

  chrome.runtime.sendMessage(
    {
      className: "github",
      action: "getRepositories",
    },
    (repositories) => {
      chrome.storage.local.set({ githubRepositories: repositories });
      chrome.storage.local.get(["githubUploadedRepository"]).then((res) => {
        const uploadedRepository = res?.githubUploadedRepository;

        repositories.forEach((repository) => {
          $("#repository").append(
            `<option ${
              repository.name === uploadedRepository ? "selected" : ""
            }>${repository.name}</option>`
          );
        });
      });
    }
  );
});

$("#save-repo").on("click", () => {
  const value = $("#repositories").val();
  chrome.storage.local.set({ githubUploadedRepository: value });
});
