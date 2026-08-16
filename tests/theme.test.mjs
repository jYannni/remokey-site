// The theme contract: light for everyone by default, dark only ever by
// choice, and no way for the two halves of the mechanism to drift apart.
//
// The mechanism has three pieces that MUST agree: global.css declares both
// palettes, Base.astro's inline head script applies the stored choice before
// first paint, and Header.astro's toggle flips it. The colour each piece
// hardcodes is asserted against the stylesheet here, because a mismatch is
// invisible in testing (the page still works) and glaring on a phone (the
// browser chrome no longer matches the canvas).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const dist = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');
const css = src('styles/global.css');
const PAGES = ['index.html', 'download/index.html', 'support/index.html', 'privacy/index.html'];

const bgOf = (block) => {
  const m = css.match(block)?.[1]?.match(/--bg:\s*(#[0-9a-f]{6})/i);
  assert.ok(m, 'could not read --bg from global.css');
  return m[1];
};
const LIGHT_BG = bgOf(/\n:root \{([\s\S]*?)\n\}/);
const DARK_BG = bgOf(/\n:root\[data-theme='dark'\] \{([\s\S]*?)\n\}/);

test('light is the default: dark exists only behind data-theme', () => {
  // The palette must never key off prefers-color-scheme — the default is a
  // product decision, not the visitor's OS setting, and the stored choice is
  // the only thing that flips it.
  assert.match(css, /:root\[data-theme='dark'\]/, 'dark palette missing');
  assert.ok(
    !/@media[^\n]*prefers-color-scheme/.test(css),
    'global.css must not branch on prefers-color-scheme — dark is chosen, never inferred',
  );
});

test('every page applies the stored theme inline in <head>, before first paint', () => {
  for (const page of PAGES) {
    const head = dist(page).match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
    assert.match(head, /rk-theme/, `${page}: no inline theme bootstrap in <head>`);
    assert.match(
      head, /dataset\.theme\s*=\s*['"]dark['"]/,
      `${page}: the head script must set data-theme, or dark visitors flash light on every navigation`,
    );
  }
});

test('every page carries the theme toggle, labelled and stateful', () => {
  for (const page of PAGES) {
    const html = dist(page);
    const btn = html.match(/<button[^>]*data-theme-toggle[^>]*>/)?.[0];
    assert.ok(btn, `${page}: no theme toggle`);
    assert.match(btn, /aria-label=/, `${page}: the toggle needs an accessible name`);
    assert.match(
      btn, /aria-pressed=/,
      `${page}: the toggle carries state in aria-pressed so its label can stay stable`,
    );
  }
});

test('the toggle is hidden when scripting is off', () => {
  // With no JS the site is simply light — which is also the default — so the
  // control would be a button that does nothing.
  assert.match(css, /html:not\(\.js\)\s+\.theme-toggle\s*\{[^}]*display:\s*none/);
});

test('the theme-color meta and both scripts agree with the stylesheet', () => {
  // Base.astro and Header.astro each hardcode the two canvas colours to keep
  // the browser chrome in step. They cannot read the stylesheet at runtime,
  // so this is the only place the agreement is enforced.
  for (const file of ['layouts/Base.astro', 'components/Header.astro']) {
    const astro = src(file);
    assert.ok(astro.includes(LIGHT_BG), `${file} does not carry the light --bg (${LIGHT_BG})`);
    assert.ok(astro.includes(DARK_BG), `${file} does not carry the dark --bg (${DARK_BG})`);
  }
  for (const page of PAGES) {
    assert.match(
      dist(page),
      new RegExp(`<meta name="theme-color" content="${LIGHT_BG}"`),
      `${page}: theme-color must ship as the LIGHT canvas — the head script corrects it for stored-dark visitors`,
    );
  }
});

test('no token is defined only in the dark block', () => {
  // A dark-only token silently resolves to nothing in the default theme —
  // the exact class of bug the light-first structure exists to prevent.
  const lightBlock = css.match(/\n:root \{([\s\S]*?)\n\}/)?.[1] ?? '';
  const darkBlock = css.match(/\n:root\[data-theme='dark'\] \{([\s\S]*?)\n\}/)?.[1] ?? '';
  for (const m of darkBlock.matchAll(/--([\w-]+):/g)) {
    assert.ok(
      lightBlock.includes(`--${m[1]}:`),
      `--${m[1]} is defined for dark but not for light, so the default theme cannot resolve it`,
    );
  }
});
