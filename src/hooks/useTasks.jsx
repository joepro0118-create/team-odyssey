import { useState } from 'react';
import { initialTasks } from '../data/mockData';

// Later: replace initialTasks with a fetch/API call, and these
// handlers with real writes (API/DB). The components consuming
// this hook (LoadBalancer, RecoveryZone) won't need to change.
export function useTasks() {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // "Push low-priority tasks to tomorrow" from the Rebalance modal —
  // demo behavior: marks the most recent unmoved high-energy task as moved.
  const rebalanceTask = () => {
    setTasks((prev) => {
      const highTasks = prev.filter((t) => t.energy === 'high' && !t.moved);
      if (highTasks.length === 0) return prev;
      const lastId = highTasks[highTasks.length - 1].id;
      return prev.map((t) => (t.id === lastId ? { ...t, moved: true } : t));
    });
  };

  // Life-preserver "emergency brake" — hides Calm Waters (low-energy) tasks.
  const hideLowPriority = () => {
    setTasks((prev) =>
      prev.map((t) => (t.energy === 'low' ? { ...t, hidden: true } : t))
    );
  };

  return { tasks, toggleTask, rebalanceTask, hideLowPriority };
}