// Spec invariant 3: no third-party SUBRESOURCE on any page. A subresource is
// anything the browser fetches automatically on load — it leaks the visitor's IP
// to a third party without their consent, which would make /privacy false.
//
// Anchor hrefs are deliberately exempt: they transmit nothing until clicked.
// This is why the check parses rather than grepping for "https://".

import { parse } from 'node-html-parser';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// rel values that cause a fetch. `canonical` and `alternate` do not.
const FETCHING_REL = new Set([
  'stylesheet', 'preload', 'prefetch', 'preconnect', 'dns-prefetch',
  'icon', 'shortcut icon', 'apple-touch-icon', 'manifest', 'modulepreload',
]);

function isExternal(url) {
  if (!url) return false;
  const t = url.trim();
  if (t.startsWith('data:') || t.startsWith('#') || t.startsWith('/')) return false;
  if (t.startsWith('mailto:') || t.startsWith('tel:')) return false;
  return /^https?:\/\//i.test(t) || t.startsWith('//');
}

export function findViolations(html, file) {
  const root = parse(html);
  const out = [];
  const flag = (url, why) => { if (isExternal(url)) out.push({ file, url: url.trim(), why }); };

  root.querySelectorAll('script[src]').forEach((n) => flag(n.getAttribute('src'), 'script src'));
  root.querySelectorAll('img[src], iframe[src], video[src], audio[src], embed[src], source[src]')
      .forEach((n) => flag(n.getAttribute('src'), `${n.rawTagName} src`));
  root.querySelectorAll('object[data]').forEach((n) => flag(n.getAttribute('data'), 'object data'));

  root.querySelectorAll('link[href]').forEach((n) => {
    const rel = (n.getAttribute('rel') || '').toLowerCase().trim();
    if (FETCHING_REL.has(rel)) flag(n.getAttribute('href'), `link rel=${rel}`);
  });

  root.querySelectorAll('[srcset]').forEach((n) => {
    for (const part of (n.getAttribute('srcset') || '').split(',')) {
      flag(part.trim().split(/\s+/)[0], 'srcset');
    }
  });

  root.querySelectorAll('style').forEach((n) => flagCss(n.text, file, out));
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
if (import.meta.url === `file://${process.argv[1]}`) {
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
