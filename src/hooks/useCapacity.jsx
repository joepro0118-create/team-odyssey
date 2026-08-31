import { useEffect, useState } from 'react';
import { mockCapacityResponse } from '../data/mockCapacityResponse';

// The backend sends its own theme_color (red/orange/green), but the app's
// design system avoids harsh reds — so we ignore theme_color and map
// status_level to our own tokens instead. status_level (not the color)
// is the part of the contract we actually care about.
const STATUS_COLORS = {
  CRITICAL_OVERLOAD: 'var(--coral)',
  HEAVY_STRAIN: 'var(--amber)',
  BALANCED: 'var(--seafoam)',
};

export function useCapacity() {
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/capacity'); // Person 3's endpoint
        if (!res.ok) throw new Error(`Capacity API error: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setCapacity(json);
      } catch (err) {
        // Endpoint not up yet (or failed) — fall back to the contract mock
        // so the UI keeps working during development/demo.
        console.warn('Falling back to mock capacity data:', err.message);
        if (!cancelled) {
          setCapacity(mockCapacityResponse);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    capacity,
    loading,
    error,
    statusColor: capacity ? STATUS_COLORS[capacity.status_level] ?? 'var(--ocean-mid)' : null,
  };
}