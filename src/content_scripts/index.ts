import { INJECTED_MARKER_KEY, MENU_ITEM_ID } from '../constants';
import { getPlaceholder } from './utils/get-placeholder';
import { resolveTarget } from './utils/resolve-target';
import { insertPlaceholderIntoField } from './utils/insert-placeholder-into-field';

let currentTextFieldElement: HTMLElement | null = null;

const onWorkerMessage = (
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: boolean) => void,
) => {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('menuItemId' in message) ||
    message.menuItemId !== MENU_ITEM_ID
  ) {
    sendResponse(false);
    return false;
  }

  // content script が右クリック後に(activeTab 経由で)注入された場合、その右クリックの
  // contextmenu イベントは誰にも拾われず currentTextFieldElement が空のままになる。
  // 右クリックされた要素は大抵フォーカスを持つため、document.activeElement で救済する。
  const element = currentTextFieldElement ?? resolveTarget(document.activeElement);

  // 一度消費したら使い捨てる。クリアしないと iframe 内フィールドを右クリックした場合などに
  // 古い要素が次回も優先され続け、誤った要素へ挿入しうる。また、次回呼び出し時に
  // document.activeElement へのフォールバックが効く条件でもある。
  currentTextFieldElement = null;

  // 右クリック時点ではなく、実際に挿入する直前にプレースホルダーを読み直す。
  // 動的フォームは右クリックからメニュークリックまでの間にプレースホルダーを書き換えうるため。
  const placeholder = element === null ? '' : getPlaceholder(element);

  if (element === null || placeholder === '') {
    sendResponse(false);
    return false;
  }

  // フォーカスせずに挿入すると`insertPlaceholderIntoField`が動作しないケースがある。
  // メニュー項目が実際にクリックされたときにだけ払うコストにするため、contextmenu 時点ではなくここで行う
  element.focus();

  const inserted = insertPlaceholderIntoField({ element, placeholder });

  if (!inserted) {
    // 挿入できていないのに input/change を発火すると、ページ側が「値が変わった」と
    // 誤認して不整合な状態になりうるため、合成イベントは挿入成功時のみ発火する
    sendResponse(false);
    return false;
  }

  // input/textarea はネイティブの value setter で書き込むため、input/change は自然には
  // 発火しない。合成イベントで補う必要があるのはこのケースだけ。contenteditable は
  // paste 処理か execCommand のどちらかが既にネイティブな input イベントを発火しているため、
  // ここでさらに発火すると二重通知になる。
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: placeholder,
      }),
    );
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  sendResponse(true);
  return false;
};

const onContextMenu = (event: MouseEvent) => {
  const path = event.composedPath();
  currentTextFieldElement = resolveTarget(path[0] ?? event.target);
};

// 追跡中の要素自身がフォーカスを失った場合のみクリアする。target を絞らず全ての focusout で
// クリアすると、無関係な要素間のフォーカス移動のたびに currentTextFieldElement が消えてしまう。
const onFocusOut = (event: FocusEvent) => {
  if (event.target === currentTextFieldElement) {
    currentTextFieldElement = null;
  }
};

// 拡張機能が無効化されても、既に開いていたタブの isolated world は破棄されず
// 幽霊化したまま残ることがある。再度注入されたときは、常に自分が最新のリスナー
// 一式に置き換わり、前のインスタンス（幽霊化した可能性がある方）の後片付けを行う。
const markedWindow = window as typeof window & { [INJECTED_MARKER_KEY]?: () => void };
markedWindow[INJECTED_MARKER_KEY]?.();

chrome.runtime.onMessage.addListener(onWorkerMessage);
window.addEventListener('contextmenu', onContextMenu);
window.addEventListener('focusout', onFocusOut);

markedWindow[INJECTED_MARKER_KEY] = () => {
  chrome.runtime.onMessage.removeListener(onWorkerMessage);
  window.removeEventListener('contextmenu', onContextMenu);
  window.removeEventListener('focusout', onFocusOut);
};
