/**
 * Text extraction helpers for Amazon DOM parsing.
 */

/**
 * Extract a numeric rating from strings like "4.3 out of 5 stars" or "4.3 out of 5".
 */
export function parseRating(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*out\s*of\s*5/i);
  if (match?.[1]) return parseFloat(match[1]);

  // Fallback: just try to parse the first number
  const numMatch = text.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch?.[1]) {
    const val = parseFloat(numMatch[1]);
    if (val >= 1 && val <= 5) return val;
  }
  return null;
}

/**
 * Extract an integer star count from strings like "5 star" or "4-star".
 */
export function parseStarLabel(text: string): number | null {
  const match = text.match(/^(\d)/);
  if (match?.[1]) return parseInt(match[1], 10);
  return null;
}

/**
 * Parse a percentage from strings like "68%" or "68 percent".
 */
export function parsePercentage(text: string): number | null {
  const match = text.match(/(\d+)\s*%/);
  if (match?.[1]) return parseInt(match[1], 10);
  return null;
}

/**
 * Parse a review count from strings like "1,234 ratings" or "1234 global ratings".
 */
export function parseReviewCount(text: string): number | null {
  const cleaned = text.replace(/,/g, '').replace(/\./g, '');
  const match = cleaned.match(/(\d+)/);
  if (match?.[1]) return parseInt(match[1], 10);
  return null;
}

/**
 * Parse helpful vote count from strings like:
 * "47 people found this helpful" / "One person found this helpful"
 */
export function parseHelpfulVotes(text: string): number {
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('one person')) return 1;

  const match = text.replace(/,/g, '').match(/^(\d+)/);
  if (match?.[1]) return parseInt(match[1], 10);
  return 0;
}

/**
 * Parse a review date from Amazon's format:
 * "Reviewed in the United States on January 15, 2024"
 * "Reviewed in Germany on 15. Januar 2024"
 * Returns a Date or null.
 */
export function parseReviewDate(text: string): Date | null {
  // Extract the date portion after "on "
  const onMatch = text.match(/\bon\s+(.+)$/i);
  const datePart = onMatch?.[1] ?? text;

  const parsed = new Date(datePart);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

/**
 * Get visible text content from an element, trimmed.
 */
export function textContent(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}
