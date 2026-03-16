# ADR-0004: Bridge settings through an isolated-world relay via postMessage

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

The primary content script (`content.ts`) runs in MAIN world (see ADR-0003), which means it cannot safely import `wxt/browser` or use `chrome.storage` via the WXT polyfill. At the same time, the panel needs:

1. **Initial settings on load** — before the panel is mounted, so it respects the user's saved preferences.
2. **Live settings updates** — when the user changes a toggle in the popup, the panel should update without a page reload.

Options considered:

- **Read `chrome.storage.sync` directly in MAIN world** — `chrome.storage.sync.get()` is available in Chrome 111+ MAIN world, but behaviour on Firefox MAIN world differs. A polyfill can't be used safely (see ADR-0003).
- **Inject settings via a data attribute on a DOM element** — brittle, easy to break, no live updates.
- **Use a separate isolated-world content script as a bridge** — isolated world has reliable `chrome.storage` access. Communicates with MAIN world via `window.postMessage`.

## Decision

Use a dedicated isolated-world content script (`settings-relay.content.ts`) that bridges `chrome.storage.sync` to the MAIN world via `window.postMessage`.

## Protocol

| Direction | Message type | When |
|-----------|-------------|------|
| MAIN → isolated | `__HR_GET_SETTINGS__` | On startup, MAIN requests full settings |
| isolated → MAIN | `__HR_SETTINGS_INIT__` | Response with current full `UserSettings` |
| isolated → MAIN | `__HR_SETTINGS__` | Whenever `chrome.storage.onChanged` fires |

The relay runs at `document_start` (before MAIN world), so it is ready when MAIN world fires `__HR_GET_SETTINGS__`. A 2-second timeout in `content.ts` falls back to `DEFAULT_SETTINGS` if the relay doesn't respond (e.g. Firefox isolated-world timing differences).

## Relay key list must stay in sync

The relay explicitly whitelists which storage keys to forward in `onChanged`. If a new setting is added to `UserSettings`, it **must** also be added to the relay's key list, otherwise live changes from the popup won't reach the panel. This has caused bugs (e.g. `panelPosition` was initially missing from the relay, so changing panel position in the popup had no effect until page reload).

## Consequences

- Two content scripts run on every matching page: `settings-relay.content.ts` (isolated, `document_start`) and `content.ts` (MAIN, `document_idle`). Both must be included in the manifest — WXT handles this via file naming convention.
- Security: `window.postMessage` with `'*'` as the target origin is used for simplicity. Messages are validated by checking `e.source === window` and the `type` field. This is safe for non-sensitive preference data.
