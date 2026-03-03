import { loadSettings, saveSettings } from '../../storage/settings.js';
import { isProductPage } from '../../utils/amazon-url.js';
import type { UserSettings } from '../../storage/settings.js';

async function main() {
  const settings = await loadSettings();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const onProductPage = tab?.url ? isProductPage(tab.url) : false;

  render(settings, onProductPage);
}

function render(settings: UserSettings, onProductPage: boolean) {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="popup-header">
      <div class="popup-logo">HR</div>
      <div>
        <div class="popup-title">Honest Reviews</div>
        <div class="popup-tagline">No AI · No servers · Just transparency</div>
      </div>
    </div>

    <div class="popup-body">
      <div class="status-card ${onProductPage ? 'status-active' : 'status-inactive'}">
        ${onProductPage
          ? '✓ Active on this product page'
          : 'Navigate to an Amazon product page to see review analysis.'}
      </div>

      <div class="settings-group">
        <div class="settings-label">Settings</div>

        <div class="toggle-row">
          <span class="toggle-row-label">Extension enabled</span>
          <label class="toggle">
            <input type="checkbox" id="toggle-enabled" ${settings.enabled ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="toggle-row">
          <span class="toggle-row-label">Show quality badges</span>
          <label class="toggle">
            <input type="checkbox" id="toggle-badges" ${settings.showQualityBadges ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="toggle-row">
          <span class="toggle-row-label">Auto-collapse panel</span>
          <label class="toggle">
            <input type="checkbox" id="toggle-collapse" ${settings.autoCollapse ? 'checked' : ''} />
            <span class="toggle-track"></span>
          </label>
        </div>

        <div>
          <label for="default-sort" style="display:block;font-size:13px;color:#374151;margin-bottom:6px;">
            Default sort order
          </label>
          <select class="sort-select" id="default-sort">
            <option value="most-informative" ${settings.defaultSort === 'most-informative' ? 'selected' : ''}>Most Informative</option>
            <option value="most-helpful"     ${settings.defaultSort === 'most-helpful'     ? 'selected' : ''}>Most Helpful</option>
            <option value="recent"           ${settings.defaultSort === 'recent'           ? 'selected' : ''}>Most Recent</option>
            <option value="top-rated"        ${settings.defaultSort === 'top-rated'        ? 'selected' : ''}>Top Rated</option>
            <option value="critical"         ${settings.defaultSort === 'critical'         ? 'selected' : ''}>Critical First</option>
          </select>
        </div>
      </div>
    </div>

    <div class="support-section">
      <div class="support-label">Support development</div>
      <div class="support-links">
        <a href="https://buymeacoffee.com/NerfLongshot" target="_blank" class="support-link support-link-coffee">☕ Buy Me a Coffee</a>
        <a href="https://github.com/sponsors" target="_blank" class="support-link support-link-github">♥ Sponsor</a>
        <a href="https://ko-fi.com/vighneshpath" target="_blank" class="support-link support-link-kofi">Ko-fi</a>
      </div>
    </div>

    <div class="popup-footer">
      <a href="https://github.com/VighneshPath/HonestReviews" target="_blank">Open Source on GitHub</a>
      · No affiliate links · No data collection
    </div>
  `;

  // Wire up settings listeners
  document.getElementById('toggle-enabled')?.addEventListener('change', async (e) => {
    await saveSettings({ enabled: (e.target as HTMLInputElement).checked });
  });

  document.getElementById('toggle-badges')?.addEventListener('change', async (e) => {
    await saveSettings({ showQualityBadges: (e.target as HTMLInputElement).checked });
  });

  document.getElementById('toggle-collapse')?.addEventListener('change', async (e) => {
    await saveSettings({ autoCollapse: (e.target as HTMLInputElement).checked });
  });

  document.getElementById('default-sort')?.addEventListener('change', async (e) => {
    await saveSettings({ defaultSort: (e.target as HTMLSelectElement).value as UserSettings['defaultSort'] });
  });
}

main().catch(console.error);
