'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SessionControlsProps {
  mounted: boolean;
  apiKey: string | null;
  onShowSettings: () => void;
}

/**
 * API key setup notice displayed when no API key is configured
 */
export function SessionControls({ mounted, apiKey, onShowSettings }: SessionControlsProps) {
  if (!mounted || apiKey) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-1rem)] md:max-w-2xl md:w-[calc(100%-2rem)] md:block hidden"
    >
      <div
        className="backdrop-blur-md rounded-md border overflow-hidden shadow-sm md:shadow-md"
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.2)',
        }}
      >
        <div className="px-3 py-2 flex items-start gap-2.5 md:px-3 md:py-2 md:gap-2.5">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse mt-1.5"></div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs leading-relaxed md:text-xs md:leading-relaxed"
              style={{ color: 'rgba(254, 243, 199, 0.9)' }}
            >
              API key required
            </p>
          </div>
          <button
            onClick={onShowSettings}
            className="flex-shrink-0 text-amber-300 hover:text-amber-100 underline text-xs font-medium md:text-xs"
          >
            Setup
          </button>
        </div>
      </div>
    </motion.div>
  );
}
