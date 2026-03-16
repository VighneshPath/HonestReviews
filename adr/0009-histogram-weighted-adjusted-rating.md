# ADR-0009: Histogram-weighted adjusted rating calculation

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

The adjusted rating recalculates the star average using only verified-purchase reviews. The naive approach — averaging the verified reviews in the sample — has a systematic flaw:

We fetch using a **stratified** strategy (one page per star tier). This means our sample always has roughly equal representation from each tier, regardless of the actual distribution. A product where 80% of real reviews are 5-star and 10% are 1-star will still contribute ~10 five-star and ~10 one-star reviews to our sample. A naive average of those samples would converge toward 3.0 (the midpoint), not the actual ~4.6 reality.

## Decision

Weight the verified-purchase rate per tier by the real histogram distribution.

**Algorithm:**

1. For each star tier (1–5): compute the verified-purchase rate from our sampled reviews.
   - e.g. 8 of 10 sampled 5-star reviews are verified → 80% verified rate for 5★
2. Weight each tier's verified rate by its actual histogram percentage.
   - If 65% of all reviews are 5-star, and 80% of those are verified:
   - Contribution: `5 × (65 × 0.80) = 260`
3. Divide the weighted sum by the total weight.

**Fallback**: if no histogram data is available (page hasn't loaded or fetch failed), fall back to a plain average of all verified reviews in the sample. This is less accurate but still directionally meaningful.

**Why this matters:**

| Scenario | Naive avg | Weighted avg |
|----------|-----------|-------------|
| Real product, mostly 5★ | ~3.0 (wrong) | ~4.3 (correct) |
| Inflated product | ~3.0 (coincidentally close) | Reflects actual tier distribution |
| Few reviews | ~3.0 | Falls back to plain average |

## Consequences

- The adjusted rating converges toward 1.0 or 5.0 for extreme distributions, not toward 3.0. This makes it useful as a reality-check number.
- The histogram must be available for accurate results. Flipkart's histogram is fetched from the product-reviews page; Amazon's is parsed from the product page. If both fail, the fallback plain average is shown with no delta.
- The delta (verified avg − official avg) is the primary signal. A delta of −1.2 is a strong indicator. A delta near 0 with high verified rate is a green flag.
