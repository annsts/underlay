import { useEffect } from 'react';
import { PlatformConfig } from '@/lib/platform';

/**
 * Minimal hook for VST parameter sync
 * Listens for parameter changes from VST host
 * Sends UI parameter changes back to VST host
 */
export function useVSTSync(onChange: (paramId: number, normalizedValue: number) => void) {
  const isVST = PlatformConfig.isVST;

  // Listen for parameter changes from VST host
  useEffect(() => {
    if (!isVST) return;

    const handleParamChange = (event: Event) => {
      const { paramId, value } = (event as CustomEvent<{ paramId: number; value: number }>).detail;
      onChange(paramId, value);
    };

    window.addEventListener('vstParameterChange', handleParamChange);
    return () => window.removeEventListener('vstParameterChange', handleParamChange);
  }, [isVST, onChange]);
}

/**
 * Send parameter change to VST host
 */
export function setVSTParameter(paramId: number, normalizedValue: number) {
  if (!PlatformConfig.isVST) return;

  // Send to VST via WKWebView message handler
  if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.vstHost) {
    window.webkit.messageHandlers.vstHost.postMessage({
      type: 'parameter',
      paramId,
      value: normalizedValue,
    });
  }
}
