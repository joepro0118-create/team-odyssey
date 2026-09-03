export default function FactorDrawer({ dayForecast, onClose }) {
  if (!dayForecast) return null;

  const { dayLabel, dateStr, score, statusLevel, factors = [] } = dayForecast;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CRITICAL_OVERLOAD':
        return { label: 'Critical Overload', color: 'var(--coral)', bg: 'rgba(242, 164, 111, 0.15)' };
      case 'HEAVY_STRAIN':
        return { label: 'Heavy Strain', color: 'var(--amber)', bg: 'rgba(232, 184, 75, 0.18)' };
      default:
        return { label: 'Balanced Rhythm', color: 'var(--seafoam)', bg: 'rgba(127, 207, 182, 0.18)' };
    }
  };

  const badge = getStatusBadge(statusLevel);
  const stressors = factors.filter((f) => f.type === 'stressor');
  const reliefs = factors.filter((f) => f.type === 'relief');

  const getFactorIcon = (name) => {
    switch (name) {
      case 'Deadlines':
        return '📚';
      case 'High Energy Tasks':
        return '⚡';
      case 'Sleep Debt':
        return '😴';
      case 'Restorative Sleep':
        return '✨';
      case 'Social Isolation':
        return '👤';
      case 'Social Relief':
        return '🤝';
      case 'Recovery Time':
        return '🌊';
      case 'Fatigue Momentum':
        return '⏳';
      case 'Rest Momentum':
        return '🌱';
      default:
        return '🎯';
    }
  };

  return (
    <div className="factor-drawer-card">
      <div className="factor-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <div className="factor-drawer-title">
              {dayLabel} · {dateStr}
            </div>
            <div className="factor-drawer-subtitle">
              Projected Strain Breakdown
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="factor-status-badge"
            style={{ color: badge.color, background: badge.bg }}
          >
            <span style={{ fontWeight: 800, fontSize: '15px' }}>{score}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              {badge.label}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              className="factor-drawer-close"
              onClick={onClose}
              aria-label="Close factor details"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="factor-list">
        {factors.length === 0 ? (
          <div className="factor-empty">
            <span style={{ fontSize: '24px' }}>⛵</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ocean-deep)' }}>Calm Waters</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                No significant strain drivers detected. You have clear headroom today.
              </div>
            </div>
          </div>
        ) : (
          <>
            {stressors.length > 0 && (
              <div className="factor-group">
                <div className="factor-group-label" style={{ color: 'var(--coral-dark)' }}>
                  ▲ Strain Drivers (Pushing Score Up)
                </div>
                {stressors.map((factor, idx) => (
                  <div className="factor-item stressor" key={`stressor-${idx}`}>
                    <span className="factor-icon">{getFactorIcon(factor.name)}</span>
                    <div className="factor-info">
                      <div className="factor-name">{factor.name}</div>
                      <div className="factor-desc">{factor.description}</div>
                    </div>
                    <span className="factor-impact stressor-tag">
                      +{factor.impact}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {reliefs.length > 0 && (
              <div className="factor-group" style={{ marginTop: stressors.length > 0 ? '12px' : '0' }}>
                <div className="factor-group-label" style={{ color: 'var(--ocean-mid)' }}>
                  ▼ Recovery & Relief (Lowering Score)
                </div>
                {reliefs.map((factor, idx) => (
                  <div className="factor-item relief" key={`relief-${idx}`}>
                    <span className="factor-icon">{getFactorIcon(factor.name)}</span>
                    <div className="factor-info">
                      <div className="factor-name">{factor.name}</div>
                      <div className="factor-desc">{factor.description}</div>
                    </div>
                    <span className="factor-impact relief-tag">
                      {factor.impact}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
