# ADR-0008: Stratified review fetching strategy

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

A product page on Amazon or Flipkart shows ~8-10 reviews. To make the adjusted rating and quality scoring meaningful, more reviews are needed. But fetching all reviews is impractical:
- Amazon products can have 50,000+ reviews
- Fetching all would be slow, rate-limited, and wasteful
- The user is on the product page — the analysis needs to be fast

Simply fetching the first N pages gives the most-recent reviews, which are biased: they may not represent the overall reviewer population, and they miss low-star reviews that Amazon often buries.

## Decision

### Amazon: per-star-tier stratification

Fetch one page (~10 reviews) per star tier in order: **3★ → 4★ → 2★ → 1★ → 5★**

This order is deliberate:
- **3★ first** — the most nuanced, balanced reviews; most valuable for analysis
- **4★ and 2★ next** — moderately informative
- **1★ and 5★ last** — often extreme, less analytically useful for the adjusted rating

Amazon's review endpoint accepts `filterByStar=three_star` etc., so each page is a cross-section of that tier ranked by helpfulness within the tier.

Result: ~50 reviews covering the full rating spectrum with a bias toward nuanced, helpful reviews.

### Flipkart: sort-order pseudo-stratification

Flipkart has no per-star filter. Instead, use sort orders:
- **MOST_HELPFUL** — representative cross-section
- **NEGATIVE** — low-star reviews first (equivalent to Amazon's 1-star filter)
- **POSITIVE** — high-star reviews first

Result: ~30 reviews covering the spectrum. Less precise than Amazon's stratification but the best available given the API.

Additionally, the first page fetch (MOST_HELPFUL) doubles as the histogram source: the product-reviews page renders the full star count breakdown in its server-rendered HTML, which `parseHistogramFromText` extracts.

## Histogram salvage on parse failure

If `parseFlipkartReviewList` returns 0 cards (selector mismatch on a particular page layout), the fetcher still attempts to extract the histogram from the fetched page text before bailing. Distribution data is valuable even when individual review parsing fails.

## Consequences

- **Amazon**: the 5★ tier is fetched last. If the fetch is aborted early (e.g. user navigates away), the analysis skews slightly toward lower ratings. This is acceptable — the verified-rate calculation weights by the real histogram percentages, so a missing tier doesn't corrupt the final number, it just reduces sample size.
- **Flipkart**: ~30 reviews is a smaller sample. The quality scores and timeline analysis are less reliable on products with very few reviews (< 10 per sort order page).
- **No pagination within a tier**: fetching only the first page per tier means we see the highest-helpfulness reviews in each tier (Amazon's default within-tier ranking). This is intentional — helpful reviews are more representative than random ones.
