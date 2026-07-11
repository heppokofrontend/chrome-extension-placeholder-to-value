// プレースホルダーの文字列はここでは取得しない。contextmenu 時点から実際に挿入する
// メニュークリック時点までの間にページがプレースホルダーを書き換える動的フォームがあるため、
// 呼び出し元が挿入直前に getPlaceholder で都度読み直せるよう、要素だけを返す。
export const resolveTarget = (target: EventTarget | null | undefined): HTMLElement | null => {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    // contenteditable="off" のような無効値は仕様上 inherit 状態になり、その要素自身は編集ホストにならない。
    // 値を見ずに属性の有無だけで判定すると、無効値の要素で closest が止まってしまうため、有効な true 系キーワードだけにマッチさせる。
    const contentEditable = target.closest(
      '[contenteditable=""], [contenteditable="true" i], [contenteditable="plaintext-only" i]',
    );

    if (contentEditable instanceof HTMLElement) {
      return contentEditable;
    }
  }

  return null;
};
