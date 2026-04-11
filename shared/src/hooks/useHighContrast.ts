import { useState, useEffect, useCallback } from 'react';

interface UseHighContrastReturn {
  isHighContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

export function useHighContrast(manualOverride?: boolean): UseHighContrastReturn {
  const [osPreference, setOsPreference] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
  });

  const [manualToggle, setManualToggle] = useState(manualOverride ?? false);

  // Listen for OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-contrast: more)');
    const handler = (e: MediaQueryListEvent) => setOsPreference(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Sync manual override from props
  useEffect(() => {
    if (manualOverride !== undefined) {
      setManualToggle(manualOverride);
    }
  }, [manualOverride]);

  const isHighContrast = osPreference || manualToggle;

  // Apply data attribute to document root
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }
  }, [isHighContrast]);

  const setHighContrast = useCallback((enabled: boolean) => {
    setManualToggle(enabled);
  }, []);

  return { isHighContrast, setHighContrast };
}
