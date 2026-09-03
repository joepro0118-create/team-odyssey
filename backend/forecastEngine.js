/**
 * Equilibrium — Burnout & Capacity Forecast Engine (Backend Edition)
 * =================================================================
 * Pure, deterministic forecasting utility calculating a 7-day
 * strain/overload prediction (0–100 score).
 *
 * Polarity Standard:
 *   0–100 measures STRAIN/OVERLOAD.
 *   Higher score = higher stress / risk of burnout.
 *   Clustered deadlines, sleep deficits, and isolation spike the curve upward.
 *   Recovery blocks and social connection pull the curve downward.
 *
 * Can be run standalone:
 *   node backend/forecastEngine.js
 */

export const DEFAULT_CONFIG = {
  baseline: 30,           // Normal baseline strain
  academicWeight: 16,     // Strain per academic deadline
  taskWeight: 5,          // Strain per high-energy regular task
  sleepWeight: 6,         // Strain per hour of sleep deficit
  sleepDebtCarryover: 0.5,// Half of previous night's debt carries over
  targetSleep: 8.0,       // Target restorative sleep
  isolationWeight: 4,     // Strain penalty per day past isolation threshold
  isolationThreshold: 2,  // Grace period before isolation penalty begins
  socialRelief: -10,      // Relief points from a social event
  recoveryWeight: 10,     // Relief points per recovery block
  carryoverWeight: 0.3,   // 30% carryover of previous day's strain delta
};

/**
 * Computes a 7-day burnout/strain forecast.
 *
 * @param {Array} tasks List of task objects with { dayOffset, isDeadline, energy, done, hidden }
 * @param {Array} sleepLogs List of { dayOffset, hours, targetHours }
 * @param {Array} socialEvents List of { dayOffset, title, durationHours }
 * @param {Array} recoveryBlocks List of { dayOffset, title, durationHours }
 * @param {Object} config Override weights and thresholds (accepts baseDate for deterministic tests)
 * @returns {Array} 7-day forecast array [{ dayIndex, dayLabel, dateStr, score, statusLevel, factors }]
 */
export function computeForecast(
  tasks = [],
  sleepLogs = [],
  socialEvents = [],
  recoveryBlocks = [],
  config = {}
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const forecast = [];
  let previousDayScore = null;
  let runningSleepDebt = 0;
  let daysSinceSocial = 1; // Default to 1 day since last contact

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = cfg.baseDate ? new Date(cfg.baseDate) : new Date();

  for (let i = 0; i < 7; i++) {
    const factors = [];
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() + i);
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[dateObj.getDay()];

    // 1. Base capacity/strain
    let dayScore = cfg.baseline;

    // 2. Academic Deadlines & Work Tasks
    const dayTasks = tasks.filter((t) => (t.dayOffset ?? 0) === i && !t.done && !t.hidden);
    const deadlines = dayTasks.filter((t) => t.isDeadline);
    const highTasks = dayTasks.filter((t) => !t.isDeadline && t.energy === 'high');

    const deadlineImpact = deadlines.length * cfg.academicWeight;
    if (deadlineImpact > 0) {
      dayScore += deadlineImpact;
      factors.push({
        name: 'Deadlines',
        impact: +deadlineImpact,
        type: 'stressor',
        description: `${deadlines.length} deadline${deadlines.length > 1 ? 's' : ''} clustering (+${deadlineImpact} strain)`,
      });
    }

    const highTaskImpact = highTasks.length * cfg.taskWeight;
    if (highTaskImpact > 0) {
      dayScore += highTaskImpact;
      factors.push({
        name: 'High Energy Tasks',
        impact: +highTaskImpact,
        type: 'stressor',
        description: `${highTasks.length} heavy task${highTasks.length > 1 ? 's' : ''} (+${highTaskImpact} strain)`,
      });
    }

    // 3. Sleep Debt & Carryover
    const sleepEntry = sleepLogs.find((s) => s.dayOffset === i);
    const sleepHours = sleepEntry ? sleepEntry.hours : cfg.targetSleep;
    const target = (sleepEntry && sleepEntry.targetHours) || cfg.targetSleep;
    const currentNightDeficit = Math.max(0, target - sleepHours);

    // Accumulate sleep debt with dampening carryover
    runningSleepDebt = currentNightDeficit + runningSleepDebt * cfg.sleepDebtCarryover;

    if (runningSleepDebt >= 0.5) {
      const sleepImpact = Math.round(runningSleepDebt * cfg.sleepWeight);
      dayScore += sleepImpact;
      factors.push({
        name: 'Sleep Debt',
        impact: +sleepImpact,
        type: 'stressor',
        description: `${runningSleepDebt.toFixed(1)}h cumulative sleep deficit (+${sleepImpact} strain)`,
      });
    } else if (sleepHours >= target + 0.5) {
      const sleepBonus = -6;
      dayScore += sleepBonus;
      factors.push({
        name: 'Restorative Sleep',
        impact: sleepBonus,
        type: 'relief',
        description: `${sleepHours}h well-rested sleep (${sleepBonus} strain)`,
      });
    }

    // 4. Social Interaction & Isolation Penalty
    const daySocial = socialEvents.filter((s) => s.dayOffset === i);
    if (daySocial.length > 0) {
      daysSinceSocial = 0;
      dayScore += cfg.socialRelief;
      factors.push({
        name: 'Social Relief',
        impact: cfg.socialRelief,
        type: 'relief',
        description: `${daySocial.map((s) => s.title).join(', ')} (${cfg.socialRelief} strain)`,
      });
    } else {
      daysSinceSocial += 1;
      if (daysSinceSocial > cfg.isolationThreshold) {
        const isoImpact = (daysSinceSocial - cfg.isolationThreshold) * cfg.isolationWeight;
        dayScore += isoImpact;
        factors.push({
          name: 'Social Isolation',
          impact: +isoImpact,
          type: 'stressor',
          description: `${daysSinceSocial} days without social contact (+${isoImpact} strain)`,
        });
      }
    }

    // 5. Recovery Blocks
    const dayRecovery = recoveryBlocks.filter((r) => r.dayOffset === i);
    if (dayRecovery.length > 0) {
      const recTotalHours = dayRecovery.reduce((acc, r) => acc + (r.durationHours || 1), 0);
      const recImpact = -Math.round(recTotalHours * cfg.recoveryWeight);
      dayScore += recImpact;
      factors.push({
        name: 'Recovery Time',
        impact: recImpact,
        type: 'relief',
        description: `${dayRecovery.map((r) => r.title).join(', ')} (${recImpact} strain)`,
      });
    }

    // 6. Carryover from Previous Day's Strain
    if (previousDayScore !== null) {
      const diffFromBaseline = previousDayScore - cfg.baseline;
      const carryover = Math.round(diffFromBaseline * cfg.carryoverWeight);
      if (carryover !== 0) {
        dayScore += carryover;
        factors.push({
          name: carryover > 0 ? 'Fatigue Momentum' : 'Rest Momentum',
          impact: carryover,
          type: carryover > 0 ? 'stressor' : 'relief',
          description: `${carryover > 0 ? '+' : ''}${carryover} carryover from previous day`,
        });
      }
    }

    // Clamp score strictly between 0 and 100
    const finalScore = Math.max(0, Math.min(100, Math.round(dayScore)));
    previousDayScore = finalScore;

    let statusLevel = 'BALANCED';
    if (finalScore >= 80) statusLevel = 'CRITICAL_OVERLOAD';
    else if (finalScore >= 60) statusLevel = 'HEAVY_STRAIN';

    forecast.push({
      dayIndex: i,
      dayLabel,
      dateStr: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: finalScore,
      statusLevel,
      factors,
    });
  }

  return forecast;
}

/**
 * Self-contained verification suite running the 4 required test cases:
 * a) High sleep debt accumulation
 * b) Zero social contact penalty
 * c) Clustered deadlines spike
 * d) Carryover dampening across consecutive days
 */
export function runVerificationTests() {
  const results = [];

  function assert(testName, condition, detail = '') {
    results.push({ testName, passed: Boolean(condition), detail });
    if (!condition) {
      console.error(`❌ FAIL: ${testName} - ${detail}`);
    } else {
      console.log(`✅ PASS: ${testName}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Test A: High sleep debt accumulation
  // ─────────────────────────────────────────────────────────────
  {
    const chronicSleepDeprivation = [
      { dayOffset: 0, hours: 4.5, targetHours: 8 },
      { dayOffset: 1, hours: 4.5, targetHours: 8 },
      { dayOffset: 2, hours: 4.5, targetHours: 8 },
      { dayOffset: 3, hours: 4.5, targetHours: 8 },
      { dayOffset: 4, hours: 4.5, targetHours: 8 },
      { dayOffset: 5, hours: 4.5, targetHours: 8 },
      { dayOffset: 6, hours: 4.5, targetHours: 8 },
    ];
    const forecast = computeForecast([], chronicSleepDeprivation, [{ dayOffset: 0, title: 'Checkin' }]);
    const day0Score = forecast[0].score;
    const day2Score = forecast[2].score;
    const day4Score = forecast[4].score;

    assert(
      'Test A: High sleep debt accumulation increases strain over time',
      day4Score > day2Score && day2Score > day0Score,
      `Day 0: ${day0Score}, Day 2: ${day2Score}, Day 4: ${day4Score}`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Test B: Zero social contact penalty
  // ─────────────────────────────────────────────────────────────
  {
    const withSocial = computeForecast(
      [],
      [],
      [
        { dayOffset: 1, title: 'Dinner with friends' },
        { dayOffset: 3, title: 'Coffee hangout' },
        { dayOffset: 5, title: 'Game night' },
      ]
    );

    const isolated = computeForecast([], [], []); // Zero social contact all week

    const day5WithSocial = withSocial[5].score;
    const day5Isolated = isolated[5].score;
    const isolationFactor = isolated[5].factors.find((f) => f.name === 'Social Isolation');

    assert(
      'Test B: Zero social contact triggers isolation penalty raising strain',
      day5Isolated > day5WithSocial && Boolean(isolationFactor),
      `Isolated day 5 score: ${day5Isolated} vs Connected day 5: ${day5WithSocial} (factor: ${isolationFactor?.impact})`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Test C: Clustered deadlines spike
  // ─────────────────────────────────────────────────────────────
  {
    const tasksWithCrunch = [
      { id: 1, dayOffset: 2, isDeadline: true, energy: 'high', done: false },
      { id: 2, dayOffset: 2, isDeadline: true, energy: 'high', done: false },
      { id: 3, dayOffset: 2, isDeadline: true, energy: 'high', done: false },
    ];

    const forecast = computeForecast(tasksWithCrunch, [], [{ dayOffset: 2, title: 'Sync' }]);
    const calmDayScore = forecast[0].score;
    const crunchDayScore = forecast[2].score;

    assert(
      'Test C: Clustered deadlines cause dramatic strain spike (>= 30 pts)',
      crunchDayScore - calmDayScore >= 30,
      `Calm day: ${calmDayScore}, Crunch day: ${crunchDayScore} (Spike: +${crunchDayScore - calmDayScore})`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Test D: Carryover dampening across consecutive days
  // ─────────────────────────────────────────────────────────────
  {
    // A huge crunch on Day 0, then zero tasks for days 1, 2, 3
    const tasks = [
      { id: 1, dayOffset: 0, isDeadline: true, energy: 'high', done: false },
      { id: 2, dayOffset: 0, isDeadline: true, energy: 'high', done: false },
      { id: 3, dayOffset: 0, isDeadline: true, energy: 'high', done: false },
      { id: 4, dayOffset: 0, isDeadline: true, energy: 'high', done: false },
    ];

    // Maintain regular social sync so isolation does not confound carryover dampening
    const social = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOffset: d, title: 'Chat' }));

    const forecast = computeForecast(tasks, [], social);
    const day0Score = forecast[0].score; // Very high
    const day1Score = forecast[1].score;
    const day2Score = forecast[2].score;
    const day3Score = forecast[3].score;

    const carryoverDay1 = forecast[1].factors.find((f) => f.name === 'Fatigue Momentum')?.impact ?? 0;
    const carryoverDay2 = forecast[2].factors.find((f) => f.name === 'Fatigue Momentum')?.impact ?? 0;
    const carryoverDay3 = forecast[3].factors.find((f) => f.name === 'Fatigue Momentum')?.impact ?? 0;

    assert(
      'Test D: Carryover dampens monotonically across consecutive days after crunch',
      day0Score > day1Score && day1Score > day2Score && day2Score > day3Score && carryoverDay1 > carryoverDay2 && carryoverDay2 >= carryoverDay3,
      `Scores: D0=${day0Score}, D1=${day1Score}, D2=${day2Score}, D3=${day3Score}; Carryover: D1=+${carryoverDay1}, D2=+${carryoverDay2}, D3=+${carryoverDay3}`
    );
  }

  return results;
}

// If executed directly in node: `node backend/forecastEngine.js`
const nodeProcess = globalThis?.process;
if (nodeProcess?.argv && nodeProcess.argv[1]?.includes('forecastEngine.js')) {
  console.log('--- Running Backend Forecast Engine Verification Tests ---');
  const allResults = runVerificationTests();
  const allPassed = allResults.every((r) => r.passed);
  console.log(`--- Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} (${allResults.length} tests) ---`);
  if (!allPassed) nodeProcess.exit(1);
}
