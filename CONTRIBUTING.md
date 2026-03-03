# Contributing to Honest Reviews

Thanks for wanting to help! This project has a focused scope — contributions that stay within that scope are most welcome.

---

## Project philosophy

- **No server dependency** — everything runs client-side. Don't add API calls to external services.
- **No fake detection claims** — we surface data, not verdicts. Don't add phrasing like "this product has fake reviews."
- **No affiliate links** — this is the brand. Hard line.
- **Minimal permissions** — the extension asks for very little. Keep it that way.

---

## Getting started

```bash
git clone https://github.com/VighneshPath/HonestReviews
cd honest-reviews
npm install
npm run dev        # Chrome with HMR
npm test           # Run all tests
npm run typecheck  # TypeScript strict check
```

---

## Where to contribute

### 1. Selector maintenance (most valuable)

Amazon changes their DOM regularly. The entire parsing layer is centralized in one file:

```
src/parsers/amazon/selectors.ts
```

If the extension stops working on a new Amazon layout, this is the first place to look. Add fallbacks to the array — don't remove old selectors (they may still work on regional Amazon sites).

**To test selector changes:**
1. Save an Amazon product page as HTML to `tests/fixtures/`
2. Write a test in `tests/unit/parsers/` using the fixture
3. Make sure `npm test` passes

### 2. Additional Amazon locales

The extension is configured for 10 Amazon domains. If you can test on a locale that isn't working correctly:

1. Check `src/parsers/amazon/selectors.ts` for needed fallbacks
2. Add a fixture HTML from that locale in `tests/fixtures/`
3. Add a test file under `tests/unit/parsers/`

### 3. Algorithm improvements

Stats modules live in `src/stats/`. All pure functions, no DOM access. Easy to test.

**Good contributions:**
- Improve the quality scoring weights in `review-quality.ts`
- Improve burst detection thresholds in `timeline-analysis.ts`
- Add detection for new distribution patterns in `distribution-analysis.ts`

**Always include tests** for algorithm changes. The test suite runs in <1 second.

### 4. UI/UX improvements

Lit web components are in `src/components/`. Each uses Shadow DOM, so Amazon CSS can't interfere.

- `overlay-panel.ts` — the main injected panel
- `star-histogram.ts` — SVG bar chart
- `filter-bar.ts` — sort/filter controls
- `quality-badge.ts` — per-review badge
- `adjusted-rating.ts` — verified rating display

Keep components accessible (ARIA attributes). Keep the visual style minimal — Amazon pages are busy enough.

---

## Code standards

- **TypeScript strict** — `strict: true`, `noUncheckedIndexedAccess: true`. No `any` except where genuinely unavoidable.
- **No external runtime dependencies** except Lit. Don't add chart libraries, lodash, etc.
- **Tests required** for all new stats logic and parser functions.
- **Update `selectors.ts`** — if you hardcode a selector anywhere else, move it there.

---

## Submitting a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm test` and `npm run typecheck` — both must pass
4. Write a clear PR description explaining *why* the change is needed
5. Reference any GitHub issues your PR addresses

---

## Reporting a broken selector

Amazon updates their page structure often. If the extension stops working:

1. Open a GitHub issue titled "Selectors broken — [date]"
2. Include which element stopped working (histogram, reviews, ratings?)
3. If you can, paste the relevant HTML snippet from the broken page
4. Even better: submit a PR with the fix in `selectors.ts`

---

## What we won't merge

- Any feature that requires a server or external API
- "Fake review detection" features that make probabilistic claims without clear caveats
- Affiliate link integration of any kind
- New permissions beyond what's already in `wxt.config.ts`
- Dependencies that significantly increase bundle size

---

## Future expansions (see FUTURE.md)

See [FUTURE.md](FUTURE.md) for a roadmap of planned and possible features.
