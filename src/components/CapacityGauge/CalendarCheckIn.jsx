import { useRef, useState } from 'react';

export default function CalendarCheckIn({ assessment, loading, error, onAssess, onClear }) {
  const [file, setFile] = useState(null);
  const [sleep, setSleep] = useState(['', '', '']);
  const [errands, setErrands] = useState('');
  const [localError, setLocalError] = useState('');
  const [reading, setReading] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const fileInputRef = useRef(null);
  const inFlight = useRef(false);
  const busy = loading || reading;

  function handleClear() {
    setFile(null);
    setSleep(['', '', '']);
    setErrands('');
    setLocalError('');
    setClearMessage("Result cleared. You're now viewing the sample preview.");
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  }

  async function submit(event, demo = false) {
    event?.preventDefault();
    if (inFlight.current) return;
    setClearMessage('');
    setLocalError('');
    if (!demo && (!file || !file.name.toLowerCase().endsWith('.ics'))) {
      setLocalError('Choose an .ics calendar export first.');
      return;
    }
    if (!demo && file.size > 5 * 1024 * 1024) {
      setLocalError('Choose a calendar file that is 5 MB or smaller.');
      return;
    }
    const hours = sleep.filter(v => v.trim() !== '').map(Number);
    if (!demo && (!hours.length || hours.some(v => !Number.isFinite(v) || v < 0 || v > 24))) {
      setLocalError('Enter sleep hours between 0 and 24 for at least one night.');
      return;
    }
    if (!demo && (errands === '' || !Number.isInteger(Number(errands)) || Number(errands) < 0 || Number(errands) > 1000)) {
      setLocalError('Enter a whole number of pending errands between 0 and 1000.');
      return;
    }
    inFlight.current = true;
    setReading(true);
    try {
      await onAssess(demo
        ? { demo: true, sleep_hours: [5, 6, 5.5], pending_errands_count: 4 }
        : { calendar_text: await file.text(), sleep_hours: hours, pending_errands_count: Number(errands) });
    } catch {
      setLocalError('Unable to read this file. Please select it again.');
    } finally {
      inFlight.current = false;
      setReading(false);
    }
  }

  return (
    <div className="calendar-checkin">
      <div className="checkin-heading">
        <div>
          <h3>Bring your calendar aboard</h3>
          <p>Combine your schedule with a quick sleep and errands check-in.</p>
        </div>
        <div className="checkin-badge-group">
          <span className={`source-badge ${assessment?.source === 'calendar' ? 'source-live' : ''}`}>
            {assessment?.source === 'calendar' ? 'Your calendar' : 'Sample data'}
          </span>
          {assessment && (
            <button
              type="button"
              className="clear-result-btn"
              onClick={handleClear}
              disabled={busy}
              aria-label="Clear result and return to sample preview"
            >
              Clear result
            </button>
          )}
        </div>
      </div>
      <details open={!assessment}>
        <summary>{assessment ? 'Update calendar & check-in' : 'Add your calendar & check-in'}</summary>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label htmlFor="calendar-file">Calendar export (.ics, up to 5 MB)</label>
            <input
              ref={fileInputRef}
              id="calendar-file"
              type="file"
              accept=".ics,text/calendar"
              onChange={e => { setFile(e.target.files[0] ?? null); setLocalError(''); }}
              aria-describedby="calendar-help"
            />
            <p id="calendar-help">Use event title tags: <code>[DEADLINE]</code>, <code>[STUDY]</code>, <code>[WORK]</code>, <code>[SOCIAL]</code>. Matching calendar categories also work.</p>
            <div className="checkin-fields">
              {sleep.map((value, i) => (
                <label key={i} htmlFor={`sleep-${i}`}>
                  {i === 0 ? 'Last night (hours)' : `${i + 1} nights ago (optional)`}
                  <input id={`sleep-${i}`} type="number" min="0" max="24" step="0.1" placeholder="e.g. 7.5" value={value} onChange={e => setSleep(prev => prev.map((v, idx) => idx === i ? e.target.value : v))} />
                </label>
              ))}
              <label htmlFor="pending-errands">Pending errands
                <input id="pending-errands" type="number" min="0" max="1000" step="1" placeholder="e.g. 4" value={errands} onChange={e => setErrands(e.target.value)} />
              </label>
            </div>
            <div className="checkin-actions">
              <button type="submit" className="check-load-btn">{busy ? 'Calculating…' : 'Calculate my capacity'}</button>
              <button type="button" className="sample-calendar-btn" onClick={() => submit(null, true)}>Try sample calendar</button>
            </div>
            <p className="checkin-note">Processed locally for this session. Use &ldquo;Clear result&rdquo; to reset to the sample preview, or refresh the page to clear everything. Times use Malaysia time (UTC+8).</p>
          </fieldset>
        </form>
      </details>
      {(localError || error) && <p role="alert" className="checkin-error">{localError || error} {assessment ? 'The previous result is still shown.' : 'The sample preview is still shown.'}</p>}
      <div role="status" aria-live="polite">
        {assessment ? <>
          <p className="checkin-note">{assessment.source === 'sample' ? 'Sample assessment' : 'Calendar assessment'} · {new Date(assessment.as_of).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (UTC+8)</p>
          <dl className="calendar-totals">
            <div><dt>Deadlines · next 48h</dt><dd>{assessment.input.deadlines_next_48h}</dd></div>
            <div><dt>Work/study · next 7 days</dt><dd>{assessment.input.scheduled_work_study_hours}h</dd></div>
            <div><dt>Social · past 72h</dt><dd>{assessment.input.social_hours_last_72h}h</dd></div>
            <div><dt>Average sleep</dt><dd>{assessment.input.avg_sleep_hours}h</dd></div>
            <div><dt>Pending errands</dt><dd>{assessment.input.pending_errands_count}</dd></div>
          </dl>
          {assessment.warnings.map(w => <p className="checkin-note" key={w}>{w}</p>)}
        </> : (
          <p className="checkin-note">
            {clearMessage || "You're viewing a sample preview. Calculate with your calendar or try the sample to see a backend assessment."}
          </p>
        )}
      </div>
    </div>
  );
}
