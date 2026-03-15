import { useContext } from 'react';
import { AgeTierContext } from '../context/AgeTierContext';
import type { AgeTier } from '../types';

export function useAgeTier(): AgeTier {
  return useContext(AgeTierContext);
}
