import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AdjustedRatingResult } from '../stats/adjusted-rating.js';
import { formatDelta } from '../stats/adjusted-rating.js';
import styles from './adjusted-rating.css?inline';

@customElement('hr-adjusted-rating')
export class AdjustedRatingBadge extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Object }) result: AdjustedRatingResult | null = null;
  @property({ type: Number }) officialRating: number | null = null;

  render() {
    const r = this.result;
    if (!r || r.verifiedCount === 0) {
      return html`<p class="insufficient">
        No verified purchase reviews found on this page to calculate an adjusted rating.
      </p>`;
    }

    const delta = r.delta;
    const deltaText = formatDelta(delta);
    const deltaClass = delta === null || delta === 0
      ? 'delta-neutral'
      : delta < 0 ? 'delta-negative' : 'delta-positive';

    return html`
      <div class="container">
        <div class="rating-block">
          <div class="rating-value">${r.verifiedRating?.toFixed(1) ?? '—'}</div>
          <div class="rating-label">Verified avg</div>
          ${delta !== null && delta !== 0
            ? html`<span class="delta-badge ${deltaClass}">${deltaText} vs listed</span>`
            : ''}
        </div>
        <div class="info-block">
          <div class="info-main">${this.buildInfoText(r, delta)}</div>
          <div class="info-sub">
            Based on ${r.verifiedCount} verified purchase review${r.verifiedCount !== 1 ? 's' : ''}
            of ${r.totalCount} visible
          </div>
        </div>
      </div>
    `;
  }

  private buildInfoText(r: AdjustedRatingResult, delta: number | null): string {
    if (delta === null) return `Verified buyers rate this ${r.verifiedRating?.toFixed(1)}.`;
    if (Math.abs(delta) < 0.1) return `Verified buyers rate this similarly to the listed rating.`;
    const direction = delta < 0 ? 'lower than' : 'higher than';
    return `Verified buyers rate this ${Math.abs(delta).toFixed(1)} stars ${direction} the listed ${this.officialRating?.toFixed(1) ?? '?'}.`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-adjusted-rating': AdjustedRatingBadge;
  }
}
