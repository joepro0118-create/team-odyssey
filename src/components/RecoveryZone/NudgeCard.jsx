import { useState } from 'react';

export default function NudgeCard({ nudge }) {
  const [done, setDone] = useState(false);

  return (
    <div className={`nudge-card ${done ? 'done' : ''}`} onClick={() => setDone((d) => !d)}>
      <div className="nudge-icon">{nudge.icon}</div>
      <div>
        <div className="nudge-title">{nudge.title}</div>
        <div className="nudge-sub">{nudge.sub}</div>
      </div>
      <div className="nudge-check">✓</div>
    </div>
  );
}