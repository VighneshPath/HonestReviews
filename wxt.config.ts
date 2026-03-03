import { defineConfig } from 'wxt';

export default defineConfig({
  // WXT auto-selects the correct API per browser target.
  // Build for Chrome: npm run build
  // Build for Firefox: npm run build:firefox
  // Dev with Firefox: npm run dev:firefox
  srcDir: 'src',

  vite: () => ({
    define: {
      // Firefox extension isolated worlds return null for the bare `customElements` global.
      // Lit's @customElement decorator calls customElements.define() at module init time.
      // Replacing with window.customElements (accessible via XRay wrapper) fixes this for
      // all Firefox versions. On Chrome and in MAIN world this is a no-op equivalence.
      customElements: 'window.customElements',
    },
  }),
  manifest: ({ browser }) => ({
    name: 'Honest Reviews',
    description: 'Surface Amazon review data transparently — no AI, no servers, just the facts.',
    version: '0.1.0',
    permissions: ['storage', 'activeTab'],

    // Firefox uses "browser_specific_settings" for the add-on ID,
    // which is required to use chrome.storage.sync on AMO.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'honest-reviews@yourname.dev',
              strict_min_version: '109.0',
            },
          },
          // Firefox MV3 uses "host_permissions" natively (FF 128+)
          // For older Firefox, permissions and host_permissions are merged.
          host_permissions: [
            '*://*.amazon.com/*',
            '*://*.amazon.co.uk/*',
            '*://*.amazon.de/*',
            '*://*.amazon.fr/*',
            '*://*.amazon.it/*',
            '*://*.amazon.es/*',
            '*://*.amazon.ca/*',
            '*://*.amazon.com.au/*',
            '*://*.amazon.co.jp/*',
            '*://*.amazon.in/*',
          ],
        }
      : {
          host_permissions: [
            '*://*.amazon.com/*',
            '*://*.amazon.co.uk/*',
            '*://*.amazon.de/*',
            '*://*.amazon.fr/*',
            '*://*.amazon.it/*',
            '*://*.amazon.es/*',
            '*://*.amazon.ca/*',
            '*://*.amazon.com.au/*',
            '*://*.amazon.co.jp/*',
            '*://*.amazon.in/*',
          ],
        }),

    action: {
      default_popup: 'popup/index.html',
      default_title: 'Honest Reviews',
    },
  }),
});
