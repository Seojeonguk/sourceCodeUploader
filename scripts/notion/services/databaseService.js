import { InvalidRequestException } from "../../common/exception/index.js";
import { getChromeStorage, request } from "../../common/utils/index.js";
import { NOTION_CONFIG } from "../config/config.js";
import { createPage } from "../endpoints/pages.js";
import { createBlock } from "../objects/block.js";
import { BLOCK_TYPE } from "../objects/constants/blockConstants.js";
import { PROPERTY_TYPE } from "../objects/constants/pageConstants.js";
import { createPageProperty } from "../objects/page.js";

export const getDatabases = async () => {
  const accessToken = await getChromeStorage('notionAccessToken');
  if (!accessToken) {
    throw new InvalidRequestException('Notion', 'access token');
  }

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/search`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const body = JSON.stringify({
    filter: {
      value: 'database',
      property: 'object',
    },
  });

  const response = await request(url, 'POST', headers, body);

  const results = response.results;

  return results;
};

export const upload = async (
  { problemId, type, extension, sourceCode },
  { title, level, tags },
) => {
  const databaseId = await getChromeStorage('notionUploadedDatabaseId');

  const properties = {
    title: createPageProperty(PROPERTY_TYPE.TITLE, {
      text: title,
    }),
    info: createPageProperty(PROPERTY_TYPE.MULTI_SELECT, {
      selections: [type, level, problemId].map((value) => ({
        name: value,
      })),
    }),
    tags: createPageProperty(PROPERTY_TYPE.MULTI_SELECT, {
      selections: tags.map((tag) => ({
        name: tag,
      })),
    }),
    URL: createPageProperty(PROPERTY_TYPE.URL, {
      url: `acmicpc.net/problem/${problemId}`,
    }),
    Date: createPageProperty(PROPERTY_TYPE.DATE, {
      start: new Date(),
    }),
    mime: createPageProperty(PROPERTY_TYPE.SELECT, {
      name: extension,
    }),
  };

  const children = [
    createBlock(BLOCK_TYPE.HEADING_LARGE, { text: 'How to resolve?' }),
    createBlock(BLOCK_TYPE.PARAGRAPH, { text: '' }),
    createBlock(BLOCK_TYPE.HEADING_LARGE, { text: 'Source Code' }),
    createBlock(BLOCK_TYPE.CODE, { text: sourceCode, language: 'java' }),
  ];

  const data = {
    parent: { database_id: databaseId },
    properties: properties,
    children: children,
  };

  const result = await createPage(data);
  const message = result.public_url;

  return message;
};
