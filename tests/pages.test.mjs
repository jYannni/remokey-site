import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SUPPORT_EMAIL } from '../src/config.mjs';

const read = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');

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
