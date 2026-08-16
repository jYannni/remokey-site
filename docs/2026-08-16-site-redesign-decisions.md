# Site redesign — decisions, assumptions, alternatives

**Date:** 2026-08-16
**Branch:** `feat/site-redesign-scroll-narrative`
**Brief:** the site covers the need-to-know but does not sell the app. Add a real
download path for the Mac DMG, a push to the App Store, and rebuild the landing
page as a modern scroll narrative walking a visitor from *connect* to *control*.

Written before the code, and left in the repo, because the author was asleep for
the whole build and every judgement call below was made without them. Anything
here marked **ASSUMPTION** is a place where a different answer would have changed
the work, and where reversing the decision is cheap and expected.

---

## 0. Where this work happened, and why not where it was asked for

The session opened in a `RemoteKeyboard` worktree. The site does not live there —
it is its own repo, `remokey-site`, deployed to GitHub Pages. Per the three-repo
split, `RemoteKeyboard` is app source (private), `remokey-releases` serves
`updates.remokey.app`, and `remokey-site` serves `remokey.app`.

All work is on `feat/site-redesign-scroll-narrative` in `~/Projects/remokey-site`.
Nothing in `RemoteKeyboard` was touched. That split exists precisely so the
marketing site can be redesigned without going near the Sparkle feed, and this
change respects it: **no file under `remokey-releases` was modified, and
`SUFeedURL` is not referenced by anything added here.**

---

## 1. The hard constraint that shaped everything

`scripts/check-subresources.mjs` fails the build on *any* third-party subresource,
because one would leak visitor IPs and make `/privacy` a false statement. CI
additionally re-runs the guard alone and asserts on its success output.

This is not a style preference to route around — it is the site's central
invariant, and it rules out, without appeal:

- Google Fonts / any CDN font
- externally hosted video, including anything an AI video tool would host
- analytics, tag managers, embedded players, hosted QR-code image APIs

Everything below is downstream of that rule. Every asset added in this change is
served from our own origin.

---

## 2. The animation: what was asked for, and what was built

**Asked for:** Apple-style scroll animations, or a video like the attached
Higgsfield reference, walking a visitor from connecting the phone to controlling
the Mac. Higgsfield MCP not yet set up ("do it yourself if useful"). Three free
Minimax video tokens available.

**Built:** a scroll-driven narrative in CSS and SVG, rendering the *real* app UI,
with no video file and no third-party anything.

### Why not AI-generated video (Higgsfield / Minimax)

Four reasons, in descending order of how much they mattered.

1. **It would show an app that does not exist.** A generative model has never
   seen ReMoKey. It would invent a plausible-looking phone UI and a plausible-looking
   Mac, and every frame would be a small lie on a page whose entire pitch is
   "no cloud, nothing hidden". The reference video sells a *polo shirt* — generative
   imagery is ideal there, because the shirt is the aesthetic. Here the product is
   a specific interface, and getting it wrong is worse than not showing it.
2. **Both tools need interactive auth this session could not perform.** Higgsfield
   MCP is not configured and OAuth cannot be completed non-interactively. Minimax's
   three tokens live behind the author's login. Neither was reachable while the
   author slept, and the brief was explicit: do not stop to ask.
3. **Hosting it would violate §1 or bloat the repo.** Third-party hosting is banned
   outright. Self-hosting means committing tens of megabytes to a public repo served
   by GitHub Pages, against a 100 GB/month bandwidth allowance and a 1 GB soft repo
   limit.
4. **Video is the wrong medium for this specific story.** The narrative is
   "input leaves the phone and arrives on the Mac". That is a *diagram*, and a
   diagram rendered as vector is sharper on every display, themes itself
   light/dark, weighs ~40 KB against ~40 MB, and is readable by a screen reader.

**The three tokens were deliberately left unspent.** They are worth more on a
real asset later — see §9.

### Why not a real screen recording

Genuinely the best long-term answer, and the design leaves a slot for it. Not
done now because it needs a physical iPhone paired to this Mac, a clean desktop,
and colour-managed capture of two devices at once — none of which can be arranged
while the author is asleep. A recording is also ~20-50 MB, so it needs a poster
frame and lazy loading to not regress the page. Deferred, not rejected.

### What the scroll engine actually is

One `requestAnimationFrame`-coalesced scroll listener writes a single custom
property, `--p` (0→1), onto each pinned section. All motion is pure CSS `calc()`
off that value. Reveals use `IntersectionObserver`.

| Option | Verdict |
|---|---|
| **rAF + one custom property** ✅ | Works in every browser including Firefox. ~2 KB. One listener, one style write per frame. Degrades to the finished state with JS off. |
| CSS `animation-timeline: view()` | Rejected *as the baseline*. Firefox stable still has it behind `layout.css.scroll-driven-animations.enabled` as of Firefox 152 (June 2026); ~84% global. Beautiful where it works, but the baseline cannot be "most people". Listed as a future enhancement — it is a drop-in upgrade behind `@supports`. |
| GSAP ScrollTrigger / Lenis / Framer Motion | Rejected. Runtime dependency, 30-90 KB, and smooth-scroll hijacking is an accessibility liability. The site has two dependencies today; it does not need a third for 40 lines of arithmetic. |

**Reduced motion is honoured properly.** `prefers-reduced-motion: reduce` does not
merely shorten the animations — the scroll listener never attaches, the pinned
sections un-pin into normal document flow, and every element renders in its final
state. That is the correct behaviour: a user who asked for no motion gets a
static page that still reads top-to-bottom, not a fast version of the same motion.

---

## 3. Visual direction

**Direction: "signal".** Deep graphite canvas, the app's own electric blue as the
only saturated colour, used consistently to mean *the signal travelling from
phone to Mac*. Hairline rules, monospace technical labels, large tight-tracked
display type. Precision instrument, not SaaS landing page.

The palette is **sampled from the shipped app icon**, not invented:

| Token | Value | Source |
|---|---|---|
| `--signal` | `#3E8BFF` | icon gradient, top |
| `--signal-deep` | `#1D50D1` | icon gradient, bottom |
| `--key-face` | `#F6F8FF` | the white key face |
| arc fade | `#FFFFFF` → `#B0C9F7` → `#82A9F2` | the three Wi-Fi arcs |

Sampling rather than inventing means the site, the App Store listing and the app
icon agree without anyone maintaining a mapping. The fading arcs also *are* the
signal metaphor already — the concept was taken from the icon, not imposed on it.

### Typography

- **Display:** Bricolage Grotesque (SIL OFL 1.1), self-hosted.
- **Body / UI:** the system stack. On a Mac or iPhone — which is the entire
  audience — that resolves to SF Pro, so the device mockups render in the *real*
  system font rather than an approximation of it. This is an accuracy decision as
  much as an aesthetic one.
- **Technical labels:** `ui-monospace` → SF Mono on Apple platforms. Same reasoning.

The font ships as **one 40 KB `.woff2`**, down from 131 KB, by pinning the optical-size
axis to 48 and width to 100 and keeping only `wght 400-800` live
(`fontTools.varLib.instancer`). `OFL.txt` sits beside it in `public/fonts/`, as
the licence requires. Provenance and the exact instancer invocation are recorded
in `public/fonts/README.md`.

Rejected: **Inter / Space Grotesk** (the default-choice look), a **system-only**
stack (accurate but voiceless at display sizes), and **Instrument Serif** (striking,
but an editorial serif contradicts the "Apple-style, sleek" brief).

---

## 4. The App Store push — gated, because the app is not approved

**Verified, not assumed:** `https://itunes.apple.com/lookup?id=6794302075` returns
`resultCount: 0` and the App Store URL 404s. The iPhone app is **not live**.

So the App Store call-to-action is driven by a single config value:

```js
// src/config.mjs
export const APP_STORE_URL = null;   // ← set this on approval; the whole site follows
```

- `null` → an honest "not on the App Store yet" state. No dead link, no fake button.
- a URL → the button, the QR code, and the download page's iPhone column all
  light up together, with no other edit anywhere.

`tests/appstore.test.mjs` asserts *both* branches, so the approved path is proven
to work before it is ever switched on.

**ASSUMPTION:** there is no public TestFlight link. TestFlight build 526 exists,
but a public join link requires enabling public testing in App Store Connect —
an account-settings change that is the author's to make, not something to do on
their behalf. `TESTFLIGHT_URL` is wired through exactly like `APP_STORE_URL`; set
it and a "Try the beta" path appears. If a public link already exists, that is a
one-line change.

### QR code

Generated **at build time** into inline SVG. No runtime library, no image request,
no third-party QR service (which would breach §1 and hand a visitor's interest in
the app to a stranger's server).

`qrcode` is added as a **devDependency** — it runs during the build and never
reaches a browser. Hand-rolling QR encoding means implementing Reed-Solomon error
correction and mask selection, which is a poor use of risk for a solved problem.

The QR is shown only on wide viewports. Scanning your own screen with the phone
in your hand is the point; on a phone it is noise, and the button is right there.

---

## 5. The DMG download — and the test I deliberately changed

`tests/pages.test.mjs` asserted that the landing page contains **no** `.dmg` link
and **no** `apps.apple.com` link, reasoning: *"no DMG link at launch — the Mac
host is useless without the iPhone app."*

That reasoning is sound and the brief overrides it. Both halves are now true at
once, so the assertion was **replaced, not deleted** — and replaced with something
stronger:

> **The invariant:** any page offering the Mac download must, on that same page,
> state the current status of the iPhone app.

A hardcoded "no DMG anywhere" test only holds until the day it has to be deleted,
and then it protects nothing. The invariant survives approval — it keeps holding
after `APP_STORE_URL` is set, when the wording changes from "not yet on the App
Store" to a live link. It encodes the *actual* worry (someone downloads a Mac app
that is half a pair and cannot use it) rather than a proxy for it.

Concretely the download page always shows two columns, Mac and iPhone, and the
iPhone column is never empty — it holds either the store link or an explicit
statement that the app is still in review, plus what that means for the Mac
download sitting next to it.

DMG links point at `remokey-releases` GitHub release assets, the same URLs the
Sparkle appcast enclosures use. The **version is not hardcoded**: it is read from
`src/config.mjs` (`MAC_VERSION = '1.2'`), and `tests/download.test.mjs` cross-checks
that value against the live appcast so a stale download link fails CI rather than
silently serving an old build.

---

## 6. Information architecture

| Route | State | Why |
|---|---|---|
| `/` | rebuilt | scroll narrative: Hero → Connect → Pair → Control → Private → Get it |
| `/download/` | **new** | Mac DMG + iPhone (gated). The page the brief was missing. |
| `/support/` | kept | already routes through the in-app reporter; only restyled |
| `/privacy/` | kept, unchanged prose | legal text. Restyled, **not reworded** — see below |

`/privacy/` prose is deliberately untouched. It is the document the App Store
review reads and the one `/support/` and the app both point at. Rewording it
during a visual redesign, with nobody awake to check, is a bad trade for zero
visual gain. Only the surrounding chrome changed.

**ASSUMPTION:** `/download/` is the right URL, over `/mac/` or `/get/`. It is
guessable, matches what people type, and is what the in-app "check for updates"
failure path would most plausibly send someone to. Renaming later costs a redirect.

---

## 7. Copy

All feature claims were checked against the shipped source before being written —
the site never claims a capability the app does not have today, and capabilities
that are gated behind a permission (Accessibility) or a host capability handshake
are described as such rather than as unconditional.

Where the source showed something as unverified or private-API, it is **not**
mentioned on the site at all. A marketing page is the wrong place to discover
that a feature is conditional.

---

## 8. Accessibility and performance targets

Held as hard requirements, not aspirations:

- Full keyboard operability; visible focus rings that survive the dark theme
- The narrative readable with **JavaScript disabled** — JS only adds motion
- `prefers-reduced-motion` fully honoured, per §2
- Real landmarks and heading order; the device art carries text alternatives, and
  purely decorative geometry is hidden from assistive tech
- Text contrast at WCAG AA against the graphite canvas
- No layout shift from the font (`font-display: swap` + preload + explicit fallback
  metrics)
- Total page weight target: **under 250 KB** including the font

---

## 9. Left undone, deliberately

1. **A real screen recording of the app in use.** The strongest possible asset and
   the one thing that would beat the vector narrative. Needs a physical phone and
   the author present. The hero has a slot sized for it.
2. **The three Minimax tokens, unspent.** Best future use is *not* a fake UI walkthrough
   but an atmospheric hero plate — a desk, a Mac, a phone — behind the real UI. That
   is the one job generative video does better than vector, because no accuracy claim
   rides on it.
3. **`APP_STORE_URL` / `TESTFLIGHT_URL` still `null`.** One-line changes on approval.
4. **`animation-timeline` upgrade** when Firefox unflags it. Drop-in behind `@supports`.
5. **The archived `jyannni.remokey.app` Pages site still serving 200.** Pre-existing,
   noted in project memory, out of scope here — it needs unarchive → delete Pages →
   re-archive.
