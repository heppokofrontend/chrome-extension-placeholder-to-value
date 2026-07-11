/* eslint-disable @typescript-eslint/no-deprecated -- テスト対象自体が意図的に execCommand を使っているため */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockExecCommand } from '../../helpers/mock-exec-command';
import { insertIntoEditable } from '../../../content_scripts/utils/insert-into-editable';

describe('insertIntoEditable', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div contenteditable="true">hello</div>';
    mockExecCommand();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paste イベントの clipboardData に value を積んで dispatch する', () => {
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    let received: string | undefined;
    div.addEventListener('paste', (event) => {
      received = event.clipboardData?.getData('text/plain');
    });

    insertIntoEditable({ element: div, placeholder: 'いまどうしてる？' });

    expect(received).toBe('いまどうしてる？');
  });

  it('paste が preventDefault() されたら execCommand は呼ばない(エディタ側が処理済み)', () => {
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    div.addEventListener('paste', (event) => {
      event.preventDefault();
      div.textContent = `${div.textContent}value`;
    });

    const result = insertIntoEditable({ element: div, placeholder: 'value' });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- vitest の toHaveBeenCalled 系イディオム
    expect(document.execCommand).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('preventDefault() されても実際には何も挿入されていなければ失敗とみなす(貼り付けブロッカー)', () => {
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    // 「preventDefault した = 挿入済み」とは限らない。貼り付けをブロックするだけで
    // 何も挿入しないサイトを再現する
    div.addEventListener('paste', (event) => {
      event.preventDefault();
    });

    const result = insertIntoEditable({ element: div, placeholder: 'value' });

    expect(result).toBe(false);
  });

  it('paste が誰にも処理されなければ execCommand で実挿入する(素の contenteditable)', () => {
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    const result = insertIntoEditable({ element: div, placeholder: 'value' });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- vitest の toHaveBeenCalled 系イディオム
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'value');
    expect(result).toBe(true);
  });

  it('execCommand が false を返せば(選択範囲が確立できない等)失敗として伝える', () => {
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    document.execCommand = vi.fn().mockReturnValue(false);

    const result = insertIntoEditable({ element: div, placeholder: 'value' });

    expect(result).toBe(false);
  });

  it('execCommand が例外を投げても外に伝播しない', () => {
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('not allowed');
    });

    expect(() => {
      insertIntoEditable({ element: div, placeholder: 'value' });
    }).not.toThrow();
  });
});
