// The download page, and the DMG links anywhere on the site.
//
// The failure this suite exists to prevent is a Download button that serves an
// old build, or a 404, months after a release — nobody re-reads a marketing
// page after shipping. Every DMG URL is therefore derived from MAC_VERSION in
// src/config.mjs, and these tests prove nothing hardcoded a version beside it.
//
// The check that MAC_VERSION matches the version actually published lives in
// scripts/smoke.mjs, not here: it needs the network, and a unit suite that
// fails when GitHub is slow is a suite people learn to ignore.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { MAC_VERSION, MAC_MIN_OS, IOS_MIN_OS, dmgUrl, RELEASES_REPO } from '../src/config.mjs';

const read = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');
const PAGES = ['index.html', 'download/index.html', 'support/index.html', 'privacy/index.html'];

test('the download page is built', () => {
  assert.ok(existsSync(new URL('../dist/download/index.html', import.meta.url)));
});

test('every .dmg URL on the site is the one dmgUrl() builds', () => {
  const expected = dmgUrl();
  for (const page of PAGES) {
    for (const m of read(page).matchAll(/https?:\/\/[^"'\s]*?\.dmg/gi)) {
      assert.equal(
        m[0], expected,
        `${page} contains a DMG URL that is not dmgUrl(). Hardcoding one means ` +
        `it silently rots at the next Mac release — build it from MAC_VERSION.`,
      );
    }
  }
});

test('the DMG URL points at the releases repo, not this site', () => {
  const url = dmgUrl();
  assert.ok(url.startsWith(RELEASES_REPO), `expected the asset to live in ${RELEASES_REPO}`);
  assert.ok(
    !url.includes('remokey.app'),
    'Spec invariant: binaries are served from remokey-releases, never from the ' +
    'marketing site. Serving them here would put release artefacts behind the ' +
    'Pages deploy of a site that gets redesigned.',
  );
});

test('the DMG filename matches the shape release-mac.sh produces', () => {
  assert.match(dmgUrl(), /\/ReMoKey-for-Mac-\d+\.\d+(\.\d+)?\.dmg$/);
});

test('MAC_VERSION looks like a marketing version, not a build number', () => {
  // sparkle:shortVersionString is "1.2"; sparkle:version is 527. Pasting the
  // build number here yields a URL that 404s.
  assert.match(
    MAC_VERSION, /^\d+\.\d+(\.\d+)?$/,
    `MAC_VERSION should be a marketing version like "1.2" — got "${MAC_VERSION}". ` +
    `If this is a build number, you copied sparkle:version instead of ` +
    `sparkle:shortVersionString.`,
  );
});

test('the download page states both platform requirements', () => {
  const html = read('download/index.html');
  assert.ok(html.includes(`macOS ${MAC_MIN_OS}`), 'must state the minimum macOS');
  assert.ok(html.includes(`iOS ${IOS_MIN_OS}`), 'must state the minimum iOS');
});

test('the download page shows the Mac and the iPhone as two separate panes', () => {
  const html = read('download/index.html');
  assert.ok(/ReMoKey for Mac/.test(html), 'needs a Mac pane');
  assert.ok(/ReMoKey for iPhone/.test(html), 'needs an iPhone pane');
});

test('the download page tells people about the Accessibility grant', () => {
  // The single biggest support trap in the product: without it the phone
  // connects, the menu-bar icon appears, and nothing moves. Someone who has
  // just downloaded the DMG is exactly the person who needs warning.
  assert.match(
    read('download/index.html'), /accessibility/i,
    'the post-download steps must mention the Accessibility grant',
  );
});

test('the header links the download page from every page', () => {
  for (const page of PAGES) {
    assert.ok(
      /href="\/download\/"/.test(read(page)),
      `${page} does not link /download/ — the page exists but is unreachable`,
    );
  }
});
