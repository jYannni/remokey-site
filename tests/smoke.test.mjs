import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runChecks } from '../scripts/smoke.mjs';
import { MAC_VERSION, dmgUrl } from '../src/config.mjs';

const ok = (body = '', status = 200, location = null) => ({
  status,
  text: async () => body,
  headers: { get: (h) => (h.toLowerCase() === 'location' ? location : null) },
});

// A stub of a fully healthy site. Each test overrides only the part it breaks,
// so a failure names one cause instead of a soup of them.
const healthy = async (url) => {
  if (url.startsWith('http://')) return ok('', 301, url.replace('http://', 'https://'));
  if (url.includes('www.')) return ok('', 301, 'https://remokey.app/');
  if (url.includes('support')) return ok('mail support@remokey.app');
  if (url.includes('appcast'))
    return ok(`<rss><sparkle:shortVersionString>${MAC_VERSION}</sparkle:shortVersionString></rss>`);
  if (url.endsWith('.dmg')) return ok('');
  return ok('<html></html>');
};

test('passes when every page answers, redirects work, and the feeds agree', async () => {
  const { failures } = await runChecks({ fetchImpl: healthy });
  assert.deepEqual(failures, []);
});

// Without this, deleting the page-status loop entirely leaves the suite green —
// found by mutating each check to a no-op and seeing which tests died. The loop
// is the one check nothing was holding in place.
test('fails when a page does not answer 200', async () => {
  const fetchImpl = async (url) =>
    url === 'https://remokey.app/privacy/' ? ok('', 404) : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(
    failures.some((f) => /privacy/.test(f) && /404/.test(f)),
    `expected a failure naming /privacy/ and 404, got: ${JSON.stringify(failures)}`
  );
});

test('fails when the support page omits the address', async () => {
  const fetchImpl = async (url) =>
    url.includes('support') && !url.includes('www.') && url.startsWith('https://')
      ? ok('nothing useful here')
      : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /support/);
});

test('fails when the two appcast URLs disagree', async () => {
  const fetchImpl = async (url) =>
    url.includes('raw.githubusercontent') ? ok('<rss>A</rss>')
    : url.includes('appcast') ? ok('<rss>B</rss>')
    : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(failures.some((f) => /appcast/i.test(f)));
});

test('fails when plain HTTP does not redirect to HTTPS', async () => {
  const fetchImpl = async (url) =>
    url.startsWith('http://') ? ok('<html></html>', 200) : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(failures.some((f) => /http/i.test(f) && /redirect/i.test(f)));
});

test('fails when www does not redirect to the apex', async () => {
  const fetchImpl = async (url) =>
    url.includes('www.') ? ok('<html></html>', 200) : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(failures.some((f) => /www/i.test(f)));
});

// --- Release drift ---------------------------------------------------------
//
// These two are the reason the download page can be trusted months after it was
// written. Nobody re-reads a marketing page after shipping, so the only thing
// standing between a release and a stale Download button is this check.

test('fails when the site offers an older version than the appcast publishes', async () => {
  const fetchImpl = async (url) =>
    url.includes('appcast')
      ? ok('<rss><sparkle:shortVersionString>9.9</sparkle:shortVersionString></rss>')
      : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(
    failures.some((f) => /MAC_VERSION/.test(f) && f.includes('9.9')),
    `expected a failure naming MAC_VERSION and the published version, got: ${JSON.stringify(failures)}`
  );
});

test('fails when the DMG the Download button points at does not exist', async () => {
  const fetchImpl = async (url) => (url.endsWith('.dmg') ? ok('', 404) : healthy(url));
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(
    failures.some((f) => /\.dmg/.test(f) && /404/.test(f)),
    `expected a failure naming the DMG and 404, got: ${JSON.stringify(failures)}`
  );
});

test('the download page is one of the pages checked for a 200', async () => {
  const fetchImpl = async (url) =>
    url === 'https://remokey.app/download/' ? ok('', 404) : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(
    failures.some((f) => /download/.test(f) && /404/.test(f)),
    `expected /download/ to be checked, got: ${JSON.stringify(failures)}`
  );
});

test('a mismatched appcast still surfaces alongside a version mismatch', async () => {
  // Both checks read the same feed body. An earlier revision consumed the
  // Response twice, which threw and silently dropped the second check.
  const fetchImpl = async (url) =>
    url.includes('raw.githubusercontent')
      ? ok('<rss>different</rss>')
      : url.includes('appcast')
        ? ok('<rss><sparkle:shortVersionString>9.9</sparkle:shortVersionString></rss>')
        : healthy(url);
  const { failures } = await runChecks({ fetchImpl });
  assert.ok(failures.some((f) => /appcast/i.test(f) && /disagree/.test(f)), 'appcast mismatch missing');
  assert.ok(failures.some((f) => /MAC_VERSION/.test(f)), 'version mismatch missing');
});
