# ADR-0007: Zero server architecture — fully client-side

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

Competing review analysis tools (Fakespot, ReviewMeta) operated backend servers that received product identifiers, ran ML models, and returned scores. Both shut down in 2025. The operational cost was unsustainable without a reliable revenue model, and the ML claims ("detects fake reviews") were difficult to substantiate.

An alternative "AI-powered" approach would require:
- Server infrastructure to run models
- A database to cache results
- An API key management system
- Revenue to sustain costs
- Privacy policy obligations (product lookups reveal browsing behaviour)

## Decision

No server. All analysis runs in the browser, on data already present on the product page or fetched from the same site the user is already visiting.

## What this enables

| Capability | How |
|------------|-----|
| Star histogram | Parsed from product page DOM — Amazon always includes it server-rendered |
| Adjusted rating | Calculated from visible reviews + histogram data |
| Distribution pattern | Pure math on histogram percentages |
| Review quality scores | Formula applied to DOM-parsed fields per review |
| Timeline burst detection | Date parsing + grouping by month |
| Additional reviews | `fetch()` to the site's own review endpoints using the user's existing session cookies |

## What this deliberately excludes

- **Fake review detection** — requires training data, historical patterns, ML. We don't have these and won't pretend to.
- **Cross-product comparison** — would require a database of all products.
- **Seller reputation scoring** — same.

Our positioning: *"No AI, no servers, just transparency."* The extension surfaces data that is already embedded in the page but presented in ways that obscure patterns. We make the signal visible; users decide what it means.

## Monetisation without servers

- Buy Me a Coffee and Ko-fi links in the popup — low friction, no subscription required.
- No affiliate links — this is explicitly part of the brand. Trust is the product.
- No data collection, no telemetry. The extension makes zero third-party network requests.

## Consequences

- **Hard limit on review count**: ~50 reviews on Amazon (10 per star tier × 5 tiers), ~30 on Flipkart (3 sort orders). Products with thousands of reviews are not fully represented. This is disclosed in the README.
- **No caching**: every page load re-fetches and re-analyses. This is fine — analysis takes <1s and the fresh data is always current.
- **No cross-session state**: the extension has no memory of past analyses. Each product page is analysed independently.
- **Resilience**: no server = no outage, no API rate limits, no maintenance burden.
