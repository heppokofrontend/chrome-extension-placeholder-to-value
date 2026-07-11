import { beforeEach, describe, expect, it } from 'vitest';
import { ensureSelectionInsideElement } from '../../../content_scripts/utils/ensure-selection-inside-element';

describe('ensureSelectionInsideElement', () => {
  beforeEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  it('要素内に選択範囲が既にあれば何もしない', () => {
    document.body.innerHTML = '<div contenteditable="true">hello</div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    const textNode = div.firstChild;
    if (textNode === null) {
      throw new Error('text node not found');
    }

    const range = document.createRange();
    range.setStart(textNode, 2);
    range.setEnd(textNode, 2);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    ensureSelectionInsideElement(div);

    expect(selection?.anchorNode).toBe(textNode);
    expect(selection?.anchorOffset).toBe(2);
  });

  it('選択範囲が無ければ要素末尾に補正する', () => {
    document.body.innerHTML = '<div contenteditable="true">hello</div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    window.getSelection()?.removeAllRanges();

    ensureSelectionInsideElement(div);

    const selection = window.getSelection();
    expect(selection?.rangeCount).toBe(1);
    expect(div.contains(selection?.anchorNode ?? null)).toBe(true);
    expect(selection?.getRangeAt(0).collapsed).toBe(true);
  });

  it('選択範囲が要素外にあれば要素末尾に補正する', () => {
    document.body.innerHTML = '<div contenteditable="true">hello</div><p>other</p>';
    const div = document.querySelector('div');
    const other = document.querySelector('p');
    if (div === null || other === null) {
      throw new Error('elements not found');
    }

    const range = document.createRange();
    range.selectNodeContents(other);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    ensureSelectionInsideElement(div);

    const selection = window.getSelection();
    expect(div.contains(selection?.anchorNode ?? null)).toBe(true);
  });
});
