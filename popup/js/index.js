import { initializeButtonEvents } from './buttonEventHandler.js';
import { initializeOnLoad } from './onLoadInitialization.js';

(() => {
  initializeButtonEvents();
  initializeOnLoad();
})();
