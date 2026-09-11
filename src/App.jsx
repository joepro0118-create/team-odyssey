import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import CapacityGauge from './components/CapacityGauge/CapacityGauge';
import CalendarCheckIn from './components/CapacityGauge/CalendarCheckIn';
import CalendarResult from './components/CapacityGauge/CalendarResult';
import LoadBalancer from './components/LoadBalancer/LoadBalancer';
import ScheduleCalendar from './components/ScheduleCalendar/ScheduleCalendar';
import StressTracker from './components/StressTracker/StressTracker';
import RecoveryZone from './components/RecoveryZone/RecoveryZone';
import LockScreen from './components/LockScreen/LockScreen';
import WaveTransition from './components/WaveTransition/WaveTransition';
import ChatWidget from './components/ChatWidget/ChatWidget';
import ModalBackdrop from './components/ModalBackdrop/ModalBackdrop';
import { useCapacity } from './hooks/useCapacity';
import { useTasks } from './hooks/useTasks';
import { useMood } from './hooks/useMood';
import { computeForecast } from './utils/forecastEngine';
import {
  mockForecastTasks,
  mockForecastSleepLogs,
  mockForecastSocialEvents,
  mockForecastRecoveryBlocks,
} from './data/mockForecastData';

export default function App() {
  const { mood, setMoodFromEmotion } = useMood();
  const { capacity, assessment, loading, error, statusColor, assessCalendar, clearAssessment } = useCapacity(mood);
  const { tasks, toggleTask, rebalanceTask, replaceTasks, resetTasks } = useTasks();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [chatForceClose, setChatForceClose] = useState(0);
  const [clearMessage, setClearMessage] = useState('');

  async function handleAssess(payload) {
    setClearMessage('');
    const result = await assessCalendar(payload);
    if (result) replaceTasks(result.schedule.tasks);
    return result;
  }

  function handleClear() {
    clearAssessment();
    resetTasks();
    setClearMessage("Result cleared. You're now viewing the sample preview.");
  }

  function handleOpenCalendarModal() {
    setChatForceClose((c) => c + 1);
    setShowCalendarModal(true);
  }

  const [sleepLogs] = useState([
    { dayOffset: 0, hours: 6.5, targetHours: 8 },
    { dayOffset: 1, hours: 6.0, targetHours: 8 },
    { dayOffset: 2, hours: 5.5, targetHours: 8 },
    { dayOffset: 3, hours: 6.0, targetHours: 8 },
    { dayOffset: 4, hours: 7.0, targetHours: 8 },
    { dayOffset: 5, hours: 7.5, targetHours: 8 },
    { dayOffset: 6, hours: 8.0, targetHours: 8 },
  ]);

  const [socialEvents] = useState([
    { id: 1, title: 'Dinner with friends', dayOffset: 2, durationHours: 2 },
    { id: 2, title: 'Study group coffee', dayOffset: 5, durationHours: 1.5 },
  ]);

  // Combine live tasks (today + rebalanced tomorrow) with the future schedule (days 2–6)
  const combinedTasks = useMemo(() => {
    if (assessment?.schedule) return tasks;
    const futureSchedule = mockForecastTasks.filter((t) => t.dayOffset >= 2);
    return [...tasks, ...futureSchedule];
  }, [tasks, assessment?.schedule]);

  const activeSleepLogs = assessment?.schedule
    ? assessment.schedule.sleepLogs
    : sleepLogs.length > 0
      ? sleepLogs
      : mockForecastSleepLogs;

  const activeSocialEvents = assessment?.schedule
    ? assessment.schedule.socialEvents
    : socialEvents.length > 0
      ? socialEvents
      : mockForecastSocialEvents;

  const moodModifier = capacity?.mood_modifier;
  const forecast = useMemo(() => {
    const configOverride = {
      ...(moodModifier ? { baseline: 30 + moodModifier } : {}),
    };
    return computeForecast(
      combinedTasks,
      activeSleepLogs,
      activeSocialEvents,
      assessment?.schedule ? [] : mockForecastRecoveryBlocks,
      configOverride
    );
  }, [combinedTasks, activeSleepLogs, activeSocialEvents, assessment, moodModifier]);

  const canvasRef = useRef(null);
  const waveRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  // Each direct child of .canvas is a <section className="column ...">
  // rendered by the five components below, in order.
  const scrollTo = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollTo({
      left: index * canvas.clientWidth,
      behavior: 'smooth',
    });
  };

  const goTo = (index) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
    scrollTo(index);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleScroll = () => {
      const idx = Math.round(canvas.scrollLeft / canvas.clientWidth);
      setActiveIndex(idx);
    };

    canvas.addEventListener('scroll', handleScroll);
    return () => canvas.removeEventListener('scroll', handleScroll);
  }, [unlocked]);

  const handleUnlock = (detectedMood) => {
    if (detectedMood) {
      setMoodFromEmotion(detectedMood);
    }
    waveRef.current?.play(() => {
      setUnlocked(true);
    });
  };

  return (
    <>
      {!unlocked ? (
        <LockScreen onContinue={handleUnlock} />
      ) : (
        <div className="app">
          <div className="canvas-wrap">
            <div className="canvas" ref={canvasRef}>
              <CapacityGauge
                capacity={capacity}
                statusColor={statusColor}
                loading={loading}
              />
              <StressTracker
                forecast={forecast}
                calendarSchedule={assessment?.schedule}
              />
              <section className="column col-calendar">
                <div className="col-eyebrow">Schedule</div>
                <div className="schedule-header">
                  <h2 className="col-title">Your Calendar</h2>
                  <button
                    className="schedule-add-btn"
                    onClick={handleOpenCalendarModal}
                    aria-label="Import calendar file"
                  >
                    +
                  </button>
                </div>
                <ScheduleCalendar
                  tasks={combinedTasks}
                  socialEvents={activeSocialEvents}
                  forecast={forecast}
                />
                <CalendarResult
                  assessment={assessment}
                  loading={loading}
                  onClear={handleClear}
                  clearMessage={clearMessage}
                  onOpenModal={handleOpenCalendarModal}
                />
              </section>
              <LoadBalancer tasks={tasks} toggleTask={toggleTask} rebalanceTask={rebalanceTask} calendarMode={Boolean(assessment)} />
              <RecoveryZone />
            </div>
          </div>

          <Sidebar activeIndex={activeIndex} onNavigate={goTo} />
          <ChatWidget
            activeIndex={activeIndex}
            source={assessment?.source === 'calendar' ? 'Imported calendar' : assessment ? 'Sample calendar assessment' : 'Sample preview'}
            forceClose={chatForceClose}
            onOpenChange={(isOpen) => {
              if (isOpen) {
                setShowCalendarModal(false);
              }
            }}
          />

          <ModalBackdrop
            isOpen={showCalendarModal}
            onClose={() => setShowCalendarModal(false)}
            ariaLabel="Calendar check-in modal"
          >
            <div className="calendar-modal-card">
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCalendarModal(false)}
                aria-label="Close calendar check-in modal"
              >
                ✕
              </button>
              <CalendarCheckIn
                assessment={assessment}
                loading={loading}
                error={error}
                onAssess={handleAssess}
                onClear={handleClear}
                onSuccess={() => setShowCalendarModal(false)}
              />
            </div>
          </ModalBackdrop>
        </div>
      )}

      <WaveTransition ref={waveRef} />
    </>
  );
}

