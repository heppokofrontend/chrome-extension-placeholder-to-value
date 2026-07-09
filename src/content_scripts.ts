import { INJECTED_MARKER_KEY, MENU_ITEM_ID } from './constants';

type TextField = HTMLInputElement | HTMLTextAreaElement;

let currentTextField: TextField | null = null;

const setNativeValue = ({ field, value }: { field: TextField; value: string }) => {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value);
};

const onWorkerMessage = (
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: boolean) => void,
) => {
  const menuItemId = (() => {
    if (
      typeof message !== 'object' ||
      message === null ||
      !('menuItemId' in message) ||
      typeof message.menuItemId !== 'string'
    ) {
      return undefined;
    }

    return message.menuItemId;
  })();

  if (menuItemId !== MENU_ITEM_ID) {
    sendResponse(false);
    return false;
  }

  if (currentTextField === null || currentTextField.placeholder === '') {
    sendResponse(false);
    return false;
  }

  const { placeholder } = currentTextField;

  setNativeValue({ field: currentTextField, value: currentTextField.value + placeholder });
  currentTextField.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: placeholder,
    }),
  );
  currentTextField.dispatchEvent(new Event('change', { bubbles: true }));

  sendResponse(true);
  return false;
};

const resolveTarget = (target: EventTarget | null | undefined): TextField | null => {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target;
  }
  return null;
};

const onContextMenu = (event: MouseEvent) => {
  const path = event.composedPath();
  currentTextField = resolveTarget(path[0] ?? event.target);

  // フォーカスせずにコンテキストメニューを開いた場合`setNativeValue`が動作しないケースがある
  currentTextField?.focus();
};

// 拡張機能が無効化されても、既に開いていたタブの isolated world は破棄されず
// 幽霊化したまま残ることがある。再度注入されたときは、常に自分が最新のリスナー
// 一式に置き換わり、前のインスタンス（幽霊化した可能性がある方）の後片付けを行う。
const markedWindow = window as typeof window & { [INJECTED_MARKER_KEY]?: () => void };
markedWindow[INJECTED_MARKER_KEY]?.();

chrome.runtime.onMessage.addListener(onWorkerMessage);
window.addEventListener('contextmenu', onContextMenu);

markedWindow[INJECTED_MARKER_KEY] = () => {
  chrome.runtime.onMessage.removeListener(onWorkerMessage);
  window.removeEventListener('contextmenu', onContextMenu);
};
