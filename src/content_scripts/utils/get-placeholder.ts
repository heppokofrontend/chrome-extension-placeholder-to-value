const getDescribedByText = (target: HTMLElement) => {
  const ariaDescribedBy = target.getAttribute('aria-describedby');

  if (typeof ariaDescribedBy !== 'string') {
    return '';
  }

  return ariaDescribedBy
    .split(/\s+/)
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent.trim() ?? '')
    .filter((text) => text !== '')
    .join(' ');
};

export const getPlaceholder = (target: HTMLElement) => {
  const isNative = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  const candidates = [
    target.getAttribute('placeholder'),
    target.getAttribute('aria-placeholder'),
    isNative ? '' : getDescribedByText(target),
  ];

  for (const candidate of candidates) {
    const trimmed = (candidate ?? '').trim();

    if (trimmed !== '') {
      return trimmed;
    }
  }

  return '';
};
