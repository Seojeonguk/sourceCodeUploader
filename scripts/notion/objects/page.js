import { PROPERTY_TYPE, SELECT_COLOR } from "./constants/pageConstants.js";
import { createRichTextArray } from "./block.js";

/**
 * Create a page property.
 * @param {string} type - The type of page property to create
 * @param {Object} payload - The payload containing the necessary data for creating the page property
 * @returns {Object} - The created page property object
 */
export const createPageProperty = (type, payload) => {
  switch (type) {
    case PROPERTY_TYPE.DATE:
      return createDate(payload);
    case PROPERTY_TYPE.MULTI_SELECT:
      return createMultiSelect(payload);
    case PROPERTY_TYPE.SELECT:
      return createSelect(payload);
    case PROPERTY_TYPE.TITLE:
      return createTitle(payload);
    case PROPERTY_TYPE.URL:
      return createUrl(payload);
    default:
      throw new Error(`Unsupported block type: ${type}`);
  }
};

/**
 * Create a date property.
 * @param {Object} param - Object containing the parameters for creating the date property
 * @param {Date} [param.start=new Date()] - The start date for the date property, defaults to the current date if not provided
 * @param {Date|null} [param.end=null] - The end date for the date property, defaults to null if not provided
 * @returns {Object} - The created date property object
 */
export const createDate = ({ start = new Date(), end = null }) => {
  return {
    [PROPERTY_TYPE.DATE]: {
      start,
      end,
    },
  };
};

/**
 * Create a multi-select property.
 * @param {Object} params - Object containing the parameters for creating the multi-select property
 * @param {Array} [params.selections=[]] - An array of objects representing the selections for the multi-select property
 * @param {string} [params.selections.id=null] - The ID of the selection (optional)
 * @param {string} params.selections.name - The name of the selection
 * @param {string} [params.selections.color=default] - The color of the selection, default is SELECT_COLOR.DEFAULT
 * @returns {Object} - The created multi-select property object
 */
export const createMultiSelect = ({ selections = [] }) => {
  return {
    [PROPERTY_TYPE.MULTI_SELECT]: selections.map(
      ({ color = SELECT_COLOR.DEFAULT, id = null, name }) => ({
        id,
        name,
        color,
      })
    ),
  };
};

/**
 * Create a select property.
 * @param {Object} params - Object containing the parameters for creating the select property
 * @param {string} [params.color=SELECT_COLOR.DEFAULT] - The color of the select option, default is SELECT_COLOR.DEFAULT
 * @param {string} [params.id=null] - The ID of the select option (optional)
 * @param {string} params.name - The name of the select option
 * @returns {Object} - The created select property object
 */
export const createSelect = ({
  color = SELECT_COLOR.DEFAULT,
  id = null,
  name,
}) => {
  return {
    [PROPERTY_TYPE.SELECT]: {
      color,
      name,
      id,
    },
  };
};

/**
 * Create a title property.
 * @param {Object} params - Object containing the parameters for creating the title property
 * @param {string} params.text - The text content of the title
 * @returns {Object} - The created title property object
 */
export const createTitle = ({ text }) => {
  return {
    id: PROPERTY_TYPE.TITLE,
    type: PROPERTY_TYPE.TITLE,
    title: createRichTextArray(text),
  };
};

/**
 * Create a URL property.
 * @param {Object} params - Object containing the parameters for creating the URL property
 * @param {string} params.url - The URL value for the property
 * @returns {Object} - The created URL property object
 */
export const createUrl = ({ url }) => {
  return {
    url,
  };
};
