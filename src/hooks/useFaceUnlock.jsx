import { useEffect, useRef, useState } from 'react';

const EMOTIONS = [
  { name: 'Tired', msg: 'Running low today — a short recovery break will go further than usual.' },
  { name: 'Stressed', msg: 'Load looks heavy right now. One small win first can ease the rest.' },
  { name: 'Calm', msg: "You look steady today — good window to tackle something you've been putting off." },
  { name: 'Focused', msg: 'Sharp and dialed in — a good day to push through the hard task first.' },
];

// Demo-only face "scan": grabs the camera for a live preview and fakes a
// recognition + mood-read sequence on a timer. The mood pick is random —
// swap it for a real emotion-recognition model (e.g. face-api.js) later.
// This hook's returned shape (status / mood / unlocked / readyToContinue)
// is the contract LockScreen depends on, so a swap-in model just needs to
// keep setting these same fields.
export function useFaceUnlock() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Scanning face…');
  const [mood, setMood] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [readyToContinue, setReadyToContinue] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    let stream;
    let cancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch {
        setHasCamera(false); // no permission / no device — LockScreen falls back to an icon
      }
    }
    startCamera();

    const t1 = setTimeout(() => setStatus('Face recognized'), 1800);
    const t2 = setTimeout(() => {
      setStatus('Unlocked');
      setUnlocked(true);
    }, 2300);
    const t3 = setTimeout(() => {
      const pick = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
      setMood(pick);
      setStatus(`Mood read: ${pick.name}`);
      setReadyToContinue(true);
    }, 3400);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, status, mood, unlocked, readyToContinue, hasCamera };
}
