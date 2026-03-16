# ADR-0012: Site registry and shared parser contracts

**Status:** Accepted
**Date:** 2026-Q1

---

## Context

After adding Flipkart, two problems appeared:

**1. Amazon types leaking into unrelated modules.**
`ParsedReview`, `ProductPageData`, and `StarDistribution` were defined inside `src/parsers/amazon/`. Flipkart parsers, stats modules, and UI components all imported these shared interfaces from the Amazon folder — a naming accident that misled contributors into thinking the types were Amazon-specific.

**2. Adding a site required edits in four separate files.**
`detectSite()` in `content.ts`, the `matches` array in `content.ts`, the `matches` array in `settings-relay.content.ts`, and `isProductPage` in `popup/main.ts`. These were scattered and there was no single authoritative list of supported sites.

## Decision

### Shared parser contracts

Define site-neutral interfaces in dedicated modules at the parser layer:

| File | Contents |
|------|----------|
| `src/parsers/review.ts` | `ParsedReview` interface |
| `src/parsers/product.ts` | `ProductPageData`, `StarDistribution` interfaces |

These modules describe *what the data is*, not *who produced it*. Both site parsers, all stats modules, and all components import from here. The Amazon and Flipkart parser files re-export these types for any legacy internal references.

**Why not `types.ts`?** A generic `types.ts` becomes a dumping ground — anything without an obvious home ends up there. Naming modules by the concept they describe (`review.ts`, `product.ts`) creates a bounded scope that resists growth.

### Site registry

Move site-specific wiring out of `content.ts` into a dedicated `src/sites/` directory:

```
src/sites/
├── adapter.ts   — SiteAdapter interface (previously inline in content.ts)
├── amazon.ts    — createAmazonAdapter(url): SiteAdapter | null
├── flipkart.ts  — createFlipkartAdapter(url): SiteAdapter | null
└── index.ts     — registry: SITE_FACTORIES[], detectSite(), isKnownProductPage(),
                   ALL_SITE_MATCHES; contains contributor guide
```

`content.ts` now imports only `{ detectSite, ALL_SITE_MATCHES }` from `sites/index.ts`. `background.ts` and `popup/main.ts` import only `{ isKnownProductPage }`. No file outside `src/sites/` imports an individual site module.

### isKnownProductPage

Extracted from per-site URL utils into `sites/index.ts` as a single function that delegates to `detectSite()`. Background script and popup both use it, so adding a new site automatically covers badge clearing and popup status — no additional changes.

## Alternatives rejected

**Barrel export from `src/parsers/index.ts`** — a barrel re-exports everything and creates the same implicit coupling. Consumers still depend on the whole parser layer rather than the specific contract they need.

**Keep types in `amazon/`** — the Amazon leakage problem is real: developers reading Flipkart code would see `import { ParsedReview } from '../amazon/review-list.js'` and reasonably conclude this was an Amazon-specific type.

## Consequences

- `ParsedReview`, `ProductPageData`, and `StarDistribution` are visibly site-agnostic. A new contributor writing a Walmart parser imports from `parsers/review.ts`, not `parsers/amazon/review-list.ts`.
- Adding a site requires edits to two files (`sites/index.ts`, `wxt.config.ts`) plus creating the new site's own files. The main orchestration files (`content.ts`, `background.ts`, `popup/main.ts`) require no changes.
- `SiteAdapter` has a discoverable home (`sites/adapter.ts`) rather than being buried inside the largest file in the codebase.
