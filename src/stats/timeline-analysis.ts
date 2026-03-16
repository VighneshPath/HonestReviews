import type { ParsedReview } from '../parsers/amazon/review-list.js';

export interface TimelineAnalysis {
  /** Whether a suspicious review burst was detected */
  hasBurst: boolean;
  /** Description of any detected burst */
  burstDescription: string | null;
  /** Reviews grouped by month (ISO year-month key) */
  byMonth: Record<string, number>;
}

/**
 * Analyze review dates for clustering patterns that may indicate review campaigns.
 * Only operates on reviews with parseable dates.
 */
export function analyzeTimeline(reviews: ParsedReview[]): TimelineAnalysis {
  const datedReviews = reviews.filter((r) => r.date !== null);

  if (datedReviews.length < 3) {
    return { hasBurst: false, burstDescription: null, byMonth: {} };
  }

  const byMonth = groupByMonth(datedReviews);
  const burst = detectBurst(byMonth, datedReviews.length);

  return {
    hasBurst: burst !== null,
    burstDescription: burst,
    byMonth,
  };
}

function groupByMonth(reviews: ParsedReview[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const review of reviews) {
    if (!review.date) continue;
    const key = toMonthKey(review.date);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Detect if any single month has a disproportionate share of visible reviews.
 * Threshold: ≥40% of all dated reviews in one month is suspicious.
 */
function detectBurst(byMonth: Record<string, number>, total: number): string | null {
  if (total < 3) return null;

  for (const [month, count] of Object.entries(byMonth)) {
    const share = count / total;
    if (share >= 0.4 && count >= 3) {
      // month is "YYYY-MM" — appending "-01" gives a valid ISO date string
      const monthName = new Date(`${month}-01`).toLocaleString('en', { month: 'long', year: 'numeric' });
      return (
        `${count} of ${total} visible reviews (${Math.round(share * 100)}%) ` +
        `were posted in ${monthName}. A concentrated burst of reviews in a single month ` +
        `can indicate a coordinated review campaign.`
      );
    }
  }

  return null;
}
