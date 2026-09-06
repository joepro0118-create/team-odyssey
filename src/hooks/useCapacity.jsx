import { useRef, useState } from 'react';
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
  const [assessment, setAssessment] = useState(null);
  const capacity = assessment?.capacity ?? mockCapacityResponse;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortCtrlRef = useRef(null);

  async function assessCalendar(payload) {
    abortCtrlRef.current?.abort();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(30000)]),
      });
      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Calendar service is unavailable. Start the project with npm run dev and retry.');
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to assess this calendar.');
      if (!json.capacity?.breakdown || !json.input || !json.schedule) {
        throw new Error('Calendar service returned an incomplete result. Please retry.');
      }
      setAssessment(json);
      return json;
    } catch (err) {
      if (ctrl.signal.aborted) return null;
      setError(err.name === 'TimeoutError'
        ? 'The calendar took too long to process. Try a smaller export.'
        : err instanceof TypeError
          ? 'Cannot reach the calendar service. Start the project with npm run dev and retry.'
          : err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function clearAssessment() {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    setAssessment(null);
    setLoading(false);
    setError(null);
  }

  return {
    capacity,
    assessment,
    assessCalendar,
    clearAssessment,
    loading,
    error,
    statusColor: capacity ? STATUS_COLORS[capacity.status_level] ?? 'var(--ocean-mid)' : null,
  };
}
