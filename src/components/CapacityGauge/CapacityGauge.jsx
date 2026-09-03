import { useEffect, useMemo, useState } from 'react';
import BurnoutForecastChart from '../BurnoutForecast/BurnoutForecastChart';
import FactorDrawer from '../BurnoutForecast/FactorDrawer';
import { computeForecast } from '../../utils/forecastEngine';
import {
  mockForecastTasks,
  mockForecastSleepLogs,
  mockForecastSocialEvents,
  mockForecastRecoveryBlocks,
} from '../../data/mockForecastData';

const BAR_CONFIG = [
  { key: 'mental_points', label: 'Mental', max: 40 },
  { key: 'time_points', label: 'Time', max: 30 },
  { key: 'errands_points', label: 'Errands', max: 15 },
];

export default function CapacityGauge({
  capacity,
  statusColor,
  loading,
  error: _error,
  tasks = [],
  sleepLogs = [],
  socialEvents = [],
}) {
  const [animated, setAnimated] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Combine live tasks (today + rebalanced tomorrow) with the future schedule (days 2–6)
  const combinedTasks = useMemo(() => {
    const futureSchedule = mockForecastTasks.filter((t) => t.dayOffset >= 2);
    return [...tasks, ...futureSchedule];
  }, [tasks]);

  const activeSleepLogs = sleepLogs && sleepLogs.length > 0 ? sleepLogs : mockForecastSleepLogs;
  const activeSocialEvents = socialEvents && socialEvents.length > 0 ? socialEvents : mockForecastSocialEvents;

  const forecast = useMemo(() => {
    return computeForecast(
      combinedTasks,
      activeSleepLogs,
      activeSocialEvents,
      mockForecastRecoveryBlocks
    );
  }, [combinedTasks, activeSleepLogs, activeSocialEvents]);

  useEffect(() => {
    if (!capacity) return;
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, [capacity]);

  if (loading && !capacity) {
    return (
      <section className="column col1">
        <div className="col-eyebrow">Today</div>
        <h2 className="col-title">Your capacity</h2>
        <p className="gauge-pct">Loading your capacity…</p>
      </section>
    );
  }

  if (!capacity) {
    return (
      <section className="column col1">
        <div className="col-eyebrow">Today</div>
        <h2 className="col-title">Your capacity</h2>
        <p className="gauge-pct">Couldn't load your capacity right now.</p>
      </section>
    );
  }

  const { total_capacity_percent, breakdown, primary_recommendation } = capacity;
  const fillY = 220 - (total_capacity_percent / 100) * 220;
  const sleepMult = breakdown.sleep_multiplier;
  const socialRelief = breakdown.social_relief_points;

  return (
    <section className="column col1">
      <div
        className="col1-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '22px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="col-eyebrow">{activeTab === 'today' ? 'Today' : 'Horizon'}</div>
          <h2 className="col-title" style={{ margin: 0 }}>
            {activeTab === 'today' ? 'Your capacity' : 'Burnout Forecast'}
          </h2>
        </div>

        {/* Tab Toggle Pill */}
        <div className="view-toggle-pill" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'today'}
            className={`view-toggle-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            Today
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'forecast'}
            className={`view-toggle-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            7-Day Forecast
          </button>
        </div>
      </div>

      {activeTab === 'forecast' ? (
        <div className="forecast-view-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
          <BurnoutForecastChart
            forecast={forecast}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
          />
          {selectedDayIndex !== null && forecast[selectedDayIndex] && (
            <FactorDrawer
              dayForecast={forecast[selectedDayIndex]}
              onClose={() => setSelectedDayIndex(null)}
            />
          )}
        </div>
      ) : (
        <>

      <div className="gauge-wrap">
        <div className="wave-track">
          <svg
            viewBox="0 0 220 220"
            width="220"
            height="220"
            style={{ display: 'block', margin: '0 auto' }}
          >
            <defs>
              <clipPath id="circleClip">
                <circle cx="110" cy="110" r="100" />
              </clipPath>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4FA9C4" />
                <stop offset="100%" stopColor="#0A3D5C" />
              </linearGradient>
            </defs>

            <circle cx="110" cy="110" r="100" fill="#fff" stroke="#E6D3A9" strokeWidth="4" />

            <g clipPath="url(#circleClip)">
              <rect x="0" y="0" width="220" height="220" fill="#EAF3F1" />
              <g transform={`translate(0,${fillY})`}>
                <path
                  d="M-220 10 C -190 -6, -160 26, -130 10 C -100 -6, -70 26, -40 10 C -10 -6, 20 26, 50 10 C 80 -6, 110 26, 140 10 C 170 -6, 200 26, 220 10 C 250 -6 280 26 310 10 L 310 220 L -220 220 Z"
                  fill="url(#waveGrad)"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0 0;-88 0"
                    dur="4.5s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M-220 6 C -190 -10, -160 22, -130 6 C -100 -10, -70 22, -40 6 C -10 -10, 20 22, 50 6 C 80 -10, 110 22, 140 6 C 170 -10, 200 22, 220 6 C 250 -10 280 22 310 6 L 310 220 L -220 220 Z"
                  fill="#7FCFB6"
                  opacity="0.55"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0 0;88 0"
                    dur="3.2s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            </g>

            <circle cx="110" cy="110" r="100" fill="none" stroke="#0A3D5C" strokeWidth="3" />
            <text
              x="110"
              y="102"
              textAnchor="middle"
              fontFamily="Quicksand"
              fontWeight="700"
              fontSize="30"
              fill="#0A3D5C"
            >
              {total_capacity_percent}%
            </text>
            <text
              x="110"
              y="122"
              textAnchor="middle"
              fontFamily="Nunito"
              fontWeight="700"
              fontSize="12"
              fill="#1F6F8B"
            >
              FULL
            </text>
            <text x="83" y="72" fontSize="20">
              🏄
            </text>
          </svg>
        </div>
        <div className="gauge-pct">{primary_recommendation}</div>
      </div>

      <div className="bars-row">
        {BAR_CONFIG.map((cfg) => {
          const value = breakdown[cfg.key];
          const pct = Math.min(100, (value / cfg.max) * 100);
          return (
            <div className="bar-card" key={cfg.key}>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: animated ? `${pct}%` : '0%', background: statusColor }}
                />
              </div>
              <div className="bar-label">{cfg.label}</div>
              <div className="bar-val">
                {value}/{cfg.max}
              </div>
            </div>
          );
        })}
      </div>

      <div className="modifier-row">
        <span className="modifier-chip">
          😴 Sleep ×{sleepMult.toFixed(2)}
        </span>
        <span className="modifier-chip">
          🤝 Social {socialRelief >= 0 ? '+' : ''}
          {socialRelief}
        </span>
      </div>
        </>
      )}
    </section>
  );
}