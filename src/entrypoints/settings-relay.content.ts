import { browser } from 'wxt/browser';
import { ALL_SITE_MATCHES } from '../sites/index.js';
import { DEFAULT_SETTINGS } from '../storage/types.js';

/**
 * Isolated-world relay for settings. Handles two responsibilities:
 *
 * 1. Initial load: responds to __HR_GET_SETTINGS__ from the MAIN world with
 *    the full current settings (__HR_SETTINGS_INIT__).
 * 2. Live updates: forwards chrome.storage.onChanged events to the MAIN world
 *    as __HR_SETTINGS__ messages.
 *
 * chrome.storage APIs are reliable in isolated world scripts but not in MAIN
 * world content scripts, so we bridge everything through window.postMessage.
 */
export default defineContentScript({
  matches: ALL_SITE_MATCHES,
  runAt: 'document_start',

  main() {
    // Respond to the initial settings request from the MAIN world content script.
    window.addEventListener('message', async (e) => {
      if (e.source !== window || !e.data || e.data.type !== '__HR_GET_SETTINGS__') return;
      try {
        const stored = await browser.storage.sync.get(DEFAULT_SETTINGS);
        const settings = { ...DEFAULT_SETTINGS, ...stored };
        window.postMessage({ type: '__HR_SETTINGS_INIT__', payload: settings }, '*');
      } catch {
        window.postMessage({ type: '__HR_SETTINGS_INIT__', payload: { ...DEFAULT_SETTINGS } }, '*');
      }
    });

    // Relay live storage changes to the MAIN world.
    // Derive keys from DEFAULT_SETTINGS so this stays in sync automatically when settings are added.
    const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const payload: Record<string, unknown> = {};
      for (const key of SETTINGS_KEYS) {
        if (key in changes) {
          payload[key] = (changes[key] as { newValue?: unknown }).newValue;
        }
      }
      if (Object.keys(payload).length > 0) {
        window.postMessage({ type: '__HR_SETTINGS__', payload }, '*');
      }
    });
  },
});
