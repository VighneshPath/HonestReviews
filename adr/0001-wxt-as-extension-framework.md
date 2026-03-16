# ADR-0001: Use WXT as the browser extension framework

**Status:** Accepted
**Date:** 2025-Q4

---

## Context

Building a browser extension requires handling Manifest V3 service workers, content scripts, popups, and cross-browser differences (Chrome vs Firefox) by hand — or using a framework that abstracts them. The main options evaluated were:

- **Raw manifest + Vite** — full control, maximum boilerplate
- **Plasmo** — popular, but heavy runtime, proprietary conventions, opinionated file layout
- **WXT** — Vite-based, Manifest V3 native, HMR in dev, supports Chrome + Firefox from a single codebase, zero runtime overhead in output

## Decision

Use **WXT** as the extension framework.

## Rationale

- **Convention over configuration**: entry points are files in `src/entrypoints/`. WXT derives the manifest automatically from file names and exported metadata (`defineContentScript`, `defineBackground`). No hand-crafted `manifest.json`.
- **HMR in dev**: content scripts reload on save, popup rebuilds instantly — critical for tight iteration on DOM parsing work.
- **Cross-browser output**: `npm run build` targets Chrome MV3; `npm run build -- --browser firefox` targets Firefox. Same source, different output directories.
- **Zero runtime**: unlike Plasmo, WXT ships no runtime library. The output bundle is pure compiled TypeScript + tree-shaken dependencies.
- **Vite ecosystem**: Tailwind v4, `?inline` CSS imports, vitest — all just work.

## Consequences

- Entry point naming is convention-based: a file named `settings-relay.content.ts` becomes a content script; `content-settings.ts` does **not** (and will not appear in the manifest). This has caused confusion — see ADR-0003.
- WXT's logger swallows errors from content script IIFEs in production builds. Debugging MAIN-world crashes requires dev builds or explicit `console.error`.
