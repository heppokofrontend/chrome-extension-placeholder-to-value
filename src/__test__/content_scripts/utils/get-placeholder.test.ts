import { describe, expect, it } from 'vitest';
import { getPlaceholder } from '../../../content_scripts/utils/get-placeholder';

describe('getPlaceholder', () => {
  it('placeholder 属性を優先して返す', () => {
    document.body.innerHTML =
      '<input placeholder=" いまどうしてる？ " aria-placeholder="無視される" />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }

    expect(getPlaceholder(input)).toBe('いまどうしてる？');
  });

  it('placeholder が無ければ aria-placeholder を返す', () => {
    document.body.innerHTML = '<div aria-placeholder="ここに入力"></div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('ここに入力');
  });

  it('aria-placeholder が空文字なら aria-describedby 先のテキストを返す', () => {
    document.body.innerHTML = `
      <div aria-placeholder="" aria-describedby="hint"></div>
      <span id="hint">  ヒントの本文  </span>
    `;
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('ヒントの本文');
  });

  it('aria-placeholder が空白のみなら aria-describedby 先のテキストを返す', () => {
    document.body.innerHTML = `
      <div aria-placeholder="   " aria-describedby="hint"></div>
      <span id="hint">  ヒントの本文  </span>
    `;
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('ヒントの本文');
  });

  it('placeholder も aria-placeholder も無ければ aria-describedby 先のテキストを返す', () => {
    document.body.innerHTML = `
      <div aria-describedby="hint"></div>
      <span id="hint">  ヒントの本文  </span>
    `;
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('ヒントの本文');
  });

  it('aria-describedby が複数IDの場合はそれぞれのテキストを結合して返す', () => {
    document.body.innerHTML = `
      <div aria-describedby="hint error-msg"></div>
      <span id="hint">  ヒントの本文  </span>
      <span id="error-msg">  エラー文  </span>
    `;
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('ヒントの本文 エラー文');
  });

  it('aria-describedby の複数IDのうち一部が存在しなければ存在するものだけ返す', () => {
    document.body.innerHTML = `
      <div aria-describedby="missing hint"></div>
      <span id="hint">  ヒントの本文  </span>
    `;
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('ヒントの本文');
  });

  it('aria-describedby の参照先が存在しなければ空文字を返す', () => {
    document.body.innerHTML = '<div aria-describedby="missing"></div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('');
  });

  it('何も無ければ空文字を返す', () => {
    document.body.innerHTML = '<div></div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    expect(getPlaceholder(div)).toBe('');
  });
});
