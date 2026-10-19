import { localizePage } from '../../scripts/common/utils/index.js';
import { initializeButtonEvents } from './buttonEventHandler.js';
import { initializeOnLoad } from './onLoadInitialization.js';

(() => {
  localizePage();
  initializeButtonEvents();
  initializeOnLoad();
})();
