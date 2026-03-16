import type { ProductPageData, StarDistribution } from '../amazon/product-page.js';

export type { ProductPageData, StarDistribution };

export function parseFlipkartProductPage(doc: Document): ProductPageData {
  return {
    averageRating: parseAverageRating(doc),
    totalRatings: parseTotalRatings(doc),
    starDistribution: parseStarDistribution(doc),
  };
}

function parseAverageRating(doc: Document): number | null {
  // Try legacy selectors first (class names Flipkart has used historically)
  const legacySelectors = ['._3LWZlK', '._1lRcqv ._3LWZlK', '._1OEHUl'];
  for (const sel of legacySelectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) {
        const val = parseFloat(el.textContent?.trim() ?? '');
        if (val >= 1 && val <= 5) return val;
      }
    } catch { /* skip */ }
  }

  // Regex fallback: scan the ratings section text for a standalone N.N rating
  const ratingsEl = findRatingsSection(doc);
  if (ratingsEl) {
    const match = ratingsEl.textContent?.trim().match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (val >= 1 && val <= 5) return val;
    }
  }

  // Structural fallback: newer Flipkart pages show the overall rating inside the
  // "ratings-reviews-details-page" link (e.g. "3.3 | 4,829 ratings").
  try {
    const link = doc.querySelector('a[href*="ratings-reviews-details-page"]');
    if (link) {
      const match = link.textContent?.trim().match(/^(\d+(?:\.\d+)?)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val >= 1 && val <= 5) return val;
      }
    }
  } catch { /* skip */ }

  return null;
}

function parseTotalRatings(doc: Document): number | null {
  const legacySelectors = ['._2_R_DZ', '._3pLy-c', '._1lRcqv'];
  for (const sel of legacySelectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) {
        const text = el.textContent?.trim() ?? '';
        const match = text.replace(/,/g, '').match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
    } catch { /* skip */ }
  }
  return null;
}

function parseStarDistribution(doc: Document): StarDistribution[] {
  const ratingsEl = findRatingsSection(doc);
  const text = ratingsEl?.textContent ?? doc.body?.textContent ?? '';
  return parseHistogramFromText(text);
}

/**
 * Parse histogram from text containing patterns like "5 ★ 177 4 ★ 51 ..." or
 * Flipkart's compact reviews-page format "1★2,0532★7133★1,5914★4,5455★12,232".
 * Converts absolute counts to percentages.
 * Exported so review-fetcher can reuse it on fetched page HTML.
 */
export function parseHistogramFromText(text: string): StarDistribution[] {
  const counts: Record<number, number> = {};

  // Flipkart reviews-page compact format: all 5 entries concatenated without spaces,
  // counts may have comma separators. Regex backtracking resolves the ambiguity.
  const compact = text.match(
    /1[\u2605\u2606]([\d,]+)2[\u2605\u2606]([\d,]+)3[\u2605\u2606]([\d,]+)4[\u2605\u2606]([\d,]+)5[\u2605\u2606]([\d,]+)/,
  );
  if (compact) {
    counts[1] = parseInt(compact[1]!.replace(/,/g, ''), 10);
    counts[2] = parseInt(compact[2]!.replace(/,/g, ''), 10);
    counts[3] = parseInt(compact[3]!.replace(/,/g, ''), 10);
    counts[4] = parseInt(compact[4]!.replace(/,/g, ''), 10);
    counts[5] = parseInt(compact[5]!.replace(/,/g, ''), 10);
  } else {
    // Spaced format: "5 ★ 177" — counts may also have comma separators
    const pattern = /([1-5])\s*[\u2605\u2606]\s*([\d,]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const stars = parseInt(match[1]!, 10);
      const count = parseInt(match[2]!.replace(/,/g, ''), 10);
      if (!(stars in counts)) counts[stars] = count; // keep first occurrence per tier
    }
  }

  if (Object.keys(counts).length === 0) return [];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return ([5, 4, 3, 2, 1] as const)
    .filter((s) => s in counts)
    .map((stars) => ({
      stars,
      percentage: Math.round((counts[stars]! / total) * 100),
    }));
}

function findRatingsSection(doc: Document): Element | null {
  const selectors = [
    '._3LWZlK',     // legacy rating badge + surrounding section
    '._1YokD2',     // legacy ratings & reviews section
    '._3Ay6Sb',     // legacy histogram container
    '[class*="ratingHistogram"]',
    '[class*="ratingsReviews"]',
  ];
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) return el;
    } catch { /* skip */ }
  }
  // Fallback: find a section whose text includes the star histogram pattern
  const allDivs = doc.querySelectorAll('div');
  for (const div of allDivs) {
    if (/[1-5]\s*[\u2605\u2606]\s*\d+/.test(div.textContent ?? '') &&
        (div.textContent?.length ?? 0) < 500) {
      return div;
    }
  }
  return null;
}
