# ADR-0005: Floating panel fixed to document.body for all sites

**Status:** Accepted
**Date:** 2026-Q1

---

## Context

The original design planned to inject the panel inline into the product page, near the review section (Amazon) or the ratings widget (Flipkart). This approach was abandoned for the following reasons:

### Amazon
Amazon's product page is server-rendered and relatively stable. Inline insertion works, but picking a reliable anchor element requires site-specific knowledge and breaks when Amazon changes their DOM layout.

### Flipkart
Flipkart is a **React Native Web SPA**. The entire content inside `#container` is managed by React's reconciler. When React reconciles a subtree, it can:
- Remove elements that aren't in its virtual DOM
- Overwrite `innerHTML` of managed containers
- Evict any DOM node inserted outside React's knowledge

An attempt was made to inject the panel next to `div.vQDoqR` (the review card container). It was immediately evicted on the next React render. A "guardian" approach was tried — a `MutationObserver` that re-injected the panel if it was removed. This caused React to enter an infinite reconciliation loop, corrupting the page's internal state.

### Cross-site consistency
Having per-site panel mounting logic (inline for Amazon, some other strategy for Flipkart) creates two code paths for every panel-related feature. Any new site would require its own strategy.

## Decision

For **all sites**, mount the panel as a `position: fixed` element appended directly to `document.body`, outside any site-managed subtree.

```typescript
panel.style.cssText = [
  'position: fixed',
  'width: 380px',
  'max-height: 80vh',
  'overflow-y: auto',
  'z-index: 2147483647',  // highest possible, renders above everything
].join('; ');
document.body.appendChild(panel);
```

## Why this works

- `document.body` is never reconciled by React (React mounts into a specific child element, not `body` itself).
- `position: fixed` removes the panel from normal flow — no layout impact on the page.
- `z-index: 2147483647` (max 32-bit signed int) ensures the panel is above any site overlay, modal, or sticky header.
- A `MutationObserver` in `analyze()` reconnects the panel if it is somehow detached: `if (panel && !panel.isConnected) document.body.appendChild(panel)`.

## Panel positioning

User can configure corner placement: bottom-right (default), bottom-left, top-right, top-left. This is implemented via `applyPanelPosition()` which sets `top`/`bottom`/`left`/`right` on the panel style. The setting is stored in `chrome.storage.sync` and applied at mount time and on live changes from the popup.

## Consequences

- The panel is visible on top of the page rather than inline with content. This is the right trade-off: it works reliably on all sites and avoids complex per-site DOM surgery.
- The panel overlaps the corner of the page. Width is 380px — narrow enough not to obscure most content. Users can move it to any corner via settings.
- If `document.body` itself is replaced (rare but theoretically possible in extreme SPAs), the panel would be lost. The poll loop and `MutationObserver` on `document.body` protect against this.
