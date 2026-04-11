import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRovingTabindex } from '../useRovingTabindex';

describe('useRovingTabindex', () => {
  describe('1D horizontal', () => {
    it('starts with activeIndex 0', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 4, orientation: 'horizontal' }),
      );
      expect(result.current.activeIndex).toBe(0);
    });

    it('active item has tabIndex 0, others have -1', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal' }),
      );
      expect(result.current.getItemProps(0).tabIndex).toBe(0);
      expect(result.current.getItemProps(1).tabIndex).toBe(-1);
      expect(result.current.getItemProps(2).tabIndex).toBe(-1);
    });

    it('ArrowRight moves to next item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowRight',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('ArrowLeft moves to previous item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.setActiveIndex(2);
      });
      act(() => {
        result.current.getItemProps(2).onKeyDown({
          key: 'ArrowLeft',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('wraps from last to first', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'horizontal', wrap: true }),
      );
      act(() => {
        result.current.setActiveIndex(2);
      });
      act(() => {
        result.current.getItemProps(2).onKeyDown({
          key: 'ArrowRight',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });

    it('Home moves to first item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 5, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.setActiveIndex(3);
      });
      act(() => {
        result.current.getItemProps(3).onKeyDown({
          key: 'Home',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });

    it('End moves to last item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 5, orientation: 'horizontal' }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'End',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(4);
    });
  });

  describe('1D vertical', () => {
    it('ArrowDown moves to next item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'vertical' }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('ArrowUp moves to previous item', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 3, orientation: 'vertical' }),
      );
      act(() => {
        result.current.setActiveIndex(1);
      });
      act(() => {
        result.current.getItemProps(1).onKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('2D grid', () => {
    it('ArrowRight moves to next column', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3 }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowRight',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('ArrowDown moves to next row', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3 }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowDown',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(3);
    });

    it('ArrowUp moves to previous row', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3 }),
      );
      act(() => {
        result.current.setActiveIndex(4);
      });
      act(() => {
        result.current.getItemProps(4).onKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('does not move past grid boundary when wrap is false', () => {
      const { result } = renderHook(() =>
        useRovingTabindex({ itemCount: 6, orientation: 'grid', columns: 3, wrap: false }),
      );
      act(() => {
        result.current.getItemProps(0).onKeyDown({
          key: 'ArrowUp',
          preventDefault: () => {},
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });
  });
});
