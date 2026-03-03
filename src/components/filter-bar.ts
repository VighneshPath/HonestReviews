import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SortMode } from '../stats/review-sorter.js';
import styles from './filter-bar.css?inline';

export interface FilterState {
  verifiedOnly: boolean;
  hasPhotos: boolean;
  minLength: number;
  sortMode: SortMode;
}

export type FilterChangeEvent = CustomEvent<FilterState>;

@customElement('hr-filter-bar')
export class FilterBar extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) defaultSort: SortMode = 'most-informative';

  @state() private filters: FilterState = {
    verifiedOnly: false,
    hasPhotos: false,
    minLength: 0,
    sortMode: 'most-informative',
  };

  protected firstUpdated() {
    this.filters = { ...this.filters, sortMode: this.defaultSort };
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('defaultSort') && changed.get('defaultSort') !== undefined) {
      this.filters = { ...this.filters, sortMode: this.defaultSort };
    }
  }

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
        >✓ Verified only</button>

        <button
          class="toggle-btn ${f.hasPhotos ? 'active' : ''}"
          @click="${() => this.toggle('hasPhotos')}"
          aria-pressed="${f.hasPhotos}"
        >📷 Has photos</button>

        <button
          class="toggle-btn ${f.minLength > 0 ? 'active' : ''}"
          @click="${() => this.toggleMinLength()}"
          aria-pressed="${f.minLength > 0}"
        >📝 Detailed</button>
      </div>
    `;
  }

  private toggle(key: 'verifiedOnly' | 'hasPhotos') {
    this.filters = { ...this.filters, [key]: !this.filters[key] };
    this.emitChange();
  }

  private toggleMinLength() {
    this.filters = { ...this.filters, minLength: this.filters.minLength > 0 ? 0 : 150 };
    this.emitChange();
  }

  private onSortChange(e: Event) {
    this.filters = { ...this.filters, sortMode: (e.target as HTMLSelectElement).value as SortMode };
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(new CustomEvent<FilterState>('filter-change', {
      detail: { ...this.filters },
      bubbles: true,
      composed: true,
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hr-filter-bar': FilterBar;
  }
}
