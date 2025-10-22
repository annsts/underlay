'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { TooltipProvider as RadixTooltipProvider } from '@radix-ui/react-tooltip';

interface TooltipContextValue {
  enabled: boolean;
}

const TooltipContext = createContext<TooltipContextValue>({ enabled: true });

export function useTooltipPreference() {
  return useContext(TooltipContext);
}

interface TooltipProviderProps {
  children: ReactNode;
}

/**
 * Global tooltip provider that wraps the app and manages tooltip preferences
 */
export function TooltipPreferenceProvider({ children }: TooltipProviderProps) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const loadPreference = () => {
      try {
        const storage = typeof window !== 'undefined' ? sessionStorage : null;
        if (!storage) return;

        const savedPrefs = JSON.parse(storage.getItem('underlay-preferences') || '{}');
        setEnabled(savedPrefs.showTooltips ?? true);
      } catch (error) {
        console.error('Error loading tooltip preference:', error);
      }
    };

    loadPreference();

    const handlePreferenceChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.showTooltips !== undefined) {
        setEnabled(customEvent.detail.showTooltips);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('tooltip-preference-changed', handlePreferenceChange);
      return () => window.removeEventListener('tooltip-preference-changed', handlePreferenceChange);
    }
  }, []);

  return (
    <TooltipContext.Provider value={{ enabled }}>
      <RadixTooltipProvider delayDuration={300} skipDelayDuration={200}>
        {children}
      </RadixTooltipProvider>
    </TooltipContext.Provider>
  );
}
