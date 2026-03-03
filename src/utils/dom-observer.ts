/**
 * MutationObserver wrapper for detecting when Amazon's AJAX loads review content.
 */

export type ObserverCallback = (mutations: MutationRecord[]) => void;

/**
 * Watch for the review list container to be populated (Amazon loads reviews via AJAX).
 * Calls onReady when reviews appear; calls onUpdate when they change (e.g. filter/page).
 */
export function watchForReviews(
  doc: Document,
  onReady: () => void,
  onUpdate: () => void,
): MutationObserver {
  let reviewsReady = false;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check if review elements were added
      const hasNewReviews = Array.from(mutation.addedNodes).some(
        (node) =>
          node instanceof Element &&
          (node.matches('[data-hook="review"]') ||
            node.querySelector('[data-hook="review"]') !== null ||
            node.matches('div.review') ||
            node.querySelector('div.review') !== null),
      );

      if (hasNewReviews) {
        if (!reviewsReady) {
          reviewsReady = true;
          // Small debounce to let all nodes settle
          setTimeout(onReady, 200);
        } else {
          setTimeout(onUpdate, 200);
        }
        break;
      }
    }
  });

  observer.observe(doc.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/**
 * Simple debounce utility.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  }) as T;
}
