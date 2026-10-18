/**
 * Packages the extension for the Chrome Web Store: `npm run package` writes
 * dist/source-code-uploader-<version>.zip. See docs/chrome-web-store.md.
 *
 * The zip holds manifest.json without its `key`, since the store gives the extension its
 * own ID, and the files the extension loads (icon, popup, scripts) without the READMEs.
 * Node.js has no zip writer, so a small one is below instead of a dependency.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// The folders the extension loads files from.
const PACKAGED_DIRS = Object.freeze(['icon', 'popup', 'scripts']);

/**
 * Lists the files of the extension to package, other than manifest.json.
 * @param {string} [root] - The repository root.
 * @returns {string[]} The sorted paths relative to the root, with `/` separators.
 */
export const listPackageFiles = (root = ROOT) =>
  PACKAGED_DIRS.flatMap((dir) =>
    readdirSync(path.join(root, dir), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path
          .relative(root, path.join(entry.parentPath, entry.name))
          .split(path.sep)
          .join('/'),
      ),
  )
    .filter((file) => !file.endsWith('.md'))
    .sort();

/**
 * Returns the manifest for the Chrome Web Store, which rejects a `key`.
 * @param {Object} manifest - The manifest of the repository.
 * @returns {Object} The manifest without `key`.
 */
export const createStoreManifest = (manifest) => {
  const storeManifest = { ...manifest };
  delete storeManifest.key;
  return storeManifest;
};

// 1980-01-01 00:00, the earliest MS-DOS date, so the same files always give the same zip.
const DOS_TIME = 0;
// Day 1 in bits 0-4, month 1 in bits 5-8 and year 0 (1980) in bits 9-15.
const DOS_DATE = 0b0000000_0001_00001;
// Bit 11: the file names are UTF-8.
const UTF8_FLAG = 0x0800;
const DEFLATE = 8;
const VERSION = 20;

/**
 * Creates a zip archive of the files, compressed with deflate.
 * @param {{name: string, data: Buffer}[]} files - The files, in the order to store them.
 * @returns {Buffer} The zip archive.
 */
export const createZip = (files) => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBytes = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data);
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(DEFLATE, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSION, 4);
    central.writeUInt16LE(VERSION, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(DEFLATE, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBytes);

    offset += local.length + nameBytes.length + compressed.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
};

/**
 * Creates the zip to upload to the Chrome Web Store.
 * @param {string} [root] - The repository root.
 * @throws {Error} If the versions of manifest.json and package.json differ.
 * @returns {{version: string, files: string[], zip: Buffer}} The version, the packaged
 *   files and the zip.
 */
export const packageExtension = (root = ROOT) => {
  const readJson = (file) =>
    JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  const manifest = readJson('manifest.json');
  const { version } = readJson('package.json');
  if (manifest.version !== version) {
    throw new Error(
      `manifest.json (${manifest.version}) and package.json (${version}) have different versions.`,
    );
  }

  const files = ['manifest.json', ...listPackageFiles(root)];
  const zip = createZip(
    files.map((name) => ({
      name,
      data:
        name === 'manifest.json'
          ? Buffer.from(
              `${JSON.stringify(createStoreManifest(manifest), null, 2)}\n`,
            )
          : readFileSync(path.join(root, name)),
    })),
  );

  return { version, files, zip };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { version, files, zip } = packageExtension();
  const output = path.join(ROOT, 'dist', `source-code-uploader-${version}.zip`);
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, zip);
  // eslint-disable-next-line no-console -- the result of the command
  console.log(
    `Wrote ${path.relative(ROOT, output)} (${files.length} files, ${zip.length} bytes).`,
  );
}
