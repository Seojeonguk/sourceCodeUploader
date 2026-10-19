// The names that Notion shows for the property types, by API type.
const TYPE_NAMES = Object.freeze({
  checkbox: 'Checkbox',
  created_time: 'Created time',
  date: 'Date',
  email: 'Email',
  files: 'Files & media',
  formula: 'Formula',
  multi_select: 'Multi-select',
  number: 'Number',
  people: 'Person',
  phone_number: 'Phone',
  relation: 'Relation',
  rich_text: 'Text',
  rollup: 'Rollup',
  select: 'Select',
  status: 'Status',
  title: 'Title',
  url: 'URL',
});

const describeType = (type) =>
  TYPE_NAMES[type] ?? String(type).replace(/_/g, ' ');

export class DatabasePropertyException extends Error {
  /**
   * Thrown when the database has a property that the uploads need, but with another type.
   * @param {string} platform - The platform, such as `Notion`.
   * @param {{name: string, type: string, expected: string}[]} properties - The properties
   *   with the wrong type: their name, their type and the type the uploads need.
   */
  constructor(platform, properties) {
    const list = properties
      .map(
        ({ name, type, expected }) =>
          `"${name}" is ${describeType(type)}, not ${describeType(expected)}`,
      )
      .join('; ');
    super(
      `The ${platform} database has properties of the wrong type: ${list}. Change their type, or rename them so the extension can add its own.`,
    );
    this.name = 'DatabasePropertyException';
    this.statusCode = 400;
    this.properties = properties;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
