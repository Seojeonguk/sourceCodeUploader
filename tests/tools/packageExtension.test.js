import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { crc32, inflateRawSync } from 'node:zlib';

import {
  createStoreManifest,
  createZip,
  listPackageFiles,
  packageExtension,
} from '../../tools/package-extension.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'manifest.json')));

/**
 * Reads a zip from its central directory, checking each file against its local header and CRC.
 * @returns {Map<string, Buffer>} The contents by file name, in the stored order.
 */
const readZip = (zip) => {
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let position = zip.readUInt32LE(end + 16);
  const files = new Map();

  for (let i = 0; i < count; i += 1) {
    assert.equal(zip.readUInt32LE(position), 0x02014b50);
    const checksum = zip.readUInt32LE(position + 16);
    const compressedSize = zip.readUInt32LE(position + 20);
    const size = zip.readUInt32LE(position + 24);
    const nameLength = zip.readUInt16LE(position + 28);
    const offset = zip.readUInt32LE(position + 42);
    const name = zip.toString(
      'utf8',
      position + 46,
      position + 46 + nameLength,
    );

    assert.equal(zip.readUInt32LE(offset), 0x04034b50);
    assert.equal(zip.readUInt16LE(offset + 8), 8);
    const dataStart = offset + 30 + zip.readUInt16LE(offset + 26);
    const data = inflateRawSync(
      zip.subarray(dataStart, dataStart + compressedSize),
    );
    assert.equal(data.length, size);
    assert.equal(crc32(data), checksum);

    files.set(name, data);
    position += 46 + nameLength;
  }

  return files;
};

// The files that manifest.json loads.
const manifestFiles = () => [
  ...Object.values(manifest.icons),
  manifest.action.default_popup,
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap(({ css, js }) => [...css, ...js]),
  ...manifest.web_accessible_resources
    .flatMap(({ resources }) => resources)
    .filter((resource) => !resource.includes('*')),
];

// The relative paths that a packaged file loads: JS imports and HTML src/href.
const referencedFiles = (file, content) => {
  const pattern = file.endsWith('.html')
    ? /(?:src|href)="(\.{1,2}\/[^"]+)"/g
    : /(?:import|from)\s*\(?\s*'(\.{1,2}\/[^']+)'/g;
  return [...content.matchAll(pattern)].map(([, reference]) =>
    path.posix.join(path.posix.dirname(file), reference),
  );
};

describe('listPackageFiles', () => {
  const files = listPackageFiles();

  it('includes every file that manifest.json loads', () => {
    manifestFiles().forEach((file) => assert.ok(files.includes(file), file));
  });

  it('includes every file that the packaged pages and scripts load', () => {
    files
      .filter((file) => /\.(js|html)$/.test(file))
      .forEach((file) => {
        const content = readFileSync(path.join(ROOT, file), 'utf8');
        referencedFiles(file, content).forEach((reference) =>
          assert.ok(files.includes(reference), `${file} → ${reference}`),
        );
      });
  });

  it('includes the icons that the content script shows on the page', () => {
    assert.ok(files.includes('icon/githubIcon.png'));
    assert.ok(files.includes('icon/notionIcon.png'));
  });

  it('leaves out the READMEs, tests, proxy and development files', () => {
    assert.deepEqual(
      files.filter(
        (file) =>
          file.endsWith('.md') ||
          !/^(icon|popup|scripts)\//.test(file) ||
          file.includes('node_modules'),
      ),
      [],
    );
  });

  it('returns sorted paths with / separators', () => {
    assert.deepEqual(files, [...files].sort());
    assert.ok(files.every((file) => !file.includes('\\')));
  });
});

describe('createStoreManifest', () => {
  it('removes the key, which the Chrome Web Store rejects', () => {
    const { key, ...expected } = manifest;

    const storeManifest = createStoreManifest(manifest);

    assert.ok(key);
    assert.equal('key' in storeManifest, false);
    assert.deepEqual(storeManifest, expected);
  });

  it('does not change the manifest of the repository', () => {
    const copy = structuredClone(manifest);

    createStoreManifest(copy);

    assert.deepEqual(copy, manifest);
    assert.ok(copy.key);
  });
});

describe('createZip', () => {
  it('stores each file so that it reads back the same', () => {
    const files = [
      { name: 'manifest.json', data: Buffer.from('{"name":"SCU"}\n') },
      {
        name: 'scripts/한글.js',
        data: Buffer.from('// 한글 주석\n'.repeat(100)),
      },
      { name: 'empty.txt', data: Buffer.alloc(0) },
    ];

    const zip = readZip(createZip(files));

    assert.deepEqual(
      [...zip.keys()],
      files.map(({ name }) => name),
    );
    files.forEach(({ name, data }) => assert.deepEqual(zip.get(name), data));
  });

  it('gives the same zip for the same files', () => {
    const files = [{ name: 'a.txt', data: Buffer.from('a') }];

    assert.deepEqual(createZip(files), createZip(files));
  });
});

describe('packageExtension', () => {
  it('packages manifest.json without the key and the extension files', () => {
    const { version, files, zip } = packageExtension();
    const contents = readZip(zip);

    assert.equal(version, manifest.version);
    assert.deepEqual([...contents.keys()], files);
    assert.equal(files[0], 'manifest.json');
    assert.equal('key' in JSON.parse(contents.get('manifest.json')), false);
    assert.deepEqual(
      JSON.parse(contents.get('manifest.json')),
      createStoreManifest(manifest),
    );
    assert.deepEqual(
      contents.get('scripts/background.js'),
      readFileSync(path.join(ROOT, 'scripts/background.js')),
    );
  });

  it('fails if manifest.json and package.json have different versions', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'scu-package-'));
    try {
      ['icon', 'popup', 'scripts'].forEach((dir) =>
        mkdirSync(path.join(root, dir)),
      );
      writeFileSync(
        path.join(root, 'manifest.json'),
        JSON.stringify({ version: '3.2.0' }),
      );
      writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ version: '3.1.0' }),
      );

      assert.throws(() => packageExtension(root), /different versions/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
