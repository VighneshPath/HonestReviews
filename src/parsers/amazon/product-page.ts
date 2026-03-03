import { SELECTORS, queryFirst, queryAll } from './selectors.js';
import { parseRating, parseStarLabel, parsePercentage, parseReviewCount, textContent } from './utils.js';

export interface StarDistribution {
  stars: number;
  percentage: number;
}

export interface ProductPageData {
  averageRating: number | null;
  totalRatings: number | null;
  starDistribution: StarDistribution[];
}

export function parseProductPage(doc: Document): ProductPageData {
  return {
    averageRating: parseAverageRating(doc),
    totalRatings: parseTotalRatings(doc),
    starDistribution: parseStarDistribution(doc),
  };
}

function parseAverageRating(doc: Document): number | null {
  const el = queryFirst(doc, SELECTORS.product.averageRating);
  if (!el) return null;
  return parseRating(textContent(el));
}

function parseTotalRatings(doc: Document): number | null {
  const el = queryFirst(doc, SELECTORS.product.totalRatings);
  if (!el) return null;
  return parseReviewCount(textContent(el));
}

function parseStarDistribution(doc: Document): StarDistribution[] {
  // Primary: modern Amazon encodes data in aria-labels on anchor elements
  // e.g. "56 percent of reviews have 5 stars"
  const ariaResult = parseFromAriaLinks(doc);
  if (ariaResult.length > 0) return ariaResult;

  // Fallback: legacy table-row layout
  return parseFromTableRows(doc);
}

function parseFromAriaLinks(doc: Document): StarDistribution[] {
  const links = queryAll(doc, SELECTORS.histogram.ariaLinks);
  const result: StarDistribution[] = [];

  for (const link of links) {
    const label = link.getAttribute('aria-label') ?? '';
    // "56 percent of reviews have 5 stars" or "56 percent have 5 stars"
    const match = label.match(/(\d+)\s+percent\b[^0-9]*(\d)\s+star/i);
    if (!match) continue;

    const percentage = parseInt(match[1]!, 10);
    const stars = parseInt(match[2]!, 10);

    if (stars >= 1 && stars <= 5 && percentage >= 0 && percentage <= 100) {
      result.push({ stars, percentage });
    }
  }

  return result.sort((a, b) => b.stars - a.stars);
}

function parseFromTableRows(doc: Document): StarDistribution[] {
  const rows = queryAll(doc, SELECTORS.histogram.rows);
  const result: StarDistribution[] = [];

  for (const row of rows) {
    const starEl = queryFirst(row, SELECTORS.histogram.starLabel);
    const pctEl = queryFirst(row, SELECTORS.histogram.percentage);
    if (!starEl || !pctEl) continue;

    const stars = parseStarLabel(textContent(starEl));
    const percentage = parsePercentage(textContent(pctEl));

    if (stars !== null && percentage !== null && stars >= 1 && stars <= 5) {
      result.push({ stars, percentage });
    }
  }

  return result.sort((a, b) => b.stars - a.stars);
}
