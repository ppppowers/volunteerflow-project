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

  // Keep mutable values in refs so timer callbacks always read the latest without
  // causing the effect to re-run or creating stale closures.
  const onTimeoutRef = useRef(onTimeout);
  const isWarningRef = useRef(false);

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
    clearAllTimers();
    warningTimerRef.current = setTimeout(() => {
      isWarningRef.current = true;
      setIsWarning(true);
      setSecondsLeft(60);

      countdownIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);

      timeoutTimerRef.current = setTimeout(() => {
        clearAllTimers();
        onTimeoutRef.current();
      }, timeoutMs - warningMs);
    }, warningMs);
  }, [warningMs, timeoutMs, clearAllTimers]);

  const reset = useCallback(() => {
    isWarningRef.current = false;
    setIsWarning(false);
    setSecondsLeft(60);
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    startIdleTimer();

    // handleActivity is defined inside the effect so it never appears in the
    // dependency array — eliminating the re-run-on-isWarning-change bug.
    // It reads isWarningRef (a ref) to avoid a stale closure on isWarning state.
    const handleActivity = () => {
      if (!isWarningRef.current) {
        startIdleTimer();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      clearAllTimers();
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [startIdleTimer, clearAllTimers]);
  // deps: startIdleTimer changes when warningMs/timeoutMs change — correct, we
  // want to restart the timer when the thresholds change (e.g. auth confirmed).
  // handleActivity is NOT a dep because it's defined inside the effect.

  return { isWarning, secondsLeft, reset };
}
