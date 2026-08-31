import { useState } from 'react';

export default function LifePreserverButton({ onHideLowPriority }) {
  const [pressed, setPressed] = useState(false);
  const [status, setStatus] = useState('');

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 250);
    onHideLowPriority();
    setStatus('Lower priority tasks hidden for today');
  };

  return (
    <div className="brake-wrap">
      <div className={`life-preserver ${pressed ? 'pressed' : ''}`} onClick={handleClick}>
        <div className="life-preserver-inner" />
      </div>
      <div className="brake-label">Hide lower priority tasks</div>
      <div className="brake-status">{status}</div>
    </div>
  );
}