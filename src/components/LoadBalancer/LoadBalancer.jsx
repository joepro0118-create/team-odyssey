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

export default function LoadBalancer({ tasks, toggleTask, rebalanceTask, calendarMode }) {
  const [modalOpen, setModalOpen] = useState(false);

  const visibleTasks = tasks.filter(t => !t.hidden && (!calendarMode || t.dayOffset === 0 || t.moved));
  const highTasks = visibleTasks.filter((t) => t.energy === 'high');
  const lowTasks = visibleTasks.filter((t) => t.energy === 'low');

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
          Explore rebalancing
        </button>
      </div>

      <p className="checkin-note">{calendarMode
        ? 'Calendar planning preview. Completing or moving an item changes the forecast only; your calendar file and submitted Today assessment stay as submitted. Reimporting resets this plan.'
        : 'Sample tasks. Add your calendar in Your capacity to load your schedule.'}</p>
      {visibleTasks.length === 0 && <p>No tagged work, study or deadlines scheduled for today.</p>}

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
