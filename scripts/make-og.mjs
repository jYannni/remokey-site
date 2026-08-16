// Generates public/og.png — the 1200x630 card shown when a link to the site is
// pasted into a chat app or a social post.
//
// Run by hand (`npm run og`), and the PNG is COMMITTED, rather than generated
// during the build. The reason is font rendering: this rasterises through
// librsvg, which resolves font families against the fonts installed on the
// machine doing the rasterising. A macOS laptop and a GitHub Actions runner do
// not have the same fonts, so a build-time render would silently produce a
// different card in CI than the one that was designed and reviewed. Committing
// the output makes the artefact the reviewed one, always.
//
// Re-run it whenever the headline or the palette changes.

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 1200, H = 630;

// Sampled from the shipped app icon; see src/styles/global.css.
const VOID = '#08090c', SIGNAL = '#3e8bff', DEEP = '#1c4fd0';
const TEXT = '#e8ecf3', DIM = '#9aa5b4';

// Helvetica Neue is present on every macOS install, which is where this script
// is meant to run. If a glyph is missing the render still succeeds — it just
// falls back — so a wrong font shows up as an ugly card, never a failed build.
const SANS = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const MONO = 'SF Mono, Menlo, monospace';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="haze" cx="18%" cy="72%" r="62%">
      <stop offset="0" stop-color="${SIGNAL}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${SIGNAL}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="haze2" cx="86%" cy="14%" r="52%">
      <stop offset="0" stop-color="${DEEP}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${DEEP}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="key" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SIGNAL}"/>
      <stop offset="1" stop-color="${DEEP}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${VOID}"/>
  <rect width="${W}" height="${H}" fill="url(#haze)"/>
  <rect width="${W}" height="${H}" fill="url(#haze2)"/>

  <!-- The app mark: a key cap with waves rising out of it. -->
  <g transform="translate(72 62) scale(52)">
    <g fill="none" stroke="${SIGNAL}" stroke-width="0.05" stroke-linecap="round">
      <path d="M 0.375 0.483 A 0.125 0.125 0 0 1 0.625 0.483"/>
      <path d="M 0.292 0.483 A 0.208 0.208 0 0 1 0.708 0.483" opacity="0.62"/>
      <path d="M 0.208 0.483 A 0.292 0.292 0 0 1 0.792 0.483" opacity="0.4"/>
    </g>
    <circle cx="0.5" cy="0.483" r="0.022" fill="${SIGNAL}"/>
    <rect x="0.35" y="0.492" width="0.3" height="0.267" rx="0.067" fill="${SIGNAL}"/>
  </g>
  <text x="140" y="98" font-family="${SANS}" font-size="34" font-weight="700"
        fill="${TEXT}" letter-spacing="-0.5">ReMoKey</text>

  <text x="72" y="262" font-family="${SANS}" font-size="64" font-weight="700"
        fill="${TEXT}" letter-spacing="-2.6">The Mac&#8217;s over there.</text>
  <text x="72" y="338" font-family="${SANS}" font-size="64" font-weight="700"
        fill="${TEXT}" letter-spacing="-2.6">You&#8217;re over <tspan fill="${SIGNAL}">here</tspan>.</text>

  <text x="72" y="412" font-family="${SANS}" font-size="27" fill="${DIM}"
        letter-spacing="-0.3">Your iPhone becomes your Mac&#8217;s trackpad,</text>
  <text x="72" y="449" font-family="${SANS}" font-size="27" fill="${DIM}"
        letter-spacing="-0.3">keyboard and media remote. Over your own Wi-Fi.</text>

  <rect x="72" y="512" width="400" height="1" fill="#232935"/>
  <text x="72" y="552" font-family="${MONO}" font-size="18" fill="#7a8697"
        letter-spacing="2.2">NO ACCOUNT &#183; NO CLOUD &#183; NO MIRRORING</text>

  <!-- Phone and Mac, reduced to silhouettes. At the size this card is actually
       viewed, real UI would be an illegible smudge, and a smudge reads as a
       mistake rather than as detail. -->
  <g opacity="0.95">
    <!-- Mac -->
    <rect x="818" y="236" width="236" height="150" rx="12" fill="#151a22" stroke="#333c4b" stroke-width="2"/>
    <rect x="832" y="250" width="208" height="112" rx="6" fill="url(#key)" opacity="0.3"/>
    <path d="M 796 396 H 1076 l -18 16 H 814 Z" fill="#20252e"/>
    <!-- Phone, clear of the Mac and clear of the card edge -->
    <rect x="1076" y="268" width="92" height="184" rx="20" fill="#151a22" stroke="#333c4b" stroke-width="2"/>
    <rect x="1106" y="279" width="32" height="7" rx="3.5" fill="#0a0d13"/>
    <rect x="1086" y="298" width="72" height="140" rx="10" fill="#1c222b"/>
    <!-- The signal, phone to Mac -->
    <path d="M 1074 348 C 1068 340, 1064 336, 1058 332" fill="none" stroke="${SIGNAL}"
          stroke-width="3" stroke-linecap="round"/>
    <circle cx="1066" cy="340" r="4.5" fill="${SIGNAL}"/>
  </g>
</svg>`;

const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(out, png);
console.log(`Wrote ${out} — ${(png.length / 1024).toFixed(1)} KB`);
