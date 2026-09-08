# Reading a Framer content model from a published site

A published Framer site tells you which of its pages are CMS collection items, which collection
each belongs to, and what each item's slug is — all from the hydration payload every page ships in
its HTML. No API token is needed, and none exists to ask for: Framer has no public content API for
a published site.

## How do you find every page?

Two sources, used in a fixed order of preference.

1. **The sitemap.** A published Framer site's `sitemap.xml` is complete — it lists every static
   route and every CMS item route the site publishes. Because of that completeness, the sitemap is
   the primary source of pages, not a fallback.
2. **Link breadth-first search**, starting from the entry URL, following same-origin anchors. This
   only runs when there is no sitemap to read. It is a fallback precisely because it is incomplete
   in a way the sitemap is not: a page reachable only through client-side navigation, or simply not
   linked from any crawled page, is invisible to it.

A third source narrows a gap neither of the above closes reliably: the **search-index endpoint**,
whose URL comes from the `<meta name="framer-search-index">` tag (see [Detecting Framer from a
published page](detect-framer-from-a-published-page.md)). Its JSON body's keys are the paths of
every CMS route the site publishes, including collection items that a sitemap omits or that link
BFS can't reach. When a sitemap exists, this endpoint still runs, and its paths are merged into the
crawl queue as a third source of pages.

## How do you tell a collection item page from a static page?

Every route Framer serves through its client runtime carries `data-framer-hydrate-v2` on its mount
node, whose JSON payload is the whole classification rule:

- **`collectionItemId` present** → the page is a CMS collection item. Absent → the page is static.
- **`routeId`** → the id of the collection (or static route) the page belongs to. On an item page,
  this is the collection key; pages sharing a `routeId` belong to the same collection.

That is the entire test — one field decides item-versus-static, and one more field says which
collection. There is no separate "collection" attribute or template marker to check, unlike source
platforms whose templates carry their own collection id on the page shell; here the collection
identity comes from the same hydration payload that made the page identifiable as Framer in the
first place.

A page whose HTML has no `data-framer-hydrate-v2` payload at all — meaning `routeId` cannot be
parsed out of it — is treated as unreachable rather than static: it is not part of this site's
Framer-rendered surface, so it is dropped from the crawl with a warning rather than misclassified.

## Where does the item's slug come from?

`pathVariables` in the same hydration payload is a small record of the route's dynamic segments —
for a route like `/blog/:slug`, it holds one entry. The **first value** in that record, regardless
of its key name, is taken as the item's slug. Framer does not name the parameter consistently across
collections, so reading it positionally rather than by key name is what makes the rule work
uniformly across every collection a site defines.

## How do collections fall out of that?

Group every item page by its `routeId`. Each group is one collection: the `routeId` is its key, and
its item count is however many item pages the crawl found carrying it. Two Framer-specific
wrinkles worth knowing:

- **Locale.** `localeId` rides along in the same payload. A localized site produces one hydration
  record per locale per item; the crawl does not collapse these on its own; a downstream phase does.
- **Route source matters for coverage, not classification.** Whether a page was found via the
  sitemap, link BFS, or the search index changes nothing about how it's classified — the
  `collectionItemId`/`routeId` rule applies identically regardless of how the crawler reached the
  page. Source is recorded for diagnostics only.

## What can't be recovered this way?

**Field names.** Framer's published output carries no field schema — no equivalent of a CMS
API response with named fields, no template metadata declaring "this collection has a `title` and a
`publishedAt`." What you get from crawling is a set of rendered items and the DOM each one produces.
The collection's fields — their names, types and which rendered nodes they came from — are inferred
from comparing those rendered items against each other, which is the job of the `discovery` and
`synth` phases, not this one. That inference is good enough to produce a working, typed Payload
collection, but it is an inference, not a recovery: a field Framer's editor named `heroSubtitle`
might come out as `subtitle` or `tagline` depending on what the rendered markup made legible.

## Source in this repository

- [`src/adapters/framer/hydrate.ts`](../src/adapters/framer/hydrate.ts) — parsing
  `data-framer-hydrate-v2` into `routeId`, `collectionItemId`, `pathVariables`, `localeId`
- [`src/adapters/framer/crawl.ts`](../src/adapters/framer/crawl.ts) — the sitemap-first crawl, the
  search-index merge, and the item-versus-static classification
- [`src/adapters/framer/searchindex.ts`](../src/adapters/framer/searchindex.ts) — parsing the
  search-index JSON into route paths

## Related

- [Detecting Framer from a published page](detect-framer-from-a-published-page.md) — the check that
  runs before this
- [Framer sections to Payload blocks](framer-sections-to-payload-blocks.md) — where these
  collections and routes end up
