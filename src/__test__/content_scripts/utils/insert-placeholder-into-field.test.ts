/* eslint-disable @typescript-eslint/no-deprecated -- テスト対象自体が意図的に execCommand を使っているため */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockExecCommand } from '../../helpers/mock-exec-command';
import { insertPlaceholderIntoField } from '../../../content_scripts/utils/insert-placeholder-into-field';

describe('insertPlaceholderIntoField', () => {
  beforeEach(() => {
    mockExecCommand();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('input はネイティブの value setter で書き込む', () => {
    document.body.innerHTML = '<input />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }

    insertPlaceholderIntoField({ element: input, placeholder: 'いまどうしてる？' });

    expect(input.value).toBe('いまどうしてる？');
  });

  it('input は既存値の末尾に追記する', () => {
    document.body.innerHTML = '<input value="こんにちは" />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }

    insertPlaceholderIntoField({ element: input, placeholder: 'いまどうしてる？' });

    expect(input.value).toBe('こんにちはいまどうしてる？');
  });

  it('textarea はネイティブの value setter で書き込む', () => {
    document.body.innerHTML = '<textarea></textarea>';
    const textarea = document.querySelector('textarea');
    if (textarea === null) {
      throw new Error('textarea not found');
    }

    insertPlaceholderIntoField({ element: textarea, placeholder: 'いまどうしてる？' });

    expect(textarea.value).toBe('いまどうしてる？');
  });

  it('contenteditable は insertIntoEditable 経由(execCommand)で挿入する', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    insertPlaceholderIntoField({ element: div, placeholder: 'いまどうしてる？' });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- vitest の toHaveBeenCalled 系イディオム
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'いまどうしてる？');
  });
});
