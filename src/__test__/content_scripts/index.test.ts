/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- chrome.* をテスト用に最小限モックするため */
/* eslint-disable @typescript-eslint/no-deprecated -- テスト対象自体が意図的に execCommand を使っているため */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockExecCommand } from '../helpers/mock-exec-command';
import { MENU_ITEM_ID } from '../../constants';

type WorkerMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: boolean) => void,
) => boolean;

let currentListener: WorkerMessageListener | undefined;

const resetListener = () => {
  currentListener = undefined;
};

const registerListener = (listener: WorkerMessageListener) => {
  currentListener = listener;
};

const unregisterListener = (listener: WorkerMessageListener) => {
  if (currentListener === listener) {
    currentListener = undefined;
  }
};

const loadContentScript = async () => {
  vi.resetModules();
  resetListener();

  (globalThis as any).chrome = {
    runtime: {
      onMessage: {
        addListener: registerListener,
        removeListener: unregisterListener,
      },
    },
  };

  await import('../../content_scripts/index');

  const listener = currentListener;
  if (listener === undefined) {
    throw new Error('onWorkerMessage was not registered');
  }

  return listener;
};

describe('content_scripts/index (onWorkerMessage integration)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockExecCommand();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('input は contextmenu で捕捉した要素の既存値の末尾にプレースホルダーを追記する', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<input placeholder="world" value="hello" />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }

    let insertedData: string | null | undefined;
    input.addEventListener('input', (event) => {
      insertedData = event.data;
    });

    input.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    // 既存値を潰さず末尾に追記する(置換ではない)
    expect(input.value).toBe('helloworld');
    // InputEvent.data は挿入された分(プレースホルダー)のみを表す
    expect(insertedData).toBe('world');
    expect(sendResponse).toHaveBeenCalledWith(true);
  });

  it('contenteditable は既存の中身を保持したままカーソル位置へプレースホルダー単体を挿入する', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<div contenteditable="true" aria-placeholder="world">hello</div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    let inputEventCount = 0;
    div.addEventListener('input', () => {
      inputEventCount += 1;
    });

    div.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- vitest の toHaveBeenCalled 系イディオム
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'world');
    expect(sendResponse).toHaveBeenCalledWith(true);
    // contenteditable は execCommand 自体がネイティブな input を発火する(実ブラウザ挙動)ため、
    // ここで合成 input を重ねて発火すると二重通知になる。jsdom の execCommand モックは
    // input を発火しないので、0 回であることは「合成イベントを追加しなかった」ことの確認になる
    expect(inputEventCount).toBe(0);
  });

  it('contextmenu からメニュークリックまでの間に placeholder が書き換わっても最新の値を挿入する', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<input placeholder="old" />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }

    input.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    // 動的フォームが右クリック後にプレースホルダーを書き換えるケースを再現する
    input.setAttribute('placeholder', 'new');

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    expect(input.value).toBe('new');
    expect(sendResponse).toHaveBeenCalledWith(true);
  });

  it('contextmenu 時点では focus() しない。メニュークリック時点で初めてフォーカスする', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<div contenteditable="true" aria-placeholder="world">hello</div>';
    const div = document.querySelector('div');
    if (div === null) {
      throw new Error('div not found');
    }

    const focusSpy = vi.spyOn(div, 'focus');

    div.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    // メニュー項目をクリックするとは限らないため、右クリックした時点ではフォーカスさせない
    // (ProseMirror/Quill 等の重量級エディターでは、フォーカスのたびに再計算コストがかかりうる)
    expect(focusSpy).not.toHaveBeenCalled();

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('未注入だったタブへ後から注入された場合、contextmenu を取り逃していても document.activeElement から救済する', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<input placeholder="world" value="hello" />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }
    // contextmenu イベントは発火させない(遅延注入で取り逃したケースを再現)。
    // 右クリックされた要素は通常フォーカスを持つため、focus() だけ再現する。
    input.focus();

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    expect(input.value).toBe('helloworld');
    expect(sendResponse).toHaveBeenCalledWith(true);
  });

  it('menuItemId が一致しなければ何もせず false を返す', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<input placeholder="world" value="hello" />';
    const input = document.querySelector('input');
    if (input === null) {
      throw new Error('input not found');
    }
    input.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: 'other' }, {}, sendResponse);

    expect(input.value).toBe('hello');
    expect(sendResponse).toHaveBeenCalledWith(false);
  });

  it('対象を解決できなければ何もせず false を返す', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = '<div></div>';

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(false);
  });

  it('追跡中の要素が focusout すると追跡をクリアし、別要素にフォーカスが移っていればそちらに挿入する', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = `
      <input id="tracked" placeholder="tracked-value" value="" />
      <input id="focused" placeholder="focused-value" value="" />
    `;
    const tracked = document.querySelector<HTMLInputElement>('#tracked');
    const focused = document.querySelector<HTMLInputElement>('#focused');
    if (tracked === null || focused === null) {
      throw new Error('input not found');
    }

    tracked.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    // 右クリック後、メニュークリック前に追跡要素からフォーカスが外れ、
    // 別の要素にフォーカスが移ったケースを再現する
    tracked.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    focused.focus();

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    expect(tracked.value).toBe('');
    expect(focused.value).toBe('focused-value');
    expect(sendResponse).toHaveBeenCalledWith(true);
  });

  it('追跡中の要素以外の focusout では追跡をクリアしない', async () => {
    const onWorkerMessage = await loadContentScript();

    document.body.innerHTML = `
      <input id="tracked" placeholder="tracked-value" value="" />
      <input id="other" value="" />
    `;
    const tracked = document.querySelector<HTMLInputElement>('#tracked');
    const other = document.querySelector<HTMLInputElement>('#other');
    if (tracked === null || other === null) {
      throw new Error('input not found');
    }

    tracked.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    // 追跡対象ではない無関係な要素の focusout は追跡をクリアしないことを確認する
    other.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    const sendResponse = vi.fn();
    onWorkerMessage({ menuItemId: MENU_ITEM_ID }, {}, sendResponse);

    expect(tracked.value).toBe('tracked-value');
    expect(sendResponse).toHaveBeenCalledWith(true);
  });
});
