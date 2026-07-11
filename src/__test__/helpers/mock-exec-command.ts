import { vi } from 'vitest';

// jsdom は execCommand('insertText') を実装していないため、実際に contenteditable
// 要素へテキストを追記する最小限のモックで代用する
export const mockExecCommand = () => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand = vi.fn((commandId: string, _showUI?: boolean, value?: string) => {
    if (commandId === 'insertText' && typeof value === 'string') {
      const target = document.querySelector('[contenteditable]');
      if (target !== null) {
        target.textContent = `${target.textContent}${value}`;
      }
    }

    return true;
  });
};
