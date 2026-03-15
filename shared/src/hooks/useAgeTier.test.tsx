import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { AgeTierProvider } from '../context/AgeTierContext';
import { useAgeTier } from './useAgeTier';

function wrapper(tier: 'tiny' | 'junior' | 'explorer') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AgeTierProvider tier={tier}>{children}</AgeTierProvider>;
  };
}

describe('useAgeTier', () => {
  it('returns the age tier from context', () => {
    const { result } = renderHook(() => useAgeTier(), { wrapper: wrapper('tiny') });
    expect(result.current).toBe('tiny');
  });

  it('defaults to junior when no provider', () => {
    const { result } = renderHook(() => useAgeTier());
    expect(result.current).toBe('junior');
  });

  it('returns explorer when set', () => {
    const { result } = renderHook(() => useAgeTier(), { wrapper: wrapper('explorer') });
    expect(result.current).toBe('explorer');
  });
});
