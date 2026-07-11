// jsdom は DataTransfer を実装していないため、paste イベントのテストで使う最小限のポリフィルを用意する
if (globalThis.DataTransfer === undefined) {
  class DataTransferPolyfill {
    readonly #data = new Map<string, string>();

    setData(format: string, data: string) {
      this.#data.set(format, data);
    }

    getData(format: string) {
      return this.#data.get(format) ?? '';
    }
  }

  // @ts-expect-error -- jsdom に無い DataTransfer をテスト用に補う
  globalThis.DataTransfer = DataTransferPolyfill;
}

// jsdom は ClipboardEvent も実装していないため、同様に最小限のポリフィルを用意する
if (globalThis.ClipboardEvent === undefined) {
  class ClipboardEventPolyfill extends Event {
    clipboardData: DataTransfer | null;

    constructor(
      type: string,
      eventInitDict: EventInit & { clipboardData?: DataTransfer | null } = {},
    ) {
      super(type, eventInitDict);
      this.clipboardData = eventInitDict.clipboardData ?? null;
    }
  }

  // @ts-expect-error -- jsdom に無い ClipboardEvent をテスト用に補う
  globalThis.ClipboardEvent = ClipboardEventPolyfill;
}

// jsdom は isContentEditable を実装しておらず常に undefined を返すため、実ブラウザの挙動を
// 模したポリフィルを用意する。仕様上 contenteditable は true/false/plaintext-only/空文字が
// 有効なキーワードで、それ以外の無効な値(例: "off")は inherit 状態になり、その要素自身では
// 何も決めず祖先の状態をそのまま引き継ぐ。そのため、有効なキーワードに当たるまで祖先を
// 遡って判定する。
const computeIsContentEditable = (element: HTMLElement | null): boolean => {
  if (element === null) {
    return false;
  }

  const value = element.getAttribute('contenteditable')?.toLowerCase();

  if (value === '' || value === 'true' || value === 'plaintext-only') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  // value が null(属性なし)または無効な値の場合は inherit として親を見に行く
  return computeIsContentEditable(element.parentElement);
};

Object.defineProperty(HTMLElement.prototype, 'isContentEditable', {
  configurable: true,
  get(this: HTMLElement) {
    return computeIsContentEditable(this);
  },
});
