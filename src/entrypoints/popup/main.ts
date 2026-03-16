import { loadSettings, saveSettings } from '../../storage/settings.js';
import { isProductPage } from '../../utils/amazon-url.js';
import { isFlipkartProductPage } from '../../utils/flipkart-url.js';
import type { UserSettings } from '../../storage/settings.js';

async function main() {
  const settings = await loadSettings();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  const onProductPage = isProductPage(url) || isFlipkartProductPage(url);

  applySettings(settings, onProductPage);
  bindEvents();
}

function applySettings(settings: UserSettings, onProductPage: boolean) {
  const statusCard = document.getElementById('status-card')!;
  statusCard.className = `status-card ${onProductPage ? 'status-active' : 'status-inactive'}`;
  statusCard.textContent = onProductPage
    ? '✓ Active on this product page'
    : 'Navigate to an Amazon or Flipkart product page to see review analysis.';

  checkbox('toggle-enabled').checked = settings.enabled;
  checkbox('toggle-badges').checked = settings.showQualityBadges;
  checkbox('toggle-collapse').checked = settings.autoCollapse;
  select('default-sort').value = settings.defaultSort;
  select('panel-position').value = settings.panelPosition;
}

function bindEvents() {
  checkbox('toggle-enabled').addEventListener('change', (e) => {
    saveSettings({ enabled: (e.target as HTMLInputElement).checked });
  });

  checkbox('toggle-badges').addEventListener('change', (e) => {
    saveSettings({ showQualityBadges: (e.target as HTMLInputElement).checked });
  });

  checkbox('toggle-collapse').addEventListener('change', (e) => {
    saveSettings({ autoCollapse: (e.target as HTMLInputElement).checked });
  });

  select('default-sort').addEventListener('change', (e) => {
    saveSettings({ defaultSort: (e.target as HTMLSelectElement).value as UserSettings['defaultSort'] });
  });

  select('panel-position').addEventListener('change', (e) => {
    saveSettings({ panelPosition: (e.target as HTMLSelectElement).value as UserSettings['panelPosition'] });
  });
}

function checkbox(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function select(id: string): HTMLSelectElement {
  return document.getElementById(id) as HTMLSelectElement;
}

main().catch(console.error);
