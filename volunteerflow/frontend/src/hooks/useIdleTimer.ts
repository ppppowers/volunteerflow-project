import { useCallback, useEffect, useRef, useState } from 'react';

interface UseIdleTimerOptions {
  warningMs?: number;
  timeoutMs?: number;
  onTimeout: () => void;
}

interface UseIdleTimerResult {
  isWarning: boolean;
  secondsLeft: number;
  reset: () => void;
}

const DEFAULT_WARNING_MS = 9 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export function useIdleTimer({
  warningMs = DEFAULT_WARNING_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onTimeout,
}: UseIdleTimerOptions): UseIdleTimerResult {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Keep latest onTimeout in a ref so it's always current without being a dep
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current !== null) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    warningTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      setSecondsLeft(60);

      countdownIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutTimerRef.current = setTimeout(() => {
        clearAllTimers();
        onTimeoutRef.current();
      }, timeoutMs - warningMs);
    }, warningMs);
  }, [warningMs, timeoutMs, clearAllTimers]);

  const reset = useCallback(() => {
    clearAllTimers();
    setIsWarning(false);
    setSecondsLeft(60);
    startIdleTimer();
  }, [clearAllTimers, startIdleTimer]);

  const handleActivity = useCallback(() => {
    if (!isWarning) {
      clearAllTimers();
      startIdleTimer();
    }
  }, [isWarning, clearAllTimers, startIdleTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    startIdleTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      clearAllTimers();
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [handleActivity, startIdleTimer, clearAllTimers]);

  return { isWarning, secondsLeft, reset };
}
