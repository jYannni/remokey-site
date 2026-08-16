// Structural guarantees for the built HTML: the things that make the redesign
// safe rather than merely pretty. Each of these has already been a real defect
// in this codebase or is one bad edit away from being one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { parse } from 'node-html-parser';

const read = (p) => readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');
const PAGES = ['index.html', 'download/index.html', 'support/index.html', 'privacy/index.html'];
const dom = (p) => parse(read(p));

// --- Duplicate ids ---------------------------------------------------------

test('no page contains a duplicate id', () => {
  // The device mockups are inline SVGs carrying <clipPath> and <linearGradient>
  // definitions referenced by url(#id). The landing page renders the `control`
  // phone twice, and when both instances used id="scr-control" every reference
  // in the document resolved to the FIRST one — so the second phone was clipped
  // by a path positioned for the first. Phone.astro now suffixes a per-instance
  // counter; this is the test that keeps it that way.
  for (const page of PAGES) {
    const ids = dom(page).querySelectorAll('[id]').map((n) => n.getAttribute('id'));
    const seen = new Set(), dupes = new Set();
    for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
    assert.equal(
      dupes.size, 0,
      `${page} has duplicate ids: ${[...dupes].join(', ')}. Every url(#id) in ` +
      `the document resolves to the first match, so a duplicate silently ` +
      `mis-renders whichever element came second.`,
    );
  }
});

test('every internal url(#…) reference resolves on the same page', () => {
  for (const page of PAGES) {
    const html = read(page);
    const ids = new Set(dom(page).querySelectorAll('[id]').map((n) => n.getAttribute('id')));
    for (const m of html.matchAll(/url\(#([A-Za-z][\w.:-]*)\)/g)) {
      assert.ok(ids.has(m[1]), `${page} references url(#${m[1]}) but no such id exists`);
    }
  }
});

// --- Accessibility scaffolding --------------------------------------------

test('every page has exactly one h1', () => {
  for (const page of PAGES) {
    const h1s = dom(page).querySelectorAll('h1');
    assert.equal(h1s.length, 1, `${page} has ${h1s.length} <h1> elements, expected 1`);
  }
});

test('heading levels never skip on the way down', () => {
  for (const page of PAGES) {
    const levels = dom(page)
      .querySelectorAll('h1,h2,h3,h4,h5,h6')
      .map((n) => Number(n.rawTagName[1]));
    let prev = 0;
    for (const l of levels) {
      assert.ok(
        l <= prev + 1,
        `${page} jumps from h${prev} to h${l}. Screen-reader users navigate by ` +
        `heading level, and a skipped level reads as a missing section.`,
      );
      prev = l;
    }
  }
});

test('every page has a skip link pointing at the main landmark', () => {
  for (const page of PAGES) {
    const root = dom(page);
    const skip = root.querySelector('a.skip');
    assert.ok(skip, `${page} has no skip link`);
    const target = skip.getAttribute('href');
    assert.equal(target, '#main');
    assert.ok(root.querySelector('#main'), `${page} skip link targets #main, which does not exist`);
  }
});

test('every page has main, header and footer landmarks', () => {
  for (const page of PAGES) {
    const root = dom(page);
    for (const tag of ['main', 'header', 'footer']) {
      assert.ok(root.querySelector(tag), `${page} is missing <${tag}>`);
    }
  }
});

test('every decorative or informative svg is resolved one way or the other', () => {
  // An <svg> with neither role="img"+label nor aria-hidden is announced as an
  // unlabelled graphic. The device art carries a description; the glyphs are
  // decoration beside real text.
  for (const page of PAGES) {
    for (const svg of dom(page).querySelectorAll('svg')) {
      const hidden = svg.getAttribute('aria-hidden') === 'true';
      const labelled = svg.getAttribute('role') === 'img' &&
        (svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby'));
      assert.ok(
        hidden || labelled,
        `${page} has an <svg> that is neither aria-hidden nor role="img" with a label`,
      );
    }
  }
});

test('nested svgs inside a labelled svg do not each announce themselves', () => {
  // The glyph component renders its own <svg> inside the device mockups. If
  // those were also role="img", one phone would announce a dozen graphics.
  for (const page of PAGES) {
    for (const outer of dom(page).querySelectorAll('svg[role="img"]')) {
      for (const inner of outer.querySelectorAll('svg')) {
        assert.equal(
          inner.getAttribute('aria-hidden'), 'true',
          `${page}: an <svg> nested inside a labelled <svg> must be aria-hidden`,
        );
      }
    }
  }
});

test('every link has a discernible name', () => {
  for (const page of PAGES) {
    for (const a of dom(page).querySelectorAll('a')) {
      const name = (a.getAttribute('aria-label') || a.text || '').trim();
      assert.ok(
        name.length > 0,
        `${page} has a link with no text and no aria-label: ${a.toString().slice(0, 120)}`,
      );
    }
  }
});

// --- The no-JavaScript contract -------------------------------------------

test('the reveal animation cannot hide content when scripting is off', () => {
  // .reveal starts at opacity 0 and is un-hidden by an IntersectionObserver.
  // The `html:not(.js)` escape hatch is what stops a scripting-disabled browser
  // getting a blank page, and the `.js` class is set by an inline script in
  // <head> so it lands before first paint.
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(
    css, /html:not\(\.js\)\s+\.reveal\s*\{[^}]*opacity:\s*1/,
    'global.css must reset .reveal to opacity 1 when the .js class is absent',
  );
  for (const page of PAGES) {
    assert.match(
      read(page), /document\.documentElement\.classList\.add\('js'\)/,
      `${page} does not set the .js class inline in <head>`,
    );
  }
});

test('the walkthrough steps are readable when scripting is off', () => {
  // Non-current steps are dimmed to 0.4 opacity by the scroll engine's sibling
  // rule. With no JS nothing is ever marked current, so without this reset the
  // entire section sits permanently at unreadable contrast.
  const idx = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(idx, /html:not\(\.js\)\)?\s*\.step\s*\{[^}]*opacity:\s*1/);
});

// --- Weight ----------------------------------------------------------------

test('the landing page ships under 120 KB of HTML', () => {
  // Six inline device mockups is a lot of SVG. It compresses to roughly a tenth
  // of this, but an unbounded budget is how a page quietly becomes a megabyte.
  const bytes = statSync(new URL('../dist/index.html', import.meta.url)).size;
  assert.ok(bytes < 120_000, `dist/index.html is ${(bytes / 1024).toFixed(1)} KB`);
});

test('the display font ships as one file and under 60 KB', () => {
  const f = new URL('../dist/fonts/bricolage-grotesque-display.woff2', import.meta.url);
  assert.ok(existsSync(f), 'the self-hosted display font is missing from the build');
  const kb = statSync(f).size / 1024;
  assert.ok(kb < 60, `the font is ${kb.toFixed(1)} KB — re-check the instancer axes`);
});

test('the OFL licence ships beside the font', () => {
  // SIL OFL 1.1 requires the licence to travel with the font.
  assert.ok(existsSync(new URL('../dist/fonts/OFL.txt', import.meta.url)));
});

test('the social card is built at the size the meta tags promise', () => {
  const png = new URL('../public/og.png', import.meta.url);
  assert.ok(existsSync(png), 'public/og.png is missing — run `npm run og`');
  const buf = readFileSync(png);
  // PNG IHDR: width and height are big-endian uint32 at offsets 16 and 20.
  assert.equal(buf.readUInt32BE(16), 1200);
  assert.equal(buf.readUInt32BE(20), 630);
});
