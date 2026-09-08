# Framer sections to Payload blocks

Framer has no block model either. A published Framer page is a tree of positioned components — the
"sections" a visual editor perceives while building the page are a design-time convention, not a
structure that survives into the rendered output. Payload's page model is the opposite: a page is
an ordered list of typed blocks, each with its own fields. So, exactly as with any other visual
builder with no exported block schema, migrating page structure is not a translation — the block
model doesn't exist on the source side and has to be **derived** from the rendered page, then made
explicit on the target side.

The derivation runs in three stages: name the repeated section types across the site, record where
each one occurs, then compose every route as an ordered list of those occurrences with their field
values. This is the same discovery mechanism regardless of which visual builder produced the site,
because the problem it solves — a rendered DOM with no author-time structure attached — is the same
problem whether the source happens to be Framer or something else with no block API.

## How is a block type distinguished from a block instance?

A **block type** is the reusable definition: an id, a human name, a role, and an exemplar — one
route plus the node ids on that route that best show what this type looks like. It optionally
carries a confidence score, and optionally a collection key when the type exists to render items of
a collection.

A **block instance** is one appearance: the route it appears on, its node ids there, its role, a
short summary, and its boundary rect. Instances are stored sharded per route, so a page's structure
can be read without loading the whole site's.

The separation matters because a hero used on six pages must become one Payload block with six
instances, not six near-identical block definitions. The exemplar is what the component is authored
against; the instances are what fill it with per-page content.

Globals are treated as a closed set rather than discovered freely: exactly two names are allowed,
`header` and `footer`. Anything shared across pages that is not one of those stays a block.

Collection item pages — the CMS items identified by `collectionItemId` in the hydration payload, see
[Reading a Framer content model from a published site](read-framer-content-model-from-published-site.md)
— are decomposed differently again. Rather than a list of blocks, a collection gets a representative
item and a set of **sections**, each with an id, a role, a summary, node ids and a boundary. A
collection template is one layout reused across every item, so it is authored once against the
representative item.

## What does this become in Payload?

A `pages` collection with three fields — `title`, `slug`, and `layout`, a blocks field admitting
every discovered block type:

```ts
fields: [
  { name: "title", type: "text", required: true },
  { name: "slug", type: "text", required: true, unique: true, index: true },
  { name: "layout", type: "blocks", blocks: [/* every discovered block type */] },
];
```

Each CMS collection becomes its own Payload collection, grouped under `Content` in the admin, with
its first text field used as the document title and shown alongside `updatedAt` in the list view. Two
field-level rules are applied rather than inherited from the inference:

- **`slug` is always forced** to `text`, required, unique and indexed, whatever the inference
  produced. It is the field routing depends on, so it cannot be left to chance.
- **Relationship fields never carry `required`.** Seeding writes documents in an order that cannot
  guarantee a referenced document already exists, and a required relationship would make the seed
  fail on ordering rather than on data.

Each discovered block type is emitted as a Payload `Block` config with its own `interfaceName`,
registered in the page builder's blocks array, and paired with a generated React component under the
app's block registry — the component that renders it on the frontend is the same one Payload's admin
uses to preview it. Rich text fields inferred from a section's copy are authored against Payload's
Lexical dialect rather than plain strings, so the admin editing experience matches what an editor
would expect from a block with a heading and body copy.

## Source in this repository

- [`src/ir/discovery.ts`](../src/ir/discovery.ts) — block types, instances, globals, collection
  sections
- [`src/ir/layout.ts`](../src/ir/layout.ts) — the per-route composition record and unit kinds
- [`src/scripts/generate/steps/scaffold/collections.ts`](../src/scripts/generate/steps/scaffold/collections.ts)
  — the emitted `pages` and CMS collection configs
- [`src/scripts/generate/templates/app-frontend/catch-all-page.tsx.tpl`](../src/scripts/generate/templates/app-frontend/catch-all-page.tsx.tpl)
  — route resolution

## Related

- [Reading a Framer content model from a published site](read-framer-content-model-from-published-site.md)
  — where the routes and collections come from
- [Freezing a published site so the migration is verifiable](freeze-a-published-site-for-verifiable-migration.md)
  — what the anchor ids refer to
