import { browser } from 'wxt/browser';
import type { SortMode } from '../stats/review-sorter.js';

export interface UserSettings {
  /** Default sort mode for reviews */
  defaultSort: SortMode;
  /** Whether to show quality badges on reviews */
  showQualityBadges: boolean;
  /** Whether to auto-collapse the panel */
  autoCollapse: boolean;
  /** Whether to show the panel at all */
  enabled: boolean;
}

const DEFAULTS: UserSettings = {
  defaultSort: 'most-informative',
  showQualityBadges: true,
  autoCollapse: false,
  enabled: true,
};

/**
 * Load user settings from chrome.storage.sync.
 * Falls back to defaults for any missing keys.
 */
export async function loadSettings(): Promise<UserSettings> {
  try {
    const stored = await browser.storage.sync.get(DEFAULTS);
    return { ...DEFAULTS, ...stored } as UserSettings;
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Save partial settings update to browser.storage.sync.
 */
export async function saveSettings(partial: Partial<UserSettings>): Promise<void> {
  try {
    await browser.storage.sync.set(partial);
  } catch {
    // Storage unavailable — silently continue
  }
}
