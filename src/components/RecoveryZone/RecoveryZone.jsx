import { useState, useEffect, useCallback, useRef } from 'react';
import { RECOVERY_SPOTS } from '../../data/recoverySpots';

/* ── Dev-mode placeholder warning ─────────────────────────── */
if (import.meta.env.DEV) {
  const unverified = RECOVERY_SPOTS.filter(
    (s) =>
      String(s.rating).includes('VERIFY') ||
      String(s.lat).includes('VERIFY') ||
      String(s.lng).includes('VERIFY')
  );
  if (unverified.length) {
    console.warn(
      `⚠️  Recovery Spots: ${unverified.length} spot(s) still have VERIFY placeholders!\n`,
      unverified.map((s) => `  • ${s.spotName} — rating: ${s.rating}`).join('\n')
    );
  }
}

/* ── Haversine helper ─────────────────────────────────────── */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

function walkTime(meters) {
  const mins = Math.round(meters / 80);
  return `${mins} min walk`;
}

/* ── Category config ──────────────────────────────────────── */
const CATEGORIES = [
  {
    key: 'run',
    label: 'Where to Run',
    icon: '🏃',
    gradient: 'linear-gradient(135deg, #4FA9C4 0%, #7FCFB6 100%)',
  },
  {
    key: 'food',
    label: 'Find Favourite Food',
    icon: '🍜',
    gradient: 'linear-gradient(135deg, #F2A46F 0%, #E8B84B 100%)',
  },
  {
    key: 'chill',
    label: 'Quiet Spot to Chill',
    icon: '🧘',
    gradient: 'linear-gradient(135deg, #7FCFB6 0%, #CFEEE1 100%)',
  },
];

/* ── Main Component ───────────────────────────────────────── */
export default function RecoveryZone() {
  const [expanded, setExpanded] = useState(null); // 'run' | 'food' | 'chill' | null
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { category, spotName, categoryTag, distance, walkTimeStr, rating, aiRationale, mapQuery, vibeTags }
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const cardRefs = useRef({});

  // Scroll expanded card into view
  useEffect(() => {
    if (expanded && cardRefs.current[expanded]) {
      setTimeout(() => {
        cardRefs.current[expanded]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
    }
  }, [expanded, result]);

  const handleToggle = useCallback(
    async (categoryKey) => {
      // Collapse if tapping the same active button
      if (expanded === categoryKey) {
        setExpanded(null);
        setResult(null);
        setError(null);
        return;
      }

      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setExpanded(categoryKey);
      setResult(null);
      setError(null);
      setLoading(true);

      try {
        // 1. Get user location
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('location'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('location')), {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        if (controller.signal.aborted) return;

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // 2. Compute distances for spots in this category
        const categorySpots = RECOVERY_SPOTS.filter((s) => s.category === categoryKey);
        const spotsWithDistance = categorySpots
          .map((spot) => {
            const meters = haversineMeters(userLat, userLng, spot.lat, spot.lng);
            return {
              ...spot,
              meters,
              distance: formatDistance(meters),
              walkTimeStr: walkTime(meters),
            };
          })
          .sort((a, b) => a.meters - b.meters);

        // 3. Call Gemini via backend
        const payload = {
          category: categoryKey,
          spots: spotsWithDistance.map((s) => ({
            spotName: s.spotName,
            categoryTag: s.categoryTag,
            distance: s.distance,
            walkTime: s.walkTimeStr,
            rating: s.rating,
            vibeTags: s.vibeTags,
          })),
        };

        const res = await fetch('/api/recovery-recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error('api');
        }

        const data = await res.json();
        const pickedSpot = spotsWithDistance.find((s) => s.spotName === data.spotName) || spotsWithDistance[0];
        const mapQuery = encodeURIComponent(`${pickedSpot.spotName}, ${pickedSpot.address}`);

        setResult({
          category: categoryKey,
          spotName: pickedSpot.spotName,
          categoryTag: pickedSpot.categoryTag,
          distance: pickedSpot.distance,
          walkTimeStr: pickedSpot.walkTimeStr,
          rating: pickedSpot.rating,
          aiRationale: data.aiRationale,
          mapQuery,
          vibeTags: pickedSpot.vibeTags,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err.message === 'location') {
          setError('location');
        } else {
          setError('api');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [expanded]
  );

  const handleRetry = useCallback(() => {
    if (expanded) handleToggle(expanded);
  }, [expanded, handleToggle]);

  return (
    <section className="column col4">
      <div className="col-eyebrow">Reset</div>
      <h2 className="col-title">Recovery zone</h2>

      <div className="recovery-buttons">
        {CATEGORIES.map((cat) => {
          const isActive = expanded === cat.key;
          const showCard = isActive && (loading || result || error);

          return (
            <div key={cat.key} className="recovery-slot">
              {/* ── Intent Button ── */}
              <button
                id={`recovery-btn-${cat.key}`}
                className={`recovery-intent-btn ${isActive ? 'active' : ''}`}
                style={{ '--btn-gradient': cat.gradient }}
                onClick={() => handleToggle(cat.key)}
                aria-expanded={isActive}
              >
                <span className="recovery-intent-icon">{cat.icon}</span>
                <span className="recovery-intent-label">{cat.label}</span>
                <span className={`recovery-intent-chevron ${isActive ? 'open' : ''}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              {/* ── Expansion Card ── */}
              <div
                ref={(el) => (cardRefs.current[cat.key] = el)}
                className={`recovery-card ${showCard ? 'expanded' : ''}`}
                aria-hidden={!showCard}
              >
                <div className="recovery-card-inner">
                  {/* Loading */}
                  {loading && isActive && (
                    <div className="recovery-loading">
                      <div className="recovery-loading-dots">
                        <span /><span /><span />
                      </div>
                      <p className="recovery-loading-text">Finding your perfect spot…</p>
                    </div>
                  )}

                  {/* Error: location */}
                  {error === 'location' && isActive && (
                    <div className="recovery-error">
                      <span className="recovery-error-icon">📍</span>
                      <p>Enable location to get a recommendation</p>
                      <button className="recovery-retry-btn" onClick={handleRetry}>
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Error: api */}
                  {error === 'api' && isActive && (
                    <div className="recovery-error">
                      <span className="recovery-error-icon">⚡</span>
                      <p>Couldn&rsquo;t get a recommendation right now</p>
                      <button className="recovery-retry-btn" onClick={handleRetry}>
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Result */}
                  {result && isActive && (
                    <>
                      {/* 1. AI Rationale */}
                      <div className="recovery-rationale">
                        <div className="recovery-rationale-label">AI Rationale</div>
                        <p className="recovery-rationale-text">{result.aiRationale}</p>
                      </div>

                      {/* 2. Spot Overview */}
                      <div className="recovery-overview">
                        <h3 className="recovery-spot-name">{result.spotName}</h3>
                        <div className="recovery-spot-meta">
                          <span className="recovery-tag">{result.categoryTag}</span>
                          <span className="recovery-distance">
                            📍 {result.distance} ({result.walkTimeStr})
                          </span>
                          <span className="recovery-rating">⭐ {result.rating}</span>
                        </div>
                        <div className="recovery-vibe-chips">
                          {result.vibeTags.map((tag) => (
                            <span key={tag} className="recovery-vibe-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 3. Map */}
                      <div className="recovery-map-wrap">
                        <iframe
                          className="recovery-map"
                          title={`Map of ${result.spotName}`}
                          src={`https://maps.google.com/maps?q=${result.mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          allowFullScreen
                        />
                      </div>

                      {/* 4. Navigation */}
                      <a
                        className="recovery-nav-btn"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${result.mapQuery}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`recovery-navigate-${result.category}`}
                      >
                        🚶 Start Walking Navigation
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dev-mode VERIFY badge */}
      {import.meta.env.DEV &&
        RECOVERY_SPOTS.some((s) => String(s.rating).includes('VERIFY')) && (
          <div className="recovery-dev-badge">
            ⚠️ Some spots have unverified data
          </div>
        )}
    </section>
  );
}