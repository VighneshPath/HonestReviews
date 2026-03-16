import { isKnownProductPage } from '../sites/index.js';

export default defineBackground({
  // Firefox MV3 requires persistent: false for service workers
  persistent: false,

  main() {
    // Clear the badge when navigating away from any supported product page.
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status !== 'complete') return;
      if (!tab.url) return;

      if (!isKnownProductPage(tab.url)) {
        browser.action.setBadgeText({ tabId, text: '' });
      }
    });

    // Listen for rating data from content script to display on badge
    browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type !== 'SET_BADGE_RATING') return;
      if (!sender.tab?.id) return;

      const rating = message.rating as number | null;
      if (rating !== null) {
        browser.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#3b82f6' });
        browser.action.setBadgeText({
          tabId: sender.tab.id,
          text: rating.toFixed(1),
        });
      }
    });
  },
});
