/**
 * コンテキストメニュー表示から挿入実行までは chrome.runtime のメッセージ往復を挟む非同期区間があり、
 * その間にフォーカスや選択範囲が要素外に外れることがある。paste/execCommand どちらの挿入経路も
 * 「要素内の選択範囲」を挿入位置として使うため、無ければ要素末尾に補正しておく。
 */
export const ensureSelectionInsideElement = (element: HTMLElement) => {
  const selection = window.getSelection();

  if (selection === null) {
    return;
  }

  if (
    selection.rangeCount === 0 ||
    !element.contains(selection.anchorNode) ||
    !element.contains(selection.focusNode)
  ) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};
