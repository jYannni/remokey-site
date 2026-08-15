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

test('site URL has no trailing slash', () => {
  assert.equal(SITE_URL, 'https://remokey.app');
});
