# ReMoKey site design system — "daylight"

**Canonical as of:** 2026-08-16, post PR #2. The source of truth for every
value is `src/styles/global.css`; this document is the source of truth for
*intent* — what each piece is for, what may touch what, and which test pins
which rule. When code and this document disagree, one of them is wrong on
purpose: fix the mismatch, don't route around it.

Who this is for: anyone (person or agent) adding a page, a section, or a
component without making the site read like two people built it.

---

## 1. Principles

1. **Precision instrument, not SaaS landing page.** Hairline rules, mono
   technical labels, large tight-tracked display type, one saturated colour.
   Restraint is the aesthetic; when in doubt, remove.
2. **The signal means one thing.** Blue is the signal travelling from phone
   to Mac — the app icon's colour. It is never decoration-for-variety.
3. **Honesty is a design constraint.** Every product claim is verified
   against the app source before it ships (see §9). The privacy diagram
   draws the internet *because* leaving it out would dodge the question.
4. **The degraded states are designed, not tolerated.** No-JS, reduced
   motion, and narrow viewports each render a finished composition — never a
   broken or half-initialised one. Anything motion adds, a static fallback
   must already say.
5. **Everything self-hosted.** `scripts/check-subresources.mjs` fails the
   build on any third-party subresource — fonts, scripts, images, video,
   anything. This is the privacy page's proof, not a style preference.

---

## 2. Colour

Light is the default for **everyone** — dark exists only behind the header
toggle, persisted in `localStorage('rk-theme')`, applied before first paint
by `Base.astro`'s inline head script. `prefers-color-scheme` is deliberately
never consulted (a default that depends on the visitor's OS is not a
default). `tests/theme.test.mjs` pins the whole contract, including that no
token exists only in the dark block.

### Tokens and roles

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#f4f1e9` | `#111214` | The canvas. Warm porcelain / warm charcoal — never pure white or blue-black. |
| `--card` | `#fdfcf8` | `#17181b` | Raised surfaces: cards, panes, buttons. |
| `--well` | `#ebe7db` | `#1e2024` | Recessed: hovers, code chips, art fills. |
| `--line` / `--line-lit` | `#e0dbcd` / `#cbc4b2` | `#26282d` / `#383b42` | Hairlines; `-lit` for borders that must read. |
| `--text` | `#1d1e20` | `#ecedef` | Headings, primary copy. |
| `--text-dim` | `#4c5158` | `#a6abb3` | Body copy in sections. |
| `--text-mute` | `#63696f` | `#878d96` | Captions, asides. **The floor** — nothing fainter carries real text. |
| `--signal` | `#3e8bff` | same | **Art and glow only. Never text on canvas.** |
| `--signal-ink` | `#2456c9` | `#5c9dff` | The only blue allowed to colour type: links, `.hl`, icon chips. |
| `--signal-solid` / `--signal-deep` | `#2f6fe0` / `#1c4fd0` | same | The primary-button gradient; the only surfaces carrying white text. |
| `--signal-haze` / `--signal-edge` | alpha washes | hotter alphas | Tints and focus edges. Dark runs hotter or the atmosphere vanishes into charcoal. |
| `--dawn` | warm orange wash | dimmer | The one warm note. Hero atmosphere only — never structural. |
| `--good` | `#157635` | `#35c759` | Affirmative. Sized for its worst case: 11px chip text over its own 9% tint. |

### The two-blues rule

`--signal` is vivid and fails AA on both canvases; `--signal-ink` is the one
that reads. If a blue will ever touch type, it is `--signal-ink` — even at
headline sizes where vivid would technically pass, because classes get
reused at body scale and nobody re-checks.

### Contrast (WCAG, measured — don't trust comments, run the numbers)

| Pair | Light | Dark |
|---|---|---|
| `--text` on `--bg` | 14.78 | 16.00 |
| `--text-dim` on `--bg` | 7.09 | 8.12 |
| `--text-mute` on `--bg` | 4.92 | 5.61 |
| `--signal-ink` on `--bg` | 5.73 | 6.89 |
| `--good` on `--bg` | 5.06 | 8.45 |
| white on `--signal-solid` / `--signal-deep` | 4.70 / 6.82 | same |

Every row is pinned in `tests/a11y.test.mjs` **for both themes**. A new text
token joins the pinned list in the same commit that introduces it.

### Rules

- Never define a token only in the dark block (test-pinned: it would fail to
  resolve in the default theme).
- The theme-color meta hexes are hardcoded in `Base.astro` and
  `Header.astro`; a test asserts they equal `--bg`. Change all three together.
- Prefer `color-mix(in srgb, var(--token) N%, transparent)` for tints over
  hand-baked rgb values — it survives a palette change.

---

## 3. Typography

| Face | Token | Use |
|---|---|---|
| Bricolage Grotesque | `--display` | Headings only. Self-hosted, instanced to <60 KB (test-pinned), OFL ships beside it. |
| System stack | `--body` | Everything else — it is what a Mac renders, which is the point. |
| System mono | `--mono` | `.label`, chips, technical metadata, diagram captions. |

Scale (fluid clamps; use the token, never a bare size): `--t-mega` (hero
only) → `--t-xl` (section h2) → `--t-lg` (step h3) → `--t-md` (card titles,
ledes) → `--t-body` → `--t-sm` (card body, asides) → `--t-xs` (labels,
legal). Headings track tighter as they grow (`-0.028em` base, `-0.042em` at
mega). `text-wrap: balance` on headings, `pretty` on paragraphs.

The `.label` primitive (mono, uppercase, 0.14em tracking, leading hairline)
opens every section. It is the system's metronome — do not invent a second
kind of eyebrow.

**Punctuation is typographic**: curly quotes and apostrophes in all rendered
copy (`’`), spaced em dashes, `·` for metadata separators. Straight quotes
survive only in code and `<title>`.

---

## 4. Space, layout, elevation

- **Wrap**: `--page: 78rem` max, `--gutter` fluid `1.25→2.5rem`. Text-only
  pages use `.wrap--text` (46rem). Everything aligns to the wrap edge — a
  block that is centred *as a box* while its text is left-ragged is a bug
  (that was the download-header defect).
- **Section rhythm**: `padding-block: clamp(4rem, 2rem + 7vw, 9rem)` between
  major sections, hairline `border-top` or `.rule` between them. Padding
  does not stack with the footer's margin — the closing section's bottom
  half is deliberately shallower.
- **Radii**: `--r-sm: 8px`, `--r-md: 14px`, `--r-lg: 22px` (cards, panes,
  bento). Pills use `999px`.
- **Shadows**: `--shadow-card` for surfaces, `--shadow-device` (filter) for
  device art. Both are warm-tinted in light and deepened in dark — never
  hand-roll a `box-shadow` on a new surface.
- **Overflow**: the root clips horizontally (`overflow-x: clip` on `html`
  and `body`). Consequence: anything that overflows is *silently cut off*,
  not scrollable — measure narrow layouts at 320–400px before shipping
  (the header toggle clipped for a 45px range and no test caught it; Codex
  did). Wide content scrolls inside `.scroll-x`, never the page.

---

## 5. Motion

One engine (in `index.astro`): an IntersectionObserver for `.reveal`s and a
single rAF-coalesced scroll handler for everything continuous. No motion
libraries — the site has two dependencies and does not need a third for
forty lines of arithmetic.

- **Easings**: `--ease` (general), `--ease-out` (entrances). No bounces.
- **Reveals**: add `.reveal` (+ optional `--reveal-delay`). Contract, all
  test-pinned: hidden state exists only under `html.js`; a CSS failsafe
  un-hides after 2s and is disarmed (`html.js-live`) only once the observer
  is genuinely attached; `html:not(.js)` shows everything.
- **Scroll-driven states** write one custom property or class per frame,
  computed in the engine, consumed by CSS `calc()`. The hero journey is the
  reference implementation — and its two hard-won rules apply to ALL future
  scroll motion:
  1. **The finished position is the layout position.** Motion is a transform
     *away from* the end state, so a dead engine renders the finished page.
  2. **Never scale SVG text per-frame.** A near-identity animated `scale()`
     leaves Chromium rasterising `<text>` on a stale glyph raster. Translate
     and rotate only; snap to identity at rest.
- **Reduced motion** is an opt-out, not a faster version: the engine never
  attaches, every element renders finished, and any layout that depends on
  the engine (sticky walkthrough) swaps for its static alternative. **No-JS
  gets the same swap** — the two paths kill the same engine and must give
  the same answer (test-pinned).
- **State is not motion.** Scroll-dependent *state* (the header hairline)
  lives outside the engine and works under reduced motion, on every page.

---

## 6. Components

| Component | File | Notes |
|---|---|---|
| Buttons | `global.css` `.btn` | Variants: `--primary` (signal gradient — the only white-on-blue surface), default (card), `--ghost`. 48px min height. `.btn__stack/__sub` for two-line labels. |
| Cards | `.card`, `.bcard` (bento) | Bento spans must fill every row at every breakpoint — a hole reads as a bug. Feature cards may carry inline SVG art (aria-hidden, tokens for colours so it themes). |
| Chips | `download.astro` `.chip` | Mono uppercase 11px. Colour via `color-mix` tints of a *pinned* text token. |
| Header | `Header.astro` | Sticky, translucent, hairline on `.is-stuck`. Owns the theme toggle (aria-pressed carries state; hidden without JS) and the bfcache `pageshow` re-apply. |
| StoreCta | `StoreCta.astro` | THE App Store gate. The invariant: a Mac download is never offered without the iPhone app's live status beside it (test-pinned). All of it reads `APP_STORE_URL` — one lever. |
| Footer | `Footer.astro` | Contact email lives under "More" beside Support. Restates requirements; keeps the Apple non-affiliation line. |
| QrCode | `QrCode.astro` | Build-time, self-hosted, quiet zone baked into the SVG. |

### Device art (`Mac.astro`, `Phone.astro`)

The mockups render the **real** app UI, drawn from the app's own geometry
(NotchCardShape, ContentView constants) on a **real-looking** device: the
Mac has the Apple mark, Finder's menus, status items, aurora wallpaper and
Dock; the phone has its iOS status bar. Rules:

- Everything Apple-shaped is hand-drawn approximation — never traced or
  redistributed artwork (same policy as `Glyph.astro`'s SF-Symbol stand-ins).
- The ReMoKey menu-bar mark is template-rendered: it takes the menu bar's
  foreground colour (dark on the light bar). Do not "fix" it to blue.
- Every instance suffixes its SVG ids with a `globalThis` counter — two
  same-page instances otherwise resolve each other's `url(#…)` refs
  (test-pinned: no duplicate ids, all refs resolve).
- Component styles live in `global.css`, NOT in a scoped `<style>` — Astro
  stamps `data-astro-cid-*` on every element of a styled component, which
  for SVG components is tens of KB (the page budget is test-pinned at
  160 KB, deliberate slack included).
- SVG text scales with the viewBox: set caption sizes by *rendered* px at
  the smallest render, and remember the svg root clips at the viewBox edge
  — measure, don't eyeball.
- Screens: Mac `hud` = `none|connecting|connected|ready|code`; Phone
  `screen` = `control|connect|pair`, plus `trail` (hero only). Device names
  say "Yanko's" on purpose — it is the owner's product.

### Iconography (`Glyph.astro`)

24×24 grid, 1.7 stroke, round caps/joins. Drawn from scratch to read as the
SF Symbol's *idea* — Apple's outlines are not redistributable as web assets.
New glyphs join the same file and match the optical weight.

---

## 7. Voice

The copy is precise, warm, and a little wry — it explains like an engineer
who likes you. Reference lines: "Nowhere. That's the feature." / "Not
reduced — absent." / "It feels like the glass came off a MacBook."

- Short declaratives. Concessions inverted into promises ("Across the room
  is close enough.").
- Say what the app *doesn't* do, on purpose, where a reader would wonder.
- No exclamation marks, no "simply/just/seamless/blazingly", no feature-list
  hype. If a sentence could open any SaaS page, cut it.
- Watch pet words across a page ("whole" shipped four times once).
- Apple's idiom where Apple's platform: "Download on the App Store".

**Hard constraints** (test-pinned): "trackpad", "own Wi-Fi", and "no screen
mirroring" must survive on the landing page; "PIN" is banned (the pairing
code is a *code*); no claim of brightness, pinch-zoom, mirroring, or
off-LAN control — the app does not do them.

---

## 8. Guard rails, and which test holds which rule

| Rule | Test |
|---|---|
| No third-party subresources | `check-subresources.mjs` (+ CI proves it ran) |
| Both palettes AA, chip tint, button gradient, skip link | `a11y.test.mjs` |
| Theme contract (light default, inline boot, toggle aria, meta agreement, no dark-only tokens) | `theme.test.mjs` |
| Reveal failsafe / js-live / no-JS / reduced-motion swaps | `a11y.test.mjs`, `structure.test.mjs` |
| Unique SVG ids, resolved refs, one h1, heading order, labelled SVGs, list roles | `structure.test.mjs` |
| Page ≤160 KB, font ≤60 KB + OFL, og.png 1200×630 | `structure.test.mjs` |
| App Store gate + pending-status invariant | `appstore.test.mjs` |
| DMG freshness vs live appcast | `download.test.mjs` |
| Landing claims (required + banned phrases) | `pages.test.mjs` |

The pattern to keep: when review finds a defect, the fix lands **with a test
that names the failure it prevents**, commented with the story. That is why
the suite reads like a history of near-misses — it is one.

## 9. Extending the system

Checklist for a new section/page/component:

1. Tokens only — no raw hex, no bare px font sizes, no hand-rolled shadows.
2. Check both themes (toggle it), 320px, no-JS, and reduced motion.
3. New text colour? Pin it in `a11y.test.mjs` for both themes, same commit.
4. New product claim? Verify it against the app source first, and note the
   verification in a comment like the `CAPS` array does.
5. Motion? Finished-position-is-layout-position, and no per-frame SVG text
   scaling. State that must survive reduced motion goes outside the engine.
6. Anything markdown-adjacent in Astro: whitespace between a text line and
   a next-line element collapses — keep phrase-critical spacing on one line.
7. Run `npm test` (100 tests) — and if you bounded something (budget, count,
   size), say why in the test.
