import { BLOCK_TYPE, LANGUAGES } from './constants/blockConstants.js';

/**
 * Create a block based on the specified type and payload.
 *
 * @param {Object} params - Object containing the type and payload of the block to create
 * @param {string} params.type - The type of the block
 * @param {*} params.payload - The payload containing the necessary data to create the block
 * @returns {Object} - The created block object
 * @throws {Error} - If an unsupported block type is provided
 */
export const createBlock = (type, payload) => {
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
 * Create a code block.
 *
 * @param {Object} code - The code block to add.
 * @param {string} [code.caption] - The caption for the code block.
 * @param {string} code.text - The code content of the code block.
 * @param {string} [code.language=plain_text] - The programming language of the code block.
 * @returns {Object} - The created code block.
 */
export const createCode = ({ caption, text, language = LANGUAGES.Text }) => ({
  type: BLOCK_TYPE.CODE,
  [BLOCK_TYPE.CODE]: {
    caption: caption && createRichTextArray(caption),
    rich_text: createRichTextArrayByLength(text),
    language,
  },
});

/**
 * Create a heading block.
 *
 * @param {Object} heading - The heading block to add.
 * @param {string} [heading.type=heading_1] - The type of heading.
 * @param {string} heading.text - The text content of the heading.
 * @param {string} [heading.color] - The color of the heading.
 * @param {boolean} [heading.is_toggleable=false] - Whether the heading is toggleable.
 * @returns {Object} - The created heading block.
 */
export const createHeading = ({
  type = BLOCK_TYPE.HEADING_LARGE,
  text,
  color,
  // eslint-disable-next-line camelcase -- Notion API field name
  is_toggleable = false,
}) => ({
  type,
  [type]: {
    rich_text: createRichTextArray(text),
    color,
    // eslint-disable-next-line camelcase -- Notion API field name
    is_toggleable,
  },
});

/**
 * Creates a paragraph block.
 *
 * @param {Object} paragraph - The paragraph block to add.
 * @param {string} paragraph.text - The text content of the paragraph.
 * @param {string} [paragraph.color] - The color of the text in the paragraph.
 * @returns {Object} The created paragraph block.
 */
export const createParagraph = ({ text, color }) => ({
  type: BLOCK_TYPE.PARAGRAPH,
  [BLOCK_TYPE.PARAGRAPH]: {
    rich_text: createRichTextArray(text),
    color,
  },
});

/**
 * Creates a rich text block.
 *
 * @param {Object} richText - The rich text block to add.
 * @param {string} richText.text - The text content of the rich text.
 * @param {?string} [richText.link=null] - link associated with the text.
 * @param {Object} [richText.annotations={}] - formatting annotations including:
 * @param {boolean} [richText.annotations.bold=false] - Whether the text is bold.
 * @param {boolean} [richText.annotations.italic=false] - Whether the text is italicized.
 * @param {boolean} [richText.annotations.strikethrough=false] - Whether the text has a strikethrough.
 * @param {boolean} [richText.annotations.underline=false] - Whether the text is underlined.
 * @param {boolean} [richText.annotations.code=false] - Whether the text is formatted as code.
 * @param {string} [richText.annotations.color] - The color of the text.
 * @param {?string} [href=null] - URL associated with the text.
 * @returns {Object} The created rich text block.
 */
export const createRichText = ({
  text,
  link = null,
  annotations: {
    bold = false,
    italic = false,
    strikethrough = false,
    underline = false,
    code = false,
    color,
  } = {},
  href = null,
}) => ({
  type: BLOCK_TYPE.TEXT,
  [BLOCK_TYPE.TEXT]: {
    content: text,
    link,
  },
  annotations: {
    bold,
    italic,
    strikethrough,
    underline,
    code,
    color,
  },
  plain_text: text,
  href,
});

/**
 * Splits the given text by newline characters ('\n') and creates an array of rich text objects,
 * where each line is transformed into a rich text object using the createRichText function.
 * Adds a newline character to all lines except the last one.
 * @param {string} text The text to be transformed
 * @returns {Object[]} An array of rich text objects
 */
export const createRichTextArray = (text) =>
  text.split('\n').map((value, index, array) =>
    createRichText({
      text: array.length - 1 === index ? value : `${value}\n`,
    }),
  );

// Notion allows up to 2000 characters in the content of one rich text object.
const MAX_TEXT_LENGTH = 2000;

// The first half of a character that takes two UTF-16 code units, such as an emoji.
const isHighSurrogate = (code) => code >= 0xd800 && code <= 0xdbff;

/**
 * Splits the given text into chunks of up to 2000 characters each and creates an array of rich text objects,
 * where each chunk is transformed into a rich text object using the createRichText function.
 * A character made of two UTF-16 code units is kept in one chunk, so it is not broken in Notion.
 * @param {string} text The text to be transformed
 * @returns {Object[]} An array of rich text objects
 */
export const createRichTextArrayByLength = (text) => {
  const array = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + MAX_TEXT_LENGTH, text.length);
    if (end < text.length && isHighSurrogate(text.charCodeAt(end - 1))) {
      end -= 1;
    }

    array.push(createRichText({ text: text.slice(start, end) }));
    start = end;
  }

  return array;
};
