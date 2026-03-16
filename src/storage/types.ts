import type { SortMode } from '../stats/review-sorter.js';

export type PanelPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface UserSettings {
  defaultSort: SortMode;
  showQualityBadges: boolean;
  autoCollapse: boolean;
  enabled: boolean;
  panelPosition: PanelPosition;
}

export const DEFAULT_SETTINGS: UserSettings = {
  defaultSort: 'most-informative',
  showQualityBadges: true,
  autoCollapse: false,
  enabled: true,
  panelPosition: 'bottom-right',
};
