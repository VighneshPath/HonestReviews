# ADR-0006: SiteAdapter interface for multi-site support

**Status:** Accepted
**Date:** 2026-Q1

---

## Context

The extension started as Amazon-only. Adding Flipkart support required deciding how to handle:

1. **Different DOM structures** — completely different HTML, class names, and page architectures.
2. **Different fetch strategies** — Amazon has per-star-tier filters; Flipkart has sort orders (MOST_HELPFUL, NEGATIVE, POSITIVE) instead.
3. **Different available signals** — Flipkart doesn't expose helpful vote counts or in-card images reliably; Amazon exposes all six quality signals.
4. **Different URL structures** — Flipkart reviews URLs must be extracted from the DOM (can't be constructed from the product URL alone).

Options:
- **Conditionals everywhere** (`if (isAmazon) ... else if (isFlipkart) ...`) — scales poorly, mixes concerns.
- **Adapter pattern** — each site provides an object implementing a common interface. The orchestration in `content.ts` calls the interface, not the site.

## Decision

Define a `SiteAdapter` interface in `content.ts`. `detectSite()` returns the correct adapter for the current URL, or `null` if the site isn't supported.

```typescript
interface SiteAdapter {
  parseProductPage: (doc: Document) => ProductPageData;
  parseReviewList:  (doc: Document) => ParsedReview[];
  fetchReviews:     (id: string, signal: AbortSignal, onPage: ...) => Promise<ParsedReview[]>;
  getReviewsFetchId: () => string | null;
  reviewContainerSelectors: string[];
  reviewSignals?: ReadonlySet<ReviewSignal>;  // defaults to ALL_SIGNALS
}
```

## reviewSignals — per-site signal normalization

Not all signals are extractable on every site. Flipkart product pages don't expose helpful vote counts or per-card photo counts reliably. If those signals are included in the score formula with a value of 0, every Flipkart review is penalised relative to Amazon reviews.

The fix: each adapter declares which signals it can produce. The quality scoring function (`scoreReview`) normalises to the max achievable with *those* signals. A Flipkart review scoring 80 on 4 available signals is genuinely comparable to an Amazon review scoring 80 on all 6.

Flipkart's signal set:
```typescript
reviewSignals: new Set<ReviewSignal>(['length', 'verified', 'recency', 'nuancedRating'])
```

## Adding a new site

1. Create `src/utils/<site>-url.ts` — URL matching and ID extraction.
2. Create `src/parsers/<site>/` — `product-page.ts`, `review-list.ts`, `review-fetcher.ts`.
3. Add a new adapter in `detectSite()` in `content.ts`.
4. Update `settings-relay.content.ts` matches array with the site's URL patterns.
5. Update the popup's `isProductPage` check if the popup shows per-site status.

## Consequences

- Each site is self-contained in `src/parsers/<site>/`. The orchestration layer (`content.ts`) never imports site-specific logic directly — it always goes through the adapter interface.
- `reviewSignals` is optional (defaults to `ALL_SIGNALS`). Amazon doesn't need to declare it explicitly.
- The adapter approach is not a plugin system — adapters are statically compiled in. Dynamic plugin loading is unnecessary given the small number of supported sites.
