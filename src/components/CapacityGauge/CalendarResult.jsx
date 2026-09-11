export default function CalendarResult({
  assessment,
  loading = false,
  onClear,
  clearMessage = '',
  onOpenModal,
}) {
  return (
    <div className="calendar-checkin calendar-result-card" role="status" aria-live="polite">
      <div className="checkin-heading">
        <div>
          <h3>Schedule Assessment</h3>
          {assessment ? (
            <p className="checkin-note">
              {assessment.source === 'sample' ? 'Sample assessment' : 'Calendar assessment'} ·{' '}
              {new Date(assessment.as_of).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (UTC+8)
            </p>
          ) : (
            <p className="checkin-note">
              {clearMessage || "You're viewing the sample preview. Import your calendar or try the sample to assess your capacity."}
            </p>
          )}
        </div>
        <div className="checkin-badge-group">
          <span className={`source-badge ${assessment?.source === 'calendar' ? 'source-live' : ''}`}>
            {assessment?.source === 'calendar' ? 'Your calendar' : 'Sample data'}
          </span>
          {assessment ? (
            <button
              type="button"
              className="clear-result-btn"
              onClick={onClear}
              disabled={loading}
              aria-label="Clear result and return to sample preview"
            >
              Clear result
            </button>
          ) : (
            <button
              type="button"
              className="clear-result-btn"
              onClick={onOpenModal}
              aria-label="Open calendar check-in modal"
            >
              + Import
            </button>
          )}
        </div>
      </div>

      {assessment && (
        <>
          <dl className="calendar-totals" style={{ marginTop: '14px' }}>
            <div><dt>Deadlines · next 48h</dt><dd>{assessment.input.deadlines_next_48h}</dd></div>
            <div><dt>Work/study · next 7 days</dt><dd>{assessment.input.scheduled_work_study_hours}h</dd></div>
            <div><dt>Social · past 72h</dt><dd>{assessment.input.social_hours_last_72h}h</dd></div>
            <div><dt>Average sleep</dt><dd>{assessment.input.avg_sleep_hours}h</dd></div>
            <div><dt>Pending errands</dt><dd>{assessment.input.pending_errands_count}</dd></div>
          </dl>
          {assessment.warnings?.map((w) => (
            <p className="checkin-note" key={w}>{w}</p>
          ))}
        </>
      )}
    </div>
  );
}
