# ADR-0010: Six-signal review quality score, normalised per site

**Status:** Accepted
**Date:** 2026-Q1

---

## Context

The "Most Informative" sort and the quality badge (0–100) needed a scoring formula. The goal is to surface reviews that are *useful to read*, not just the most recent 5-star reviews.

## Decision

Score each review on six independent signals, then normalise to 0–100 based on which signals are available for the current site.

| Signal | Max weight | Rationale |
|--------|-----------|-----------|
| `length` | 30 | Longer reviews contain more specific detail. Full score at 600+ chars. |
| `helpfulVotes` | 25 | Other shoppers validated it as useful. Full score at 20+ votes. |
| `verified` | 15 | Binary — Amazon/Flipkart confirmed the reviewer bought the product. |
| `hasImages` | 10 | Photos indicate firsthand experience, harder to fake. |
| `recency` | 10 | Full within 3 months; decays to 0 beyond 2 years. Products change. |
| `nuancedRating` | 10 | Bonus for 2–3 star reviews — statistically the most balanced and specific. |

**Normalisation formula:**
```
total = (rawScore / maxPossible) × 100
```
where `maxPossible` is the sum of weights for signals *available on this site*.

**Why normalise?** If Flipkart doesn't expose helpful votes or per-card images, those signals contribute 0 to `rawScore` *and* are excluded from `maxPossible`. A Flipkart review scoring 80 on its 4 available signals (max 65 pts) is genuinely comparable to an Amazon review scoring 80 on all 6.

## Why `nuancedRating` gets a bonus

2- and 3-star reviews are systematically underweighted by most sort algorithms (Amazon default sorts by helpfulness which correlates with 5-star reviews). Research on review usefulness consistently shows that moderate-rating reviews contain the most specific, actionable information — they praise specific strengths and note specific weaknesses. A 2-star review that explains exactly what broke is more useful than a 5-star "great product!" review.

## Tier labels

| Score | Label | CSS class |
|-------|-------|-----------|
| 75–100 | High Quality | `high` (green) |
| 50–74 | Good | `mid` (blue) |
| 25–49 | Moderate | `low` (yellow) |
| 0–24 | Low Signal | `minimal` (gray) |

## Consequences

- The formula is subjective. The weights encode opinions about what makes a review useful. Contributions to `review-quality.ts` that change weights should include a rationale.
- A verified 600-char review with 20+ helpful votes and a photo scores 100 regardless of star rating. This is intentional — usefulness is orthogonal to whether the reviewer liked the product.
- The `nuancedRating` bonus means 2–3 star reviews will often appear first in "Most Informative" sort, which is the desired behaviour.
