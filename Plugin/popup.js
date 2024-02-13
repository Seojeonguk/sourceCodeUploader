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
        $("#repositories option").remove();
        repositories.forEach((repository) => {
          $("#repositories").append(
            `<option ${
              repository.name === uploadedRepository ? "selected" : ""
            }>${repository.name}</option>`
          );
        });
      }
    });
});

$(function () {
  chrome.storage.local.get(["githubAccessToken"]).then((res) => {
    const accessToken = res?.githubAccessToken;
    if (accessToken) {
      $(".status-circle").addClass("green");
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

$("#github-authentication").on("click", () => {
  sendMessageToBackground("github", "authentication");
});

$("#github-commit").on("click", () => {
  $("#repositories option").remove();

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
          $("#repositories").append(
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
