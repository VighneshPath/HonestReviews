import { describe, it, expect } from 'vitest';
import { parseHistogramFromText } from '../../../../src/parsers/flipkart/product-page.js';

describe('parseHistogramFromText', () => {
  it('parses "N ★ count" patterns and converts to percentages', () => {
    // "258 ratings and 16 reviews 1 ★ 16 2 ★ 3 3 ★ 11 4 ★ 51 5 ★ 177"
    const text = '258 ratings and 16 reviews 1 \u2605 16 2 \u2605 3 3 \u2605 11 4 \u2605 51 5 \u2605 177';
    const result = parseHistogramFromText(text);

    expect(result).toHaveLength(5);
    // Sorted 5-star first
    expect(result[0]!.stars).toBe(5);
    expect(result[4]!.stars).toBe(1);

    // Total = 16 + 3 + 11 + 51 + 177 = 258
    // 5★: 177/258 ≈ 69%
    expect(result[0]!.percentage).toBe(69);
    // 4★: 51/258 ≈ 20%
    expect(result[1]!.percentage).toBe(20);
    // 1★: 16/258 ≈ 6%
    expect(result[4]!.percentage).toBe(6);
  });

  it('returns empty array when no star pattern found', () => {
    expect(parseHistogramFromText('no ratings here')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseHistogramFromText('')).toEqual([]);
  });

  it('handles partial histogram (only some stars present)', () => {
    const text = '5 \u2605 100 4 \u2605 50';
    const result = parseHistogramFromText(text);
    expect(result).toHaveLength(2);
    expect(result[0]!.stars).toBe(5);
    expect(result[0]!.percentage).toBe(67); // 100/150
    expect(result[1]!.stars).toBe(4);
    expect(result[1]!.percentage).toBe(33); // 50/150
  });

  it('parses Flipkart compact format with comma-separated counts', () => {
    // Reviews page format: "1★2,0532★7133★1,5914★4,5455★12,232"
    const text = '21,134 ratings and 2,142 reviews1\u2605 2,053 2\u2605 713 3\u2605 1,591 4\u2605 4,545 5\u2605 12,232+526';
    const result = parseHistogramFromText(text);
    expect(result).toHaveLength(5);
    expect(result[0]!.stars).toBe(5);
    expect(result[4]!.stars).toBe(1);
    // 5★: 12232/21134 ≈ 58%
    expect(result[0]!.percentage).toBe(58);
    // 1★: 2053/21134 ≈ 10%
    expect(result[4]!.percentage).toBe(10);
  });

  it('parses Flipkart compact format without spaces between entries', () => {
    // Concatenated without spaces as seen in reviews page body text
    const text = '1\u26052,0532\u26057133\u26051,5914\u26054,5455\u260512,232';
    const result = parseHistogramFromText(text);
    expect(result).toHaveLength(5);
    expect(result[0]!.stars).toBe(5);
    expect(result[4]!.stars).toBe(1);
    expect(result[0]!.percentage).toBe(58);
    expect(result[4]!.percentage).toBe(10);
  });
});
