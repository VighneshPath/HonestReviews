import { describe, it, expect } from 'vitest';
import { queryFirst, queryAll } from '../../../src/parsers/dom-utils.js';

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('queryFirst', () => {
  it('returns the first matching element for the first selector that matches', () => {
    const doc = makeDoc('<div id="a"></div><span id="b"></span>');
    const el = queryFirst(doc, ['#a', '#b']);
    expect(el?.id).toBe('a');
  });

  it('falls through to the next selector when the first matches nothing', () => {
    const doc = makeDoc('<span id="b"></span>');
    const el = queryFirst(doc, ['#a', '#b']);
    expect(el?.id).toBe('b');
  });

  it('returns null when no selector matches', () => {
    const doc = makeDoc('<div id="x"></div>');
    expect(queryFirst(doc, ['#a', '#b'])).toBeNull();
  });

  it('returns null for an empty selector list', () => {
    const doc = makeDoc('<div id="a"></div>');
    expect(queryFirst(doc, [])).toBeNull();
  });

  it('skips an invalid selector without throwing', () => {
    const doc = makeDoc('<div id="a"></div>');
    const el = queryFirst(doc, ['[invalid!!selector', '#a']);
    expect(el?.id).toBe('a');
  });

  it('works on an Element root as well as Document', () => {
    const doc = makeDoc('<div id="root"><span class="target"></span></div>');
    const root = doc.getElementById('root')!;
    expect(queryFirst(root, ['.target'])).not.toBeNull();
  });
});

describe('queryAll', () => {
  it('returns all elements matched by the first working selector', () => {
    const doc = makeDoc('<div class="item"></div><div class="item"></div><span class="other"></span>');
    const els = queryAll(doc, ['.item', '.other']);
    expect(els).toHaveLength(2);
    expect(els.every((e) => e.className === 'item')).toBe(true);
  });

  it('falls through to the next selector when the first matches nothing', () => {
    const doc = makeDoc('<span class="other"></span>');
    const els = queryAll(doc, ['.item', '.other']);
    expect(els).toHaveLength(1);
    expect(els[0]?.className).toBe('other');
  });

  it('returns an empty array when no selector matches', () => {
    const doc = makeDoc('<div id="x"></div>');
    expect(queryAll(doc, ['.item', '.other'])).toEqual([]);
  });

  it('returns an empty array for an empty selector list', () => {
    const doc = makeDoc('<div class="item"></div>');
    expect(queryAll(doc, [])).toEqual([]);
  });

  it('skips an invalid selector without throwing', () => {
    const doc = makeDoc('<div class="item"></div>');
    const els = queryAll(doc, ['[bad!!sel', '.item']);
    expect(els).toHaveLength(1);
  });

  it('works on an Element root as well as Document', () => {
    const doc = makeDoc('<ul id="list"><li class="row"></li><li class="row"></li></ul>');
    const list = doc.getElementById('list')!;
    expect(queryAll(list, ['.row'])).toHaveLength(2);
  });
});
