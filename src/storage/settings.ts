import { browser } from 'wxt/browser';
import type { UserSettings } from './types.js';
import { DEFAULT_SETTINGS } from './types.js';
export type { UserSettings } from './types.js';
export { DEFAULT_SETTINGS } from './types.js';

export async function loadSettings(): Promise<UserSettings> {
  try {
    const stored = await browser.storage.sync.get(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...stored } as UserSettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial: Partial<UserSettings>): Promise<void> {
  try {
    await browser.storage.sync.set(partial);
  } catch { /* storage unavailable */ }
}
