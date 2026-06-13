import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const threshold = 80;

  useEffect(() => {
    const el = document.getElementById('scroll-root') || document.documentElement;

    const onTouchStart = (e) => {
      if (window.scrollY === 0) startY.current = e.touches[0].clientY;
    };

    const onTouchEnd = async (e) => {
      if (startY.current === null) return;
      const diff = e.changedTouches[0].clientY - startY.current;
      startY.current = null;
      if (diff > threshold && window.scrollY === 0) {
        setRefreshing(true);
        try { await onRefresh(); } finally { setRefreshing(false); }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh]);

  return refreshing;
}
