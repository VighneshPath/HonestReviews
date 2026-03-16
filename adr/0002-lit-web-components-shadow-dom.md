# ADR-0002: Use Lit web components with Shadow DOM for the UI layer

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

The extension injects a panel directly into Amazon and Flipkart product pages. These pages run their own CSS (Amazon uses global utility classes; Flipkart uses React Native Web's generated classes). Any injected UI risks:

1. **Style bleed-in**: the host page's CSS selectors bleeding into our components.
2. **Style bleed-out**: our CSS selectors accidentally matching host page elements.
3. **Framework conflict**: injecting React or Vue components creates version conflicts if the host page already bundles a different version.

Options evaluated:

- **React + CSS Modules** — powerful but adds ~40KB; creates version conflict risk; no native style isolation.
- **Vanilla DOM + inline styles** — zero overhead but unmanageable at component scale; no reactivity.
- **Lit + Shadow DOM** — 5KB, uses native browser web components, Shadow DOM is the only way to get *true* CSS isolation without iframes.

## Decision

Use **Lit** for component authoring and **Shadow DOM** (the default in Lit) for style isolation.

## Rationale

- **Shadow DOM** creates an impenetrable CSS boundary. Host page global rules (`* { box-sizing: ... }`, `.a-size-base`, RNW's `css-*`) cannot reach inside; our internal rules cannot leak out.
- **Lit's reactive properties** (`@property`) give React-like declarative rendering without a vdom diffing runtime. When `panel.reviews = newReviews`, Lit schedules a microtask and re-renders only changed parts.
- **Web components are permanent**: a `<hr-overlay-panel>` element registered via `customElements.define` stays alive even if the host page's JavaScript re-runs. React and Vue components mounted via `createRoot` or `createApp` can be destroyed by the framework reconciler.
- **5KB gzipped**: appropriate for a browser extension that aims for a small footprint.

## CSS import pattern

CSS is authored in external `.css` files using `@reference "tailwindcss"` and `@apply` directives, then imported as a string via Vite's `?inline` suffix:

```typescript
import styles from './overlay-panel.css?inline';
// ...
static styles = unsafeCSS(styles);
```

This keeps styles in maintainable files (editor support, linting) while still being injected into the Shadow DOM as a `<style>` element, not a `<link>` (which would make a network request that CSP may block).

## Consequences

- `document.querySelector` from the host page or from our content script cannot pierce Shadow DOM. To inspect panel internals, use `panel.shadowRoot.querySelector(...)`.
- Lit's `@property({ type: Object })` performs shallow equality. Mutating an object in place and reassigning the same reference will not trigger a re-render. Always spread: `panel.productData = { ...productData, starDistribution: histogram }`.
- Firefox requires `customElements: 'window.customElements'` in `wxt.config.ts` to work in MAIN world. Without it, `customElements.define` references the wrong registry.
