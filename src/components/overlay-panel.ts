import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ProductPageData } from '../parsers/product.js';
import type { ParsedReview } from '../parsers/review.js';
import type { AdjustedRatingResult } from '../stats/adjusted-rating.js';
import type { DistributionAnalysis } from '../stats/distribution-analysis.js';
import type { TimelineAnalysis } from '../stats/timeline-analysis.js';
import type { FilterState } from './filter-bar.js';
import type { SortMode } from '../stats/review-sorter.js';
import { sortReviews } from '../stats/review-sorter.js';
import { scoreReview, qualityTier, ALL_SIGNALS } from '../stats/review-quality.js';
import type { ReviewSignal } from '../stats/review-quality.js';
import './star-histogram.js';
import './adjusted-rating.js';
import './filter-bar.js';
import styles from './overlay-panel.css?inline';

@customElement('hr-overlay-panel')
export class OverlayPanel extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Object }) productData: ProductPageData | null = null;
  @property({ type: Array })  reviews: ParsedReview[] = [];
  @property({ type: Object }) adjustedRating: AdjustedRatingResult | null = null;
  @property({ type: Object }) distribution: DistributionAnalysis | null = null;
  @property({ type: Object }) timeline: TimelineAnalysis | null = null;
  @property({ type: String }) fetchStatus: 'idle' | 'loading' | 'done' = 'idle';
  @property({ type: Number }) fetchedCount = 0;
  @property({ type: Boolean }) collapsed = false;
  @property({ type: Boolean }) showQualityBadges = true;
  @property({ type: String }) defaultSort: SortMode = 'most-informative';
  @property({ attribute: false }) reviewSignals: ReadonlySet<ReviewSignal> = ALL_SIGNALS;

  @state() private activeTab: 'overview' | 'sort' = 'overview';
  @state() private filterState: FilterState = {
    verifiedOnly: false,
    hasPhotos: false,
    minLength: 0,
    sortMode: 'most-informative',
  };
  @state() private expandedIds: Set<string> = new Set();
  @state() private displayCount = 15;

  // Sync filterState.sortMode with defaultSort before every render that changes it.
  // willUpdate() runs before render(), so setting state here doesn't trigger a second update.
  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('defaultSort')) {
      this.filterState = { ...this.filterState, sortMode: this.defaultSort };
    }
  }

  render() {
    const verifiedCount = this.reviews.filter((r) => r.isVerified).length;
    const verifiedPct = this.reviews.length > 0
      ? Math.round((verifiedCount / this.reviews.length) * 100)
      : null;

    return html`
      <div class="panel">
        <div class="panel-header" @click="${this.toggleCollapse}">
          <div class="panel-title">
            <div class="logo">HR</div>
            <span>Honest Reviews</span>
            <span class="tagline">· No AI, no servers, just transparency</span>
          </div>
          <button
            class="collapse-btn ${this.collapsed ? 'collapsed' : ''}"
            aria-label="${this.collapsed ? 'Expand' : 'Collapse'} panel"
            aria-expanded="${!this.collapsed}"
          >▾</button>
        </div>

        ${!this.collapsed ? html`
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
              ? this.renderOverview(verifiedPct, verifiedCount)
              : this.renderSortTab()}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFetchStatus() {
    if (this.fetchStatus === 'loading') {
      return html`
        <div class="fetch-status">
          <div class="spinner"></div>
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

  private renderOverview(verifiedPct: number | null, verifiedCount: number) {
    return html`
      ${this.renderFetchStatus()}

      ${verifiedPct !== null ? html`
        <div class="verified-ratio">
          <span class="ratio-value">${verifiedPct}%</span>
          <span class="ratio-label">
            verified purchases (${verifiedCount} of ${this.reviews.length} analyzed)
          </span>
        </div>
      ` : ''}

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

      ${this.timeline?.hasBurst ? html`
        <div class="divider"></div>
        <div class="timeline-alert">⚠️ ${this.timeline.burstDescription}</div>
      ` : ''}
    `;
  }

  private renderSortTab() {
    const f = this.filterState;
    let filtered = [...this.reviews];
    if (f.verifiedOnly) filtered = filtered.filter((r) => r.isVerified);
    if (f.hasPhotos)    filtered = filtered.filter((r) => r.hasImages);
    if (f.minLength > 0) filtered = filtered.filter((r) => r.bodyLength >= f.minLength);

    const sorted = sortReviews(filtered, f.sortMode);
    const visible = sorted.slice(0, this.displayCount);
    const remaining = sorted.length - this.displayCount;

    return html`
      <div class="filter-section">
        <hr-filter-bar
          .defaultSort="${this.defaultSort}"
          @filter-change="${this.onFilterChange}"
        ></hr-filter-bar>
      </div>

      <div class="review-count">
        ${filtered.length} review${filtered.length !== 1 ? 's' : ''}
        ${filtered.length < this.reviews.length ? ' matching filters' : ''}
        ${this.fetchStatus === 'loading'
          ? html` · <span class="fetching-label">fetching more…</span>`
          : ''}
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
    const score = scoreReview(review, new Date(), this.reviewSignals).total;
    const tier = qualityTier(score);
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
          ${stars ? html`<span class="stars">${stars}</span>` : ''}
          ${this.showQualityBadges ? html`
            <span class="quality-pill quality-pill--${tier}" title="Quality score: ${score}/100">
              ${score}
            </span>
          ` : ''}
          ${review.isVerified ? html`<span class="verified-badge">✓ Verified</span>` : ''}
        </div>

        ${review.title ? html`<div class="review-title">${review.title}</div>` : ''}

        ${review.body ? html`
          <div class="review-body">${bodyText}</div>
          ${needsTruncation ? html`
            <button class="expand-btn" @click="${() => this.toggleExpanded(review.id)}">
              ${isExpanded ? 'Show less ▲' : 'Show more ▼'}
            </button>
          ` : ''}
        ` : html`<div class="review-body review-body--empty">(no text)</div>`}

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
    this.displayCount = 15;
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
