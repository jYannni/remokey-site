// Live assertions against the deployed site. The appcast rows are the important
// ones: they re-prove on EVERY deploy that changing the apex DNS did not disturb
// updates.remokey.app, which is the only URL here with permanent consequences —
// SUFeedURL is compiled into every Mac bundle ever shipped and can never be
// redirected for installs that already exist.
//
// The appcast is compared against the raw.githubusercontent copy rather than a
// stored hash, because it changes legitimately on every Mac release — a pinned
// hash would fail on every release, and a check that cries wolf gets switched off.
// "Both URLs serve the same bytes" is the property that holds forever.

import { pathToFileURL } from 'node:url';
import { SUPPORT_EMAIL } from '../src/config.mjs';

const FEED = 'https://updates.remokey.app/appcast.xml';
const FEED_RAW =
  'https://raw.githubusercontent.com/jYannni/remokey-releases/main/appcast.xml';

export async function runChecks({ fetchImpl = fetch, base = 'https://remokey.app' } = {}) {
  const failures = [];
  const get = async (url) => {
    try { return await fetchImpl(url); }
    catch (e) { failures.push(`${url}: request failed — ${e.message}`); return null; }
  };

  for (const path of ['/', '/support/', '/privacy/']) {
    const r = await get(base + path);
    if (r && r.status !== 200) failures.push(`${path}: expected 200, got ${r.status}`);
  }

  const support = await get(base + '/support/');
  if (support && !(await support.text()).includes(SUPPORT_EMAIL)) {
    failures.push(`/support/: page does not contain ${SUPPORT_EMAIL}`);
  }

  // Redirects, checked with redirect:'manual' so the 301 itself is observable
  // rather than silently followed. `.app` is HSTS-preloaded, so a browser would
  // upgrade http:// on its own — but only after the first visit, and never for
  // curl or any non-browser client. The server-side redirect must exist.
  const redirect = async (url, wantHostFragment, label) => {
    let r;
    try { r = await fetchImpl(url, { redirect: 'manual' }); }
    catch (e) { failures.push(`${label}: request failed — ${e.message}`); return; }
    const loc = r.headers?.get?.('location') ?? '';
    if (r.status < 300 || r.status >= 400) {
      failures.push(`${label}: expected a 3xx redirect, got ${r.status}`);
    } else if (!loc.includes(wantHostFragment)) {
      failures.push(`${label}: redirects to "${loc}", expected it to contain "${wantHostFragment}"`);
    }
  };

  await redirect('http://remokey.app/', 'https://', 'http → https');
  await redirect('https://www.remokey.app/', 'remokey.app', 'www → apex');

  const [feed, raw] = await Promise.all([get(FEED), get(FEED_RAW)]);
  if (feed && feed.status !== 200) failures.push(`appcast: expected 200, got ${feed.status}`);
  if (feed && raw) {
    const [a, b] = [await feed.text(), await raw.text()];
    if (a !== b) {
      failures.push(
        'appcast: updates.remokey.app and raw.githubusercontent disagree — ' +
        'they are two views of one file, so this means the Pages deploy is stale ' +
        'or DNS has been disturbed'
      );
    }
  }

  return { failures };
}

// CLI entry: `node scripts/smoke.mjs`
// Same defect, same fix as scripts/check-subresources.mjs — the hand-built
// `file://${process.argv[1]}` comparison fails OPEN on any path containing a
// space, so the script would exit 0 having checked nothing. In CI that is a
// green tick for a check that never ran.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { failures } = await runChecks({});
  if (failures.length) {
    console.error('\nSmoke checks FAILED:\n');
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('All smoke checks passed.');
}
