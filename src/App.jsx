import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import CapacityGauge from './components/CapacityGauge/CapacityGauge';
import CalendarCheckIn from './components/CapacityGauge/CalendarCheckIn';
import LoadBalancer from './components/LoadBalancer/LoadBalancer';
import StressTracker from './components/StressTracker/StressTracker';
import RecoveryZone from './components/RecoveryZone/RecoveryZone';
import { useCapacity } from './hooks/useCapacity';
import { useTasks } from './hooks/useTasks';
import { useMood } from './hooks/useMood';

export default function App() {
  const { capacity, assessment, loading, error, statusColor, assessCalendar, clearAssessment } = useCapacity();
  const { tasks, toggleTask, rebalanceTask, hideLowPriority, replaceTasks, resetTasks } = useTasks();
  const { mood, setMood, history } = useMood();

  async function handleAssess(payload) {
    const result = await assessCalendar(payload);
    if (result) replaceTasks(result.schedule.tasks);
    return result;
  }

  function handleClear() {
    clearAssessment();
    resetTasks();
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

  const canvasRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Each direct child of .canvas is a <section className="column ...">
  // rendered by the four components below, in order.
  const goTo = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = canvas.children[index];
    target?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
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
  }, []);

  return (
    <div className="app">
      <Sidebar activeIndex={activeIndex} onNavigate={goTo} />

      <div className="canvas" ref={canvasRef}>
        <CapacityGauge
          capacity={capacity}
          statusColor={statusColor}
          loading={loading}
          calendarSchedule={assessment?.schedule}
          tasks={tasks}
          sleepLogs={sleepLogs}
          socialEvents={socialEvents}
        >
          <CalendarCheckIn assessment={assessment} loading={loading} error={error} onAssess={handleAssess} onClear={handleClear} />
        </CapacityGauge>
        <LoadBalancer tasks={tasks} toggleTask={toggleTask} rebalanceTask={rebalanceTask} calendarMode={Boolean(assessment)} />
        <StressTracker mood={mood} setMood={setMood} history={history} />
        <RecoveryZone onHideLowPriority={hideLowPriority} />
      </div>

      <div className="scroll-dots">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`dot ${activeIndex === i ? 'active' : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
