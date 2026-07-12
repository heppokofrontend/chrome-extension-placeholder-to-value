import { ensureSelectionInsideElement } from './ensure-selection-inside-element';
import type { TextFieldInfo } from './types';

export const insertIntoEditable = ({ element, placeholder }: TextFieldInfo) => {
  ensureSelectionInsideElement(element);

  const textContentBeforeInsert = element.textContent;

  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', placeholder);

  const defaultActionAllowed = element.dispatchEvent(
    new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    }),
  );

  if (!defaultActionAllowed) {
    // 「エディタ側が paste を処理して自前挿入した」という前提はここでは検証できない。
    // 貼り付けブロッカーを持つサイト(銀行・試験フォーム等)は、何も挿入しないまま
    // preventDefault だけすることがあるため、実際に中身が変化したかで判定する。
    return element.textContent !== textContentBeforeInsert;
  }

  // ここに来るのは、誰も paste を処理しなかった場合(素の contenteditable など)。
  // 合成イベントには本物の貼り付け動作が伴わないため、まだ何も挿入されていない。
  // execCommand は非推奨だが、内部状態を壊さず実際に挿入できる代替手段が無いため
  // ここでは意図的に使う。サイト側の実装によっては拒否されて例外になることがあるため、
  // 失敗しても致命的にならないよう握りつぶす。
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const insertTextSucceeded = document.execCommand('insertText', false, placeholder);

    return insertTextSucceeded && element.textContent !== textContentBeforeInsert;
  } catch {
    // 拾えなかった場合の後続手段は無い。ここで諦める
    return false;
  }
};
