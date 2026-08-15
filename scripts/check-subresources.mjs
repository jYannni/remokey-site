// Spec invariant 3: no third-party SUBRESOURCE on any page. A subresource is
// anything the browser fetches automatically on load — it leaks the visitor's IP
// to a third party without their consent, which would make /privacy false.
//
// Anchor hrefs are deliberately exempt: they transmit nothing until clicked.
// This is why the check parses rather than grepping for "https://".

import { parse } from 'node-html-parser';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

// rel values that cause a fetch. `canonical` and `alternate` do not.
const FETCHING_REL = new Set([
  'stylesheet', 'preload', 'prefetch', 'preconnect', 'dns-prefetch',
  'icon', 'shortcut icon', 'apple-touch-icon', 'manifest', 'modulepreload',
]);

function isExternal(url) {
  if (!url) return false;
  const t = url.trim();
  // MUST precede the '/' check below: a protocol-relative URL starts with '/'
  // too, and the early return made this clause unreachable dead code.
  if (t.startsWith('//')) return true;
  if (t.startsWith('data:') || t.startsWith('#') || t.startsWith('/')) return false;
  if (t.startsWith('mailto:') || t.startsWith('tel:')) return false;
  return /^https?:\/\//i.test(t);
}

export function findViolations(html, file) {
  const root = parse(html);
  const out = [];
  const flag = (url, why) => { if (isExternal(url)) out.push({ file, url: url.trim(), why }); };

  root.querySelectorAll('script[src]').forEach((n) => flag(n.getAttribute('src'), 'script src'));
  // Select by tag, then check EVERY candidate attribute. An earlier revision used
  // `getAttribute('src') ?? getAttribute('poster') ?? getAttribute('href')`, which
  // stops at the first attribute present — so <video src="/local.mp4"
  // poster="https://cdn/evil.png"> was missed. That combination is the natural
  // authoring mistake, not an exotic one.
  //
  // Selected by bare tag name rather than `use[xlink\\:href]`: attribute selectors
  // containing a colon are a portability gamble across parsers, and checking the
  // attribute directly sidesteps it. `a` is deliberately absent — anchors transmit
  // nothing until clicked, and adding it here would block every App Store link.
  const SUBRESOURCE_ATTRS = ['src', 'poster', 'href', 'xlink:href', 'data'];
  root.querySelectorAll('img, iframe, video, audio, embed, source, track, input, use, object')
      .forEach((n) => {
        for (const attr of SUBRESOURCE_ATTRS) {
          const v = n.getAttribute(attr);
          if (v) flag(v, `${n.rawTagName} ${attr}`);
        }
      });

  root.querySelectorAll('link[href]').forEach((n) => {
    const rels = (n.getAttribute('rel') || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (rels.some((r) => FETCHING_REL.has(r))) {
      flag(n.getAttribute('href'), `link rel=${rels.join(' ')}`);
    }
  });

  root.querySelectorAll('[srcset], [imagesrcset]').forEach((n) => {
    for (const attr of ['srcset', 'imagesrcset']) {
      const raw = n.getAttribute(attr);
      if (!raw) continue;
      for (const part of raw.split(',')) flag(part.trim().split(/\s+/)[0], attr);
    }
  });

  root.querySelectorAll('style').forEach((n) => flagCss(n.text, file, out));
  // Inline style attributes: index.astro uses these heavily, so this is one
  // url() away from being a live vector, not a theoretical one.
  root.querySelectorAll('[style]').forEach((n) => flagCss(n.getAttribute('style') || '', file, out));
  return out;
}

export function flagCss(css, file, out = []) {
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)/gi)) {
    if (isExternal(m[1])) out.push({ file, url: m[1].trim(), why: 'css url()' });
  }
  for (const m of css.matchAll(/@import\s+['"]([^'"]+)/gi)) {
    if (isExternal(m[1])) out.push({ file, url: m[1].trim(), why: 'css @import' });
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

export function checkDir(dir) {
  const violations = [];
  for (const p of walk(dir)) {
    const rel = relative(dir, p);
    if (p.endsWith('.html')) violations.push(...findViolations(readFileSync(p, 'utf8'), rel));
    else if (p.endsWith('.css')) flagCss(readFileSync(p, 'utf8'), rel, violations);
  }
  return violations;
}

// CLI entry: `node scripts/check-subresources.mjs dist`
// The naive `file://${process.argv[1]}` comparison failed OPEN on any path with a
// space or non-ASCII character: the script exited 0 having checked nothing, and CI
// reported a pass. pathToFileURL percent-encodes the same way import.meta.url does.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? 'dist';
  const v = checkDir(dir);
  if (v.length) {
    console.error(`\nThird-party subresources found in ${dir}:\n`);
    for (const x of v) console.error(`  ${x.file}: ${x.url}  (${x.why})`);
    console.error(`\nThis would leak visitor IPs to a third party and make`);
    console.error(`https://remokey.app/privacy a false statement. Self-host it instead.\n`);
    process.exit(1);
  }
  console.log(`No third-party subresources in ${dir}.`);
}
