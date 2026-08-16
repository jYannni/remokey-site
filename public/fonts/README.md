# Fonts

## `bricolage-grotesque-display.woff2`

**Bricolage Grotesque**, by Mathieu Triay / Atelier Triay.
Licensed under the **SIL Open Font License 1.1** — the full text is in
`OFL.txt` beside this file, as the licence requires.

Upstream: <https://github.com/ateliertriay/bricolage>

### Why it is self-hosted

`scripts/check-subresources.mjs` fails the build on any third-party subresource,
because one would leak visitor IPs and make `/privacy` false. A Google Fonts
`<link>` is exactly that. The file is served from our own origin instead.

### Why it is 40 KB and not 131 KB

The Google Fonts latin subset ships all three variable axes — optical size,
width and weight — at 131 KB. The site uses exactly one optical size and one
width, so the other two axes were pinned and only `wght` left live:

```
python -m fontTools.varLib.instancer \
  bricolage-grotesque-latin.woff2 \
  "opsz=48" "wdth=100" "wght=400:800" \
  --output bricolage-grotesque-display.woff2 --no-overlap-flag
```

That is a 70% saving on the single largest asset on the site.

`sha256: 988616ef92f1ed3f6df9d18dbd8d6f8f3d7ce5a82797973f191dd6414171fba5`

### If you need a wider weight range or another width

Re-run the instancer against the original subset rather than swapping in the
full three-axis file — and re-check the `size-adjust` / `ascent-override`
numbers on the `Bricolage Fallback` face in `src/styles/global.css`, which are
matched to *this* instance so the fallback does not reflow headlines on swap.

## Everything else

Body text and UI use the system stack, and technical labels use `ui-monospace`.
On macOS and iOS — which is the entire audience for this product — those resolve
to SF Pro and SF Mono, so the device mockups render in the *real* system font
rather than an approximation of it. That is an accuracy decision as much as an
aesthetic one, and it costs nothing to download.
