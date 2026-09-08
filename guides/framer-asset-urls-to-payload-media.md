# Framer asset URLs to Payload media

The same image on a Framer site appears under several URLs: the original, plus one URL per
downscaled size the runtime requests depending on viewport and layout. Copying those URLs into a
Payload `media` collection one-for-one would give a single photograph several entries. Framer makes
the canonicalisation simpler than most source platforms, because every asset lives on one host and
variants are marked by a single query parameter — but it removes something a source platform
normally hands you for free: the original file name.

## Which URLs are the same asset?

Every Framer asset — image, video, or font — is served from one host, `framerusercontent.com`,
under `/images/<id>.<ext>`, `/assets/<id>.<ext>`, or `/sites/<siteId>/<id>.<ext>`. The `<id>` segment
is an opaque platform-generated string, not a slugified version of whatever the file was named when
it was uploaded.

Canonicalising a URL means dropping its query string entirely: for any Framer asset URL,
`?scale-down-to=…`, `?width=…&height=…`, or both together, contribute no identity — the path alone
determines which asset a URL points to.

## Which URLs are generated variants rather than assets?

A URL carrying `scale-down-to=512`, `scale-down-to=1024` or `scale-down-to=2048` is a downscaled
copy the runtime requests for a smaller viewport; the number is the target pixel dimension. A bare
`?width=&height=` with no `scale-down-to` is the original, and those two parameters simply report
its own intrinsic size — they do not select a different rendition.

```
framerusercontent.com/images/0LKC1Ii8jJl4rPH5OY56H6z4PUg.png?width=1024&height=683
  ← the original, carrying its own intrinsic size

framerusercontent.com/images/0LKC1Ii8jJl4rPH5OY56H6z4PUg.png?scale-down-to=512&width=1024&height=683
  ← a 512px-wide downscaled variant of the same original
```

The test is a single query-parameter check: `scale-down-to` present marks a variant, absent means
the URL already points at the original. Because canonicalisation drops the whole query string,
every `scale-down-to` variant of an id resolves to the exact same canonical URL as the original —
there is no suffix to strip and no separate lookup needed to fold a variant back onto its source.

## Where do asset references hide?

Scanning `<img src>` finds most images but not all of them, so references are collected from eight
places: `img-src`, `img-srcset`, `background-image`, `css-url`, `lightbox-json`, `video-urls`,
`poster-url`, `og-image`. Each candidate URL is filtered through `isVariant` before anything is
grouped, so a `srcset` listing five scaled copies of the same photo contributes zero references —
only the bare original, wherever it's referenced from, survives the filter. Alt text is collected
per reference too, and when the same canonical URL is referenced with different alt text on
different pages, the most frequent non-empty value is the one that's kept.

## Source in this repository

- [`src/adapters/framer/media-normalize.ts`](../src/adapters/framer/media-normalize.ts) — dropping
  the query string, the `scale-down-to` variant check, and naming a file from the id
- [`src/scripts/assets/steps/media/utils/build-media-assets.ts`](../src/scripts/assets/steps/media/utils/build-media-assets.ts)
  — grouping, download, and the media documents Payload ends up with
- [`src/ir/assets.ts`](../src/ir/assets.ts) — the asset record shape

## Related

- [Framer sections to Payload blocks](framer-sections-to-payload-blocks.md) — how fields point at
  media documents
