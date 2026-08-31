const MOOD_STEPS = [
  { max: 20, emoji: '🏄', label: 'Stoked and steady', color: '#7FCFB6' },
  { max: 45, emoji: '🙂', label: 'Feeling steady', color: '#4FA9C4' },
  { max: 70, emoji: '😐', label: 'A little tired', color: '#E8B84B' },
  { max: 88, emoji: '😟', label: 'Running low', color: '#F2A46F' },
  { max: 101, emoji: '⛈️', label: 'Close to burnout', color: '#E07A4A' },
];

function getMoodStep(value) {
  return MOOD_STEPS.find((s) => value < s.max) ?? MOOD_STEPS[MOOD_STEPS.length - 1];
}

export default function MoodSlider({ mood, setMood }) {
  const step = getMoodStep(mood);

  return (
    <div className="mood-card">
      <div className="mood-face">{step.emoji}</div>
      <div className="mood-label">{step.label}</div>
      <input
        type="range"
        min="0"
        max="100"
        value={mood}
        className="mood-slider"
        style={{ accentColor: step.color }}
        onChange={(e) => setMood(Number(e.target.value))}
      />
      <div className="mood-endpoints">
        <span>🏄</span>
        <span>⛈️</span>
      </div>
    </div>
  );
}