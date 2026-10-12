import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encodeBase64Unicode } from '../../scripts/common/utils/encoding.js';

const decodeBase64Unicode = (base64) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
  );

describe('encodeBase64Unicode', () => {
  it('encodes ASCII text the same as btoa', () => {
    const source = 'int main() { return 0; }';

    assert.equal(encodeBase64Unicode(source), btoa(source));
  });

  it('encodes Korean text that btoa cannot handle (#150)', () => {
    const source = '// 한글 주석\nprint("안녕")';

    assert.throws(() => btoa(source));
    assert.equal(decodeBase64Unicode(encodeBase64Unicode(source)), source);
  });

  it('encodes emoji (4-byte UTF-8)', () => {
    const source = 'console.log("🚀");';

    assert.equal(decodeBase64Unicode(encodeBase64Unicode(source)), source);
  });

  it('encodes an empty string', () => {
    assert.equal(encodeBase64Unicode(''), '');
  });
});
