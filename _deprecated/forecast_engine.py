"""
Equilibrium — Burnout & Capacity Forecast Engine (Python Edition)
=================================================================
Pure-Python 7-day strain/overload prediction module with zero
third-party dependencies.

Polarity Standard:
    0–100 measures STRAIN/OVERLOAD (higher score = higher stress).
    Clustered deadlines, sleep debt, and social isolation raise strain.
    Recovery blocks and social interaction lower strain.

Usage:
    from forecast_engine import compute_forecast
    forecast = compute_forecast(tasks, sleep_logs, social_events, recovery_blocks)

Standalone test run:
    python forecast_engine.py
"""

from datetime import datetime, timedelta

DEFAULT_CONFIG = {
    "baseline": 30,
    "academic_weight": 16,
    "task_weight": 5,
    "sleep_weight": 6,
    "sleep_debt_carryover": 0.5,
    "target_sleep": 8.0,
    "isolation_weight": 4,
    "isolation_threshold": 2,
    "social_relief": -10,
    "recovery_weight": 10,
    "carryover_weight": 0.3,
}

DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def compute_forecast(tasks=None, sleep_logs=None, social_events=None, recovery_blocks=None, config=None):
    """Calculate 7-day strain trajectory and contributing factors."""
    tasks = tasks or []
    sleep_logs = sleep_logs or []
    social_events = social_events or []
    recovery_blocks = recovery_blocks or []

    cfg = dict(DEFAULT_CONFIG)
    if config:
        cfg.update(config)

    forecast = []
    prev_score = None
    running_sleep_debt = 0.0
    days_since_social = 1

    base_date = cfg.get("base_date")
    if base_date:
        if isinstance(base_date, str):
            today = datetime.fromisoformat(base_date)
        else:
            today = base_date
    else:
        today = datetime.now()

    for i in range(7):
        factors = []
        current_date = today + timedelta(days=i)
        day_label = "Today" if i == 0 else ("Tomorrow" if i == 1 else DAYS_OF_WEEK[current_date.weekday()])

        # 1. Base capacity/strain
        day_score = float(cfg["baseline"])

        # 2. Deadlines and tasks
        day_tasks = [t for t in tasks if t.get("day_offset", t.get("dayOffset", 0)) == i and not t.get("done") and not t.get("hidden")]
        deadlines = [t for t in day_tasks if t.get("is_deadline", t.get("isDeadline", False))]
        high_tasks = [t for t in day_tasks if not t.get("is_deadline", t.get("isDeadline", False)) and t.get("energy") == "high"]

        deadline_impact = len(deadlines) * cfg["academic_weight"]
        if deadline_impact > 0:
            day_score += deadline_impact
            factors.append({
                "name": "Deadlines",
                "impact": deadline_impact,
                "type": "stressor",
                "description": f"{len(deadlines)} deadline(s) clustering (+{deadline_impact} strain)",
            })

        high_task_impact = len(high_tasks) * cfg["task_weight"]
        if high_task_impact > 0:
            day_score += high_task_impact
            factors.append({
                "name": "High Energy Tasks",
                "impact": high_task_impact,
                "type": "stressor",
                "description": f"{len(high_tasks)} heavy task(s) (+{high_task_impact} strain)",
            })

        # 3. Sleep debt & carryover
        sleep_entry = next((s for s in sleep_logs if s.get("day_offset", s.get("dayOffset")) == i), None)
        sleep_hours = sleep_entry.get("hours", cfg["target_sleep"]) if sleep_entry else cfg["target_sleep"]
        target = sleep_entry.get("target_hours", sleep_entry.get("targetHours", cfg["target_sleep"])) if sleep_entry else cfg["target_sleep"]
        current_deficit = max(0.0, target - sleep_hours)
        running_sleep_debt = current_deficit + running_sleep_debt * cfg["sleep_debt_carryover"]

        if running_sleep_debt >= 0.5:
            sleep_impact = round(running_sleep_debt * cfg["sleep_weight"])
            day_score += sleep_impact
            factors.append({
                "name": "Sleep Debt",
                "impact": sleep_impact,
                "type": "stressor",
                "description": f"{running_sleep_debt:.1f}h cumulative sleep deficit (+{sleep_impact} strain)",
            })
        elif sleep_hours >= target + 0.5:
            sleep_bonus = -6
            day_score += sleep_bonus
            factors.append({
                "name": "Restorative Sleep",
                "impact": sleep_bonus,
                "type": "relief",
                "description": f"{sleep_hours}h well-rested sleep ({sleep_bonus} strain)",
            })

        # 4. Social events & isolation
        day_social = [s for s in social_events if s.get("day_offset", s.get("dayOffset")) == i]
        if day_social:
            days_since_social = 0
            day_score += cfg["social_relief"]
            titles = ", ".join(s.get("title", "Social") for s in day_social)
            factors.append({
                "name": "Social Relief",
                "impact": cfg["social_relief"],
                "type": "relief",
                "description": f"{titles} ({cfg['social_relief']} strain)",
            })
        else:
            days_since_social += 1
            if days_since_social > cfg["isolation_threshold"]:
                iso_impact = (days_since_social - cfg["isolation_threshold"]) * cfg["isolation_weight"]
                day_score += iso_impact
                factors.append({
                    "name": "Social Isolation",
                    "impact": iso_impact,
                    "type": "stressor",
                    "description": f"{days_since_social} days without social contact (+{iso_impact} strain)",
                })

        # 5. Recovery blocks
        day_recovery = [r for r in recovery_blocks if r.get("day_offset", r.get("dayOffset")) == i]
        if day_recovery:
            rec_hours = sum(r.get("duration_hours", r.get("durationHours", 1.0)) for r in day_recovery)
            rec_impact = -round(rec_hours * cfg["recovery_weight"])
            day_score += rec_impact
            titles = ", ".join(r.get("title", "Recovery") for r in day_recovery)
            factors.append({
                "name": "Recovery Time",
                "impact": rec_impact,
                "type": "relief",
                "description": f"{titles} ({rec_impact} strain)",
            })

        # 6. Fatigue momentum carryover
        if prev_score is not None:
            diff = prev_score - cfg["baseline"]
            carryover = round(diff * cfg["carryover_weight"])
            if carryover != 0:
                day_score += carryover
                factors.append({
                    "name": "Fatigue Momentum" if carryover > 0 else "Rest Momentum",
                    "impact": carryover,
                    "type": "stressor" if carryover > 0 else "relief",
                    "description": f"{'+' if carryover > 0 else ''}{carryover} carryover from previous day",
                })

        final_score = max(0, min(100, round(day_score)))
        prev_score = final_score

        if final_score >= 80:
            status = "CRITICAL_OVERLOAD"
        elif final_score >= 60:
            status = "HEAVY_STRAIN"
        else:
            status = "BALANCED"

        forecast.append({
            "day_index": i,
            "day_label": day_label,
            "date_str": current_date.strftime("%b %d"),
            "score": final_score,
            "status_level": status,
            "factors": factors,
        })

    return forecast


if __name__ == "__main__":
    sample_tasks = [
        {"text": "Econ Problem Set", "is_deadline": True, "day_offset": 0},
        {"text": "Midterm Exam", "is_deadline": True, "day_offset": 2},
        {"text": "Term Paper", "is_deadline": True, "day_offset": 3},
    ]
    sample_sleep = [
        {"day_offset": 0, "hours": 7.0},
        {"day_offset": 2, "hours": 4.8},
        {"day_offset": 3, "hours": 4.5},
    ]
    sample_social = [{"day_offset": 0, "title": "Lunch"}, {"day_offset": 4, "title": "Dinner"}]
    sample_recovery = [{"day_offset": 5, "title": "Beach walk", "duration_hours": 2.0}]

    results = compute_forecast(sample_tasks, sample_sleep, sample_social, sample_recovery)
    print("--- 7-Day Forecast Sample Output ---")
    for day in results:
        print(f"{day['day_label']:<10} | Score: {day['score']:<3} | Status: {day['status_level']:<18} | Factors: {len(day['factors'])}")
