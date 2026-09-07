import { useEffect, useState } from 'react';

export function useHeartbeat() {
  const [bpm, setBpm] = useState(72);

  useEffect(() => {
    const timer = setInterval(() => {
      setBpm(Math.floor(68 + Math.random() * 8));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return { bpm };
}
