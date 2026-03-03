import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { qualityLabel, qualityColor } from '../stats/review-quality.js';

@customElement('hr-quality-badge')
export class QualityBadge extends LitElement {
  @property({ type: Number }) score = 0;

  static styles = css`
    :host {
      display: inline-block;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      border: 1px solid transparent;
      cursor: default;
      user-select: none;
    }

    .score-text {
      font-variant-numeric: tabular-nums;
    }
  `;

  render() {
    const color = qualityColor(this.score);
    const label = qualityLabel(this.score);

    return html`
      <span
        class="badge"
        style="color: ${color}; border-color: ${color}20; background: ${color}14;"
        title="Review quality score: ${this.score}/100 — ${label}"
        aria-label="Review quality: ${label} (${this.score}/100)"
      >
        <span class="score-text">${this.score}</span>
        <span>${label}</span>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-quality-badge': QualityBadge;
  }
}
