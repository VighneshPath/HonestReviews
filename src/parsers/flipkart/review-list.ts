import type { ParsedReview } from '../review.js';

export type { ParsedReview };

/**
 * Flipkart review card selectors.
 * Flipkart uses React Native Web — css-175oi2r (flex container) and
 * css-1rynq56 (text) are stable RNW base classes. vQDoqR, v1zwn21k, etc.
 * are Flipkart-specific and may change between deployments.
 * Last verified: 2026-03
 */
const CARD_SELECTORS = [
  'div.vQDoqR',
  '[class*="reviewCard"]',
  '[class*="review-card"]',
];

export function parseFlipkartReviewList(doc: Document): ParsedReview[] {
  const cards = findReviewCards(doc);
  return cards.map((el, index) => parseReview(el, index));
}

/**
 * Returns true if the element looks like a genuine review card.
 * Filters out "Similar Products" / recommendation cards that share the same
 * class names as review cards but contain prices and product images instead of
 * review text.
 *
 * A valid review card has at least one of:
 *  - "Verified Buyer" / "Verified Purchase" text
 *  - A date-like string (relative or absolute)
 *
 * NOTE: Do NOT check for a[href*="product-reviews"] — recommendation cards also
 * link to their own product-reviews pages and would incorrectly pass that check.
 */
function isLikelyReviewCard(el: Element): boolean {
  const text = el.textContent ?? '';
  if (/verified\s+(buyer|purchase)/i.test(text)) return true;
  if (isDateLike(text)) return true;
  return false;
}

function findReviewCards(doc: Document): Element[] {
  for (const sel of CARD_SELECTORS) {
    try {
      const els = doc.querySelectorAll(sel);
      if (els.length > 0) {
        const filtered = Array.from(els).filter(isLikelyReviewCard);
        if (filtered.length > 0) return filtered;
      }
    } catch { /* invalid selector */ }
  }

  // Fallback: find any leaf element whose text starts with "Review for:" and walk
  // up the tree to the review card container.
  //
  // In the hydrated live DOM:  class is css-1rynq56, parent IS the card
  // In SSR/fetched HTML:       class is css-146c3p1, card is several levels up
  //
  // We walk up until we hit an ancestor that passes isLikelyReviewCard
  // (contains verified/date text), which identifies the full review card.
  const reviewCards: Element[] = [];
  const seen = new Set<Element>();
  for (const el of doc.querySelectorAll('div.css-1rynq56, div.css-146c3p1')) {
    if (!el.textContent?.trim().startsWith('Review for:')) continue;
    let card: Element | null = el.parentElement;
    for (let d = 0; d < 8 && card; d++, card = card.parentElement) {
      if (isLikelyReviewCard(card) && !seen.has(card)) {
        seen.add(card);
        reviewCards.push(card);
        break;
      }
    }
  }
  return reviewCards;
}

function parseReview(card: Element, index: number): ParsedReview {
  const rating = parseRating(card);
  const { isVerified, dateText } = parseMeta(card);
  const date = parseFlipkartDate(dateText);
  const helpfulVotes = parseHelpful(card);
  const title = parseTitle(card);
  const body = parseBody(card);
  const reviewerName = parseReviewerName(card);
  const images = parseImages(card);

  const id = makeReviewId(reviewerName, dateText, rating) || `fk-${index}`;

  return {
    id,
    element: card,
    rating,
    title,
    body,
    isVerified,
    date,
    dateText,
    helpfulVotes,
    hasImages: images.length > 0,
    images,
    reviewerName,
    bodyLength: body.length,
  };
}

/**
 * Rating badge: a single digit 1–5 in the first matching text node.
 * Flipkart renders it as a bold colored box at the start of each card.
 * Primary: stable RNW text class css-1rynq56. Fallback: any leaf element.
 */
function parseRating(card: Element): number | null {
  // Primary: RNW text elements (stable base class)
  for (const el of card.querySelectorAll('div.css-1rynq56, [dir="auto"]')) {
    const text = el.textContent?.trim() ?? '';
    if (/^[1-5]$/.test(text)) return parseInt(text, 10);
    if (/^[1-5]\.\d$/.test(text)) return Math.round(parseFloat(text));
  }
  // Fallback: any leaf element whose sole content is a rating digit
  for (const el of card.querySelectorAll('div, span')) {
    if (el.children.length > 0) continue;
    const text = el.textContent?.trim() ?? '';
    if (/^[1-5]$/.test(text)) return parseInt(text, 10);
  }
  return null;
}

/**
 * Title: typically in a specific class; fall back to heuristic detection.
 */
function parseTitle(card: Element): string {
  const selectors = [
    'div.v1zwn21k.v1zwn24',
    'div[class*="v1zwn24"]',
    'p[class*="title"]',
  ];
  for (const sel of selectors) {
    try {
      const el = card.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    } catch { /* skip */ }
  }

  // Reviews-page fallback: title is the last css-1rynq56 in the first child that is
  // not a rating digit/decimal or bullet character.
  const firstChild = card.children[0];
  if (firstChild) {
    const textEls = Array.from(firstChild.querySelectorAll('div.css-1rynq56, div[dir="auto"]'));
    for (let i = textEls.length - 1; i >= 0; i--) {
      const text = textEls[i].textContent?.trim() ?? '';
      if (text && !/^[1-5](\.\d)?$/.test(text) && text !== '•') return text;
    }
  }
  return '';
}

/**
 * Body: look for the review text container.
 * On the product page, Flipkart wraps the review body in an <a> and appends
 * a trailing "…more" / "...more" to indicate truncation. We strip that marker
 * so the displayed text is clean; background-fetched reviews from the
 * /product-reviews/ page contain the full untruncated body.
 */
function parseBody(card: Element): string {
  const selectors = [
    'div.v1zwn21k.v1zwn26',
    'div[class*="v1zwn26"]',
    'p[class*="body"]',
    'p[class*="review"]',
  ];
  for (const sel of selectors) {
    try {
      const el = card.querySelector(sel);
      if (el?.textContent?.trim()) return stripFlipkartReadMore(el.textContent.trim());
    } catch { /* skip */ }
  }

  // Reviews-page fallback: body is the sibling immediately after the "Review for:" child.
  const children = Array.from(card.children);
  const rfIdx = children.findIndex(c => c.textContent?.trim().startsWith('Review for:'));
  if (rfIdx >= 0 && rfIdx + 1 < children.length) {
    const bodyEl = children[rfIdx + 1];
    const text = bodyEl.textContent?.trim() ?? '';
    if (text && !text.includes('Helpful for') && !/verified/i.test(text)) {
      return stripFlipkartReadMore(text);
    }
  }
  return '';
}

/**
 * Flipkart truncates review bodies on the product page with a trailing
 * "...more" or "…more" (where "more" is an anchor link). Strip it so the
 * partial text doesn't end with a confusing non-interactive "more" label.
 */
export function stripFlipkartReadMore(text: string): string {
  // Match either 2+ regular dots OR a single unicode ellipsis (…) before "more"
  return text.replace(/(?:\.{2,}|…)\s*more\s*$/i, '').trimEnd();
}

function parseReviewerName(card: Element): string {
  const selectors = [
    'div.v1zwn21k.v1zwn27',
    'div[class*="v1zwn27"]',
    'p[class*="reviewer"]',
    'p[class*="name"]',
  ];
  for (const sel of selectors) {
    try {
      const el = card.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    } catch { /* skip */ }
  }

  // Reviews-page fallback: name is in the last child's text, before ", City" or "Helpful for".
  const metaChild = card.children[card.children.length - 1];
  if (metaChild) {
    const text = metaChild.textContent?.trim() ?? '';
    const nameBeforeCity = text.match(/^(.+?)\s*,\s*[A-Z]/);
    if (nameBeforeCity) return nameBeforeCity[1].trim();
    const nameBeforeHelpful = text.match(/^(.+?)Helpful for/i);
    if (nameBeforeHelpful) return nameBeforeHelpful[1].trim();
  }
  return '';
}

/**
 * Meta elements share the v1zwn28 class — distinguish by text content.
 * "Verified Buyer" → isVerified. Date text (relative or absolute) → dateText.
 * On fetched pages the date may be combined: "Verified Purchase · Sep, 2023".
 */
function parseMeta(card: Element): { isVerified: boolean; dateText: string } {
  const selectors = [
    'div.v1zwn21l.v1zwn28',
    'div[class*="v1zwn28"]',
    'span[class*="verified"]',
  ];

  let isVerified = false;
  let dateText = '';

  for (const sel of selectors) {
    try {
      const els = card.querySelectorAll(sel);
      for (const el of els) {
        const text = el.textContent?.trim() ?? '';
        if (!text) continue;

        if (/verified\s+(buyer|purchase)/i.test(text)) {
          isVerified = true;
          // Combined format: "Verified Purchase · Sep, 2023"
          const rest = text.replace(/verified\s+(buyer|purchase)\s*[·•]?\s*/i, '').trim();
          if (rest && !dateText) dateText = rest;
        } else if (isDateLike(text) && !dateText) {
          dateText = text;
        }
      }
    } catch { /* skip */ }
  }

  // Fallback: scan card text for date and verified status
  if (!dateText || !isVerified) {
    const cardText = card.textContent ?? '';
    if (!dateText) {
      const relMatch = cardText.match(/(\d+\s+(?:year|month|week|day)s?\s+ago)/i);
      if (relMatch) dateText = relMatch[1];
      const absMatch = cardText.match(/\b([A-Za-z]{3,9},\s*\d{4})\b/);
      if (!dateText && absMatch) dateText = absMatch[1];
    }
    if (!isVerified && /verified\s+(buyer|purchase)/i.test(cardText)) {
      isVerified = true;
    }
  }

  return { isVerified, dateText };
}

function isDateLike(text: string): boolean {
  return (
    /\d+\s+(?:year|month|week|day)s?\s+ago/i.test(text) ||
    /[A-Za-z]{3,9},?\s*\d{4}/.test(text) ||
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/.test(text)
  );
}

function parseHelpful(card: Element): number {
  const text = card.textContent ?? '';
  // "Helpful for 25" or "25 Helpful"
  const m =
    text.match(/Helpful\s+for\s+(\d+)/i) ??
    text.match(/(\d+)\s+Helpful/i);
  if (m) return parseInt(m[1]!, 10);
  return 0;
}

/**
 * Detect review photos — present on some Flipkart reviews as img elements
 * within the card. Filter out tiny icons/avatars (width < 40 or no dimensions).
 */
function parseImages(card: Element): string[] {
  const imgs = Array.from(card.querySelectorAll('img'));
  return imgs
    .filter((img) => {
      const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') ?? '0', 10);
      return w === 0 || w >= 40; // include unknown-size imgs conservatively
    })
    .map((img) => img.src)
    .filter(Boolean);
}

/**
 * Parse Flipkart date formats:
 * - "2 years ago", "1 month ago", "3 days ago"
 * - "Sep, 2023", "January 2024"
 */
function parseFlipkartDate(text: string): Date | null {
  if (!text) return null;

  const relMatch = text.match(/(\d+)\s+(year|month|week|day)s?\s+ago/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]!, 10);
    const unit = relMatch[2]!.toLowerCase();
    const d = new Date();
    if (unit === 'year') d.setFullYear(d.getFullYear() - n);
    else if (unit === 'month') d.setMonth(d.getMonth() - n);
    else if (unit === 'week') d.setDate(d.getDate() - n * 7);
    else if (unit === 'day') d.setDate(d.getDate() - n);
    return d;
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

/**
 * Generate a stable review ID from content for deduplication across fetches.
 */
function makeReviewId(name: string, dateText: string, rating: number | null): string {
  const raw = `${name}|${dateText}|${rating}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
  }
  return `fk-${Math.abs(h).toString(36)}`;
}
