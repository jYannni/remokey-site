import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORT_EMAIL, SITE_URL } from '../src/config.mjs';

test('support address is not a placeholder', () => {
  assert.ok(
    !SUPPORT_EMAIL.includes('example.com'),
    `SUPPORT_EMAIL is still a placeholder: ${SUPPORT_EMAIL}`
  );
});

test('support address is on our own domain', () => {
  assert.match(
    SUPPORT_EMAIL,
    /^[^@\s]+@remokey\.app$/,
    `SUPPORT_EMAIL must be an @remokey.app address, got: ${SUPPORT_EMAIL}`
  );
});

// Pinned to the exact literal, not just the domain. The regex above would accept
// help@remokey.app while the app repo still compiled support@remokey.app, and both
// suites would stay green while the two drifted — which is precisely the failure this
// cross-repo contract exists to prevent. Task 12 pins the Swift side to the same
// literal, so changing the address deliberately costs four edits across two repos.
// That friction is correct for a value baked into every binary ever shipped.
test('support address matches the literal the app compiles in', () => {
  assert.equal(
    SUPPORT_EMAIL,
    'support@remokey.app',
    'Must equal ReportDestination.address in the RemoteKeyboard repo, which is ' +
    'still the unset placeholder remokey+reports@example.com — do NOT copy that ' +
    'value here. Task 12 sets the Swift side to support@remokey.app once the ' +
    'mailbox is confirmed receiving. If you are deliberately changing the support ' +
    'address, change it in BOTH repos and in both tests.'
  );
});

test('site URL is the canonical apex origin', () => {
  assert.equal(
    SITE_URL,
    'https://remokey.app',
    'Astro derives canonical URLs from this. It must be the apex origin with no ' +
    'trailing slash, no www, and no path.'
  );
});
