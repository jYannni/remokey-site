// Single source of truth. The support address also exists in the app repo at
// Packages/RemoteKeyboardKit/Sources/RemoteKeyboardKit/ReportDestination.swift
// and the two MUST match — that address is compiled into every shipped binary,
// so a mismatch means users mail an inbox nobody reads, with no error anywhere.

export const SITE_URL = 'https://remokey.app';
export const SUPPORT_EMAIL = 'support@remokey.app';
export const PRODUCT_NAME = 'ReMoKey';

// ---------------------------------------------------------------------------
// Release state
// ---------------------------------------------------------------------------

// The Mac version offered for download. NOT hardcoded into any page: every DMG
// link is built from this, and tests/download.test.mjs cross-checks it against
// the live appcast, so a stale value fails CI instead of quietly serving an old
// build to everyone who clicks Download.
//
// On a Mac release, bump this to match `sparkle:shortVersionString` in
// remokey-releases/appcast.xml. Nothing else needs to change.
export const MAC_VERSION = '1.2';

// Minimum macOS, from `sparkle:minimumSystemVersion` in the appcast and
// Host/project.yml. Minimum iOS is 18.0, from Phone/project.yml — iOS 18 runs
// on every device iOS 17 ran on, so this drops no hardware.
export const MAC_MIN_OS = '14.0';
export const IOS_MIN_OS = '18.0';

// The public releases repo. The DMG is served from a GitHub release asset — the
// same file the Sparkle enclosure points at, so a download and an in-app update
// can never be different bytes.
export const RELEASES_REPO = 'https://github.com/jYannni/remokey-releases';
export const RELEASES_TAG = 'downloads';

/** Absolute URL of the DMG for a given version. */
export const dmgUrl = (version = MAC_VERSION) =>
  `${RELEASES_REPO}/releases/download/${RELEASES_TAG}/ReMoKey-for-Mac-${version}.dmg`;

// ---------------------------------------------------------------------------
// The App Store gate
// ---------------------------------------------------------------------------

// VERIFIED 2026-08-16: itunes.apple.com/lookup?id=6794302075 returns
// resultCount: 0 and the store URL 404s. The iPhone app is NOT approved.
//
// Leave as null until it is live. Every App Store affordance on the site —
// the hero CTA, the download page's iPhone column, and the build-time QR code —
// reads this one value. Setting it to the real URL turns all of them on at
// once; nothing else needs editing.
//
// DO NOT set this to a guessed URL to "have it ready". A 404 behind a Download
// button is worse than an honest "not yet", and tests/appstore.test.mjs fails
// the build if this is set to anything that is not an apps.apple.com URL.
export const APP_STORE_URL = null;

// A PUBLIC TestFlight join link (https://testflight.apple.com/join/XXXXXXXX),
// if one is ever opened. Requires enabling public testing in App Store Connect,
// which is an account-settings change for the owner to make — it was not done
// on their behalf. Set it and a beta path appears beside the Mac download;
// leave it null and nothing references it.
export const TESTFLIGHT_URL = null;

/** True once a stranger can actually install the iPhone app. */
export const iphoneAvailable = () => APP_STORE_URL !== null || TESTFLIGHT_URL !== null;
