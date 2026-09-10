import { useState } from 'react';
import BurnoutForecastChart from '../BurnoutForecast/BurnoutForecastChart';
import FactorDrawer from '../BurnoutForecast/FactorDrawer';

export default function StressTracker({ forecast = [], calendarSchedule }) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  return (
    <section className="column col3">
      <div className="col-eyebrow">Horizon</div>
      <h2 className="col-title">7-Day Tracker</h2>

      <div className="forecast-view-wrap">
        <p className="checkin-note">
          {calendarSchedule
            ? 'Calendar-based scenario: your recent average sleep is assumed for each future night. Only tagged events are included; no recovery blocks are assumed. The forecast uses task counts and has a different formula from Today’s assessment.'
            : 'Sample forecast — upload your calendar in Calendar to explore your own schedule.'}
        </p>
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
    </section>
  );
}