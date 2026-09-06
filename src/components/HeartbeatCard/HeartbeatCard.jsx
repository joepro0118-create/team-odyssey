export default function HeartbeatCard({ bpm }) {
  return (
    <div className="heart-card">
      <div className="heart-icon">❤️</div>
      <div>
        <div className="heart-bpm">{bpm} bpm</div>
        <div className="heart-sub">Resting heart rate</div>
      </div>
      <svg className="ecg-line" viewBox="0 0 240 40" preserveAspectRatio="none">
        <polyline
          points="0,20 30,20 40,6 50,34 60,20 90,20 100,20 110,4 120,36 130,20 160,20 170,20 180,6 190,34 200,20 240,20"
          fill="none"
          stroke="#E8935A"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
