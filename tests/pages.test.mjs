import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SUPPORT_EMAIL } from '../src/config.mjs';

const read = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');

// The footer carries a mailto on every page, so `html.includes(SUPPORT_EMAIL)` is
// satisfied without the body naming the address at all. Scope assertions about page
// content to <main> so they test the page rather than the chrome.
const mainOf = (p) => {
  const m = read(p).match(/<main[^>]*>([\s\S]*?)<\/main>/);
  assert.ok(m, `no <main> found in ${p} — has Base.astro changed?`);
  return m[1];
};

test('privacy page is built', () => {
  assert.ok(existsSync(new URL('../dist/privacy/index.html', import.meta.url)));
});

// Weaker than it looks: the SUPPORT_EMAIL assertion is satisfied by Footer.astro's
// mailto alone, so it does not prove the policy body names the address. The
// placeholder case — the failure that matters — is guarded by the last test here.
test('privacy page states no collection and names the support address', () => {
  const html = read('privacy/index.html');
  assert.match(html, /collect/i);
  assert.ok(html.includes(SUPPORT_EMAIL));
});

test('privacy page discloses the update check', () => {
  const html = read('privacy/index.html');
  assert.ok(
    html.includes('updates.remokey.app'),
    'privacy policy must name the host the Mac contacts for updates — the design spec requires the specific hostname, not just "GitHub"'
  );
});

// This also permanently covers Base.astro's Markdown `frontmatter` prop path, which
// until now was verified only by throwaway pages. A broken frontmatter fallback emits
// an empty <title>, so asserting the real value proves the layout wiring resolves.
test('privacy page renders its frontmatter title through the shared layout', () => {
  const html = read('privacy/index.html');
  assert.match(
    html,
    /<title>Privacy — ReMoKey<\/title>/,
    'Base.astro must render the Markdown frontmatter title, not fall back to PRODUCT_NAME'
  );
});

test('privacy page carries no placeholder support address', () => {
  const html = read('privacy/index.html');
  assert.ok(
    !html.includes('SUPPORT ADDRESS'),
    'the source document ends with a literal [SUPPORT ADDRESS — to be set before release] placeholder; it must be replaced'
  );
  assert.ok(!html.includes('example.com'));
});

test('support page is built and names the address', () => {
  const html = read('support/index.html');
  assert.ok(html.includes(SUPPORT_EMAIL));
});

test('support page routes users through the in-app reporter', () => {
  const html = read('support/index.html');
  assert.match(
    html,
    /report a problem/i,
    'support page must point at the in-app reporter — an email address alone produces "it does not work" reports'
  );
});

test('support page body names the address, not just the footer', () => {
  assert.ok(mainOf('support/index.html').includes(SUPPORT_EMAIL));
});

test('privacy page body names the address, not just the footer', () => {
  assert.ok(mainOf('privacy/index.html').includes(SUPPORT_EMAIL));
});

test('landing page is built with the coming-soon state', () => {
  const html = read('index.html');
  assert.match(html, /coming soon/i);
});

test('landing page offers no download links before the iPhone app ships', () => {
  const html = read('index.html');
  assert.ok(
    !/\.dmg/i.test(html),
    'no DMG link at launch — the Mac host is useless without the iPhone app'
  );
  assert.ok(
    !/apps\.apple\.com/i.test(html),
    'no App Store link until the app is actually approved'
  );
});

test('the site never ships a copy of the appcast', () => {
  assert.ok(
    !existsSync(new URL('../dist/appcast.xml', import.meta.url)),
    'Spec invariant 1: the appcast lives only in remokey-releases. A second copy ' +
    'here would drift, and the stale one is the one shipped apps read.'
  );
});
