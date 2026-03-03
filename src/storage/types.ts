import type { SortMode } from '../stats/review-sorter.js';

export interface UserSettings {
  defaultSort: SortMode;
  showQualityBadges: boolean;
  autoCollapse: boolean;
  enabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  defaultSort: 'most-informative',
  showQualityBadges: true,
  autoCollapse: false,
  enabled: true,
};
