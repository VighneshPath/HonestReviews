# Future Expansions

A living document of ideas for where Honest Reviews can go. Items are roughly ordered by feasibility and impact. None of these are commitments — this is a thinking space.

---

## Near-term (Phase 3 polish & beyond)

### Dark mode support
Detect `prefers-color-scheme: dark` and apply a dark theme to the overlay panel. Lit's CSS custom properties make this straightforward — define a dark variant of all `--hr-*` variables.

### Extension badge with adjusted rating
Show the verified-only adjusted rating in the extension icon badge (e.g. "3.8") on product pages. The background script already handles badge text — just needs the content script to send the data reliably.

### Keyboard shortcut to toggle panel
Add a keyboard shortcut (e.g. `Alt+H`) to show/hide the panel without clicking. Use `chrome.commands` in the manifest.

### Settings sync across devices
Already using `chrome.storage.sync` — this works automatically when the user is signed into Chrome. No code changes needed; just document it.

### "Copy report" button
Add a button that copies a plain-text summary to the clipboard: rating, verified ratio, distribution pattern, adjusted rating. Useful for sharing research.

---

## Medium-term

### Other retail sites

The architecture is intentionally site-agnostic. Parsers live in `src/parsers/{site}/` and content script matches are configurable. Adding support for other sites is a matter of:

1. Adding a new parsers directory
2. Writing site-specific selectors + parsers
3. Adding host_permission and content script match for the new domain

**Candidates:**
- **Walmart** — has star histograms and verified purchase badges
- **Best Buy** — verified reviews, good histogram data
- **Target** — similar structure to Walmart
- **Etsy** — different signals (shop age, review photos matter more)
- **Chewy** — pet product reviews have their own patterns
- **Google Play Store** — app reviews with similar distribution patterns
- **Steam** — "Recommended/Not Recommended" binary is different but interesting

### Review page analysis (not just product page)

Currently we only analyze the ~10 reviews on the product detail page. Amazon has a dedicated reviews page (`/product-reviews/{ASIN}`) that loads many more reviews. A content script match for that URL pattern would unlock:

- Analyze 50-100+ reviews per parse
- More statistically significant adjusted rating
- Better timeline clustering detection
- Page-turn aware (MutationObserver already handles AJAX loads)

### Export / CSV download

Allow downloading the parsed review data as a CSV. Pure client-side using `Blob` + `URL.createObjectURL`. Useful for power users doing their own analysis.

### Review age distribution visualization

A second histogram showing when reviews were posted (by month/year). Makes it immediately obvious if there was a campaign or if reviews are very old. The `timeline-analysis.ts` already calculates `byMonth` — just needs a UI component.

---

## Longer-term

### Pro version (Chrome Web Store paid)

Keep the core extension free and OSS. A Pro version could offer:
- Multi-site support (Walmart, Best Buy, etc.)
- Review history export
- Side-by-side product comparison
- Priority selector updates

Revenue from Pro funds maintenance. Core stays free forever. This is the "open core" model.

### Offline review database (local-only)

Store parsed review summaries in `IndexedDB` (client-side only, no server). When you revisit a product, show how the rating/distribution has changed since your last visit. "This product's rating dropped 0.3 stars since you last checked."

No server needed — it's just local history. Privacy-preserving by design.

### Community selector updates (GitHub-sourced)

When Amazon breaks selectors, the current model requires a new extension release. A lightweight alternative: fetch a JSON file of selector overrides from a GitHub raw URL (with user's explicit consent and no tracking). This lets selector fixes ship faster without a full release cycle.

This is the only scenario where a network request would make sense, and it should be:
- Opt-in only
- Fetching a public static file (no user data sent)
- Verified via content hash

### Firefox for Android

WXT supports Firefox Android builds. The main blocker is UI layout — the overlay panel needs responsive design for mobile viewports. Amazon's mobile web experience also has different DOM structure.

### Safari / iOS

WXT doesn't currently support Safari directly. Would require a separate build pipeline. Lower priority given Safari's market share for this use case.

---

## Non-goals (things we will not build)

These are deliberate omissions, not oversights:

- **ML-based fake detection** — requires server infrastructure, introduces false confidence, and undermines the "just transparency" brand
- **Affiliate link integration** — hard line
- **User accounts / sync** — we don't want to know who you are
- **Price tracking** — different product, different scope, different privacy implications
- **Seller reputation scoring** — requires cross-product data that we don't have client-side
- **Review text sentiment analysis** — tempting but requires either a large local model or a server; both are out of scope for Phase 1-3

---

*Last updated: 2025 — kept as a living document, update as plans evolve.*
