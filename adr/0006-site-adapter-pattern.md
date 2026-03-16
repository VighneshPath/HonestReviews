# ADR-0006: SiteAdapter interface and site registry

**Status:** Accepted
**Date:** 2026-Q1
**Supersedes:** (original version described SiteAdapter inline in content.ts; updated after ADR-0012)

---

## Context

The extension started as Amazon-only. Adding Flipkart support required deciding how to handle:

1. **Different DOM structures** — completely different HTML, class names, and page architectures.
2. **Different fetch strategies** — Amazon has per-star-tier filters; Flipkart uses sort orders (MOST_HELPFUL, NEGATIVE_FIRST, POSITIVE_FIRST) with no per-star filter.
3. **Different available signals** — Flipkart doesn't expose helpful vote counts or per-card image counts reliably. Amazon exposes all six quality signals.
4. **Different URL structures** — Flipkart review URLs must be extracted from the DOM (can't be constructed purely from the product URL).

Options considered:
- **Conditionals everywhere** (`if (isAmazon) ... else if (isFlipkart) ...`) — doesn't scale, mixes concerns.
- **Adapter pattern** — each site implements a common interface; the orchestration code calls the interface and never mentions a site by name.

## Decision

Define a `SiteAdapter` interface. Each site (Amazon, Flipkart, …) provides a factory function that returns an adapter or `null` if the URL isn't a match. A site registry in `src/sites/index.ts` holds the list of factories and exposes two public functions: `detectSite()` and `isKnownProductPage()`.

```
src/sites/
├── adapter.ts    — SiteAdapter interface definition
├── amazon.ts     — createAmazonAdapter(url) → SiteAdapter | null
├── flipkart.ts   — createFlipkartAdapter(url) → SiteAdapter | null
└── index.ts      — registry: SITE_FACTORIES[], detectSite(), isKnownProductPage(),
                    ALL_SITE_MATCHES
```

`content.ts`, `background.ts`, and `popup/main.ts` all import only from `src/sites/index.ts` — they never import individual site modules.

### SiteAdapter interface (src/sites/adapter.ts)

```typescript
interface SiteAdapter {
  parseProductPage:         (doc: Document) => ProductPageData;
  parseReviewList:          (doc: Document) => ParsedReview[];
  fetchReviews:             (id, signal, onPage) => Promise<ParsedReview[]>;
  getReviewsFetchId:        () => string | null;
  reviewContainerSelectors: string[];
  reviewSignals?:           ReadonlySet<ReviewSignal>; // defaults to ALL_SIGNALS
}
```

### reviewSignals — per-site quality normalisation

Not all signals are extractable on every site. Flipkart doesn't reliably expose helpful vote counts or per-card photo counts. If those signals were included with a forced value of 0, every Flipkart review would be penalised relative to Amazon reviews.

The fix: each adapter declares which signals it can produce. `scoreReview()` normalises to the max achievable with *those* signals, so a Flipkart review scoring 80/100 on 4 signals is genuinely comparable to an Amazon review scoring 80/100 on all 6.

Flipkart's declared signals:
```typescript
const FLIPKART_SIGNALS: ReadonlySet<ReviewSignal> = new Set([
  'length', 'verified', 'recency', 'nuancedRating',
]);
```

## Adding a new site

See `src/sites/index.ts` for the contributor guide comment at the top of the file. In brief:

1. Create `src/utils/<name>-url.ts` — URL detection and ID extraction.
2. Create `src/parsers/<name>/` — `product-page.ts`, `review-list.ts`, `review-fetcher.ts`.
3. Create `src/sites/<name>.ts` — implement `createXxxAdapter(url): SiteAdapter | null`.
4. Register in `src/sites/index.ts`: add to `SITE_FACTORIES` and `ALL_SITE_MATCHES`.
5. Add the new domain to `host_permissions` in `wxt.config.ts` (needed for background fetch).

`content.ts`, `background.ts`, and `popup/main.ts` require **no changes** — they consume `ALL_SITE_MATCHES` and `isKnownProductPage()` from the registry.

## Shared parser contracts

`ParsedReview` lives in `src/parsers/review.ts`. `ProductPageData` and `StarDistribution` live in `src/parsers/product.ts`. These are site-neutral — neither Amazon nor Flipkart "owns" them. Both site parsers import from these shared modules. Stats and components do the same. See ADR-0012.

## Consequences

- Each site is self-contained in `src/parsers/<site>/` and `src/sites/<site>.ts`. The orchestration layer never imports site-specific logic directly.
- `reviewSignals` is optional — Amazon omits it (defaults to ALL_SIGNALS).
- Adding a site touches at most two source files in the main codebase (sites/index.ts, wxt.config.ts), plus creating the new site's own files.
