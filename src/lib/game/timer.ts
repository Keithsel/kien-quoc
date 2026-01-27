import { createSignal } from 'solid-js';

export interface TimerState {
  remaining: number;
  formatted: string;
  isWarning: boolean;
  isExpired: boolean;
}

const WARNING_THRESHOLD = 10; // seconds

export function createTimer(getPhaseEndTime: () => number, getStatus: () => string) {
  const [remaining, setRemaining] = createSignal(0);

  let interval: number | undefined;

  function start() {
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      const endTime = getPhaseEndTime();
      const status = getStatus();
      if (status === 'playing' && endTime > 0) {
        const rem = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setRemaining(rem);
      } else {
        setRemaining(0);
      }
    }, 100) as unknown as number;
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const state = () => ({
    remaining: remaining(),
    formatted: formatTime(remaining()),
    isWarning: remaining() <= WARNING_THRESHOLD && remaining() > 0,
    isExpired: remaining() === 0
  });

  return { state, start, stop, remaining };
}
