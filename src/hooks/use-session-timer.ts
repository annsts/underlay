import { useCallback, useRef, useState } from 'react';

export function useSessionTimer() {
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }

    sessionStartTimeRef.current = Date.now();
    setSessionTimeRemaining(600);

    sessionTimerRef.current = setInterval(() => {
      if (!sessionStartTimeRef.current) return;

      const elapsed = (Date.now() - sessionStartTimeRef.current) / 1000;
      const remaining = Math.max(0, 600 - elapsed);
      setSessionTimeRemaining(Math.floor(remaining));

      if (remaining <= 0) {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
        }
      }
    }, 1000);
  }, []);

  const stopSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    sessionStartTimeRef.current = null;
    setSessionTimeRemaining(null);
  }, []);

  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    sessionTimeRemaining,
    startSessionTimer,
    stopSessionTimer,
    formatTimeRemaining,
  };
}
