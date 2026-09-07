import { useFaceUnlock } from '../../hooks/useFaceUnlock';

export default function LockScreen({ onContinue }) {
  const { videoRef, status, mood, readyToContinue, hasCamera } = useFaceUnlock();

  return (
    <div className="lock-screen">
      <div className="scan-ring">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: hasCamera ? 'block' : 'none' }}
        />
        {!hasCamera && <div className="fallback-face">🙂</div>}
        <div
          className="scan-line"
          style={{ animationPlayState: readyToContinue ? 'paused' : 'running' }}
        />
      </div>

      <div className="lock-status">{status}</div>
      <div className="lock-sub">{mood?.msg}</div>

      <button className={`continue-btn ${readyToContinue ? 'show' : ''}`} onClick={() => onContinue(mood)}>
        Continue
      </button>
    </div>
  );
}
