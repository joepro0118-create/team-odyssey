import { useId } from 'react';

/**
 * Builds a smooth wave-like path through a set of points using
 * simple cubic beziers between consecutive points (matching StressChart.jsx).
 */
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

export default function BurnoutForecastChart({
  forecast = [],
  selectedDayIndex = 0,
  onSelectDay = () => {},
}) {
  const gradientId = useId();
  // Expanded dimensions for rich mobile and desktop viewing
  const width = 520;
  const chartHeight = 260;
  const paddingTop = 38;
  const paddingBottom = 34;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const xStart = 32;
  const xEnd = width - 36;
  const step = forecast.length > 1 ? (xEnd - xStart) / (forecast.length - 1) : 0;

  // Map 0–100 strain score to Y coordinate (higher strain = higher on SVG curve)
  const points = forecast.map((d, i) => ({
    x: xStart + i * step,
    y: paddingTop + usableHeight - (d.score / 100) * usableHeight,
    dayIndex: d.dayIndex,
    dayLabel: d.dayLabel,
    dateStr: d.dateStr,
    score: d.score,
    statusLevel: d.statusLevel,
    factors: d.factors,
  }));

  const linePath = buildPath(points);
  const baseY = chartHeight - 16;
  const fillPath = points.length > 0
    ? `${linePath} L${points[points.length - 1].x},${baseY} L${points[0].x},${baseY} Z`
    : '';

  // Threshold indicator lines
  const yThreshold80 = paddingTop + usableHeight - (80 / 100) * usableHeight;
  const yThreshold60 = paddingTop + usableHeight - (60 / 100) * usableHeight;

  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL_OVERLOAD':
        return 'var(--coral)';
      case 'HEAVY_STRAIN':
        return 'var(--amber)';
      default:
        return 'var(--seafoam)';
    }
  };

  return (
    <div className="forecast-chart-card">
      <div className="forecast-chart-header">
        <div>
          <div className="forecast-header-eyebrow">
            7-Day Capacity Horizon
          </div>
          <div className="forecast-header-sub">
            Forward-looking strain (0–100). Tap any day to inspect drivers.
          </div>
        </div>

        {/* Legend */}
        <div className="forecast-legend">
          <span className="forecast-legend-item">
            <span className="legend-dot" style={{ background: 'var(--seafoam)' }} />
            &lt;60
          </span>
          <span className="forecast-legend-item">
            <span className="legend-dot" style={{ background: 'var(--amber)' }} />
            60–79
          </span>
          <span className="forecast-legend-item">
            <span className="legend-dot" style={{ background: 'var(--coral)' }} />
            80+
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible', display: 'block', minHeight: '220px' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2A46F" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#7FCFB6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#CFEEE1" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Threshold reference lines & labels */}
          <line
            x1={xStart - 12}
            y1={yThreshold80}
            x2={xEnd + 12}
            y2={yThreshold80}
            stroke="var(--coral)"
            strokeDasharray="4 4"
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
          <text
            x={xEnd + 10}
            y={yThreshold80 - 5}
            fill="var(--coral-dark)"
            fontSize="10.5"
            fontFamily="Nunito"
            fontWeight="800"
            textAnchor="end"
          >
            80 Overload
          </text>

          <line
            x1={xStart - 12}
            y1={yThreshold60}
            x2={xEnd + 12}
            y2={yThreshold60}
            stroke="var(--amber)"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <text
            x={xEnd + 10}
            y={yThreshold60 - 5}
            fill="var(--amber)"
            fontSize="10.5"
            fontFamily="Nunito"
            fontWeight="800"
            textAnchor="end"
          >
            60 Strain
          </text>

          {/* Wave fill area and curve stroke */}
          {fillPath && <path d={fillPath} fill={`url(#${gradientId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#1F6F8B"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Clickable vertical selection zones & nodes */}
          {points.map((p, i) => {
            const isSelected = selectedDayIndex === i;
            const nodeColor = getStatusColor(p.statusLevel);

            return (
              <g
                key={`node-${p.dayIndex}`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${p.dayLabel} forecast (score ${p.score})`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectDay(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDay(i);
                  }
                }}
              >
                {/* Generous touch hit target */}
                <rect
                  x={p.x - (step || 40) / 2}
                  y={0}
                  width={step || 40}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Selected vertical guide line */}
                {isSelected && (
                  <line
                    x1={p.x}
                    y1={paddingTop - 14}
                    x2={p.x}
                    y2={baseY}
                    stroke="var(--ocean-deep)"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                    opacity="0.45"
                  />
                )}

                {/* Selected outer pulsing ring */}
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12.5"
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="3"
                    opacity="0.55"
                  />
                )}

                {/* Main node circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 7.5 : 5.5}
                  fill={nodeColor}
                  stroke="#FFFDF8"
                  strokeWidth="2.5"
                />

                {/* Score badge above node */}
                <text
                  x={p.x}
                  y={p.y - (isSelected ? 16 : 12)}
                  fontFamily="Quicksand"
                  fontWeight="700"
                  fontSize={isSelected ? '14' : '11.5'}
                  fill={isSelected ? 'var(--ocean-deep)' : '#335061'}
                  textAnchor="middle"
                >
                  {p.score}
                </text>

                {/* Day label below base line */}
                <text
                  x={p.x}
                  y={chartHeight - 4}
                  fontFamily="Nunito"
                  fontSize={isSelected ? '12.5' : '11.5'}
                  fontWeight={isSelected ? '800' : '700'}
                  fill={isSelected ? 'var(--ocean-deep)' : '#7A95A2'}
                  textAnchor="middle"
                >
                  {p.dayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
