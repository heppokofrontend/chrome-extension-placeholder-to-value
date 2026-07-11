import { describe, expect, it } from 'vitest';
import { resolveTarget } from '../../../content_scripts/utils/resolve-target';

describe('resolveTarget', () => {
  it('input はそのまま element として返す', () => {
    document.body.innerHTML = '<input />';
    const input = document.querySelector('input');

    expect(resolveTarget(input)).toBe(input);
  });

  it('textarea はそのまま element として返す', () => {
    document.body.innerHTML = '<textarea></textarea>';
    const textarea = document.querySelector('textarea');

    expect(resolveTarget(textarea)).toBe(textarea);
  });

  it('contenteditable="true" の要素自身が対象なら返す', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';
    const div = document.querySelector('div');

    expect(resolveTarget(div)).toBe(div);
  });

  it('contenteditable 要素の子孫が対象なら closest で親を返す', () => {
    document.body.innerHTML = `
      <div contenteditable="true">
        <span id="child">text</span>
      </div>
    `;
    const child = document.querySelector('#child');
    const parent = document.querySelector('div');

    expect(resolveTarget(child)).toBe(parent);
  });

  it('contenteditable が値省略(裸属性)でも true 扱いで返す', () => {
    document.body.innerHTML = '<div contenteditable></div>';
    const div = document.querySelector('div');

    expect(resolveTarget(div)).toBe(div);
  });

  it('contenteditable="plaintext-only" の要素自身が対象なら返す', () => {
    document.body.innerHTML = '<div contenteditable="plaintext-only"></div>';
    const div = document.querySelector('div');

    expect(resolveTarget(div)).toBe(div);
  });

  it('contenteditable="TRUE" のような大文字表記でも返す', () => {
    document.body.innerHTML = '<div contenteditable="TRUE"></div>';
    const div = document.querySelector('div');

    expect(resolveTarget(div)).toBe(div);
  });

  it('contenteditable="off" のような無効値は inherit として親のホストまで遡る', () => {
    document.body.innerHTML = `
      <div contenteditable="true">
        <div contenteditable="off">
          <span id="child">text</span>
        </div>
      </div>
    `;
    const child = document.querySelector('#child');
    const root = document.querySelector('div');

    expect(resolveTarget(child)).toBe(root);
  });

  it('contenteditable="false" の要素自身が対象なら null を返す', () => {
    document.body.innerHTML = '<div contenteditable="false"></div>';
    const div = document.querySelector('div');

    expect(resolveTarget(div)).toBeNull();
  });

  it('contenteditable="true" の内側にある contenteditable="false" の島は編集不可として扱う', () => {
    document.body.innerHTML = `
      <div contenteditable="true">
        <div contenteditable="false">
          <span id="child">text</span>
        </div>
      </div>
    `;
    const child = document.querySelector('#child');

    expect(resolveTarget(child)).toBeNull();
  });

  it('該当しない要素は null を返す', () => {
    document.body.innerHTML = '<div></div>';
    const div = document.querySelector('div');

    expect(resolveTarget(div)).toBeNull();
  });

  it('null / undefined は null を返す', () => {
    expect(resolveTarget(null)).toBeNull();
    expect(resolveTarget(undefined)).toBeNull();
  });
});
