/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- chrome.* をテスト用に最小限モックするため */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MENU_ITEM_ID } from '../constants';

type OnInstalledListener = () => void;
type OnClickedListener = (info: { menuItemId: string | number }) => void;

let onInstalledListener: OnInstalledListener | undefined;
let onClickedListener: OnClickedListener | undefined;

const createContextMenus = () => ({
  create: vi.fn(),
});

const createChromeMock = ({
  tab,
  sendMessageImpl,
  executeScriptImpl,
}: {
  tab: { id?: number; url?: string } | undefined;
  sendMessageImpl?: (tabId: number, message: unknown) => Promise<unknown>;
  executeScriptImpl?: (details: unknown) => Promise<unknown>;
}) => ({
  i18n: {
    getMessage: vi.fn().mockReturnValue('placeholder into value'),
  },
  runtime: {
    onInstalled: {
      addListener: (listener: OnInstalledListener) => {
        onInstalledListener = listener;
      },
    },
  },
  contextMenus: {
    ...createContextMenus(),
    onClicked: {
      addListener: (listener: OnClickedListener) => {
        onClickedListener = listener;
      },
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([tab]),
    sendMessage: vi.fn(sendMessageImpl ?? (() => Promise.resolve())),
  },
  scripting: {
    executeScript: vi.fn(executeScriptImpl ?? (() => Promise.resolve())),
  },
});

const loadWorker = async (chromeMock: unknown) => {
  vi.resetModules();
  onInstalledListener = undefined;
  onClickedListener = undefined;
  (globalThis as any).chrome = chromeMock;

  await import('../worker');
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onInstalled でコンテキストメニューを http/https 限定・i18n タイトルで作成する', async () => {
    const chromeMock = createChromeMock({ tab: { id: 1, url: 'https://example.com/' } });
    await loadWorker(chromeMock);

    onInstalledListener?.();

    expect((chromeMock as any).contextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MENU_ITEM_ID,
        title: 'placeholder into value',
        contexts: ['editable'],
        documentUrlPatterns: ['http://*/*', 'https://*/*'],
      }),
    );
  });

  it('メニュークリック時、対象タブへ content script が既に注入済みならそのままメッセージを送る', async () => {
    const chromeMock = createChromeMock({ tab: { id: 1, url: 'https://example.com/' } });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: MENU_ITEM_ID });
    await flushMicrotasks();

    expect((chromeMock as any).tabs.sendMessage).toHaveBeenCalledTimes(1);
    expect((chromeMock as any).tabs.sendMessage).toHaveBeenCalledWith(1, {
      menuItemId: MENU_ITEM_ID,
    });
    expect((chromeMock as any).scripting.executeScript).not.toHaveBeenCalled();
  });

  it('未注入のタブでは executeScript で注入してから再送する(inject-and-retry)', async () => {
    let attempt = 0;
    const sendMessageImpl = () => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.reject(new Error('Receiving end does not exist'));
      }
      return Promise.resolve();
    };

    const chromeMock = createChromeMock({
      tab: { id: 1, url: 'https://example.com/' },
      sendMessageImpl,
    });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: MENU_ITEM_ID });
    await flushMicrotasks();

    expect((chromeMock as any).scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 1 },
      files: ['content_scripts.js'],
    });
    expect((chromeMock as any).tabs.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('注入も再送も失敗したら警告を出すだけで例外を投げない', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sendMessageImpl = () => Promise.reject(new Error('Receiving end does not exist'));
    const executeScriptImpl = () => Promise.reject(new Error('Cannot access contents of the page'));

    const chromeMock = createChromeMock({
      tab: { id: 1, url: 'https://example.com/' },
      sendMessageImpl,
      executeScriptImpl,
    });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: MENU_ITEM_ID });
    await flushMicrotasks();

    expect(warnSpy).toHaveBeenCalledWith(
      '[placeholder-into-value] inject-and-retry failed',
      expect.any(Error),
    );
  });

  it('menuItemId が一致しなければ何もしない', async () => {
    const chromeMock = createChromeMock({ tab: { id: 1, url: 'https://example.com/' } });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: 'other' });
    await flushMicrotasks();

    expect((chromeMock as any).tabs.query).not.toHaveBeenCalled();
  });

  it('アクティブタブが無ければ何もしない', async () => {
    const chromeMock = createChromeMock({ tab: undefined });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: MENU_ITEM_ID });
    await flushMicrotasks();

    expect((chromeMock as any).tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('タブの URL が http/https でなければ何もしない(例: chrome:// ページ)', async () => {
    const chromeMock = createChromeMock({ tab: { id: 1, url: 'chrome://settings' } });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: MENU_ITEM_ID });
    await flushMicrotasks();

    expect((chromeMock as any).tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('タブの id が無ければ何もしない', async () => {
    const chromeMock = createChromeMock({ tab: { url: 'https://example.com/' } });
    await loadWorker(chromeMock);

    onClickedListener?.({ menuItemId: MENU_ITEM_ID });
    await flushMicrotasks();

    expect((chromeMock as any).tabs.sendMessage).not.toHaveBeenCalled();
  });
});
