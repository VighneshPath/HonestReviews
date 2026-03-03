import { describe, it, expect } from 'vitest';
import { analyzeDistribution } from '../../../src/stats/distribution-analysis.js';
import type { StarDistribution } from '../../../src/parsers/amazon/product-page.js';

function dist(percentages: [number, number, number, number, number]): StarDistribution[] {
  const [p5, p4, p3, p2, p1] = percentages;
  return [
    { stars: 5, percentage: p5 },
    { stars: 4, percentage: p4 },
    { stars: 3, percentage: p3 },
    { stars: 2, percentage: p2 },
    { stars: 1, percentage: p1 },
  ];
}

describe('analyzeDistribution', () => {
  it('returns insufficient-data for fewer than 3 entries', () => {
    const result = analyzeDistribution([{ stars: 5, percentage: 80 }]);
    expect(result.pattern).toBe('insufficient-data');
  });

  it('detects polarized pattern: high 5-star and 1-star, low 3-star', () => {
    // 60% five-star, 5% four-star, 5% three-star, 5% two-star, 25% one-star
    const result = analyzeDistribution(dist([60, 5, 5, 5, 25]));
    expect(result.pattern).toBe('polarized');
    expect(result.concernLevel).toBeGreaterThan(50);
  });

  it('detects overwhelmingly-positive pattern: 90%+ in 4-5 star with 70%+ five-star', () => {
    const result = analyzeDistribution(dist([75, 18, 4, 2, 1]));
    expect(result.pattern).toBe('overwhelmingly-positive');
  });

  it('detects negative-skew when 1-star >= 30%', () => {
    const result = analyzeDistribution(dist([20, 10, 10, 15, 45]));
    expect(result.pattern).toBe('negative-skew');
    expect(result.concernLevel).toBeGreaterThan(40);
  });

  it('detects negative-skew when bottom two >= 35%', () => {
    const result = analyzeDistribution(dist([30, 20, 15, 20, 15]));
    expect(result.pattern).toBe('negative-skew');
  });

  it('returns normal for a healthy distribution', () => {
    // Roughly 40/30/15/10/5 — typical good product
    const result = analyzeDistribution(dist([40, 30, 15, 10, 5]));
    expect(result.pattern).toBe('normal');
    expect(result.concernLevel).toBe(0);
  });

  it('includes byStars breakdown', () => {
    const result = analyzeDistribution(dist([50, 20, 15, 10, 5]));
    expect(result.byStars[5]).toBe(50);
    expect(result.byStars[1]).toBe(5);
  });
});
