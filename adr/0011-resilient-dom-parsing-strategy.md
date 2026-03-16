# ADR-0011: Resilient DOM parsing — selector arrays, text fallbacks, no fragile single selectors

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

Amazon and Flipkart update their page layouts regularly. A single CSS selector that breaks on a DOM update silently causes the extension to stop working, with no user-visible error.

## Decision

All DOM parsing uses **arrays of selectors tried in priority order**, with **text-content fallbacks** when structural selectors fail.

### Amazon
All selectors are centralised in `src/parsers/amazon/selectors.ts`. Each entry is an array:

```typescript
export const SELECTORS = {
  review: {
    container: ['[data-hook="review"]', 'div.review'],
    rating:    ['[data-hook="review-star-rating"] .a-icon-alt', '.review-rating .a-icon-alt'],
    // ...
  }
};
```

When Amazon changes a class name, only `selectors.ts` needs updating — not every parser function.

### Flipkart
Flipkart uses React Native Web, which generates stability-varying class names (stable: `css-1rynq56`, `css-175oi2r`; unstable: `vQDoqR`, `v1zwn21k`). The approach:

1. **Try known class names first** (fast path).
2. **Fall back to stable RNW base classes** (`css-1rynq56`, `dir="auto"`).
3. **Fall back to structural heuristics** — e.g. find a `div.css-1rynq56` whose text starts with "Review for:" to locate review card containers.
4. **Fall back to text content patterns** — e.g. scan for elements containing date-like text or "Verified Buyer".

### Text-based histogram parsing
The star distribution histogram is extracted via regex from `textContent`, not from specific DOM nodes. The regex handles two Flipkart formats:
- **Compact** (reviews page): `1★2,0862★7213★1,6014★4,5965★12,377`
- **Spaced** (product page): `5 ★ 177  4 ★ 51 ...`

Text-based extraction is more resilient than structural selectors because text format changes less often than DOM structure.

## Key lesson: parseAverageRating fallback chain

`parseAverageRating` on Flipkart has three layers:
1. Legacy class selectors (`._3LWZlK` etc.) — works on older deployments
2. `findRatingsSection` text regex — works when histogram section is present
3. `a[href*="ratings-reviews-details-page"]` text — works on modern pages without a histogram section

Each layer was added when the previous one started failing on newly observed page layouts. The third layer was added after discovering that some product categories (e.g. electronics) show category-level ratings instead of a star histogram on the product page.

## Consequences

- Parser code is more verbose than a single-selector approach. This is acceptable — resilience matters more than brevity here.
- Text fallbacks are slower than direct selector queries (may scan many elements). Performance is acceptable because parsing runs once per page load on a small DOM subtree.
- When the extension breaks (a site update bypasses all fallbacks), the failure is silent — the panel shows "No distribution data available" or missing ratings rather than crashing. This is preferable to a broken page.
