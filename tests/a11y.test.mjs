// Accessibility regressions that an adversarial audit actually found here.
//
// Every test below corresponds to a defect that shipped in this branch before
// review. They are pinned because each one is invisible in normal use: they only
// appear under reduced motion, with scripting off, in Safari's accessibility
// tree, or in a contrast meter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const dist = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');
const css = src('styles/global.css');
const index = src('pages/index.astro');
const PAGES = ['index.html', 'download/index.html', 'support/index.html', 'privacy/index.html'];

// --- Contrast ---------------------------------------------------------------

const lum = (hex) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Composite `fg` over `bg` at `alpha`, the way opacity actually renders. */
const over = (fg, bg, alpha) => {
  const mix = (i) => Math.round(
    parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha),
  );
  return '#' + [1, 3, 5].map((i) => mix(i).toString(16).padStart(2, '0')).join('');
};

const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  assert.ok(m, `token --${name} not found in global.css`);
  return m[1];
};

test('white text on the primary button clears AA at both ends of the gradient', () => {
  // --signal alone is 3.31:1 against white, which is why the gradient starts at
  // --signal-solid instead. Losing that distinction is a silent AA failure on
  // the most important control on the site.
  for (const name of ['signal-solid', 'signal-deep']) {
    const r = ratio(token(name), '#ffffff');
    assert.ok(r >= 4.5, `white on --${name} (${token(name)}) is ${r.toFixed(2)}:1, needs 4.5:1`);
  }
});

test('the primary button gradient does not use --signal', () => {
  assert.ok(
    !/--btn-bg:\s*linear-gradient\([^)]*var\(--signal\)/.test(css),
    '--signal is 3.31:1 against white. It may tint, glow and colour text, but it ' +
    'must never sit behind a white label — use --signal-solid.',
  );
});

test('the skip link clears AA', () => {
  // 17.76px at weight 600 is below the 18.66px large-text threshold, so this
  // needs the full 4.5:1 and not 3:1.
  const bg = css.match(/\.skip\s*\{[^}]*background:\s*var\(--([a-z-]+)\)/)?.[1];
  assert.ok(bg, 'could not read the skip link background');
  const r = ratio(token(bg), '#ffffff');
  assert.ok(r >= 4.5, `skip link is ${r.toFixed(2)}:1 on --${bg}`);
});

test('walkthrough steps are never dimmed below AA', () => {
  // Two of the three steps are non-current at any moment. Dimming them with
  // opacity started at 0.4 — body text at 2.13:1 — and the alpha that would
  // clear 4.5:1 for the aside's --text-mute is 0.90, by which point the effect
  // is invisible. The current step is marked with a coloured rule instead.
  //
  // If someone reintroduces opacity dimming, this makes them prove it is legible
  // for the DIMMEST colour in the block, not the brightest.
  const block = index.match(/\n    \.step \{([\s\S]*?)\n    \}/)?.[1] ?? '';
  const op = Number(block.match(/opacity:\s*([\d.]+)/)?.[1] ?? 1);
  assert.ok(op > 0, '.step opacity must not be 0');
  if (op === 1) return;
  for (const name of ['text-dim', 'text-mute']) {
    const r = ratio(over(token(name), token('void'), op), token('void'));
    assert.ok(
      r >= 4.5,
      `a non-current step renders --${name} at ${r.toFixed(2)}:1 (opacity ${op}); ` +
      `needs 4.5:1. Mark the current step without lowering the others' contrast.`,
    );
  }
});

// --- Reduced motion ---------------------------------------------------------

test('reduced motion restores everything the scroll engine would have restored', () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(block, 'no prefers-reduced-motion block in global.css');
  // The engine does not only animate — it also undims. Under reduced motion it
  // returns before the step observer exists, so nothing is ever marked current
  // and all three steps sat at 2.13:1 permanently.
  assert.match(block, /\.reveal\s*\{[^}]*opacity:\s*1/, 'must un-hide .reveal');
  assert.match(block, /\.step\s*\{[^}]*opacity:\s*1/, 'must un-dim .step');
});

test('reduced motion swaps the sticky column for the inline per-step art', () => {
  // Otherwise the pinned column never advances and a reader gets "Two screens.
  // One code." beside a Mac still showing "Ready to pair".
  const block = index.match(
    /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n  \}/,
  )?.[1];
  assert.ok(block, 'index.astro has no reduced-motion block');
  assert.match(block, /\.walk__stick\s*\{[^}]*display:\s*none/);
  assert.match(block, /\.step__art\s*\{[^}]*display:\s*block/);
});

test('forced-colors resets opacity, which it cannot override itself', () => {
  assert.match(
    css, /@media \(forced-colors: active\)\s*\{[^}]*opacity:\s*1/,
    'forced colours replace colour but never opacity, so a dimmed element stays ' +
    'dimmed inside the palette a user chose to guarantee contrast',
  );
});

// --- Failure modes ----------------------------------------------------------

test('content still appears if the reveal script never executes', () => {
  // `.js` is set inline in <head> and arms `opacity: 0`; a separate module
  // un-arms it. Those are two failure domains and only one gates the CSS, so a
  // module that 404s, is blocked, or throws leaves a blank page below the
  // header. The failsafe animation costs nothing when the observer works.
  assert.match(css, /\.reveal\s*\{[\s\S]*?animation:\s*reveal-failsafe/);
  assert.match(css, /@keyframes reveal-failsafe\s*\{[^}]*opacity:\s*1/);
});

test('the scroll engine can be torn down, not only started', () => {
  // A preference change used to re-run start() unconditionally, adding another
  // observer and another scroll/resize pair every time — 1 to 4 listeners after
  // three toggles — while never detaching the ones already running.
  assert.match(index, /new AbortController\(\)/);
  assert.match(index, /addEventListener\('scroll',[^)]*signal/);
  assert.match(index, /addEventListener\('resize',[^)]*signal/);
  assert.match(index, /revealIO\.disconnect\(\)/);
});

// --- Semantics --------------------------------------------------------------

test('every unstyled list keeps its role', () => {
  // Safari drops the list role — and the item count with it — as soon as
  // list-style is none. Chromium keeps it, so a Chrome-only audit misses this
  // entirely, and this site's whole audience is on Safari.
  for (const page of PAGES) {
    const root = parse(dist(page));
    for (const list of root.querySelectorAll('ul, ol')) {
      const cls = list.getAttribute('class') || '';
      if (!cls) continue;                       // plain markdown lists keep markers
      assert.equal(
        list.getAttribute('role'), 'list',
        `${page}: <${list.rawTagName} class="${cls}"> has list-style removed but no role="list"`,
      );
    }
  }
});

test('the skip link moves focus rather than only scrolling', () => {
  for (const page of PAGES) {
    const main = parse(dist(page)).querySelector('#main');
    assert.equal(
      main.getAttribute('tabindex'), '-1',
      `${page}: #main needs tabindex="-1" — without it the skip link scrolls but ` +
      `leaves focus on <body>, and VoiceOver's reading cursor does not follow`,
    );
  }
  assert.match(css, /#main\s*\{[^}]*scroll-margin-top/,
    'the landing point must clear the sticky header');
});

test('long unbreakable strings cannot be clipped beyond reach', () => {
  // overflow-x: clip removes the scrollbar that would otherwise expose them, so
  // a long URL or bundle id in the docs would be silently unreadable.
  assert.match(css, /\.doc[^{]*\{[^}]*overflow-wrap:\s*anywhere/);
});
