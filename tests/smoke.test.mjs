import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runChecks } from '../scripts/smoke.mjs';

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
  if (url.includes('appcast')) return ok('<rss>same</rss>');
  return ok('<html></html>');
};

test('passes when every page answers, redirects work, and the feeds agree', async () => {
  const { failures } = await runChecks({ fetchImpl: healthy });
  assert.deepEqual(failures, []);
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
