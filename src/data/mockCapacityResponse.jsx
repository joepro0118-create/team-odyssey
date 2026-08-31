export const mockCapacityResponse = {
  total_capacity_percent: 86,
  status_level: 'CRITICAL_OVERLOAD',
  theme_color: '#EF4444', // backend's own color — we intentionally don't use this, see useCapacity.js
  breakdown: {
    mental_points: 30,
    time_points: 25,
    errands_points: 8,
    sleep_multiplier: 1.35,
    social_relief_points: -5,
  },
  primary_recommendation:
    'Sleep deficit is multiplying your academic load by 1.35x. Protect an 8-hour sleep block tonight.',
};