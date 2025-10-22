import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface NotificationToastProps {
  message: string | null;
  type?: 'error' | 'warning';
  autoDismissMs?: number;
  onDismiss?: () => void;
}

export function NotificationToast({
  message,
  type = 'error',
  autoDismissMs,
  onDismiss,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  useEffect(() => {
    if (message) {
      setIsVisible(true);

      // Auto-dismiss after timeout if configured
      if (autoDismissMs && autoDismissMs > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismissMs);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [message, autoDismissMs, handleDismiss]);

  const isError = type === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;

  return (
    <AnimatePresence>
      {isVisible && message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-1rem)] md:max-w-2xl md:w-[calc(100%-2rem)] md:top-20"
        >
          <div
            className="backdrop-blur-md rounded-md border overflow-hidden shadow-sm md:shadow-md"
            style={{
              backgroundColor: isError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              borderColor: isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            }}
          >
            <div className="px-2.5 py-1.5 flex items-start gap-2 md:px-3 md:py-2 md:gap-2.5">
              <Icon
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 md:w-4 md:h-4"
                style={{
                  color: isError ? 'rgba(248, 113, 113, 0.7)' : 'rgba(251, 191, 36, 0.7)',
                  opacity: 0.8,
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] leading-snug md:text-xs md:leading-relaxed"
                  style={{
                    color: isError ? 'rgba(254, 202, 202, 0.9)' : 'rgba(254, 243, 199, 0.9)',
                  }}
                >
                  {message}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity p-0.5 -mr-0.5"
                style={{ color: isError ? 'rgb(254, 202, 202)' : 'rgb(254, 243, 199)' }}
                aria-label="Dismiss"
              >
                <svg
                  className="w-3 h-3 md:w-3.5 md:h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
