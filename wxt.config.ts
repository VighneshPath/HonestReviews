import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',

  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      // Firefox isolated worlds return null for the bare `customElements` global.
      // window.customElements is accessible via the XRay wrapper in all Firefox versions.
      customElements: 'window.customElements',
    },
  }),
  manifest: ({ browser }) => ({
    name: 'Honest Reviews',
    description: 'Surface Amazon & Flipkart review data transparently — no AI, no servers, just the facts.',
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
            '*://*.flipkart.com/*',
            '*://flipkart.com/*',
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
            '*://*.flipkart.com/*',
            '*://flipkart.com/*',
          ],
        }),

    action: {
      default_popup: 'popup/index.html',
      default_title: 'Honest Reviews',
    },
  }),
});
