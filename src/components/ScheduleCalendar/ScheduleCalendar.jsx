import { useState, useMemo } from 'react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Category colors matching the existing design tokens
const CATEGORY_COLORS = {
  deadline: 'var(--coral)',
  study: 'var(--ocean-mid)',
  work: 'var(--ocean-light)',
  social: 'var(--seafoam)',
};

/**
 * Defensively strip bracket tags like [DEADLINE], [STUDY] etc.
 * The backend already strips these, but mock data may still contain them.
 */
function cleanTitle(text) {
  return (text || 'Untitled').replace(/\[.*?\]\s*/g, '').trim() || 'Untitled';
}

/**
 * Classify a task into a display category based on its schema fields.
 * Priority: isDeadline > energy high (study) > default (work)
 */
function classifyTask(task) {
  if (task.isDeadline) return 'deadline';
  if (task.energy === 'high') return 'study';
  return 'work';
}

/**
 * Get category display label for screen readers / tooltips.
 */
function categoryLabel(cat) {
  switch (cat) {
    case 'deadline': return 'Deadline';
    case 'study': return 'Study';
    case 'work': return 'Work';
    case 'social': return 'Social';
    default: return 'Event';
  }
}

export default function ScheduleCalendar({ tasks = [], socialEvents = [], forecast = [] }) {
  const [selectedDay, setSelectedDay] = useState(0);

  // Build the 7-day pill data, anchored to today
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      return {
        dayOffset: i,
        label: i === 0 ? 'Today' : WEEKDAY_LABELS[dayOfWeek],
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });
  }, []);

  // Group tasks + social events by dayOffset for density + detail
  const eventsByDay = useMemo(() => {
    const grouped = {};
    for (let i = 0; i < 7; i++) grouped[i] = [];

    // Tasks (deadline, study, work)
    tasks.forEach((t) => {
      const offset = t.dayOffset ?? 0;
      if (offset >= 0 && offset <= 6 && !t.done && !t.hidden) {
        grouped[offset].push({
          id: t.id,
          title: cleanTitle(t.text),
          category: classifyTask(t),
          energy: t.energy,
        });
      }
    });

    // Social events
    socialEvents.forEach((s) => {
      const offset = s.dayOffset ?? -1;
      if (offset >= 0 && offset <= 6) {
        grouped[offset].push({
          id: `social-${s.id}`,
          title: cleanTitle(s.title),
          category: 'social',
          durationHours: s.durationHours,
        });
      }
    });

    return grouped;
  }, [tasks, socialEvents]);

  // Get forecast score for each day (if available)
  const getScore = (dayOffset) => {
    const day = forecast.find((f) => f.dayIndex === dayOffset);
    return day ? day.score : null;
  };

  const selectedEvents = eventsByDay[selectedDay] || [];

  return (
    <div className="schedule-calendar">
      {/* Day pills strip */}
      <div className="schedule-strip" role="tablist" aria-label="7-day schedule">
        {days.map((day) => {
          const count = (eventsByDay[day.dayOffset] || []).length;
          const isActive = selectedDay === day.dayOffset;
          const score = getScore(day.dayOffset);

          return (
            <button
              key={day.dayOffset}
              role="tab"
              aria-selected={isActive}
              aria-label={`${day.label}, ${day.dateStr}, ${count} event${count !== 1 ? 's' : ''}`}
              className={`schedule-day-pill${isActive ? ' active' : ''}`}
              onClick={() => setSelectedDay(day.dayOffset)}
            >
              <span className="schedule-pill-label">{day.label}</span>
              <span className="schedule-pill-date">{day.dateStr}</span>
              {count > 0 && (
                <span
                  className="schedule-density-dot"
                  style={{
                    background: count >= 3 ? 'var(--coral)' : 'var(--seafoam)',
                  }}
                />
              )}
              {score !== null && (
                <span
                  className="schedule-pill-score"
                  style={{
                    color:
                      score >= 80
                        ? 'var(--coral)'
                        : score >= 60
                          ? 'var(--amber)'
                          : 'var(--seafoam)',
                  }}
                >
                  {score}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail card for selected day */}
      <div className="schedule-detail-card" role="tabpanel" aria-label={`Events for ${days[selectedDay]?.label}`}>
        <div className="schedule-detail-header">
          <span className="schedule-detail-day">{days[selectedDay]?.label}</span>
          <span className="schedule-detail-date">{days[selectedDay]?.dateStr}</span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="schedule-empty">
            <span style={{ fontSize: '24px' }}>⛵</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ocean-deep)' }}>Clear Waters</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                No events scheduled for this day.
              </div>
            </div>
          </div>
        ) : (
          <div className="schedule-event-list">
            {selectedEvents.map((event) => (
              <div className="schedule-event-chip" key={event.id}>
                <span
                  className="schedule-category-dot"
                  style={{ background: CATEGORY_COLORS[event.category] || 'var(--ocean-light)' }}
                  title={categoryLabel(event.category)}
                />
                <span className="schedule-event-title">{event.title}</span>
                <span className="schedule-event-badge" style={{
                  background: `${CATEGORY_COLORS[event.category] || 'var(--ocean-light)'}22`,
                  color: CATEGORY_COLORS[event.category] || 'var(--ocean-light)',
                }}>
                  {categoryLabel(event.category)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
