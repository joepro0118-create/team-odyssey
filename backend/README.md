# Equilibrium — Backend Scoring Engine

Zero-dependency Python module that calculates a student's burnout/capacity score.

## Quick Start

```bash
cd backend/

# Run the contract sample
python engine.py

# Run all tests
python -m unittest test_engine -v
```

## Data Contracts

### Input (from Person 2 / Data Gatherer)

```json
{
  "student_id": "student_01",
  "deadlines_next_48h": 3,
  "scheduled_work_study_hours": 34.5,
  "pending_errands_count": 4,
  "avg_sleep_hours": 5.5,
  "social_hours_last_72h": 1.5
}
```

### Output (consumed by Person 1 / Frontend)

```json
{
  "total_capacity_percent": 86,
  "status_level": "CRITICAL_OVERLOAD",
  "theme_color": "#EF4444",
  "breakdown": {
    "mental_points": 30.0,
    "time_points": 25.9,
    "errands_points": 8.0,
    "sleep_multiplier": 1.35,
    "social_relief_points": 0.0
  },
  "primary_recommendation": "Sleep deficit is multiplying your academic load by 1.35x. ..."
}
```

## Usage in Code

```python
from engine import compute_capacity

result = compute_capacity({
    "student_id": "student_01",
    "deadlines_next_48h": 3,
    "scheduled_work_study_hours": 34.5,
    "pending_errands_count": 4,
    "avg_sleep_hours": 5.5,
    "social_hours_last_72h": 1.5,
})
```

## Dependencies

**None.** Python 3.8+ standard library only.
