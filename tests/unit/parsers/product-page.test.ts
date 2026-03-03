import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseProductPage } from '../../../src/parsers/amazon/product-page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureHtml = readFileSync(
  join(__dirname, '../../fixtures/amazon-product-page.html'),
  'utf-8',
);

let doc: Document;

beforeAll(() => {
  const dom = new JSDOM(fixtureHtml);
  doc = dom.window.document;
});

describe('parseProductPage', () => {
  it('parses average rating', () => {
    const result = parseProductPage(doc);
    expect(result.averageRating).toBe(4.2);
  });

  it('parses total ratings count', () => {
    const result = parseProductPage(doc);
    expect(result.totalRatings).toBe(1247);
  });

  it('parses all 5 star distribution entries from aria-labels', () => {
    const result = parseProductPage(doc);
    expect(result.starDistribution).toHaveLength(5);
  });

  it('sorts distribution 5-star first', () => {
    const result = parseProductPage(doc);
    expect(result.starDistribution[0]?.stars).toBe(5);
    expect(result.starDistribution[4]?.stars).toBe(1);
  });

  it('parses correct percentages from aria-labels', () => {
    const result = parseProductPage(doc);
    const byStars = Object.fromEntries(
      result.starDistribution.map((d) => [d.stars, d.percentage]),
    );
    expect(byStars[5]).toBe(58);
    expect(byStars[4]).toBe(15);
    expect(byStars[3]).toBe(7);
    expect(byStars[2]).toBe(5);
    expect(byStars[1]).toBe(15);
  });
});
