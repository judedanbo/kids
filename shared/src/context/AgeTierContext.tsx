import { createContext, type ReactNode } from 'react';
import type { AgeTier } from '../types';

export const AgeTierContext = createContext<AgeTier>('junior');

interface AgeTierProviderProps {
  tier: AgeTier;
  children: ReactNode;
}

export function AgeTierProvider({ tier, children }: AgeTierProviderProps) {
  return <AgeTierContext.Provider value={tier}>{children}</AgeTierContext.Provider>;
}
