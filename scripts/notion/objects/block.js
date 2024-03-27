import { BLOCK_TYPE, COLORS, LANGUAGES } from "./constants/blockConstants.js";
import { splitTextIntoChunks } from "../../util.js";

/**
 * Create a block based on the specified type and payload.
 * @param {Object} params - Object containing the type and payload of the block to create
 * @param {string} params.type - The type of the block
 * @param {*} params.payload - The payload containing the necessary data to create the block
 * @returns {Object} - The created block object
 * @throws {Error} - If an unsupported block type is provided
 */
export const createBlock = ({ type, payload }) => {
  switch (type) {
    case BLOCK_TYPE.CODE:
      return createCode(payload);
    case BLOCK_TYPE.HEADING_LARGE:
      return createHeading({ type: BLOCK_TYPE.HEADING_LARGE, ...payload });
    case BLOCK_TYPE.HEADING_MIDIUM:
      return createHeading({ type: BLOCK_TYPE.HEADING_MIDIUM, ...payload });
    case BLOCK_TYPE.HEADING_SMALL:
      return createHeading({ type: BLOCK_TYPE.HEADING_SMALL, ...payload });
    case BLOCK_TYPE.PARAGRAPH:
      return createParagraph(payload);
    case BLOCK_TYPE.TEXT:
      return createRichText(payload);
    default:
      throw new Error(`Unsupported block type: ${type}`);
  }
};

/**
 * Create a code block object.
 * @param {Object} params - Object containing the parameters for creating the code block
 * @param {string} [params.caption] - The caption for the code block
 * @param {string} params.text - The code content of the code block
 * @param {string} [params.language=blockConstants.LANGUAGES.PLAIN_TEXT] - The programming language of the code block, default is plain text
 * @returns {Object} - The created code block object
 */
export const createCode = ({ caption, text, language = LANGUAGES.Text }) => {
  return {
    type: BLOCK_TYPE.CODE,
    [BLOCK_TYPE.CODE]: {
      caption: createRichTextArray(caption),
      rich_text: createRichTextArray(text),
      language,
    },
  };
};

/**
 * Create a heading object.
 * @param {Object} params - Object containing the parameters for creating the heading
 * @param {string} [params.type="heading_1"] - The type of heading, default is "heading_1"
 * @param {string} params.text - The text content of the heading
 * @param {string} [params.color="default"] - The color of the heading, default is "default"
 * @param {boolean} [params.is_toggleable=false] - Whether the heading is toggleable or not, default is false
 * @returns {Object} - The created heading object
 */
export const createHeading = ({
  type = BLOCK_TYPE.HEADING_LARGE,
  text,
  color = COLORS.DEFAULT,
  is_toggleable = false,
}) => {
  return {
    type,
    [type]: {
      rich_text: createRichTextArray(text),
      color,
      is_toggleable,
    },
  };
};

/**
 * Create a paragraph object.
 * @param {Object} params - An object containing the parameters for creating the paragraph block.
 * @param {string} params.text - The text content of the paragraph.
 * @param {string} [params.color="default"] - The color of the paragraph text, default is "default".
 * @returns {Object} - The created paragraph block object.
 */
export const createParagraph = ({ text, color = COLORS.DEFAULT }) => {
  return {
    type: BLOCK_TYPE.PARAGRAPH,
    [BLOCK_TYPE.PARAGRAPH]: {
      rich_text: createRichTextArray(text),
      color,
    },
  };
};

/**
 * Create a rich text object.
 * @param {Object} params - Object containing the parameters for creating the rich text
 * @param {string} params.text - The content of the rich text
 * @param {string|null} [params.link=null] - The link URL associated with the rich text, default is null
 * @param {Object} [params.annotations={}] - Object containing the text formatting annotations, default is an empty object
 * @param {boolean} [params.annotations.bold=false] - Whether the text is bold or not, default is false
 * @param {boolean} [params.annotations.italic=false] - Whether the text is italic or not, default is false
 * @param {boolean} [params.annotations.strikethrough=false] - Whether the text has a strikethrough or not, default is false
 * @param {boolean} [params.annotations.underline=false] - Whether the text is underlined or not, default is false
 * @param {boolean} [params.annotations.code=false] - Whether the text is formatted as code or not, default is false
 * @param {string} [params.annotations.color="default"] - The color of the text, default is "default"
 * @param {string|null} [params.href=null] - The href attribute associated with the rich text, default is null
 * @returns {Object} - The created rich text object
 */
export const createRichText = ({
  text,
  link = null,
  annotations = {},
  href = null,
}) => {
  return {
    type: BLOCK_TYPE.TEXT,
    [BLOCK_TYPE.TEXT]: {
      content: text,
      link,
    },
    annotations: {
      bold: annotations.bold || false,
      italic: annotations.italic || false,
      strikethrough: annotations.strikethrough || false,
      underline: annotations.underline || false,
      code: annotations.code || false,
      color: annotations.color || blockConstants.COLORS.DEFAULT,
    },
    plain_text: text,
    href,
  };
};

/**
 * Function to split the given text into chunks of 1000 characters each and convert them into an array of Rich Text objects.
 * @param {string} text The text to be converted
 * @returns {object[]} An array of Rich Text objects
 */
export const createRichTextArray = (text) => {
  const chunks = splitTextIntoChunks(text, 1000);
  const richTextArray = chunks.map((chunk) => createRichText({ text: chunk }));
  return richTextArray;
};
