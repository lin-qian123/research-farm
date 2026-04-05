import type { ReaderScrollSnapshot, ReaderService } from './types';

function queryBlock(container: HTMLElement, blockId: string) {
  return container.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
}

export function createReaderService(): ReaderService {
  return {
    captureScrollSnapshot(container, blockId) {
      if (!container) return null;
      const currentElement = queryBlock(container, blockId);
      const containerTop = container.getBoundingClientRect().top;
      return {
        blockId,
        top: (currentElement?.getBoundingClientRect().top ?? 0) - containerTop,
        containerScrollTop: container.scrollTop ?? 0,
      };
    },
    restoreScrollSnapshot(container, snapshot) {
      if (!container || !snapshot) return false;
      const element = queryBlock(container, snapshot.blockId);
      if (!element) {
        container.scrollTop = snapshot.containerScrollTop;
        return false;
      }

      const containerTop = container.getBoundingClientRect().top;
      const currentTop = element.getBoundingClientRect().top - containerTop;
      const delta = currentTop - snapshot.top;
      if (Math.abs(delta) > 1) {
        container.scrollTop += delta;
      }
      return true;
    },
  };
}
