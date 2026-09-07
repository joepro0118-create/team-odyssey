import { useState } from 'react';
import { stressHistory } from '../data/mockData';

export function useMood() {
  const [mood, setMood] = useState(35);
  const [detectedEmotion, setDetectedEmotion] = useState(null);

  const setMoodFromEmotion = (emotion) => {
    if (!emotion) return;
    const name = typeof emotion === 'string' ? emotion : emotion.name;
    setDetectedEmotion(emotion);
    switch (name) {
      case 'Focused':
      case 'Stoked':
      case 'Energized':
        setMood(15);
        break;
      case 'Calm':
      case 'Steady':
        setMood(35);
        break;
      case 'Tired':
        setMood(65);
        break;
      case 'Stressed':
      case 'Burnout':
        setMood(85);
        break;
      default:
        break;
    }
  };

  return { mood, setMood, setMoodFromEmotion, detectedEmotion, history: stressHistory };
}