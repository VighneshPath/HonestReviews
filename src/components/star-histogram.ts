import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StarDistribution } from '../parsers/product.js';
import type { DistributionAnalysis } from '../stats/distribution-analysis.js';
import { PATTERN_LABELS, PATTERN_COLORS } from '../stats/distribution-analysis.js';
import styles from './star-histogram.css?inline';

@customElement('hr-star-histogram')
export class StarHistogram extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Array }) distribution: StarDistribution[] = [];
  @property({ type: Object }) analysis: DistributionAnalysis | null = null;

  render() {
    if (this.distribution.length === 0) {
      return html`<p class="no-data">No distribution data available.</p>`;
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
          <div class="bar-fill bar-fill-${d.stars}" style="width: ${d.percentage}%"></div>
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
