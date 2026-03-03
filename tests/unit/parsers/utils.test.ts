import { describe, it, expect } from 'vitest';
import {
  parseRating,
  parseStarLabel,
  parsePercentage,
  parseReviewCount,
  parseHelpfulVotes,
  parseReviewDate,
} from '../../../src/parsers/amazon/utils.js';

describe('parseRating', () => {
  it('parses "4.3 out of 5 stars"', () => {
    expect(parseRating('4.3 out of 5 stars')).toBe(4.3);
  });

  it('parses "5.0 out of 5"', () => {
    expect(parseRating('5.0 out of 5')).toBe(5.0);
  });

  it('parses integer ratings', () => {
    expect(parseRating('4 out of 5 stars')).toBe(4);
  });

  it('returns null for non-rating strings', () => {
    expect(parseRating('no rating here')).toBeNull();
  });
});

describe('parseStarLabel', () => {
  it('parses "5 star"', () => {
    expect(parseStarLabel('5 star')).toBe(5);
  });

  it('parses "1 star"', () => {
    expect(parseStarLabel('1 star')).toBe(1);
  });

  it('returns null for non-matching', () => {
    expect(parseStarLabel('excellent')).toBeNull();
  });
});

describe('parsePercentage', () => {
  it('parses "68%"', () => {
    expect(parsePercentage('68%')).toBe(68);
  });

  it('parses "5%"', () => {
    expect(parsePercentage('5%')).toBe(5);
  });

  it('returns null when no percentage', () => {
    expect(parsePercentage('none')).toBeNull();
  });
});

describe('parseReviewCount', () => {
  it('parses "1,247 ratings"', () => {
    expect(parseReviewCount('1,247 ratings')).toBe(1247);
  });

  it('parses "1.247 Bewertungen" (European format)', () => {
    expect(parseReviewCount('1.247 Bewertungen')).toBe(1247);
  });

  it('parses plain numbers', () => {
    expect(parseReviewCount('500 global ratings')).toBe(500);
  });
});

describe('parseHelpfulVotes', () => {
  it('parses "47 people found this helpful"', () => {
    expect(parseHelpfulVotes('47 people found this helpful')).toBe(47);
  });

  it('parses "One person found this helpful"', () => {
    expect(parseHelpfulVotes('One person found this helpful')).toBe(1);
  });

  it('returns 0 for empty string', () => {
    expect(parseHelpfulVotes('')).toBe(0);
  });

  it('parses comma-separated numbers', () => {
    expect(parseHelpfulVotes('1,234 people found this helpful')).toBe(1234);
  });
});

describe('parseReviewDate', () => {
  it('parses US date format', () => {
    const date = parseReviewDate('Reviewed in the United States on December 10, 2024');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2024);
    expect(date!.getMonth()).toBe(11); // December
    expect(date!.getDate()).toBe(10);
  });

  it('parses plain date string', () => {
    const date = parseReviewDate('January 15, 2024');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2024);
  });

  it('returns null for unparseable string', () => {
    expect(parseReviewDate('not a date at all xyz')).toBeNull();
  });
});
