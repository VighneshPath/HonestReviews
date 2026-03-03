import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SortMode } from '../stats/review-sorter.js';

export interface FilterState {
  verifiedOnly: boolean;
  hasPhotos: boolean;
  minLength: number;
  sortMode: SortMode;
}

export type FilterChangeEvent = CustomEvent<FilterState>;

@customElement('hr-filter-bar')
export class FilterBar extends LitElement {
  @state() private filters: FilterState = {
    verifiedOnly: false,
    hasPhotos: false,
    minLength: 0,
    sortMode: 'most-informative',
  };

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .filter-label {
      font-size: 11px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      flex-basis: 100%;
      margin-bottom: 2px;
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 16px;
      border: 1px solid #d1d5db;
      background: white;
      font-size: 12px;
      font-family: inherit;
      color: #374151;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .toggle-btn:hover {
      border-color: #9ca3af;
    }

    .toggle-btn.active {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
    }

    .sort-select {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      font-size: 12px;
      font-family: inherit;
      color: #374151;
      background: white;
      cursor: pointer;
    }

    .divider {
      width: 1px;
      height: 20px;
      background: #e5e7eb;
      margin: 0 4px;
    }
  `;

  render() {
    const f = this.filters;
    return html`
      <div class="filter-bar" role="group" aria-label="Review filters">
        <span class="filter-label">Sort & Filter</span>

        <select
          class="sort-select"
          .value="${f.sortMode}"
          @change="${this.onSortChange}"
          aria-label="Sort reviews by"
        >
          <option value="most-informative">Most Informative</option>
          <option value="most-helpful">Most Helpful</option>
          <option value="recent">Most Recent</option>
          <option value="top-rated">Top Rated</option>
          <option value="critical">Critical First</option>
        </select>

        <div class="divider" aria-hidden="true"></div>

        <button
          class="toggle-btn ${f.verifiedOnly ? 'active' : ''}"
          @click="${() => this.toggle('verifiedOnly')}"
          aria-pressed="${f.verifiedOnly}"
        >
          ✓ Verified only
        </button>

        <button
          class="toggle-btn ${f.hasPhotos ? 'active' : ''}"
          @click="${() => this.toggle('hasPhotos')}"
          aria-pressed="${f.hasPhotos}"
        >
          📷 Has photos
        </button>

        <button
          class="toggle-btn ${f.minLength > 0 ? 'active' : ''}"
          @click="${() => this.toggleMinLength()}"
          aria-pressed="${f.minLength > 0}"
        >
          📝 Detailed
        </button>
      </div>
    `;
  }

  private toggle(key: 'verifiedOnly' | 'hasPhotos') {
    this.filters = { ...this.filters, [key]: !this.filters[key] };
    this.emitChange();
  }

  private toggleMinLength() {
    this.filters = {
      ...this.filters,
      minLength: this.filters.minLength > 0 ? 0 : 150,
    };
    this.emitChange();
  }

  private onSortChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as SortMode;
    this.filters = { ...this.filters, sortMode: val };
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent<FilterState>('filter-change', {
        detail: { ...this.filters },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-filter-bar': FilterBar;
  }
}
