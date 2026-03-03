import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ProductPageData } from '../parsers/amazon/product-page.js';
import type { ParsedReview } from '../parsers/amazon/review-list.js';
import type { AdjustedRatingResult } from '../stats/adjusted-rating.js';
import type { DistributionAnalysis } from '../stats/distribution-analysis.js';
import type { TimelineAnalysis } from '../stats/timeline-analysis.js';
import type { FilterState } from './filter-bar.js';
import { sortReviews } from '../stats/review-sorter.js';
import { scoreReview, qualityColor } from '../stats/review-quality.js';
import './star-histogram.js';
import './adjusted-rating.js';
import './filter-bar.js';

@customElement('hr-overlay-panel')
export class OverlayPanel extends LitElement {
  @property({ type: Object }) productData: ProductPageData | null = null;
  @property({ type: Array }) reviews: ParsedReview[] = [];
  @property({ type: Object }) adjustedRating: AdjustedRatingResult | null = null;
  @property({ type: Object }) distribution: DistributionAnalysis | null = null;
  @property({ type: Object }) timeline: TimelineAnalysis | null = null;
  @property({ type: String }) fetchStatus: 'idle' | 'loading' | 'done' = 'idle';
  @property({ type: Number }) fetchedCount = 0;

  @state() private collapsed = false;
  @state() private activeTab: 'overview' | 'sort' = 'overview';
  @state() private filterState: FilterState = {
    verifiedOnly: false,
    hasPhotos: false,
    minLength: 0,
    sortMode: 'most-informative',
  };
  @state() private expandedIds: Set<string> = new Set();
  @state() private displayCount = 15;

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --hr-accent: #3b82f6;
      --hr-bg: #ffffff;
      --hr-border: #e5e7eb;
      --hr-text: #111827;
      --hr-text-muted: #6b7280;
    }

    .panel {
      background: var(--hr-bg);
      border: 1px solid var(--hr-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      margin-bottom: 16px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
      border-bottom: 1px solid var(--hr-border);
      cursor: pointer;
      user-select: none;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
      color: var(--hr-text);
    }

    .logo-icon {
      width: 20px;
      height: 20px;
      background: var(--hr-accent);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: 800;
    }

    .tagline {
      font-size: 11px;
      color: var(--hr-text-muted);
      font-weight: 400;
    }

    .collapse-btn {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: var(--hr-text-muted);
      padding: 2px;
      line-height: 1;
      transition: transform 0.2s;
    }

    .collapse-btn.collapsed {
      transform: rotate(-90deg);
    }

    .panel-body {
      padding: 16px;
    }

    .verified-ratio {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 13px;
    }

    .ratio-value {
      font-weight: 700;
      font-size: 18px;
      color: var(--hr-text);
    }

    .ratio-label {
      color: var(--hr-text-muted);
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--hr-text-muted);
      margin-bottom: 10px;
    }

    .divider {
      height: 1px;
      background: var(--hr-border);
      margin: 16px 0;
    }

    .timeline-alert {
      padding: 10px 12px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
      line-height: 1.5;
    }

    .tab-bar {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--hr-border);
      margin-bottom: 16px;
    }

    .tab-btn {
      flex: 1;
      padding: 8px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: var(--hr-text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .tab-btn.active {
      color: var(--hr-accent);
      border-bottom-color: var(--hr-accent);
    }

    .filter-section {
      margin-bottom: 12px;
    }

    .review-count-info {
      font-size: 11px;
      color: var(--hr-text-muted);
      margin-bottom: 8px;
    }

    .review-list {
      display: flex;
      flex-direction: column;
    }

    .review-card {
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .review-card:last-child {
      border-bottom: none;
    }

    .review-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .review-stars {
      color: #f59e0b;
      font-size: 13px;
      letter-spacing: -1px;
    }

    .quality-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      color: white;
      min-width: 22px;
      text-align: center;
    }

    .verified-badge {
      font-size: 10px;
      color: #059669;
      font-weight: 600;
    }

    .review-title {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 3px;
    }

    .review-body {
      font-size: 12px;
      color: #4b5563;
      line-height: 1.6;
    }

    .expand-btn {
      background: none;
      border: none;
      color: var(--hr-accent);
      font-size: 11px;
      padding: 2px 0;
      cursor: pointer;
      font-family: inherit;
      display: block;
      margin-top: 2px;
    }

    .expand-btn:hover {
      text-decoration: underline;
    }

    .review-meta {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .review-images {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .review-thumb {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--hr-border);
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .review-thumb:hover {
      opacity: 0.85;
    }

    .no-reviews {
      text-align: center;
      padding: 24px;
      color: #9ca3af;
      font-size: 13px;
    }

    .load-more-btn {
      display: block;
      width: 100%;
      padding: 8px;
      margin-top: 10px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-family: inherit;
      font-size: 12px;
      color: var(--hr-text-muted);
      cursor: pointer;
      text-align: center;
      transition: background 0.15s;
    }

    .load-more-btn:hover {
      background: #f3f4f6;
    }

    .fetch-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--hr-text-muted);
      margin-bottom: 12px;
    }

    .fetch-spinner {
      width: 10px;
      height: 10px;
      border: 2px solid #e5e7eb;
      border-top-color: var(--hr-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  render() {
    const visibleReviews = this.reviews.filter((r) => r.element !== null);
    const verifiedCount = this.reviews.filter((r) => r.isVerified).length;
    const verifiedPct =
      this.reviews.length > 0
        ? Math.round((verifiedCount / this.reviews.length) * 100)
        : null;

    return html`
      <div class="panel">
        <div class="panel-header" @click="${this.toggleCollapse}">
          <div class="panel-title">
            <div class="logo-icon">HR</div>
            <span>Honest Reviews</span>
            <span class="tagline">· No AI, no servers, just transparency</span>
          </div>
          <button
            class="collapse-btn ${this.collapsed ? 'collapsed' : ''}"
            aria-label="${this.collapsed ? 'Expand' : 'Collapse'} panel"
            aria-expanded="${!this.collapsed}"
          >▾</button>
        </div>

        ${!this.collapsed
          ? html`
            <div class="panel-body">
              <div class="tab-bar">
                <button
                  class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}"
                  @click="${() => (this.activeTab = 'overview')}"
                >Overview</button>
                <button
                  class="tab-btn ${this.activeTab === 'sort' ? 'active' : ''}"
                  @click="${() => (this.activeTab = 'sort')}"
                >Sort & Filter</button>
              </div>

              ${this.activeTab === 'overview'
                ? this.renderOverview(verifiedPct, verifiedCount, visibleReviews.length)
                : this.renderSortTab()}
            </div>
          `
          : ''}
      </div>
    `;
  }

  private renderFetchStatus() {
    if (this.fetchStatus === 'loading') {
      return html`
        <div class="fetch-status">
          <div class="fetch-spinner"></div>
          Fetching more reviews for better stats…
        </div>
      `;
    }
    if (this.fetchStatus === 'done' && this.fetchedCount > 0) {
      return html`
        <div class="fetch-status">
          ✓ Analyzed ${this.reviews.length} reviews
          (${this.fetchedCount} fetched + ${this.reviews.length - this.fetchedCount} visible)
        </div>
      `;
    }
    return '';
  }

  private renderOverview(verifiedPct: number | null, verifiedCount: number, _visibleCount: number) {
    return html`
      ${this.renderFetchStatus()}

      ${verifiedPct !== null
        ? html`
          <div class="verified-ratio">
            <span class="ratio-value">${verifiedPct}%</span>
            <span class="ratio-label">verified purchases
              (${verifiedCount} of ${this.reviews.length} analyzed)</span>
          </div>
        `
        : ''}

      <div class="section">
        <div class="section-title">Rating Distribution</div>
        <hr-star-histogram
          .distribution="${this.productData?.starDistribution ?? []}"
          .analysis="${this.distribution}"
        ></hr-star-histogram>
      </div>

      <div class="divider"></div>

      <div class="section">
        <div class="section-title">Adjusted Rating (Verified Only)</div>
        <hr-adjusted-rating
          .result="${this.adjustedRating}"
          .officialRating="${this.productData?.averageRating ?? null}"
        ></hr-adjusted-rating>
      </div>

      ${this.timeline?.hasBurst
        ? html`
          <div class="divider"></div>
          <div class="timeline-alert">
            ⚠️ ${this.timeline.burstDescription}
          </div>
        `
        : ''}
    `;
  }

  private renderSortTab() {
    const f = this.filterState;
    let filtered = [...this.reviews];
    if (f.verifiedOnly) filtered = filtered.filter((r) => r.isVerified);
    if (f.hasPhotos) filtered = filtered.filter((r) => r.hasImages);
    if (f.minLength > 0) filtered = filtered.filter((r) => r.bodyLength >= f.minLength);

    const sorted = sortReviews(filtered, f.sortMode);
    const visible = sorted.slice(0, this.displayCount);
    const remaining = sorted.length - this.displayCount;

    return html`
      <div class="filter-section">
        <hr-filter-bar @filter-change="${this.onFilterChange}"></hr-filter-bar>
      </div>

      <div class="review-count-info">
        ${filtered.length} review${filtered.length !== 1 ? 's' : ''}
        ${filtered.length < this.reviews.length ? ' matching filters' : ''}
        ${this.fetchStatus === 'loading' ? html` · <span style="color:var(--hr-accent)">fetching more…</span>` : ''}
      </div>

      <div class="review-list">
        ${visible.length === 0
          ? html`<div class="no-reviews">No reviews match the current filters.</div>`
          : visible.map((r) => this.renderReviewCard(r))}
      </div>

      ${remaining > 0 ? html`
        <button class="load-more-btn" @click="${() => (this.displayCount += 15)}">
          Show ${Math.min(15, remaining)} more (${remaining} remaining)
        </button>
      ` : ''}
    `;
  }

  private renderReviewCard(review: ParsedReview) {
    const score = scoreReview(review).total;
    const color = qualityColor(score);
    const isExpanded = this.expandedIds.has(review.id);
    const TRUNCATE_AT = 280;
    const needsTruncation = review.body.length > TRUNCATE_AT;
    const bodyText = needsTruncation && !isExpanded
      ? review.body.slice(0, TRUNCATE_AT) + '…'
      : review.body;

    const stars = review.rating !== null
      ? '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
      : '';

    // "Reviewed in India on 10 December 2024" → "10 December 2024"
    const dateStr = review.dateText.replace(/^.*\bon\s+/i, '').trim() || review.dateText;

    return html`
      <div class="review-card">
        <div class="review-card-header">
          ${stars ? html`<span class="review-stars">${stars}</span>` : ''}
          <span class="quality-pill" style="background:${color}" title="Quality score: ${score}/100">${score}</span>
          ${review.isVerified ? html`<span class="verified-badge">✓ Verified</span>` : ''}
        </div>

        ${review.title ? html`<div class="review-title">${review.title}</div>` : ''}

        ${review.body
          ? html`
            <div class="review-body">${bodyText}</div>
            ${needsTruncation ? html`
              <button class="expand-btn" @click="${() => this.toggleExpanded(review.id)}">
                ${isExpanded ? 'Show less ▲' : 'Show more ▼'}
              </button>
            ` : ''}
          `
          : html`<div class="review-body" style="color:#9ca3af;font-style:italic">(no text)</div>`}

        ${review.images.length > 0 ? html`
          <div class="review-images">
            ${review.images.slice(0, 4).map((url) => html`
              <a href="${url}" target="_blank" rel="noopener noreferrer">
                <img class="review-thumb" src="${url}" alt="Review photo" loading="lazy" />
              </a>
            `)}
          </div>
        ` : ''}

        <div class="review-meta">
          ${review.helpfulVotes > 0 ? `${review.helpfulVotes} found helpful · ` : ''}${dateStr}
        </div>
      </div>
    `;
  }

  private toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  private onFilterChange(e: CustomEvent<FilterState>) {
    this.filterState = e.detail;
    this.displayCount = 15; // reset pagination on filter change
  }

  private toggleExpanded(id: string) {
    const next = new Set(this.expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expandedIds = next;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-overlay-panel': OverlayPanel;
  }
}
