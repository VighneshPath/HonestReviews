const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.ca',
  'amazon.com.au',
  'amazon.co.jp',
  'amazon.in',
];

export const AMAZON_MATCHES = AMAZON_DOMAINS.flatMap((d) => [
  `*://*.${d}/*`,
  `*://${d}/*`,
]);

export function isAmazonUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return AMAZON_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function isProductPage(url: string): boolean {
  if (!isAmazonUrl(url)) return false;
  try {
    const { pathname } = new URL(url);
    return /\/dp\/[A-Z0-9]{10}/.test(pathname) || /\/gp\/product\/[A-Z0-9]{10}/.test(pathname);
  } catch {
    return false;
  }
}

export function extractAsin(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    return (
      pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ??
      pathname.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}
