import { useState } from 'react';
import { stressHistory } from '../data/mockData';

// Later: persist `mood` on change (API/DB) and load `history` from
// real check-in records instead of the mock array.
export function useMood() {
  const [mood, setMood] = useState(30);
  return { mood, setMood, history: stressHistory };
}