# Site v2 — "daylight": decisions, assumptions, alternatives

**Date:** 2026-08-16
**Branch:** `feat/site-v2-light-redesign` (on top of `feat/site-redesign-scroll-narrative`, PR #1)
**Brief (owner's feedback on PR #1, paraphrased):** the scroll walkthrough works,
the fonts and device art are the right starting point — but the Mac does not
read as a Mac (pill menu bar, no Apple mark, no dock, generic wallpaper), the
dark blue-black scheme isn't landing, the copy is accurate but emotionless
("The Mac's over there. You're over here" is boring), the hero should open with
the phone beside the headline and fly it down to the Mac on scroll, the privacy
line-art says nothing, the 3×3 grid could be better, two spaces are missing on
/download, the solo-developer line on /support reads unprofessional, and the
site needs a light/dark mode **defaulting to light**. Bar: "wow everyone that
visits", not "entry-to-mid-level developer".

---

## 1. Verified before designing

- **macOS 14.0 is source-true, not documentation-true.** `Host/project.yml` in
  the app repo pins `deploymentTarget: "14.0"` (twice) and the platform floor
  `macOS: "14.0"`. The site's system requirement stays.
- The two missing spaces are an **Astro compiler behaviour**: whitespace
  between a text line and an element on the following line is collapsed.
  `index.astro` already worked around it once (`Confirm{' '}<em>`); the two
  download-page cases got the same treatment (single line + a comment naming
  the trap so the next person doesn't re-wrap them).

## 2. The theme system

**Light is the default for everyone.** `prefers-color-scheme` is deliberately
never consulted — the owner asked for "default to light", and a default that
depends on the visitor's OS is not a default. Dark exists only behind the
header toggle, persisted in `localStorage('rk-theme')`, applied by an inline
`<head>` script before first paint so a stored-dark visitor never flashes
light. `tests/theme.test.mjs` pins all of it: the no-media-query rule, the
inline bootstrap on every page, the toggle's aria contract, the
hidden-without-JS rule, the theme-color agreement between `global.css`,
`Base.astro` and `Header.astro`, and that no token exists only in the dark
block (which would silently fail to resolve in the default theme).

**Palette.** Warm porcelain paper (`#f4f1e9`), near-black ink, and the app
icon's signal blue kept as the only saturated colour in the system's own
voice — it is the product's colour, and severing it would orphan the icon.
The felt change comes from everything else: paper instead of void, warm
shadows, a dawn-orange note in the hero haze, and the colour-rich device art.
Two blues now, on purpose: `--signal` (art/glow only) and `--signal-ink`
(links and coloured type, AA on the canvas). Dark became warm charcoal
(`#111214`) instead of blue-black. Every text token in both palettes clears
4.5:1 and `tests/a11y.test.mjs` now checks **both** themes.

## 3. The Mac

The menu bar carries a hand-drawn Apple mark, Finder's real menu titles,
battery/Wi-Fi/Control Centre/clock status items, and the ReMoKey mark drawn in
the menu bar's foreground colour (it is template-rendered in the real app, so
near-black on a light menu bar is the *accurate* rendering — the old white was
only right for a dark bar). The desktop is an aurora built from gradients (no
SVG filters — five Macs render on the landing page), the Dock holds eight
hand-drawn stand-ins (Finder, Safari, Messages, Mail, Photos, Notes, Music,
System Settings) at the real 54 pt size, and the chassis is silver, because
that is what a MacBook is made of.

**Nothing is Apple's artwork.** Every icon and the Apple mark are drawn from
scratch to read as the idea at a glance — same policy as the SF-Symbol
stand-ins in `Glyph.astro`, and the footer's "Not affiliated with Apple Inc."
still applies. The notch HUD geometry is unchanged (it comes from
`NotchCardShape.swift`).

**The page-weight consequence.** Five desktops + seven phones pushed
`dist/index.html` past the 120 KB budget, and most of the growth was not art:
Astro stamps `data-astro-cid-*` onto every element of a component that carries
a scoped `<style>`, which for SVG components with hundreds of elements is tens
of KB of attributes for two CSS rules. `.mac`/`.phone` styles moved to
`global.css` (saving ~22 KB), and the budget rose to a still-bounded 160 KB
with the reasoning recorded in the test.

## 4. The hero journey

The phone opens beside the headline and flies down to meet the Mac; the Mac's
HUD flips from "Ready to pair" to "Connected" as it lands. Mechanics that
matter:

- **The landed position is the layout position.** The opening pose is only a
  transform, measured each resize from an empty anchor box beside the
  headline. No JS, reduced motion, and narrow viewports therefore render the
  finished composition with zero correction — the failure mode of a broken
  engine is a static, correct page.
- Progress is `scrollY / (scroll position at which the Mac centres)`, eased
  `(1-p)²` in the engine so the flight leaves the headline at full speed and
  settles into the landing. One custom property per frame, same
  rAF-coalesced listener as everything else.
- The Ready/Connected swap is two stacked Mac renders crossfaded by a class;
  "Connected" is the in-flow default so every degraded path tells the
  finished story.

Rejected: a sticky 200 vh hero (more runway, but it hijacks scroll length for
one effect and doubles the layout complexity the walkthrough already pays
for), and `animation-timeline: view()` (Firefox still gates it).

## 5. Sections

- **Capabilities → bento.** The trackpad is the product and earns a 4-of-6
  span with a cursor-path illustration; the keyboard card carries drawn
  keycaps; "Lock it from across the room" closes the grid full-width so no
  breakpoint leaves a hole (spans chosen per breakpoint; the reasoning sits
  in a comment above the grid CSS).
- **Privacy diagram.** The old arc-and-dot said nothing. The new one argues
  the section's claim: phone → Mac inside a dashed "Your Wi-Fi" boundary, an
  animated packet on the path (offset-path, with a static fallback and the
  global reduced-motion freeze), and the internet drawn as a ghost cloud that
  nothing reaches, captioned "not involved". Drawing the internet is the
  point — leaving it out would dodge the question the section answers.
- **Support** no longer names the team size; it promises what the owner can
  keep ("every message is read… allow a few days") without the solo framing.
- **OG card** regenerated for the light face with the new headline.

## 6. Copy

Headline: **"Across the room is close enough."** — it states the product's
promise as a feeling rather than a floor plan. The lede keeps the load-bearing
verified phrases (`trackpad`, `own Wi-Fi`; the mirroring disclaimer stays in
the capabilities section). No capability claim was added anywhere — the
source-verified constraint from round 1 still binds, and the CAPS comments
naming what the app does *not* do are untouched.

## 7. Review rounds

Six parallel critics (hero design, section design, Mac realism, a11y/motion,
copy, engineering correctness) reviewed the built branch against screenshots
and source; their findings and what was done with each are recorded below.

### Round 1 — what the critics found, and what was done

All six returned **needs-work**. Every blocker and important finding was fixed;
the two deliberate declines are recorded last.

**Fixed — blockers.**
- *Hero/Mac-realism critics (measured independently):* in the mid-flight and
  landed captures the phone's SVG `<text>` rendered at ~0.9× while the chrome
  stayed put — labels stamped across the dock circles. Root cause: the
  journey's per-frame near-identity `scale()` left Chromium rasterising text
  on a stale glyph raster. Fix: anchor and slot are now the same width so the
  flight is translate+rotate only, and the engine snaps `--jp` to exactly 0 at
  the end so the landed phone carries an identity transform. Re-captured
  clean.

**Fixed — important.**
- Safari's dock icon was a blank blue disc: all seven needle vertices sat on
  the x+y=54 line — two zero-area polygons. Redrawn with the waist offset
  perpendicular to the diagonal.
- The iPhone mockups had no iOS status bar (the app never hides it —
  grep-verified against `Phone/Sources`), leaving an orphaned camera dot.
  All three screens now carry 21:42 + signal/Wi-Fi/battery, which also gives
  the Dynamic Island its silhouette; the pairing screen gained its real
  Cancel action (`PairingView.swift:70`).
- The mobile hero stacked the devices with a gap, abandoning the overlap the
  code's own comments call load-bearing. The phone now stands in front of the
  Mac's lower-left at every width.
- The download page's header was accidentally centred (`.wrap` and a
  `max-width` on one element); nested properly, it aligns with the grid.
- The privacy diagram's "not involved" caption contradicted the update-check
  bullet beside it; now "never sees your input", which is the actual claim.
  Captions also sized up — 12px in a 560-unit viewBox rendered ~7px on phones.
- Light `--good` failed AA on the "Available" chip (3.84:1 over its own tint)
  behind a comment claiming otherwise. Darkened to #157635 and the a11y suite
  now pins `--good` and the chip tint in both themes.
- The no-JS desktop walkthrough froze a "Ready to pair" Mac beside steps 2–3
  with three empty viewports; it now mirrors the reduced-motion layout, and a
  test holds the two paths equivalent.
- The theme went stale on back/forward-cache restores; a `pageshow` handler
  re-applies the stored choice. The header hairline moved out of the landing
  page's engine into the header itself (it is state, not motion — it now works
  on every page and under reduced motion).
- Flipping reduced-motion mid-visit could strand the hero showing "Ready to
  pair" behind a landed phone; the reduced branch now clears the journey
  classes.
- The download page's meta description hard-coded the pre-launch status
  outside the `APP_STORE_URL` lever; now gated on it.
- Copy: "whole" appeared four times on the landing page (heading beside "The
  whole keyboard" card) — varied; "Get it on the App Store" was Google Play's
  idiom — now "Download on the App Store"; the "you can read it" privacy
  promise is cashed out; support's "the people who build" (plural) no longer
  contradicts privacy's "independent developer" (singular); duplicate "the
  moment you open it" varied; footer's straight apostrophe curled and the
  support address moved from "Get it" to "More", beside Support.
- The `.step` dimming guard matched only one indentation level; it now
  inspects every `.step` block. The offset-path packet's fallback genuinely
  freezes now (animation and cx/cy zeroing both live inside the `@supports`
  gate). Dark-theme hero glows raised (0.07→0.12, 0.13→0.17) so the
  atmosphere survives charcoal. The ~16rem close-to-footer void tightened
  from both sides. The hero pad gained a faint gesture trail (hero instance
  only — art in the site's cursor vocabulary, not a UI claim).

**Declined, deliberately.**
- *"Yanko's Mac / Yanko's iPhone" in the mockups:* kept. It is the owner's
  name on the owner's product, shipped that way in round 1; personas would
  read as stock art.
- *Copy critic's headline vote:* keep "Across the room is close enough." —
  unanimous with the author.

### Round 2 — verification

Three verifiers re-reviewed the fixed branch against fresh captures. Design
and engineering approved with every assigned fix independently confirmed
(including pixel-level checks that the landed phone's text artifact is gone
and greps that `--jsw`/`will-change` left no residue). The copy verifier
raised one blocker — introduced by round 1's own caption fix: the enlarged
privacy caption overran the 560-unit viewBox and the svg root clipped its
final word in both themes. Fixed by shortening and centring the caption under
the cloud ("The internet / gets none of it") and widening the viewBox to 584;
the un-clip was then *measured* at desktop and narrow widths, not eyeballed.
Its polish notes were also taken: the update-check bullet now names
updates.remokey.app (closing the "That address" antecedent), two stale
engine comments were corrected, and the packet's static fallback dot now
sits on the Bezier it claims to ride.

### Round 3 — Codex, on the PR

Codex's automatic review of PR #2 raised one P2: above the header's 21rem
glyph-only breakpoint, the restored wordmark plus three links plus the new
theme toggle overflowed the row, and the root's `overflow-x: clip` cut the
toggle off silently instead of scrolling. Measured true — and wider than
Codex's estimate (clipped from 337px to ~382px in a scrollbar-bearing
window). Fixed by extending the glyph-only range to 24rem; the boundary was
re-measured clean on both sides at 1px granularity. The re-review requested
with `@codex review` found nothing further, and CI stayed green on the fix.

## 8. Deliberately not done

- **No AI-generated video.** Round 1's reasoning holds (§2 of the previous
  decisions doc): it would depict an app that doesn't exist, and hosting it
  violates the no-third-party rule or bloats the repo. If the owner wants a
  hero video later, the honest asset is a real screen recording; prompt
  drafts for Higgsfield/Minimax were handed over separately for that
  decision.
- **PR #1's history untouched.** This branch stacks on
  `feat/site-redesign-scroll-narrative`; nothing was force-pushed.
