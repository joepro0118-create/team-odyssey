# Equilibrium — Backend Data and Scoring

The backend contains two independent stages:

1. `data_ingestion.py` — Person 2 converts calendar and check-in data into the
   raw six-field input contract.
2. `engine.py` — Person 3 converts that input into the capacity assessment used
   by the frontend.

## Quick Start

```bash
cd backend/

# Run the 7-day Burnout Forecast engine & verification tests
node forecastEngine.js

# Run the scoring contract sample (standard library only)
python engine.py

# Run all tests
python -m unittest test_engine test_data_ingestion -v
```

## Person 2: Data Ingestion

Create and activate a virtual environment from the repository root, then
install the calendar dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r backend\requirements.txt
```

Calendar events must use one of these title prefixes:

```text
[DEADLINE] Database Assignment
[STUDY] Algorithms Lecture
[WORK] Cafe Shift
[SOCIAL] Dinner With Friends
```

Equivalent `CATEGORIES` values are also accepted. Cancelled events are ignored,
recurring events are expanded, and overlapping work/study or social events are
not double-counted.

Run the deterministic sample from the `backend` directory:

```bash
python data_ingestion.py fixtures\sample_calendar.ics ^
  --student-id student_01 ^
  --pending-errands 4 ^
  --sleep-hours 5 6 5.5 ^
  --now 2026-09-02T09:00:00+08:00
```

The sample produces:

```json
{
  "student_id": "student_01",
  "deadlines_next_48h": 2,
  "scheduled_work_study_hours": 13.0,
  "pending_errands_count": 4,
  "avg_sleep_hours": 5.5,
  "social_hours_last_72h": 2.0
}
```

For a private subscription feed, place the URL in an environment variable so
its access token does not appear in terminal history. For example, in
PowerShell:

```powershell
$env:EQUILIBRIUM_ICAL_URL = '<private HTTPS feed URL>'
python data_ingestion.py --calendar-url-env EQUILIBRIUM_ICAL_URL `
  --student-id student_01 `
  --pending-errands 4 `
  --sleep-hours 5 6 5.5
Remove-Item Env:EQUILIBRIUM_ICAL_URL
```

For the MVP, pending errands and the previous one to three nights of sleep are
manual inputs. An iCalendar feed supplies the other three values. Private feed
URLs are credentials: never commit them, paste them into documentation, or use
them in screenshots.

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

- `engine.py`: Python 3.8+ standard library only.
- `data_ingestion.py`: Python 3.10+ and the pinned dependencies in
  `requirements.txt`.
