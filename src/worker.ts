import { MENU_ITEM_ID } from './constants';

// content script の manifest 上の matches (http/https/file) と一致させる。
// chrome:// や他拡張機能のページ(chrome-extension://)には content script を注入できないため、
// それらではメニュー自体を表示しない。表示だけして押しても無反応、という状態を避ける。
const SUPPORTED_URL_PATTERNS = ['http://*/*', 'https://*/*', 'file:///*'];

const isSupportedUrl = (url: string | undefined) =>
  url !== undefined && (url.startsWith('http') || url.startsWith('file://'));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    type: 'normal',
    id: MENU_ITEM_ID,
    title: chrome.i18n.getMessage('menuItemTitle'),
    contexts: ['editable'],
    documentUrlPatterns: SUPPORTED_URL_PATTERNS,
  });
});

const sendMenuMessage = async (tabId: number, menuItemId: string) => {
  await chrome.tabs.sendMessage(tabId, { menuItemId });
};

const handleMenuClick = async (menuItemId: string | number) => {
  if (menuItemId !== MENU_ITEM_ID) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (tab?.id === undefined || !isSupportedUrl(tab.url)) {
    return;
  }

  try {
    await sendMenuMessage(tab.id, menuItemId);
  } catch {
    // 拡張機能の更新直後などで content script が未注入のタブはここに落ちる。
    // activeTab はこのコンテキストメニュー操作で一時的に許可されているため、
    // host_permissions を持たなくても、そのタブに限り実行時注入できる。
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_scripts.js'],
      });
      await sendMenuMessage(tab.id, menuItemId);
    } catch (error) {
      console.warn('[placeholder-into-value] inject-and-retry failed', error);
    }
  }
};

chrome.contextMenus.onClicked.addListener(({ menuItemId }) => {
  void handleMenuClick(menuItemId);
});
