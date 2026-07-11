import { insertIntoEditable } from './insert-into-editable';
import type { TextFieldInfo } from './types';

/**
 * fieldInfo.element に fieldInfo.placeholder を挿入する。
 *
 * - input/textarea: 既存値の末尾に追記する
 * - contenteditable: カーソル位置に挿入する
 *
 * @returns 挿入に成功したか
 */
export const insertPlaceholderIntoField = (fieldInfo: TextFieldInfo) => {
  const { element, placeholder } = fieldInfo;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const value = element.value + placeholder;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
    return true;
  }

  return insertIntoEditable(fieldInfo);
};
