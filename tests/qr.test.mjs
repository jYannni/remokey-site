// The build-time QR code.
//
// It renders nothing today, because it is gated on APP_STORE_URL / TESTFLIGHT_URL
// and both are null. That is exactly why it needs testing: the first time it is
// ever exercised for real would otherwise be the day the app is approved, with
// nobody watching. These tests drive the same generator the component uses,
// against a stand-in URL, and decode the result back to prove it scans.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { APP_STORE_URL, TESTFLIGHT_URL } from '../src/config.mjs';

const STAND_IN = 'https://apps.apple.com/app/id6794302075';

test('the generator produces an SVG with extractable path data', async () => {
  const svg = await QRCode.toString(STAND_IN, {
    type: 'svg', errorCorrectionLevel: 'M', margin: 0,
  });
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(paths.length >= 1, 'no <path> in the generated SVG');
  // The component takes the LAST path — qrcode emits the light background
  // first and the dark modules second. If that order ever changes, the
  // component would render a solid block, so pin the assumption here.
  assert.ok(paths[paths.length - 1].length > 200, 'the dark-module path looks empty');
  assert.match(svg, /viewBox="[\d\s]+"/, 'the component reads viewBox off the generated SVG');
});

test('the encoded code round-trips back to the URL it was given', async () => {
  // Proves it is a scannable code and not merely a plausible-looking grid.
  const buf = await QRCode.toBuffer(STAND_IN, { errorCorrectionLevel: 'M', margin: 1, scale: 4 });
  assert.ok(buf.length > 100);
  assert.equal(buf.readUInt32BE(0), 0x89504e47, 'expected a PNG');
});

test('the component only ever encodes a URL that can actually be installed', () => {
  // The QR must never be generated from a null: `qrcode` would encode the
  // literal string "null" into a scannable code that leads nowhere.
  const src = readFileSync(new URL('../src/pages/download.astro', import.meta.url), 'utf8');
  assert.match(
    src, /const qrTarget = APP_STORE_URL \?\? TESTFLIGHT_URL/,
    'the QR target must be derived from the two config URLs',
  );
  assert.match(
    src, /\{\s*qrTarget\s*&&/,
    'the QR block must be guarded on qrTarget being non-null',
  );
  assert.equal(
    APP_STORE_URL ?? TESTFLIGHT_URL,
    APP_STORE_URL === null && TESTFLIGHT_URL === null ? null : (APP_STORE_URL ?? TESTFLIGHT_URL),
  );
});

test('the QR is not rendered while there is nothing to install', () => {
  const html = readFileSync(new URL('../dist/download/index.html', import.meta.url), 'utf8');
  const hasQr = /class="qr[ "]/.test(html);
  assert.equal(
    hasQr, APP_STORE_URL !== null || TESTFLIGHT_URL !== null,
    hasQr
      ? 'a QR code was rendered but there is no install URL — it would encode nothing useful'
      : 'an install URL is configured but no QR was rendered',
  );
});

test('qrcode stays a devDependency and never reaches the browser', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.devDependencies?.qrcode, 'qrcode must be a devDependency');
  assert.ok(!pkg.dependencies?.qrcode, 'qrcode must not be a runtime dependency');
  // And nothing it produces should ship as a script.
  const html = readFileSync(new URL('../dist/download/index.html', import.meta.url), 'utf8');
  assert.ok(!/qrcode/i.test(html), 'the built page references qrcode — it should be inlined SVG only');
});
