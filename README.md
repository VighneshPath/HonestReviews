# Honest Reviews

> **No AI, no servers, just transparency.**

A browser extension that surfaces the data already embedded in Amazon product pages — star distribution patterns, verified purchase ratios, and review quality signals — so you can make better buying decisions.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why?

Fakespot shut down in July 2025. ReviewMeta is gone. The two biggest review analysis extensions are dead, leaving a gap filled by weak alternatives that use opaque AI to "detect fakes."

**Our angle is different.** We don't claim to detect fake reviews. We surface the data that's already there and let *you* decide.

**Zero server costs. Fully client-side. Open source. No affiliate links.**

---

## Installation

### Chrome / Chromium
1. Download the latest `honest-reviews-chrome-vX.Y.Z.zip` from [Releases](../../releases)
2. Unzip it
3. Go to `chrome://extensions` → enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the unzipped `chrome-mv3` folder

### Firefox
Coming soon.

### Development
```bash
git clone https://github.com/your-org/honest-reviews
cd honest-reviews
npm install
npm run dev          # Chrome with HMR
npm test             # Run all tests
```

---

## What the Panel Shows

### Overview Tab

#### Adjusted Rating
The official Amazon star rating counts all reviews equally — including unverified purchases, reviews from people who may have received the product for free, and one-line "great!" posts. The **Adjusted Rating** recalculates the average using only the verified purchase reviews we've analyzed.

> A product with a 4.3 official rating might have a 3.8 adjusted rating if most 5-star reviews are unverified.

#### Verified Purchase Ratio
What percentage of the reviews we analyzed are marked **Verified Purchase**. Low ratios (< 60%) suggest a significant portion of reviews may not come from actual buyers.

#### Rating Distribution
Visual histogram of 1–5 star percentages, sourced directly from Amazon's own histogram data (not estimated). Two patterns to watch:
- **Bimodal (J-curve)** — lots of 5-stars and 1-stars, few 3-stars. Often indicates polarizing quality or fake 5-star inflation.
- **Overwhelmingly positive** — 90%+ five-stars is unusual for most products and worth scrutinizing.

#### Review Burst Detection
Flags when an unusually high proportion of reviews arrived in a single month. A healthy product accumulates reviews steadily. A burst (e.g., "40% of all reviews posted in January 2024") is a signal of coordinated review campaigns — not proof, but worth noting.

---

### Sort & Filter Tab

This tab shows up to ~50 reviews fetched across all star levels, not just the 8–10 Amazon shows on the product page by default.

#### How the ~50 reviews are fetched

We fetch one page (~10 reviews) per star tier in this order: **3-star → 4-star → 2-star → 1-star → 5-star**. Within each tier, Amazon returns their "top reviews" (highest helpful-vote count). This gives you a stratified cross-section: the most useful critical reviews, the most useful positive reviews, and everything in between.

This is **not random** — it's Amazon's own ranking within each star level. The priority order (3-star first) ensures the most nuanced reviews are fetched first, even on slower connections.

---

#### Quality Score (0–100)

Every review gets a score estimating how useful it is to read. Higher = more worth your time.

| Component | Max Points | What it measures |
|-----------|-----------|-----------------|
| **Length** | 30 | Longer reviews tend to be more informative. Full score at 600+ characters. |
| **Helpful votes** | 25 | Other shoppers voted this review helpful. Full score at 20+ votes. |
| **Verified purchase** | 15 | Amazon confirmed this reviewer bought the product. |
| **Has photos** | 10 | Reviewer included images, suggesting firsthand experience. |
| **Recency** | 10 | Full score within 3 months. Products change; old reviews may not apply. |
| **Nuanced rating** | 10 | Bonus for 2–3 star reviews. These tend to be the most balanced and specific. |

**Color coding:**
- 🟢 **75–100** — High quality, read this one
- 🔵 **50–74** — Good signal
- 🟡 **25–49** — Moderate, skim it
- ⚫ **0–24** — Low signal (short, unverified, old, or unhelpful)

---

#### Sort Modes

| Mode | What it does |
|------|-------------|
| **Most Informative** *(default)* | Sorts by quality score. Surfaces long, helpful, verified reviews regardless of star rating. |
| **Most Helpful** | Sorts by helpful vote count — what other shoppers found most useful. |
| **Top Rated** | 5-star reviews first, then 4-star, etc. |
| **Critical** | 1-star reviews first. Good for finding dealbreakers. |
| **Most Recent** | Newest first. Useful for products that have changed over time. |

---

#### Filters

| Filter | What it does |
|--------|-------------|
| **Verified only** | Hides reviews not marked as Verified Purchase. Reduces noise from non-buyers. |
| **Has photos** | Shows only reviews that include images. Useful for fit/size/appearance products. |
| **Min body length** | Hides very short reviews. Set to e.g. 100 to skip "works great!" one-liners. |

---

## Privacy

- **No data leaves your browser.** All analysis runs locally.
- **No servers, no accounts, no tracking.**
- The extension makes same-origin requests to Amazon's own `/product-reviews/` page (using your existing Amazon session) to fetch additional reviews. No third-party requests.

---

## Project Structure

```
src/
├── entrypoints/        # WXT entry points (content script, popup)
├── parsers/amazon/     # DOM parsing — all selectors in selectors.ts
├── stats/              # Pure statistical functions (no DOM)
│   ├── adjusted-rating.ts
│   ├── distribution-analysis.ts
│   ├── review-quality.ts   ← quality score formula
│   ├── review-sorter.ts
│   └── timeline-analysis.ts
├── components/         # Lit web components (Shadow DOM)
└── utils/              # URL matching
tests/
├── unit/               # Vitest unit tests (91 tests, ~1s)
└── fixtures/           # Saved HTML snapshots
```

---

## Limitations

- **Review count**: We analyze ~50 reviews (one page per star tier). Products with thousands of reviews may not be fully represented.
- **Language**: Optimized for English. Date parsing may fail for non-English locales.
- **Amazon locale changes**: Amazon occasionally changes their DOM. If something breaks, the fix is in [`selectors.ts`](src/parsers/amazon/selectors.ts).
- **Fake review detection**: We don't do this. Genuine fake detection requires ML and historical data neither we nor you have access to. What we offer instead is transparency into what the data shows.

---

## Contributing

PRs welcome. Most impactful:

1. **Selector updates** — when Amazon changes their DOM, update `src/parsers/amazon/selectors.ts`
2. **More locales** — test on non-.in/.com Amazon sites, fix date parsing
3. **Quality formula tuning** — improve `src/stats/review-quality.ts`

Run `npm test` before submitting.

---

## License

MIT — see [LICENSE](LICENSE)
