// Builds a smooth wave-like path through a set of points using
// simple cubic beziers between consecutive points.
function buildPath(points) {
  if (points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

export default function StressChart({ history }) {
  const width = 560;
  const chartHeight = 160;
  const paddingTop = 20;
  const paddingBottom = 20;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const xStart = 10;
  const xEnd = width - 10;
  const step = (xEnd - xStart) / (history.length - 1);

  const points = history.map((d, i) => ({
    x: xStart + i * step,
    y: paddingTop + usableHeight - (d.value / 100) * usableHeight,
    day: d.day,
  }));

  const linePath = buildPath(points);
  const baseY = chartHeight - 10;
  const fillPath = `${linePath} L${points[points.length - 1].x},${baseY} L${points[0].x},${baseY} Z`;

  return (
    <div className="chart-card">
      <h3>Past 7 days</h3>
      <div className="sub">Stress level, logged each evening</div>
      <svg viewBox={`0 0 ${width} ${chartHeight}`} width="100%" height={chartHeight}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FCFB6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7FCFB6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={fillPath} fill="url(#chartFill)" />
        <path d={linePath} fill="none" stroke="#1F6F8B" strokeWidth="3" strokeLinecap="round" />

        {points.map((p) => (
          <circle key={p.day} cx={p.x} cy={p.y} r="4" fill="#0A3D5C" />
        ))}

        {points.map((p) => (
          <text
            key={`${p.day}-label`}
            x={p.x}
            y={chartHeight - 5}
            fontFamily="Nunito"
            fontSize="11"
            fill="#7a95a2"
            textAnchor="middle"
          >
            {p.day}
          </text>
        ))}
      </svg>
    </div>
  );
}