import { useState, useCallback, useRef, type KeyboardEvent, type RefCallback } from 'react';

interface UseRovingTabindexOptions {
  itemCount: number;
  columns?: number;
  wrap?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'grid';
}

interface ItemProps {
  tabIndex: number;
  onKeyDown: (e: KeyboardEvent) => void;
  ref: RefCallback<HTMLElement>;
}

interface UseRovingTabindexReturn {
  activeIndex: number;
  getItemProps: (index: number) => ItemProps;
  setActiveIndex: (index: number) => void;
}

export function useRovingTabindex({
  itemCount,
  columns = 1,
  wrap = true,
  orientation = 'horizontal',
}: UseRovingTabindexOptions): UseRovingTabindexReturn {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const moveTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      itemRefs.current.get(index)?.focus();
    },
    [],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent) => {
      let nextIndex = index;
      const row = Math.floor(index / columns);
      const col = index % columns;

      switch (e.key) {
        case 'ArrowRight': {
          if (orientation === 'vertical') return;
          e.preventDefault();
          if (orientation === 'grid') {
            if (col < columns - 1 && index + 1 < itemCount) {
              nextIndex = index + 1;
            } else if (wrap) {
              nextIndex = row * columns;
            }
          } else {
            // horizontal 1D
            if (index + 1 < itemCount) {
              nextIndex = index + 1;
            } else if (wrap) {
              nextIndex = 0;
            }
          }
          break;
        }
        case 'ArrowLeft': {
          if (orientation === 'vertical') return;
          e.preventDefault();
          if (orientation === 'grid') {
            if (col > 0) {
              nextIndex = index - 1;
            } else if (wrap) {
              nextIndex = Math.min(row * columns + columns - 1, itemCount - 1);
            }
          } else {
            // horizontal 1D
            if (index - 1 >= 0) {
              nextIndex = index - 1;
            } else if (wrap) {
              nextIndex = itemCount - 1;
            }
          }
          break;
        }
        case 'ArrowDown': {
          if (orientation === 'horizontal') return;
          e.preventDefault();
          if (orientation === 'grid') {
            const below = index + columns;
            if (below < itemCount) {
              nextIndex = below;
            } else if (wrap) {
              nextIndex = col;
            }
          } else {
            if (index + 1 < itemCount) {
              nextIndex = index + 1;
            } else if (wrap) {
              nextIndex = 0;
            }
          }
          break;
        }
        case 'ArrowUp': {
          if (orientation === 'horizontal') return;
          e.preventDefault();
          if (orientation === 'grid') {
            const above = index - columns;
            if (above >= 0) {
              nextIndex = above;
            } else if (wrap) {
              const lastRowStart = Math.floor((itemCount - 1) / columns) * columns;
              nextIndex = Math.min(lastRowStart + col, itemCount - 1);
            }
          } else {
            if (index - 1 >= 0) {
              nextIndex = index - 1;
            } else if (wrap) {
              nextIndex = itemCount - 1;
            }
          }
          break;
        }
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = itemCount - 1;
          break;
        default:
          return;
      }

      if (nextIndex !== index) {
        moveTo(nextIndex);
      }
    },
    [itemCount, columns, wrap, orientation, moveTo],
  );

  const getItemProps = useCallback(
    (index: number): ItemProps => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (e: KeyboardEvent) => handleKeyDown(index, e),
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
    }),
    [activeIndex, handleKeyDown],
  );

  return { activeIndex, getItemProps, setActiveIndex };
}
