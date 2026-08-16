// The App Store gate.
//
// The iPhone app is not approved yet, so APP_STORE_URL is null and the site has
// to say so honestly rather than parking a button that 404s. These tests hold
// BOTH halves: that today's "not yet" state is correct and complete, and that
// the approved state will work the day the URL is set — because the approved
// path is otherwise untested until the moment it goes live, which is the worst
// possible time to discover it renders wrong.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_STORE_URL, TESTFLIGHT_URL, iphoneAvailable } from '../src/config.mjs';

const read = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');
const PAGES = ['index.html', 'download/index.html'];

// --- The config gate itself ------------------------------------------------

test('APP_STORE_URL is either null or a real App Store URL', () => {
  if (APP_STORE_URL === null) return;
  assert.match(
    APP_STORE_URL,
    /^https:\/\/apps\.apple\.com\//,
    'APP_STORE_URL must be an https://apps.apple.com/ URL. A guessed or ' +
    'placeholder value ships a Download button that 404s, which is worse than ' +
    'the honest "not yet" state it replaced.',
  );
});

test('TESTFLIGHT_URL is either null or a real public TestFlight join link', () => {
  if (TESTFLIGHT_URL === null) return;
  assert.match(
    TESTFLIGHT_URL,
    /^https:\/\/testflight\.apple\.com\/join\//,
    'A public TestFlight link looks like https://testflight.apple.com/join/XXXXXXXX. ' +
    'An App Store Connect URL is not one and will not install for a stranger.',
  );
});

test('iphoneAvailable() agrees with the two URLs', () => {
  assert.equal(iphoneAvailable(), APP_STORE_URL !== null || TESTFLIGHT_URL !== null);
});

// --- THE INVARIANT ---------------------------------------------------------
//
// This replaces the old `landing page offers no download links` test, which
// asserted the absence of any .dmg or apps.apple.com string. That assertion
// only held until the day a download had to exist, and then it protected
// nothing. What it was really guarding is the worry below, which survives
// approval: the Mac host is half a pair and does nothing alone, so anyone
// offered it must be told, on that same page, where the iPhone app is up to.

test('no page offers the Mac download without stating the iPhone app’s status', () => {
  for (const page of PAGES) {
    const html = read(page);
    if (!/\.dmg/i.test(html)) continue;

    const hasStore = /apps\.apple\.com/i.test(html);
    const hasBeta = /testflight\.apple\.com/i.test(html);
    const hasPendingNotice = /data-iphone-status/.test(html);

    assert.ok(
      hasStore || hasBeta || hasPendingNotice,
      `${page} links a .dmg but says nothing about the iPhone app. The Mac ` +
      `host is useless on its own, so a bare Mac download produces a support ` +
      `ticket rather than an install. Render <StoreCta /> (which carries the ` +
      `pending notice) or link the store.`,
    );
  }
});

test('the pending notice appears exactly when the iPhone app cannot be installed', () => {
  for (const page of PAGES) {
    const html = read(page);
    const notice = /data-iphone-status/.test(html);
    if (iphoneAvailable()) {
      assert.ok(
        !notice,
        `${page} still shows the "not on the App Store yet" notice even though ` +
        `a real install URL is configured. It is gated on APP_STORE_URL / ` +
        `TESTFLIGHT_URL — if this fails, that gate has been bypassed.`,
      );
    } else {
      assert.ok(notice, `${page} must state that the iPhone app is not yet installable`);
    }
  }
});

test('no page links the App Store while APP_STORE_URL is null', () => {
  if (APP_STORE_URL !== null) return;
  for (const page of PAGES) {
    assert.ok(
      !/apps\.apple\.com/i.test(read(page)),
      `${page} links apps.apple.com but APP_STORE_URL is null, so that link ` +
      `cannot be real. It was hardcoded somewhere instead of read from config.`,
    );
  }
});

// --- Wording ---------------------------------------------------------------

test('the site never says PIN', () => {
  // Pairing by PIN was removed on 2026-08-14 and replaced with comparing a
  // four-digit code on both screens. Some in-app strings are still stale; the
  // site must not copy them, or it documents a flow that no longer exists.
  for (const page of [...PAGES, 'support/index.html', 'privacy/index.html']) {
    const text = read(page).replace(/<[^>]+>/g, ' ');
    assert.ok(
      !/\bPIN\b/.test(text),
      `${page} uses the word "PIN". The app no longer has one — the user ` +
      `compares a four-digit code shown on both devices and confirms on the Mac.`,
    );
  }
});
