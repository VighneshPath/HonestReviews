import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AdjustedRatingResult } from '../stats/adjusted-rating.js';
import { formatDelta } from '../stats/adjusted-rating.js';

@customElement('hr-adjusted-rating')
export class AdjustedRatingBadge extends LitElement {
  @property({ type: Object }) result: AdjustedRatingResult | null = null;
  @property({ type: Number }) officialRating: number | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .container {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .rating-block {
      text-align: center;
      min-width: 64px;
    }

    .rating-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
      color: #111827;
    }

    .rating-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    .delta-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }

    .delta-negative { background: #fef3c7; color: #92400e; }
    .delta-positive { background: #dcfce7; color: #166534; }
    .delta-neutral  { background: #f3f4f6; color: #6b7280; }

    .info-block {
      flex: 1;
    }

    .info-main {
      font-size: 13px;
      color: #374151;
      line-height: 1.5;
    }

    .info-sub {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .insufficient {
      font-size: 13px;
      color: #9ca3af;
      font-style: italic;
    }
  `;

  render() {
    const r = this.result;
    if (!r || r.verifiedCount === 0) {
      return html`<p class="insufficient">
        No verified purchase reviews found on this page to calculate an adjusted rating.
      </p>`;
    }

    const delta = r.delta;
    const deltaText = formatDelta(delta);
    const deltaClass =
      delta === null || delta === 0
        ? 'delta-neutral'
        : delta < 0
        ? 'delta-negative'
        : 'delta-positive';

    const infoText = this.buildInfoText(r, delta);

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
          <div class="info-main">${infoText}</div>
          <div class="info-sub">
            Based on ${r.verifiedCount} verified purchase review${r.verifiedCount !== 1 ? 's' : ''}
            of ${r.totalCount} visible
          </div>
        </div>
      </div>
    `;
  }

  private buildInfoText(r: AdjustedRatingResult, delta: number | null): string {
    if (delta === null) {
      return `Verified buyers rate this ${r.verifiedRating?.toFixed(1)}.`;
    }
    if (Math.abs(delta) < 0.1) {
      return `Verified buyers rate this similarly to the listed rating.`;
    }
    const direction = delta < 0 ? 'lower than' : 'higher than';
    return `Verified buyers rate this ${Math.abs(delta).toFixed(1)} stars ${direction} the listed ${this.officialRating?.toFixed(1) ?? '?'}.`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-adjusted-rating': AdjustedRatingBadge;
  }
}
