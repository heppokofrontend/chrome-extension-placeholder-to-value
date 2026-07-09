import { MENU_ITEM_ID } from './constants';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    type: 'normal',
    id: MENU_ITEM_ID,
    title: 'placeholder into value',
    contexts: ['editable'],
  });
});

const handleMenuClick = async (menuItemId: string | number) => {
  if (menuItemId !== MENU_ITEM_ID) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (
    tab === undefined ||
    tab.id === undefined ||
    tab.url === undefined ||
    !tab.url.startsWith('http')
  ) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { menuItemId });
  } catch (error) {
    console.warn('[placeholder-into-value] sendMessage failed', error);
  }
};

chrome.contextMenus.onClicked.addListener(({ menuItemId }) => {
  void handleMenuClick(menuItemId);
});

const injectIntoExistingTabs = async () => {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });

  for (const tab of tabs) {
    if (tab.id === undefined) {
      continue;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_scripts.js'],
      });
    } catch {
      // Chrome Web Store やその他の注入禁止ページは失敗するので無視する。
    }
  }
};

void injectIntoExistingTabs();
