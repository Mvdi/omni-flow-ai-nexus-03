
import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  enabled: boolean;
  interval: number;
  onRefresh: () => void;
}

export const useAutoRefresh = ({ enabled, interval, onRefresh }: UseAutoRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (enabled) {
      intervalRef.current = setInterval(() => {
        onRefresh();
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, onRefresh]);

  return {
    stop: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };
};
