import { initializeButtonEvents } from "./buttonEventHandler.js";
import { initializeOnLoad } from "./onLoadInitialization.js";

$(function () {
  initializeButtonEvents();
  initializeOnLoad();
});
