import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations } from '../scripts/check-subresources.mjs';
import { readFileSync } from 'node:fs';

const fixture = (n) =>
  readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

const dirty = () => findViolations(fixture('dirty.html'), 'dirty.html');
const caught = (host) => dirty().some((x) => x.url.includes(host));

test('anchor links to external sites are allowed', () => {
  assert.deepEqual(findViolations(fixture('clean.html'), 'clean.html'), []);
});

test('canonical link is not treated as a subresource', () => {
  const v = findViolations(fixture('clean.html'), 'clean.html');
  assert.ok(!v.some((x) => x.url.includes('remokey.app')));
});

test('external stylesheet and script are violations', () => {
  const v = dirty();
  assert.equal(v.length, 9, `expected 9 violations, got ${v.length}: ${JSON.stringify(v)}`);
  assert.ok(v.some((x) => x.url.includes('fonts.googleapis.com')));
  assert.ok(v.some((x) => x.url.includes('cdn.example.com')));
});

// Each vector gets its own named assertion so a regression reports WHICH one broke
// rather than only that the total count moved.

test('protocol-relative script is a violation', () => {
  // The original `isExternal` returned early on '/', making the '//' clause dead
  // code — this exact URL shape was silently exempt.
  assert.ok(caught('cdn.protocolrelative.example'), 'protocol-relative URL not caught');
});

test('external url() in an inline style attribute is a violation', () => {
  assert.ok(caught('cdn.inlinestyle.example'), 'inline style attribute not scanned');
});

test('multi-valued rel containing stylesheet is a violation', () => {
  assert.ok(caught('cdn.multirel.example'), 'rel token list not matched');
});

test('external video poster is a violation', () => {
  assert.ok(caught('cdn.poster.example'), 'video poster not caught');
});

// An external subresource must be caught even when a LOCAL attribute precedes it on
// the same element — the `??` chain stopped at the first attribute present.

test('an external poster is caught even when src is local', () => {
  assert.ok(caught('cdn.localsrc.example'), 'local src shadowed the external poster');
});

test('an external imagesrcset is caught even when srcset is local', () => {
  assert.ok(caught('cdn.imagesrcset.example'), 'local srcset shadowed the external imagesrcset');
});

test('legacy xlink:href on <use> is a violation', () => {
  assert.ok(caught('cdn.xlink.example'), 'xlink:href not checked');
});

test('a local svg sprite reference is not a violation', () => {
  const v = findViolations(fixture('clean.html'), 'clean.html');
  assert.ok(!v.some((x) => x.url.includes('local-sprite')));
});

test('a relative url() in an inline style attribute is not a violation', () => {
  const v = findViolations(fixture('clean.html'), 'clean.html');
  assert.ok(!v.some((x) => x.url.includes('/img/x.png')));
});
