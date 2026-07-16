import { useEffect, useRef } from 'react';

// Flush interval: Every 60 seconds we send data to backend
const FLUSH_INTERVAL_MS = 60000;

const TAB_LABELS: Record<string, string> = {
  'home': 'Overview',
  'seller-view': 'LTA',
  'l1-home': 'LTA',
  'l2-home': 'LTA',
  'priority': 'Priority/QB Stats',
  'leaderboard': 'Leaderboard',
  'performance': 'Performance',
  'rewards': 'Rewards',
  'mhl': 'MHL / MHO',
  'pipeline': 'Pipeline',
  'roadmap': 'Roadmap',
  'hygiene': 'Hygiene',
  'kpi_view': 'KPI View',
  'selectPersona': 'Select Persona',
  'team': 'Team View',
  'ttk': 'TTK',
  'calendar': 'Calendar',
}

export function useSessionTracker(email: string | null | undefined, activeTab: string | null) {
  // Accumulated time per tab since last flush
  const accumulatedTimeRef = useRef<Record<string, number>>({});
  
  // High resolution timestamp when we last started timing the active tab
  const lastStartTimeRef = useRef<number | null>(null);

  // Sync to database
  const flushToBackend = () => {
    if (!email) return;

    const timeSnapshot = { ...accumulatedTimeRef.current };
    
    // Check if there's actually any time to send
    const hasData = Object.values(timeSnapshot).some((sec) => sec > 0);
    if (!hasData) return;

    // Map internal IDs to beautiful labels
    const mappedSnapshot: Record<string, number> = {};
    for (const [key, value] of Object.entries(timeSnapshot)) {
      const label = TAB_LABELS[key] || key;
      mappedSnapshot[label] = (mappedSnapshot[label] || 0) + value;
    }

    // Reset local accumulated time immediately
    accumulatedTimeRef.current = {};

    const payload = {
      email,
      date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), // YYYY-MM-DD
      tabs: mappedSnapshot
    };

    fetch('/api/track-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(err => console.error('Error tracking session', err));
  };

  // Helper to commit current elapsed time into the accumulator
  const commitCurrentTime = () => {
    if (lastStartTimeRef.current !== null && activeTab) {
      const elapsedSec = (performance.now() - lastStartTimeRef.current) / 1000;
      if (elapsedSec > 0) {
        accumulatedTimeRef.current[activeTab] = (accumulatedTimeRef.current[activeTab] || 0) + elapsedSec;
      }
    }
    // Update start time to now
    lastStartTimeRef.current = performance.now();
  };

  // Handle activeTab changes
  useEffect(() => {
    // If we changed tabs, commit the time for the old tab
    commitCurrentTime();

    if (!activeTab || document.visibilityState !== 'visible' || !document.hasFocus()) {
      lastStartTimeRef.current = null;
    } else {
      lastStartTimeRef.current = performance.now();
    }

    // When the component unmounts entirely
    return () => {
      commitCurrentTime();
    };
  }, [activeTab]);

  // Handle visibility and focus changes (user switches tabs, minimizes, or opens another app)
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        if (activeTab && lastStartTimeRef.current === null) {
          lastStartTimeRef.current = performance.now();
        }
      }
    };

    const handleBlur = () => {
      commitCurrentTime();
      lastStartTimeRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        handleFocus();
      } else {
        handleBlur();
      }
    };

    const handleBeforeUnload = () => {
      commitCurrentTime();
      flushToBackend();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeTab, email]);

  // Set up periodic flush interval
  useEffect(() => {
    const interval = setInterval(() => {
      commitCurrentTime();
      flushToBackend();
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeTab, email]);
}

export function SessionTracker({ email, activeTab }: { email: string | null | undefined, activeTab: string | null }) {
  useSessionTracker(email, activeTab);
  return null;
}

