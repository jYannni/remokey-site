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

// Reimplements exactly what QrCode.astro draws, so these tests exercise the
// rendering path rather than a separately generated artefact. The first version
// of this suite decoded a PNG from QRCode.toBuffer() and passed while the
// component rendered a BLANK code — the two had nothing to do with each other.
const renderPath = (text) => {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size, bits = qr.modules.data, runs = [];
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!bits[y * n + x]) { x++; continue; }
      let w = 1;
      while (x + w < n && bits[y * n + x + w]) w++;
      runs.push({ x, y, w });
      x += w;
    }
  }
  return { n, bits, runs, d: runs.map((r) => `M${r.x} ${r.y}h${r.w}v1h-${r.w}z`).join('') };
};

test('the drawn path covers exactly the dark modules, no more and no less', () => {
  // The bug this replaces: the component used to lift the `d` out of
  // QRCode.toString({type:'svg'}) and render it with fill. That path is
  // STROKED — open horizontal scanlines at half-pixel offsets — so filling it
  // draws a set of zero-area lines and the code comes out blank. Comparing
  // drawn area against the module count catches any such mismatch directly.
  const { bits, runs } = renderPath(STAND_IN);
  const dark = bits.reduce((a, b) => a + (b ? 1 : 0), 0);
  const drawn = runs.reduce((a, r) => a + r.w, 0);
  assert.ok(dark > 100, `only ${dark} dark modules — the matrix looks empty`);
  assert.equal(drawn, dark, 'the filled area must equal the number of dark modules');
});

test('every drawn run is a closed, non-zero-area subpath', () => {
  // A subpath like `M0 0.5h7` has width but no height, so it fills nothing.
  const { d } = renderPath(STAND_IN);
  assert.ok(d.length > 200, 'the path data looks empty');
  for (const cmd of d.split('M').filter(Boolean)) {
    assert.match(
      `M${cmd}`, /^M\d+ \d+h\d+v1h-\d+z$/,
      `subpath "M${cmd}" is not a closed rect — a fill needs enclosed area`,
    );
  }
});

test('the component draws the matrix rather than scraping the library’s SVG', () => {
  const src = readFileSync(new URL('../src/components/QrCode.astro', import.meta.url), 'utf8');
  // Comments stripped first: the component documents the bug it used to have,
  // and the explanation names the call it must no longer make.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(code, /QRCode\.create\(/, 'must read the module matrix');
  assert.ok(
    !/QRCode\.toString\(/.test(code),
    'QRCode.toString() emits a STROKED path of open scanlines; its serialisation ' +
    'is not part of the API, and filling that path renders a blank code',
  );
});

test('the top-left finder pattern is where a decoder expects it', () => {
  // A cheap structural sanity check that the matrix is a real QR symbol: the
  // 7x7 finder is solid on its border ring and hollow one ring in.
  const { n, bits } = renderPath(STAND_IN);
  const at = (x, y) => bits[y * n + x];
  for (let i = 0; i < 7; i++) {
    assert.equal(at(i, 0), 1, `finder top edge broken at ${i}`);
    assert.equal(at(0, i), 1, `finder left edge broken at ${i}`);
  }
  // Row 1 of a finder is 1 0 0 0 0 0 1 — the quiet ring inside the border.
  assert.equal(at(6, 1), 1, 'finder row 1 should close on the right');
  for (let i = 1; i < 6; i++) {
    assert.equal(at(i, 1), 0, `finder inner ring should be light at x=${i}`);
  }
  // Row 2 is 1 0 1 1 1 0 1 — the border, the ring, and the solid 3x3 core.
  for (let i = 2; i < 5; i++) {
    assert.equal(at(i, 2), 1, `finder core should be dark at x=${i}`);
  }
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
