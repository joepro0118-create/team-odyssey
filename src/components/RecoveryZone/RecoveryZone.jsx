import { useState, useEffect, useCallback, useRef } from 'react';
import { RECOVERY_SPOTS } from '../../data/recoverySpots';
import SupportCallCard from './SupportCallCard';

/* ── Fallback campus coordinate (Universiti Malaya) ───────── */
const DEFAULT_COORDS = { lat: 3.1194, lng: 101.6569 };

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

function computeCategorySpots(categoryKey, coords) {
  const spots = RECOVERY_SPOTS.filter((s) => s.category === categoryKey);
  return spots
    .map((spot) => {
      const meters = haversineMeters(coords.lat, coords.lng, spot.lat, spot.lng);
      const mapQuery = spot.lat && spot.lng
        ? `${spot.lat},${spot.lng}`
        : encodeURIComponent(`${spot.spotName}, ${spot.address}`);
      return {
        ...spot,
        meters,
        distance: formatDistance(meters),
        walkTimeStr: walkTime(meters),
        mapQuery,
        aiRationale: spot.defaultRationale,
        isAiPick: false,
      };
    })
    .sort((a, b) => a.meters - b.meters);
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
  {
    key: 'talk',
    label: 'Someone to Talk To',
    icon: '🤝',
    gradient: 'linear-gradient(135deg, #F87171 0%, #FB923C 100%)',
  },
];

/* ── Main Component ───────────────────────────────────────── */
export default function RecoveryZone({ targetCategory, onTargetCategoryHandled }) {
  const [expanded, setExpanded] = useState(targetCategory || null); // 'run' | 'food' | 'chill' | 'talk' | null
  const [candidateSpots, setCandidateSpots] = useState([]); // List of spots for current category
  const [currentIndex, setCurrentIndex] = useState(0); // Index of currently viewed spot
  const [error, setError] = useState(null);

  const cachedLocationRef = useRef(null);
  const categoryCacheRef = useRef({});
  const cardRefs = useRef({});

  // 1. Pre-warm geolocation silently on mount
  useEffect(() => {
    if (navigator.geolocation && !cachedLocationRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedLocationRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    }
  }, []);

  const currentSpot = candidateSpots[currentIndex] || null;

  // Scroll expanded card into view smoothly
  useEffect(() => {
    if (expanded && cardRefs.current[expanded]) {
      setTimeout(() => {
        cardRefs.current[expanded]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  }, [expanded, currentSpot]);

  // Handle external pre-expand navigation (e.g. from ChatWidget shortcut)
  useEffect(() => {
    if (targetCategory) {
      setExpanded(targetCategory);
      setTimeout(() => {
        cardRefs.current[targetCategory]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
      onTargetCategoryHandled?.();
    }
  }, [targetCategory, onTargetCategoryHandled]);

  const handleToggle = useCallback(
    (categoryKey) => {
      // Collapse if tapping the same active button
      if (expanded === categoryKey) {
        setExpanded(null);
        return;
      }

      setError(null);

      // Dedicated support hub (Mental well-being hotlines & trusted circle)
      if (categoryKey === 'talk') {
        setExpanded('talk');
        return;
      }

      // Check if this category's spots are already cached for instant 0ms display
      if (categoryCacheRef.current[categoryKey]) {
        const cached = categoryCacheRef.current[categoryKey];
        setExpanded(categoryKey);
        setCandidateSpots(cached.spots);
        setCurrentIndex(cached.currentIndex || 0);
        return;
      }

      // Compute spots immediately using cached GPS or default coordinates
      const coords = cachedLocationRef.current || DEFAULT_COORDS;
      const initialSpots = computeCategorySpots(categoryKey, coords);
      initialSpots[0].isAiPick = true;

      // INSTANT RENDER (0ms wait!)
      setExpanded(categoryKey);
      setCandidateSpots(initialSpots);
      setCurrentIndex(0);

      categoryCacheRef.current[categoryKey] = {
        spots: initialSpots,
        currentIndex: 0,
      };

      // In the background, enrich with personalized AI rationale from Gemini
      const payload = {
        category: categoryKey,
        spots: initialSpots.map((s) => ({
          spotName: s.spotName,
          categoryTag: s.categoryTag,
          distance: s.distance,
          walkTime: s.walkTimeStr,
          rating: s.rating,
          vibeTags: s.vibeTags,
        })),
      };

      fetch('/api/recovery-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || !data.spotName) return;

          setCandidateSpots((prev) => {
            const top = prev.find((s) => s.spotName === data.spotName) || prev[0];
            const others = prev.filter((s) => s.spotName !== top.spotName);
            const enriched = [
              { ...top, aiRationale: data.aiRationale, isAiPick: true },
              ...others.map((s) => ({ ...s, isAiPick: false })),
            ];

            if (categoryCacheRef.current[categoryKey]) {
              categoryCacheRef.current[categoryKey].spots = enriched;
            }
            return enriched;
          });
        })
        .catch(() => {
          // If Gemini call fails, default rationale remains active without interrupting the user
        });
    },
    [expanded]
  );

  const handleNextSpot = useCallback(() => {
    if (candidateSpots.length > 1) {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % candidateSpots.length;
        if (expanded && categoryCacheRef.current[expanded]) {
          categoryCacheRef.current[expanded].currentIndex = next;
        }
        return next;
      });
    }
  }, [candidateSpots.length, expanded]);

  return (
    <section className="column col4">
      <div className="col-eyebrow">Reset</div>
      <h2 className="col-title">Recovery zone</h2>

      <div className="recovery-buttons">
        {CATEGORIES.map((cat) => {
          const isActive = expanded === cat.key;
          const isTalk = cat.key === 'talk';
          const showCard = isActive && (isTalk || currentSpot || error);

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
                  {/* Dedicated Support Card */}
                  {isActive && isTalk && (
                    <SupportCallCard />
                  )}

                  {/* Result Spot */}
                  {currentSpot && isActive && !isTalk && (
                    <>
                      {/* 1. AI Rationale / Insight */}
                      <div className="recovery-rationale">
                        <div className="recovery-rationale-label">
                          {currentSpot.isAiPick ? 'AI Rationale' : 'Recovery Insight'}
                        </div>
                        <p className="recovery-rationale-text">{currentSpot.aiRationale}</p>
                      </div>

                      {/* 2. Spot Overview */}
                      <div className="recovery-overview">
                        <h3 className="recovery-spot-name">{currentSpot.spotName}</h3>
                        <div className="recovery-spot-meta">
                          <span className="recovery-tag">{currentSpot.categoryTag}</span>
                          <span className="recovery-distance">
                            📍 {currentSpot.distance} ({currentSpot.walkTimeStr})
                          </span>
                          <span className="recovery-rating">⭐ {currentSpot.rating}</span>
                        </div>
                        <div className="recovery-vibe-chips">
                          {currentSpot.vibeTags.map((tag) => (
                            <span key={tag} className="recovery-vibe-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 3. Map Embed */}
                      <div className="recovery-map-wrap">
                        <iframe
                          key={`${currentSpot.spotName}-${currentIndex}`}
                          className="recovery-map"
                          title={`Map of ${currentSpot.spotName}`}
                          src={`https://maps.google.com/maps?q=${currentSpot.mapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          allowFullScreen
                        />
                      </div>

                      {/* 4. Action Buttons */}
                      <div className="recovery-actions">
                        <a
                          className="recovery-nav-btn"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${currentSpot.mapQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`recovery-navigate-${cat.key}`}
                        >
                          🚶 Start Walking Navigation
                        </a>

                        {/* 5. Next Location Selector */}
                        {candidateSpots.length > 1 && (
                          <button
                            type="button"
                            className="recovery-next-spot-btn"
                            onClick={handleNextSpot}
                            id={`recovery-next-${cat.key}`}
                          >
                            <span className="recovery-next-icon">🔄</span>
                            <span className="recovery-next-label">Don&rsquo;t want this location? Next spot</span>
                            <span className="recovery-next-arrow">→</span>
                          </button>
                        )}
                      </div>
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