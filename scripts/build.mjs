#!/usr/bin/env node
'use strict';

/**
 * Zero-dependency Cross-Browser Extension Packager
 * Generates ready-to-install packages for:
 *  - Chrome / Edge / Brave / Opera / Vivaldi / Arc (Chromium MV3): .zip + unpacked folder
 *  - Firefox (Desktop & Android, Gecko MV3): .xpi + .zip + unpacked folder
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(process.cwd());
const DIST_DIR = path.join(ROOT, 'dist');

const SHARED_FILES = [
  'background.js',
  'src/i18n.js',
  'src/selectors.js',
  'src/engine.js',
  'src/content.js',
  'src/overlay.css',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

// Standard CRC-32 table for ZIP archive creation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear()) - 1980;
  const dosDate = (year << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  return { dosDate, dosTime };
}

/**
 * Creates a standard PKZIP buffer (works as .zip and Firefox .xpi)
 * entries: Array<{ name: string, data: Buffer }>
 */
function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosDate, dosTime } = dosDateTime();

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const raw = entry.data;
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const compData = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);     // Compression method
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compData.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);         // Extra field length

    localParts.push(localHeader, nameBuf, compData);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central dir signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0x0800, 8);     // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compData.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);         // Extra length
    centralHeader.writeUInt16LE(0, 32);         // Comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk number
    centralHeader.writeUInt16LE(0, 36);         // Internal attrs
    centralHeader.writeUInt32LE(0, 38);         // External attrs
    centralHeader.writeUInt32LE(offset, 42);    // Local header offset

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compData.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);            // End of central dir signature
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function buildTarget(targetName, manifestSrcFile, archiveExtensions) {
  const manifestData = fs.readFileSync(path.join(ROOT, manifestSrcFile));
  const manifestJson = JSON.parse(manifestData.toString('utf8'));
  const version = manifestJson.version;

  const unpackedDir = path.join(DIST_DIR, targetName);
  fs.rmSync(unpackedDir, { recursive: true, force: true });
  fs.mkdirSync(unpackedDir, { recursive: true });

  const entries = [{ name: 'manifest.json', data: manifestData }];
  fs.writeFileSync(path.join(unpackedDir, 'manifest.json'), manifestData);

  for (const rel of SHARED_FILES) {
    const absSrc = path.join(ROOT, rel);
    const data = fs.readFileSync(absSrc);
    entries.push({ name: rel, data });

    const absDest = path.join(unpackedDir, rel);
    fs.mkdirSync(path.dirname(absDest), { recursive: true });
    fs.writeFileSync(absDest, data);
  }

  const zipBuf = createZipBuffer(entries);
  const outputs = [];
  for (const ext of archiveExtensions) {
    const fileName = `delete-all-google-photos-v${version}-${targetName}.${ext}`;
    const outPath = path.join(DIST_DIR, fileName);
    fs.writeFileSync(outPath, zipBuf);
    outputs.push({ fileName, bytes: zipBuf.length });
  }

  return { targetName, version, unpackedDir, outputs };
}

function main() {
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const chromium = buildTarget('chromium', 'manifest.json', ['zip']);
  const firefox = buildTarget('firefox', 'manifest.firefox.json', ['xpi', 'zip']);

  console.log('Cross-browser packages built successfully in ./dist:');
  for (const res of [chromium, firefox]) {
    for (const out of res.outputs) {
      console.log(`  - ${out.fileName} (${(out.bytes / 1024).toFixed(1)} KB)`);
    }
    console.log(`  - unpacked: dist/${res.targetName}/`);
  }
}

main();
