---
layout: ../layouts/Base.astro
title: Privacy — ReMoKey
description: ReMoKey has no servers, no accounts and no analytics.
---

# Privacy Policy — ReMoKey

**Last updated: 15 August 2026**

ReMoKey lets your iPhone act as a keyboard, trackpad and remote for your own Mac.

**ReMoKey has no servers, no accounts and no analytics.** Nothing you type, say or
do in the app is sent to us, and there is nowhere for it to be sent to. The one
exception is a problem report, which only ever leaves your device because you
wrote it and pressed send yourself — described below.

---

## What the app sends, and where

**Your iPhone talks only to your Mac.** The connection is made either over your
local network or to an address you type in yourself, and it is encrypted. It does
not pass through us or through anyone else. What travels over it is what you would
expect: keystrokes, pointer movement, the name you have given your iPhone, and —
so a button can wear the right icon — the names and icons of apps installed on
your Mac.

**Dictation never leaves your iPhone.** Speech recognition is forced to run
on-device. If your language has no on-device model downloaded, dictation refuses
to start rather than quietly sending your voice to Apple. This is deliberate: the
app types into your Mac, and what you dictate could be anything.

**The Mac app checks for updates.** It fetches a small file from
updates.remokey.app to see whether a newer version exists. That address is
hosted by GitHub, which therefore sees your IP address and the fact that a
request was made, as it would for any download. No information about you, your
Mac or your usage is included in that request. You can turn automatic checks
off in the Mac app.

Those are the only ways ReMoKey uses the network. There are no other services, no
advertising, no tracking and no third-party analytics of any kind.

---

## What is stored on your devices

Kept locally, and never transmitted to us:

- Which Macs you have paired with, and the credentials that let you reconnect
  (held in the system Keychain on your iPhone)
- Your settings — button layouts, macros, appearance, the name you gave your phone
- A diagnostic log, described next

Deleting the app removes all of it. Removing a Mac in ReMoKey deletes that Mac's
credentials from your iPhone and, when it can reach it, tells the Mac to forget
your iPhone too.

---

## The diagnostic log

Both apps keep a small local log so that a problem can be diagnosed if you choose
to report one. It is capped in size and old entries are discarded.

**It is built so that it cannot contain what you type.** Log entries are not free
text: each one is an event name plus a small number of typed values, and there is
no way for a keystroke, a dictated phrase or a password to be written into it.
Beyond that:

- Device and computer names are stored as a one-way digest, not as names
- Network addresses are reduced to a category — "local network", "VPN", and so on
  — never the address itself
- The pairing PIN, pairing credentials and the contents of anything you type are
  never recorded

The log stays on your device unless you send a report.

---

## Problem reports and feedback

If you choose to send a report, ReMoKey prepares one and hands it to **your own
email app**. You see the whole thing before anything happens, you can edit or
delete any of it, and nothing is sent unless you press send. It arrives from your
email address, so we see that address in the same way as any email you send.

A report contains what you wrote, the diagnostic log described above, and version
numbers for the app and operating system. If your iPhone is connected to your Mac
at the time, the Mac's log is included too; if it is not, the report says so and
is sent without it.

We use reports only to fix problems and decide what to build. We do not sell them,
share them or use them for advertising. They may be recorded in a private issue
tracker so the work can be followed through, and are kept only while they are
useful.

If you would rather not send diagnostics at all, you can email us directly instead.

---

## Children

ReMoKey is not directed at children and does not knowingly collect information
from anyone. It collects nothing from anybody.

---

## Your rights

Because we hold no accounts and receive nothing automatically, there is normally
no personal data of yours for us to hold, correct or delete.

If you have emailed us a report, that email is personal data, and under the UK and
EU GDPR you may ask us for a copy of it, ask us to correct it, or ask us to delete
it. Write to the address below and we will do so. The lawful basis for holding it
is our legitimate interest in supporting and improving the app; you gave it to us
by choosing to send it.

---

## Changes

If this policy changes, the date at the top changes with it, and the current
version always lives at this address.

---

## Contact

**[support@remokey.app](mailto:support@remokey.app)**

ReMoKey is made by an independent developer.
