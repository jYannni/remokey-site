import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations } from '../scripts/check-subresources.mjs';
import { readFileSync } from 'node:fs';

const fixture = (n) =>
  readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('anchor links to external sites are allowed', () => {
  assert.deepEqual(findViolations(fixture('clean.html'), 'clean.html'), []);
});

test('canonical link is not treated as a subresource', () => {
  const v = findViolations(fixture('clean.html'), 'clean.html');
  assert.ok(!v.some((x) => x.url.includes('remokey.app')));
});

test('external stylesheet and script are violations', () => {
  const v = findViolations(fixture('dirty.html'), 'dirty.html');
  assert.equal(v.length, 2);
  assert.ok(v.some((x) => x.url.includes('fonts.googleapis.com')));
  assert.ok(v.some((x) => x.url.includes('cdn.example.com')));
});
