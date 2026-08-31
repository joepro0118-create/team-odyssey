// Placeholder data. Swap the source inside the hooks (src/hooks/*)
// once real burnout-calculation / backend logic exists — components
// never need to change.

export const capacityData = {
  total: 78,
  breakdown: [
    { label: 'Mental', value: 82, color: 'var(--coral)' },
    { label: 'Time', value: 64, color: 'var(--ocean-light)' },
    { label: 'Physical', value: 45, color: 'var(--seafoam)' },
    { label: 'Social', value: 58, color: 'var(--amber)' },
    { label: 'Errands', value: 71, color: 'var(--ocean-mid)' },
  ],
};

export const initialTasks = [
  { id: 1, text: 'Finish econ problem set', energy: 'high', done: false, hidden: false, moved: false },
  { id: 2, text: 'Study for chem midterm', energy: 'high', done: false, hidden: false, moved: false },
  { id: 3, text: 'Group project presentation', energy: 'high', done: false, hidden: false, moved: false },
  { id: 4, text: 'Reply to club emails', energy: 'low', done: false, hidden: false, moved: false },
  { id: 5, text: 'Reorganize class notes', energy: 'low', done: false, hidden: false, moved: false },
  { id: 6, text: 'Pick up textbook from library', energy: 'low', done: false, hidden: false, moved: false },
];

export const stressHistory = [
  { day: 'Mon', value: 40 },
  { day: 'Tue', value: 55 },
  { day: 'Wed', value: 35 },
  { day: 'Thu', value: 60 },
  { day: 'Fri', value: 50 },
  { day: 'Sat', value: 65 },
  { day: 'Sun', value: 70 },
];

export const nudges = [
  { id: 1, icon: '🚶', title: 'Take a 15-minute walk', sub: 'Clear your head between tasks' },
  { id: 2, icon: '🎧', title: 'Listen to a calming track', sub: '5-minute ocean soundscape' },
  { id: 3, icon: '💧', title: 'Refill your water', sub: 'Small reset, big difference' },
  { id: 4, icon: '😴', title: 'Set a wind-down alarm', sub: "Protect tonight's sleep" },
];