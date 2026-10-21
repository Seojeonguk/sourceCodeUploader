import { t } from '../utils/i18n.js';

// The names that Notion shows for the property types are the `notionType_<type>` messages.
const NAMED_TYPES = Object.freeze([
  'checkbox',
  'created_time',
  'date',
  'email',
  'files',
  'formula',
  'multi_select',
  'number',
  'people',
  'phone_number',
  'relation',
  'rich_text',
  'rollup',
  'select',
  'status',
  'title',
  'url',
]);

const describeType = (type) =>
  NAMED_TYPES.includes(type)
    ? t(`notionType_${type}`)
    : String(type).replace(/_/g, ' ');

export class DatabasePropertyException extends Error {
  /**
   * Thrown when the database has a property that the uploads need, but with another type.
   * @param {string} platform - The platform, such as `Notion`.
   * @param {{name: string, type: string, expected: string}[]} properties - The properties
   *   with the wrong type: their name, their type and the type the uploads need.
   */
  constructor(platform, properties) {
    const list = properties
      .map(({ name, type, expected }) =>
        t(
          'databasePropertyItem',
          name,
          describeType(type),
          describeType(expected),
        ),
      )
      .join(t('databasePropertySeparator'));
    super(t('databasePropertyWrongType', platform, list));
    this.name = 'DatabasePropertyException';
    this.statusCode = 400;
    this.properties = properties;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
