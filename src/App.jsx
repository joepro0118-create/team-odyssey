import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import CapacityGauge from './components/CapacityGauge/CapacityGauge';
import LoadBalancer from './components/LoadBalancer/LoadBalancer';
import StressTracker from './components/StressTracker/StressTracker';
import RecoveryZone from './components/RecoveryZone/RecoveryZone';
import { useCapacity } from './hooks/useCapacity';
import { useTasks } from './hooks/useTasks';
import { useMood } from './hooks/useMood';

export default function App() {
  const { capacity, loading, error, statusColor } = useCapacity();
  const { tasks, toggleTask, rebalanceTask, hideLowPriority } = useTasks();
  const { mood, setMood, history } = useMood();

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
          error={error}
        />
        <LoadBalancer tasks={tasks} toggleTask={toggleTask} rebalanceTask={rebalanceTask} />
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