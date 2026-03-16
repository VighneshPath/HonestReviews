# ADR-0003: Run the primary content script in MAIN world

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

Browser extensions support two execution worlds for content scripts:

- **Isolated world** (default): runs in a separate JavaScript context from the page. Has access to `chrome.*`/`browser.*` extension APIs. Cannot access page-level globals or register custom elements in the page's registry.
- **MAIN world**: runs in the same JavaScript context as the page. Shares `window`, `document`, `customElements`. Cannot use `chrome.storage` reliably in all browsers.

Registering a Lit web component (`customElements.define('hr-overlay-panel', ...)`) in an isolated world creates the element in a *different* `CustomElementRegistry` than the page uses. `document.createElement('hr-overlay-panel')` in the isolated world would return an `HTMLElement`, not our `OverlayPanel` subclass — the component simply wouldn't render.

## Decision

Run `content.ts` (the primary orchestration script) in **MAIN world** by setting `world: 'MAIN'` in `defineContentScript`.

## Rationale

- Custom elements *must* be registered in the page's `customElements` registry to be instantiated by `document.createElement`.
- MAIN world scripts share the page's `window`, so Lit's `LitElement` base class, `customElements.define`, and DOM APIs all work as expected.
- The trade-off (no direct `chrome.storage` access) is handled by the isolated-world relay (ADR-0004).

## The `wxt/browser` polyfill crash

When `content.ts` originally imported from `storage/settings.ts`, that module imported `wxt/browser`. The `wxt/browser` polyfill's initialisation checks `globalThis.chrome.runtime.id` on module load. In MAIN world, `chrome.runtime.id` can be `undefined` (the extension context is not always attached to the MAIN JS context at the moment the module executes). The polyfill throws, the content script IIFE crashes, and WXT's production logger swallows the error silently — resulting in a blank page with no panel and no console output.

**Fix**: `content.ts` must **never** import anything that transitively pulls in `wxt/browser`. Type-only imports (`import type`) are safe (erased at compile time). All settings access goes through the postMessage relay.

## Consequences

- Any future module added to `content.ts`'s import tree must be audited for `wxt/browser` usage.
- `chrome.storage.sync.get/set/onChanged` are available in Chrome 111+ MAIN world — but we still route through the relay for cross-browser safety (Firefox MAIN world behaviour differs).
- The isolated-world `settings-relay.content.ts` must be a **separate file** following WXT's `<name>.content.ts` convention. A file named `content-settings.ts` compiles but is NOT added to the manifest as a content script.
