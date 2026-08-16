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

// The LIGHT palette from src/styles/global.css — the card is the site's
// default face, so it matches the default theme.
const BG = '#f4f1e9', LINE = '#e0dbcd';
const INK = '#1d1e20', DIM = '#4c5158', MUTE = '#63696f';
const SIGNAL_INK = '#2456c9', SIGNAL_SOLID = '#2f6fe0';
const DAWN = 'rgb(255,154,84)', HAZE = 'rgb(47,111,224)';

// Helvetica Neue is present on every macOS install, which is where this script
// is meant to run. If a glyph is missing the render still succeeds — it just
// falls back — so a wrong font shows up as an ugly card, never a failed build.
const SANS = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const MONO = 'SF Mono, Menlo, monospace';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="dawn" cx="86%" cy="12%" r="55%">
      <stop offset="0" stop-color="${DAWN}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${DAWN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="haze" cx="16%" cy="86%" r="60%">
      <stop offset="0" stop-color="${HAZE}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="${HAZE}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#141c52"/>
      <stop offset=".4" stop-color="#3b2e92"/>
      <stop offset=".7" stop-color="#8f4198"/>
      <stop offset="1" stop-color="#ec8a5c"/>
    </linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eceef2"/><stop offset="1" stop-color="#b7bcc6"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#dawn)"/>
  <rect width="${W}" height="${H}" fill="url(#haze)"/>

  <!-- The app mark: a key cap with waves rising out of it. -->
  <g transform="translate(72 62) scale(52)">
    <g fill="none" stroke="${SIGNAL_SOLID}" stroke-width="0.05" stroke-linecap="round">
      <path d="M 0.375 0.483 A 0.125 0.125 0 0 1 0.625 0.483"/>
      <path d="M 0.292 0.483 A 0.208 0.208 0 0 1 0.708 0.483" opacity="0.62"/>
      <path d="M 0.208 0.483 A 0.292 0.292 0 0 1 0.792 0.483" opacity="0.4"/>
    </g>
    <circle cx="0.5" cy="0.483" r="0.022" fill="${SIGNAL_SOLID}"/>
    <rect x="0.35" y="0.492" width="0.3" height="0.267" rx="0.067" fill="${SIGNAL_SOLID}"/>
  </g>
  <text x="140" y="98" font-family="${SANS}" font-size="34" font-weight="700"
        fill="${INK}" letter-spacing="-0.5">ReMoKey</text>

  <text x="72" y="262" font-family="${SANS}" font-size="66" font-weight="700"
        fill="${INK}" letter-spacing="-2.6">Across the room</text>
  <text x="72" y="340" font-family="${SANS}" font-size="66" font-weight="700"
        fill="${INK}" letter-spacing="-2.6">is <tspan fill="${SIGNAL_INK}">close enough</tspan>.</text>

  <text x="72" y="414" font-family="${SANS}" font-size="27" fill="${DIM}"
        letter-spacing="-0.3">Your iPhone becomes your Mac&#8217;s trackpad,</text>
  <text x="72" y="451" font-family="${SANS}" font-size="27" fill="${DIM}"
        letter-spacing="-0.3">keyboard and media remote. Over your own Wi-Fi.</text>

  <rect x="72" y="512" width="400" height="1" fill="${LINE}"/>
  <text x="72" y="552" font-family="${MONO}" font-size="18" fill="${MUTE}"
        letter-spacing="2.2">NO ACCOUNT &#183; NO CLOUD &#183; NO MIRRORING</text>

  <!-- Phone and MacBook, reduced to silhouettes. At the size this card is
       actually viewed, real UI would be an illegible smudge, and a smudge
       reads as a mistake rather than as detail. -->
  <g>
    <!-- MacBook: silver lid, aurora desktop -->
    <rect x="810" y="232" width="252" height="158" rx="12" fill="url(#lid)"/>
    <rect x="818" y="240" width="236" height="142" rx="7" fill="#0a0c10"/>
    <rect x="824" y="246" width="224" height="130" rx="4" fill="url(#wall)"/>
    <path d="M 788 390 H 1084 l -20 18 H 808 Z" fill="#c6cad2"/>
    <!-- Phone, dark, standing clear of the Mac -->
    <rect x="1080" y="262" width="94" height="188" rx="21" fill="#2a2c31"/>
    <rect x="1086" y="268" width="82" height="176" rx="16" fill="#0a0a0c"/>
    <rect x="1092" y="286" width="70" height="132" rx="9" fill="#1c1c1e"/>
    <rect x="1112" y="274" width="30" height="7" rx="3.5" fill="#000"/>
    <!-- The signal, phone to Mac -->
    <path d="M 1076 350 C 1068 342, 1062 338, 1054 332" fill="none" stroke="${SIGNAL_SOLID}"
          stroke-width="3" stroke-linecap="round"/>
    <circle cx="1065" cy="341" r="4.5" fill="${SIGNAL_SOLID}"/>
  </g>
</svg>`;

const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(out, png);
console.log(`Wrote ${out} — ${(png.length / 1024).toFixed(1)} KB`);
