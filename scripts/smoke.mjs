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

import { existsSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SUPPORT_EMAIL, MAC_VERSION, dmgUrl } from '../src/config.mjs';

const FEED = 'https://updates.remokey.app/appcast.xml';
const FEED_RAW =
  'https://raw.githubusercontent.com/jYannni/remokey-releases/main/appcast.xml';

export async function runChecks({ fetchImpl = fetch, base = 'https://remokey.app' } = {}) {
  const failures = [];
  const get = async (url) => {
    try { return await fetchImpl(url); }
    catch (e) { failures.push(`${url}: request failed — ${e.message}`); return null; }
  };

  // Each page is fetched exactly once and its body retained. A real Response body
  // can only be consumed once, so reading it inside the loop is the correct shape
  // rather than merely the cheaper one — and fetching /support/ twice made a single
  // unreachable page report as two separate failures.
  const bodies = {};
  for (const path of ['/', '/download/', '/support/', '/privacy/']) {
    const r = await get(base + path);
    if (!r) continue;
    if (r.status !== 200) failures.push(`${path}: expected 200, got ${r.status}`);
    bodies[path] = await r.text();
  }

  if (bodies['/support/'] !== undefined && !bodies['/support/'].includes(SUPPORT_EMAIL)) {
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

  // The download page offers a specific DMG, built from MAC_VERSION. Nobody
  // re-reads a marketing page after shipping a release, so the way this goes
  // wrong is silent: months later the button still serves 1.2 while Sparkle has
  // been handing out 1.4, or the file was renamed and the button 404s. Both are
  // checked here rather than in the unit suite, because both need the network.
  const [feed, raw] = await Promise.all([get(FEED), get(FEED_RAW)]);
  if (feed && feed.status !== 200) failures.push(`appcast: expected 200, got ${feed.status}`);
  // Read once and retain: a Response body can only be consumed once, and the
  // version check below needs the same text the comparison uses.
  const feedText = feed ? await feed.text() : '';
  if (feed && raw) {
    const [a, b] = [feedText, await raw.text()];
    if (a !== b) {
      failures.push(
        'appcast: updates.remokey.app and raw.githubusercontent disagree — ' +
        'they are two views of one file, so this means the Pages deploy is stale ' +
        'or DNS has been disturbed'
      );
    }
  }

  if (feed && feed.status === 200) {
    const published = feedText.match(/<sparkle:shortVersionString>([^<]+)</)?.[1];
    if (!published) {
      failures.push('appcast: no sparkle:shortVersionString found — has the feed format changed?');
    } else if (published !== MAC_VERSION) {
      failures.push(
        `download: the site offers ReMoKey for Mac ${MAC_VERSION} but the appcast ` +
        `publishes ${published}. Bump MAC_VERSION in src/config.mjs — until then ` +
        `the Download button serves an older build than the in-app updater does.`
      );
    }
  }

  // A HEAD is enough, and GitHub answers release assets with a redirect to the
  // CDN, so anything below 400 after following it counts as present.
  try {
    const r = await fetchImpl(dmgUrl(), { method: 'HEAD' });
    if (r.status >= 400) {
      failures.push(`download: ${dmgUrl()} returned ${r.status} — the Download button is broken`);
    }
  } catch (e) {
    failures.push(`download: ${dmgUrl()} could not be reached — ${e.message}`);
  }

  return { failures };
}

// CLI entry: `node scripts/smoke.mjs`
// Direct-invocation check. Three ways this has already failed open, each exiting 0
// having checked nothing — the worst possible outcome for a guard, since CI reports
// a green tick: a hand-built `file://${argv[1]}` breaks on paths containing spaces;
// argv[1] is the raw path while import.meta.url is symlink-resolved, so any run
// through a symlink (macOS /var -> /private/var, most notably $TMPDIR) misses; and
// an absent argv[1] would throw.
//
// Kept byte-identical to the same block in scripts/check-subresources.mjs.
const entry = process.argv[1];
const entryHref = entry
  ? pathToFileURL(existsSync(entry) ? realpathSync(entry) : entry).href
  : null;

if (entryHref && import.meta.url === entryHref) {
  const { failures } = await runChecks({});
  if (failures.length) {
    console.error('\nSmoke checks FAILED:\n');
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('All smoke checks passed.');
}
