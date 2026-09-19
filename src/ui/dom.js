export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function setButtonLabel(button, text) {
  if (!button) return;
  const target = button.querySelector('[data-label]') ?? button.querySelector('span:last-child');
  if (target) target.textContent = text;
  else button.textContent = text;
}

export function setHidden(selectorOrNode, hidden) {
  const node = typeof selectorOrNode === 'string' ? $(selectorOrNode) : selectorOrNode;
  node?.classList.toggle('hidden', Boolean(hidden));
}
