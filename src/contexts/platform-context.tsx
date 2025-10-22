/**
 * Platform Context
 * Provides platform detection throughout the React component tree
 */

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, PlatformConfig } from '@/lib/platform';

interface PlatformContextValue {
  platform: Platform;
  isVST: boolean;
  isWeb: boolean;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platform, setPlatform] = useState<Platform>(Platform.WEB);

  useEffect(() => {
    // Detect platform on mount (client-side only)
    setPlatform(PlatformConfig.platform);
  }, []);

  const value: PlatformContextValue = {
    platform,
    isVST: platform === Platform.VST,
    isWeb: platform === Platform.WEB,
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to access platform information
 * @throws {Error} If used outside of PlatformProvider
 */
export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);

  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }

  return context;
}
