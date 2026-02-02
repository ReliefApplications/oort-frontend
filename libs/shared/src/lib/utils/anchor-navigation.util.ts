/**
 * Options for anchor navigation behavior
 */
export interface AnchorNavigationOptions {
  containerId?: string;
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
}

/**
 * Result of anchor navigation handling
 */
export interface AnchorNavigationResult {
  handled: boolean;
  scrolled: boolean;
  fragment?: string;
}

/**
 * Internal anchor target information
 */
interface AnchorTarget {
  fragment: string;
  samePage: boolean;
}

const DEFAULT_CONTAINER_ID = 'appPageContainer';
const DISALLOWED_SCHEMES = ['mailto:', 'tel:', 'javascript:'];
const SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll', 'overlay'];
const ANCHOR_SPACER_ATTR = 'data-anchor-scroll-spacer';

/**
 * Safely decodes a URI component
 *
 * @param value - The value to decode
 * @returns The decoded value or original if decoding fails
 */
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Checks if a href uses a disallowed scheme
 *
 * @param href - The href to check
 * @returns True if the scheme is disallowed
 */
const isDisallowedScheme = (href: string): boolean => {
  const normalized = href.trim().toLowerCase();
  return DISALLOWED_SCHEMES.some((scheme) => normalized.startsWith(scheme));
};

/**
 * Normalizes href by converting %23 to #
 *
 * @param href - The href to normalize
 * @returns The normalized href
 */
export const normalizeHref = (href: string): string => {
  if (href.includes('%23') && !href.includes('#')) {
    return href.replace(/%23/gi, '#');
  }
  return href;
};

/**
 * Extracts a fragment from a href, if present
 *
 * @param href - The href to inspect
 * @param document - Optional document for resolving absolute URLs
 * @returns The decoded fragment or null if not present
 */
export const getFragmentFromHref = (
  href: string,
  document?: Document
): string | null => {
  const normalized = normalizeHref(href);
  if (normalized.startsWith('#')) {
    return safeDecode(normalized.slice(1));
  }
  if (normalized.startsWith('/#')) {
    return safeDecode(normalized.slice(2));
  }
  if (normalized.startsWith('%23')) {
    return safeDecode(normalized.slice(3));
  }
  if (normalized.startsWith('/%23')) {
    return safeDecode(normalized.slice(4));
  }
  if (document) {
    try {
      const url = new URL(normalized, document.location.href);
      if (url.hash) {
        return safeDecode(url.hash.slice(1));
      }
      if (url.hash === '#') {
        return '';
      }
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Finds the nearest scrollable ancestor element
 *
 * @param target - The target element
 * @param stopAt - Optional element to stop searching at
 * @returns The scrollable ancestor or null
 */
const findScrollableAncestor = (
  target: HTMLElement,
  stopAt?: HTMLElement
): HTMLElement | null => {
  const win = target.ownerDocument.defaultView;
  if (!win) {
    return null;
  }
  let current: HTMLElement | null = target.parentElement;
  let fallback: HTMLElement | null = null;
  while (current && current !== stopAt) {
    const style = win.getComputedStyle(current);
    const overflowY = style.overflowY || style.overflow;
    const hasScrollableStyle = SCROLLABLE_OVERFLOW_VALUES.includes(overflowY);
    const canScrollY =
      hasScrollableStyle && current.scrollHeight > current.clientHeight;
    if (canScrollY) {
      return current;
    }
    if (hasScrollableStyle && !fallback) {
      fallback = current;
    }
    current = current.parentElement;
  }
  return fallback;
};

/**
 * Ensures there is enough scroll space in the container
 *
 * @param container - The container element
 * @param desiredScrollTop - The desired scroll position
 */
const ensureScrollSpace = (
  container: HTMLElement,
  desiredScrollTop: number
): void => {
  const existingSpacer = container.querySelector(
    `[${ANCHOR_SPACER_ATTR}]`
  ) as HTMLElement | null;
  if (existingSpacer) {
    existingSpacer.remove();
  }

  const maxScroll = container.scrollHeight - container.clientHeight;
  const extraNeeded = desiredScrollTop - maxScroll;
  if (extraNeeded <= 0) {
    return;
  }

  const spacer = container.ownerDocument.createElement('div');
  spacer.setAttribute(ANCHOR_SPACER_ATTR, 'true');
  spacer.style.height = `${Math.ceil(extraNeeded)}px`;
  spacer.style.width = '1px';
  spacer.style.pointerEvents = 'none';
  spacer.style.flex = '0 0 auto';
  container.appendChild(spacer);
};

/**
 * Resolves anchor target information from href
 *
 * @param href - The href to resolve
 * @param document - The document context
 * @returns Anchor target information or null
 */
const resolveAnchorTarget = (
  href: string,
  document: Document
): AnchorTarget | null => {
  if (!href || isDisallowedScheme(href)) {
    return null;
  }

  const normalizedHref = normalizeHref(href);
  let url: URL;
  try {
    url = new URL(normalizedHref, document.location.href);
  } catch {
    return null;
  }

  const rawFragment = url.hash ? url.hash.slice(1) : '';
  if (!rawFragment && url.hash !== '#') {
    return null;
  }

  const fragment = safeDecode(rawFragment);
  const current = new URL(document.location.href);
  const sameOrigin = url.origin === current.origin;
  const samePath = sameOrigin && url.pathname === current.pathname;
  const sameSearch = url.search === current.search;
  const isRootPath =
    url.pathname === '/' || url.pathname === '' || url.pathname == null;
  const samePage =
    (samePath && (sameSearch || !url.search)) ||
    (sameOrigin && isRootPath && !url.search);

  return { fragment, samePage };
};

/**
 * Sets the URL fragment without triggering navigation
 *
 * @param fragment - The fragment to set
 * @param document - The document context
 */
export const setUrlFragment = (fragment: string, document: Document): void => {
  const win = document.defaultView;
  if (!win) {
    return;
  }

  const encoded = fragment ? encodeURIComponent(fragment) : '';
  const { pathname, search } = document.location;
  const hash = encoded ? `#${encoded}` : '';
  win.history.pushState(null, '', `${pathname}${search}${hash}`);
};

/**
 * Scrolls to a fragment within the document
 *
 * @param fragment - The fragment ID to scroll to
 * @param document - The document context
 * @param options - Navigation options
 * @returns True if scrolling was successful
 */
export const scrollToFragment = (
  fragment: string,
  document: Document,
  options: AnchorNavigationOptions = {}
): boolean => {
  const behavior = options.behavior ?? 'auto';
  const block = options.block ?? 'start';
  const containerId = options.containerId ?? DEFAULT_CONTAINER_ID;
  const container = document.getElementById(containerId);

  if (!fragment) {
    if (container) {
      container.scrollTo({ top: 0, behavior });
      return true;
    }
    document.defaultView?.scrollTo({ top: 0, behavior });
    return true;
  }

  const target = document.getElementById(fragment);
  if (!target) {
    return false;
  }

  if (container && container.contains(target)) {
    const scrollContainer =
      findScrollableAncestor(target, container) ?? container;
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offsetTop = targetRect.top - containerRect.top;
    const desiredScrollTop = scrollContainer.scrollTop + offsetTop;
    ensureScrollSpace(scrollContainer, desiredScrollTop);
    scrollContainer.scrollTo({
      top: desiredScrollTop,
      behavior,
    });
    const actualScrollTop = scrollContainer.scrollTop;
    const aligned =
      Math.abs(actualScrollTop - desiredScrollTop) <= 2 ||
      Math.abs(
        target.getBoundingClientRect().top -
          scrollContainer.getBoundingClientRect().top
      ) <= 2;
    return aligned;
  }

  target.scrollIntoView({ behavior, block });
  return true;
};

/**
 * Handles anchor navigation for a given href
 *
 * @param href - The href to navigate to
 * @param document - The document context
 * @param options - Navigation options
 * @returns Navigation result information
 */
export const handleAnchorNavigation = (
  href: string,
  document: Document,
  options: AnchorNavigationOptions = {}
): AnchorNavigationResult => {
  const target = resolveAnchorTarget(href, document);
  if (!target || !target.samePage) {
    return { handled: false, scrolled: false };
  }

  setUrlFragment(target.fragment, document);
  const scrolled = scrollToFragment(target.fragment, document, options);

  return {
    handled: true,
    scrolled,
    fragment: target.fragment,
  };
};
