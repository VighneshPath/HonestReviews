import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StarDistribution } from '../parsers/amazon/product-page.js';
import type { DistributionAnalysis } from '../stats/distribution-analysis.js';
import { PATTERN_LABELS, PATTERN_COLORS } from '../stats/distribution-analysis.js';

@customElement('hr-star-histogram')
export class StarHistogram extends LitElement {
  @property({ type: Array }) distribution: StarDistribution[] = [];
  @property({ type: Object }) analysis: DistributionAnalysis | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .histogram-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .histogram-row {
      display: grid;
      grid-template-columns: 48px 1fr 36px;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .star-label {
      text-align: right;
      color: #555;
      white-space: nowrap;
    }

    .bar-track {
      background: #e5e7eb;
      border-radius: 3px;
      height: 14px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    .bar-fill-5 { background: #22c55e; }
    .bar-fill-4 { background: #86efac; }
    .bar-fill-3 { background: #fbbf24; }
    .bar-fill-2 { background: #f97316; }
    .bar-fill-1 { background: #ef4444; }

    .pct-label {
      color: #374151;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .pattern-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 10px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .pattern-green  { background: #dcfce7; color: #16a34a; }
    .pattern-amber  { background: #fef3c7; color: #d97706; }
    .pattern-orange { background: #ffedd5; color: #ea580c; }
    .pattern-red    { background: #fee2e2; color: #dc2626; }
    .pattern-gray   { background: #f3f4f6; color: #6b7280; }

    .pattern-explanation {
      margin-top: 8px;
      font-size: 12px;
      color: #6b7280;
      line-height: 1.5;
    }

    .concern-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
  `;

  render() {
    if (this.distribution.length === 0) {
      return html`<p style="color:#9ca3af;font-size:13px;">No distribution data available.</p>`;
    }

    const sorted = [...this.distribution].sort((a, b) => b.stars - a.stars);

    return html`
      <div class="histogram-container">
        ${sorted.map((d) => this.renderRow(d))}
      </div>
      ${this.analysis ? this.renderPattern(this.analysis) : ''}
    `;
  }

  private renderRow(d: StarDistribution) {
    const starWord = d.stars === 1 ? 'star' : 'stars';
    return html`
      <div class="histogram-row">
        <span class="star-label">${d.stars} ${starWord}</span>
        <div class="bar-track" role="progressbar" aria-valuenow="${d.percentage}" aria-valuemin="0" aria-valuemax="100">
          <div
            class="bar-fill bar-fill-${d.stars}"
            style="width: ${d.percentage}%"
          ></div>
        </div>
        <span class="pct-label">${d.percentage}%</span>
      </div>
    `;
  }

  private renderPattern(analysis: DistributionAnalysis) {
    const color = PATTERN_COLORS[analysis.pattern];
    const label = PATTERN_LABELS[analysis.pattern];
    return html`
      <div>
        <span class="pattern-badge pattern-${color}">
          <span class="concern-dot"></span>
          ${label}
        </span>
        ${analysis.pattern !== 'normal' && analysis.pattern !== 'insufficient-data'
          ? html`<p class="pattern-explanation">${analysis.explanation}</p>`
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-star-histogram': StarHistogram;
  }
}
