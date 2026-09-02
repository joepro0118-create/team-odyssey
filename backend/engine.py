"""
Equilibrium — Student Burnout & Capacity Scoring Engine
========================================================
Pure-Python scoring module with zero third-party dependencies.

Input:  Student stress-data dict  (from Person 2 / Data Gatherer)
Output: Capacity-assessment dict  (consumed by Person 1 / Frontend)

Public API
----------
    compute_capacity(student_data: dict) -> dict

Run standalone:
    python engine.py          # prints JSON for the contract sample input
"""

import sys


# ── Constants ─────────────────────────────────────────────────────────────

MENTAL_PTS_PER_DEADLINE = 10
MENTAL_CAP = 40

TIME_DENOMINATOR = 40.0
TIME_CAP = 30.0

ERRANDS_PTS_PER_TASK = 2
ERRANDS_CAP = 15

SOCIAL_RELIEF_THRESHOLD = 3.0
SOCIAL_RELIEF_VALUE = -10.0       # relief  → lowers load
SOCIAL_ISOLATION_VALUE = 8.0      # penalty → raises load

# (min_capacity_inclusive, status_label, hex_color)
THRESHOLDS = [
    (80, "CRITICAL_OVERLOAD", "#EF4444"),
    (60, "HEAVY_STRAIN",      "#F59E0B"),
    ( 0, "BALANCED",          "#10B981"),
]

REQUIRED_KEYS = [
    "student_id",
    "deadlines_next_48h",
    "scheduled_work_study_hours",
    "pending_errands_count",
    "avg_sleep_hours",
    "social_hours_last_72h",
]

NUMERIC_KEYS = REQUIRED_KEYS[1:]  # everything except student_id


# ── Input Validation ──────────────────────────────────────────────────────

def _validate_input(data):
    """Validate *data* against the input-contract schema.

    Returns a sanitised shallow copy with negative numerics clamped to 0.
    Raises ``ValueError`` for missing keys, wrong types, or empty student_id.
    """
    if not isinstance(data, dict):
        raise ValueError(f"Expected dict, got {type(data).__name__}")

    for key in REQUIRED_KEYS:
        if key not in data:
            raise ValueError(f"Missing required key: '{key}'")

    sid = data["student_id"]
    if not isinstance(sid, str) or not sid.strip():
        raise ValueError("student_id must be a non-empty string")

    clean = dict(data)                       # shallow copy — never mutate caller
    for key in NUMERIC_KEYS:
        val = clean[key]
        if not isinstance(val, (int, float)):
            raise ValueError(
                f"Field '{key}' must be numeric (int/float), "
                f"got {type(val).__name__}"
            )
        if val < 0:
            print(
                f"[WARN] '{key}' is negative ({val}), clamping to 0.",
                file=sys.stderr,
            )
            clean[key] = 0

    return clean


# ── Sub-Score Calculators ─────────────────────────────────────────────────

def _calc_mental(deadlines):
    """Mental load: 10 pts per deadline in next 48 h, capped at 40."""
    return float(min(deadlines * MENTAL_PTS_PER_DEADLINE, MENTAL_CAP))


def _calc_time(hours):
    """Time load: proportional to a 40-hour reference week, capped at 30."""
    return float(min((hours / TIME_DENOMINATOR) * TIME_CAP, TIME_CAP))


def _calc_errands(count):
    """Errands load: 2 pts per pending micro-task, capped at 15."""
    return float(min(count * ERRANDS_PTS_PER_TASK, ERRANDS_CAP))


def _calc_sleep_multiplier(avg_sleep):
    """Physical multiplier based on average sleep hours.

    Brackets (evaluated top-down, first match wins):
        <= 5.5 h   →  1.35x   severe deficit
        < 7.5 h    →  1.05x   mild deficit
        < 8.0 h    →  1.00x   neutral
        >= 8.0 h   →  0.85x   well-rested bonus
    """
    if avg_sleep <= 5.5:
        return 1.35
    elif avg_sleep < 7.5:
        return 1.05
    elif avg_sleep < 8.0:
        return 1.0
    else:
        return 0.85


def _calc_social_relief(social_hrs):
    """Social relief or isolation penalty.

    >= 3.0 h  →  -10  (relief, lowers capacity %)
    <= 0.0 h  →   +8  (isolation penalty, raises capacity %)
    otherwise →    0
    """
    if social_hrs >= SOCIAL_RELIEF_THRESHOLD:
        return SOCIAL_RELIEF_VALUE
    elif social_hrs <= 0.0:
        return SOCIAL_ISOLATION_VALUE
    else:
        return 0.0


# ── Classifier ────────────────────────────────────────────────────────────

def _classify(capacity_pct):
    """Map a 0-100 capacity score to (status_level, theme_color)."""
    for threshold, status, color in THRESHOLDS:
        if capacity_pct >= threshold:
            return status, color
    return "BALANCED", "#10B981"              # defensive fallback


# ── Recommendation Engine ────────────────────────────────────────────────

def _generate_recommendation(breakdown, raw_input):
    """Pick the single highest-impact actionable nudge.

    Priority cascade (first matching rule wins):
      1. Sleep deficit (multiplier >= 1.35)
      2. Social isolation (penalty == +8)
      3. Deadline clustering (mental >= 30)
      4. Time overload (time >= 22.5)
      5. Errand drain (errands >= 10)
      6. Fallback — balanced state
    """
    sleep_m = breakdown["sleep_multiplier"]
    social  = breakdown["social_relief_points"]
    mental  = breakdown["mental_points"]
    time_pt = breakdown["time_points"]
    errands = breakdown["errands_points"]

    # 1 — Sleep deficit
    if sleep_m >= 1.35:
        return (
            f"Sleep deficit is multiplying your academic load by {sleep_m}x. "
            f"Protecting an 8-hour sleep block tonight will drop your load "
            f"into a manageable range."
        )

    # 2 — Social isolation
    if social >= SOCIAL_ISOLATION_VALUE:
        return (
            "You've had zero social interaction in 72 hours. A 30-minute "
            "break with a friend can reduce perceived stress by up to 20%."
        )

    # 3 — Deadline clustering
    if mental >= 30:
        n = int(raw_input["deadlines_next_48h"])
        return (
            f"You have {n} deadlines clustering in the next 48 hours. "
            f"Prioritize the highest-weight deliverable and defer or "
            f"delegate the rest."
        )

    # 4 — Time overload
    if time_pt >= 22.5:
        h = raw_input["scheduled_work_study_hours"]
        return (
            f"You're scheduled for {h} hours of work/study. Block a "
            f"2-hour recovery window to prevent diminishing returns."
        )

    # 5 — Errand drain
    if errands >= 10:
        n = int(raw_input["pending_errands_count"])
        return (
            f"Micro-tasks are silently draining your bandwidth. Batch "
            f"your {n} pending errands into a single 30-minute sweep."
        )

    # 6 — Fallback
    return (
        "You're in a balanced state. Maintain your current rhythm "
        "and protect your sleep schedule."
    )


# ── Public API ────────────────────────────────────────────────────────────

def compute_capacity(student_data):
    """Score a student's burnout / capacity from their stress data.

    Parameters
    ----------
    student_data : dict
        Must conform to the input contract schema (see README).

    Returns
    -------
    dict
        Conforms to the output contract schema consumed by the frontend.

    Raises
    ------
    ValueError
        If *student_data* fails validation (missing keys, wrong types, etc.).
    """
    clean = _validate_input(student_data)

    # ── Sub-scores ────────────────────────────────────────────────────
    mental  = _calc_mental(clean["deadlines_next_48h"])
    time_pt = _calc_time(clean["scheduled_work_study_hours"])
    errands = _calc_errands(clean["pending_errands_count"])
    sleep_m = _calc_sleep_multiplier(clean["avg_sleep_hours"])
    social  = _calc_social_relief(clean["social_hours_last_72h"])

    # ── Aggregate ─────────────────────────────────────────────────────
    base  = (mental + time_pt + errands) * sleep_m
    final = max(0, min(100, round(base + social)))

    # ── Classify ──────────────────────────────────────────────────────
    status, color = _classify(final)

    # ── Build breakdown (round display values to 1 d.p.) ─────────────
    breakdown = {
        "mental_points":        round(mental, 1),
        "time_points":          round(time_pt, 1),
        "errands_points":       round(errands, 1),
        "sleep_multiplier":     sleep_m,
        "social_relief_points": round(social, 1),
    }

    # ── Recommendation ────────────────────────────────────────────────
    recommendation = _generate_recommendation(breakdown, clean)

    return {
        "total_capacity_percent": final,
        "status_level":           status,
        "theme_color":            color,
        "breakdown":              breakdown,
        "primary_recommendation": recommendation,
    }


# ── CLI Entry Point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    sample_input = {
        "student_id": "student_01",
        "deadlines_next_48h": 3,
        "scheduled_work_study_hours": 34.5,
        "pending_errands_count": 4,
        "avg_sleep_hours": 5.5,
        "social_hours_last_72h": 1.5,
    }

    result = compute_capacity(sample_input)
    print(json.dumps(result, indent=2))
