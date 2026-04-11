import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useHighContrast } from '../useHighContrast';

describe('useHighContrast', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-high-contrast');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-high-contrast');
  });

  it('returns false by default', () => {
    const { result } = renderHook(() => useHighContrast());
    expect(result.current.isHighContrast).toBe(false);
  });

  it('toggles high contrast on', () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => {
      result.current.setHighContrast(true);
    });
    expect(result.current.isHighContrast).toBe(true);
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
  });

  it('toggles high contrast off', () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => {
      result.current.setHighContrast(true);
    });
    act(() => {
      result.current.setHighContrast(false);
    });
    expect(result.current.isHighContrast).toBe(false);
    expect(document.documentElement.hasAttribute('data-high-contrast')).toBe(false);
  });
});
