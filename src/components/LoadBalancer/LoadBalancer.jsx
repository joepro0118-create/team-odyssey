import { useState } from 'react';
import RebalanceModal from './RebalanceModal';

function TaskItem({ task, onToggle }) {
  if (task.hidden) return null;

  const pillClass = task.moved ? 'pill-moved' : task.energy === 'high' ? 'pill-high' : 'pill-low';
  const pillText = task.moved ? 'Moved' : task.energy === 'high' ? 'High' : 'Low';

  return (
    <div className={`task-item ${task.done ? 'done' : ''}`} onClick={() => onToggle(task.id)}>
      <div className={`checkbox ${task.done ? 'checked' : ''}`}>{task.done ? '✓' : ''}</div>
      <div className="task-text">{task.text}</div>
      <div className={`energy-pill ${pillClass}`}>{pillText}</div>
    </div>
  );
}

export default function LoadBalancer({ tasks, toggleTask, rebalanceTask }) {
  const [modalOpen, setModalOpen] = useState(false);

  const highTasks = tasks.filter((t) => t.energy === 'high');
  const lowTasks = tasks.filter((t) => t.energy === 'low');

  const handleRebalance = () => {
    rebalanceTask();
    setModalOpen(false);
  };

  return (
    <section className="column col2">
      <div className="col-eyebrow">Captain's Log · Today</div>
      <div className="logbook-header">
        <h2 className="col-title" style={{ marginBottom: 0 }}>
          Today's load
        </h2>
        <button className="check-load-btn" onClick={() => setModalOpen(true)}>
          Check my load
        </button>
      </div>

      <div className="waves-grid">
        <div>
          <div className="wave-list-title">
            <span className="dot-tag" style={{ background: 'var(--coral)' }} />
            Active Waves — high energy
          </div>
          {highTasks.map((t) => (
            <TaskItem key={t.id} task={t} onToggle={toggleTask} />
          ))}
        </div>

        <div>
          <div className="wave-list-title">
            <span className="dot-tag" style={{ background: 'var(--seafoam)' }} />
            Calm Waters — low energy
          </div>
          {lowTasks.map((t) => (
            <TaskItem key={t.id} task={t} onToggle={toggleTask} />
          ))}
        </div>
      </div>

      <RebalanceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRebalance={handleRebalance}
      />
    </section>
  );
}