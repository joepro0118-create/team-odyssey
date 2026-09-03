/**
 * 7-Day Seed Data for Burnout & Capacity Forecast
 * ========================================================
 * Models a realistic college student's week:
 * - Mon–Tue (Days 0–1): Gentle ramp-up, manageable load.
 * - Wed–Thu (Days 2–3): Heavy mid-week crunch with 3 major deadlines,
 *   a campus job shift, short sleep, and zero social connection.
 *   Strain curve visibly spikes into CRITICAL OVERLOAD (80+).
 * - Fri–Sun (Days 4–6): Post-exam recovery, restorative sleep,
 *   social relief, and planned rest blocks pulling the curve back down.
 */

export const mockForecastTasks = [
  // Day 0 — Today (Mon): Gentle kickoff
  { id: 101, text: 'Finish econ problem set', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 0, isDeadline: true },
  { id: 102, text: 'Reply to club emails', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 0, isDeadline: false },
  { id: 103, text: 'Pick up textbook from library', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 0, isDeadline: false },

  // Day 1 — Tomorrow (Tue): Pre-crunch prep
  { id: 104, text: 'Draft lab report introduction', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 1, isDeadline: false },
  { id: 105, text: 'Review chemistry flashcards', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 1, isDeadline: false },

  // Day 2 — Mid-week Crunch Day 1 (Wed): Dual deadlines + shift
  { id: 106, text: 'Chem 201 Midterm Exam', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 2, isDeadline: true },
  { id: 107, text: 'CS Architecture Project Repo Submission', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 2, isDeadline: true },
  { id: 108, text: 'Teaching assistant tutoring shift', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 2, isDeadline: false },

  // Day 3 — Peak Crunch Day 2 (Thu): Triple deadline & deliverable spike
  { id: 109, text: 'Macroeconomics Term Paper Due', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 3, isDeadline: true },
  { id: 110, text: 'Stats Group Project Presentation', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 3, isDeadline: true },
  { id: 111, text: 'Submit Lab Notebook Analysis', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 3, isDeadline: true },
  { id: 112, text: 'Evening campus library shift', energy: 'high', done: false, hidden: false, moved: false, dayOffset: 3, isDeadline: false },

  // Day 4 — Decompression (Fri)
  { id: 113, text: 'Submit brief peer feedback forms', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 4, isDeadline: false },
  { id: 114, text: 'Clean and reorganize study desk', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 4, isDeadline: false },

  // Day 5 — Weekend Reset (Sat)
  { id: 115, text: 'Weekly laundry & grocery run', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 5, isDeadline: false },

  // Day 6 — Renewal (Sun)
  { id: 116, text: 'Review upcoming week & calendar', energy: 'low', done: false, hidden: false, moved: false, dayOffset: 6, isDeadline: false },
];

export const mockForecastSleepLogs = [
  { dayOffset: 0, hours: 7.2, targetHours: 8.0 },  // Mon: Decent rest
  { dayOffset: 1, hours: 6.2, targetHours: 8.0 },  // Tue: Late studying
  { dayOffset: 2, hours: 5.0, targetHours: 8.0 },  // Wed: Exam cramming deficit
  { dayOffset: 3, hours: 4.8, targetHours: 8.0 },  // Thu: Peak all-nighter strain
  { dayOffset: 4, hours: 7.0, targetHours: 8.0 },  // Fri: Catching up
  { dayOffset: 5, hours: 8.8, targetHours: 8.0 },  // Sat: Deep recovery sleep
  { dayOffset: 6, hours: 8.0, targetHours: 8.0 },  // Sun: Restored baseline
];

export const mockForecastSocialEvents = [
  { id: 1, dayOffset: 0, title: 'Quick dining hall lunch with Alex', durationHours: 1.0 },
  // Days 1, 2, 3: Zero social connection — triggers isolation penalty during crunch
  { id: 2, dayOffset: 4, title: 'Post-midterm pizza & movie night', durationHours: 3.0 },
  { id: 3, dayOffset: 5, title: 'Afternoon coastal surf & beach hangout', durationHours: 2.5 },
];

export const mockForecastRecoveryBlocks = [
  // Thursday: Emergency micro-break during crunch
  { id: 1, dayOffset: 3, title: '15-min mindfulness breathing break', durationHours: 0.5 },
  // Friday: Post-crunch decompression
  { id: 2, dayOffset: 4, title: 'Sunset boardwalk walk & audio unwind', durationHours: 1.5 },
  // Saturday & Sunday: Protected restorative blocks
  { id: 3, dayOffset: 5, title: 'Hammock reading & screen-free afternoon', durationHours: 2.0 },
  { id: 4, dayOffset: 6, title: 'Sunday morning yoga & ocean soundscape', durationHours: 1.5 },
];
