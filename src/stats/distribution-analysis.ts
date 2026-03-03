import type { StarDistribution } from '../parsers/amazon/product-page.js';

export type DistributionPattern =
  | 'overwhelmingly-positive'
  | 'polarized'
  | 'negative-skew'
  | 'normal'
  | 'insufficient-data';

export interface DistributionAnalysis {
  pattern: DistributionPattern;
  /** Human-readable explanation of what the pattern means */
  explanation: string;
  /** 0-100 concern level (0 = no concern, 100 = high concern) */
  concernLevel: number;
  /** Percentage breakdown by star */
  byStars: Record<number, number>;
}

/**
 * Analyze the star distribution histogram for suspicious or notable patterns.
 */
export function analyzeDistribution(
  distribution: StarDistribution[],
): DistributionAnalysis {
  if (distribution.length < 3) {
    return {
      pattern: 'insufficient-data',
      explanation: 'Not enough rating data to analyze distribution patterns.',
      concernLevel: 0,
      byStars: {},
    };
  }

  const byStars = buildByStars(distribution);
  const fiveStar = byStars[5] ?? 0;
  const fourStar = byStars[4] ?? 0;
  const threeStar = byStars[3] ?? 0;
  const twoStar = byStars[2] ?? 0;
  const oneStar = byStars[1] ?? 0;

  const topTwo = fiveStar + fourStar;
  const bottomTwo = oneStar + twoStar;

  // Polarized: high 5-star AND high 1-star, hollow middle
  if (fiveStar >= 50 && oneStar >= 20 && threeStar <= 10) {
    return {
      pattern: 'polarized',
      explanation:
        'This product has a polarized rating distribution — many 5-star and 1-star reviews with few in the middle. ' +
        'This can indicate a product that works well for some users but fails for others, or it may reflect review manipulation (inflated positives alongside genuine negatives).',
      concernLevel: 70,
      byStars,
    };
  }

  // Overwhelmingly positive: 90%+ in 4-5 star
  if (topTwo >= 90 && fiveStar >= 70) {
    return {
      pattern: 'overwhelmingly-positive',
      explanation:
        `${fiveStar}% of ratings are 5-star. Extremely one-sided distributions can sometimes indicate incentivized reviews or review gating (where only satisfied customers are asked to leave reviews). ` +
        'That said, some excellent products do earn near-universal praise.',
      concernLevel: 40,
      byStars,
    };
  }

  // Negative skew: significant 1-star presence
  if (oneStar >= 30) {
    return {
      pattern: 'negative-skew',
      explanation:
        `${oneStar}% of ratings are 1-star, which is unusually high. ` +
        'This often indicates genuine quality issues or reliability problems. Read the 1-star reviews carefully for recurring themes.',
      concernLevel: 60,
      byStars,
    };
  }

  // Also flag if bottom two is large
  if (bottomTwo >= 35) {
    return {
      pattern: 'negative-skew',
      explanation:
        `${bottomTwo}% of ratings are 1-2 stars. This suggests a meaningful portion of buyers are unsatisfied. ` +
        'Look for patterns in the critical reviews before purchasing.',
      concernLevel: 50,
      byStars,
    };
  }

  return {
    pattern: 'normal',
    explanation:
      'The rating distribution looks typical — no unusual patterns detected in the histogram.',
    concernLevel: 0,
    byStars,
  };
}

function buildByStars(distribution: StarDistribution[]): Record<number, number> {
  const result: Record<number, number> = {};
  for (const d of distribution) {
    result[d.stars] = d.percentage;
  }
  return result;
}

/** Human-readable label for each pattern */
export const PATTERN_LABELS: Record<DistributionPattern, string> = {
  'overwhelmingly-positive': 'Overwhelmingly Positive',
  polarized: 'Polarized Distribution',
  'negative-skew': 'Negative Skew',
  normal: 'Normal Distribution',
  'insufficient-data': 'Insufficient Data',
};

/** Color class for each pattern (used in UI) */
export const PATTERN_COLORS: Record<DistributionPattern, string> = {
  'overwhelmingly-positive': 'amber',
  polarized: 'orange',
  'negative-skew': 'red',
  normal: 'green',
  'insufficient-data': 'gray',
};
