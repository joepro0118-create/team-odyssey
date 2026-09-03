"""Build Person 2's raw capacity input from an iCalendar feed.

Calendar event categories are intentionally explicit for the hackathon MVP:

    [DEADLINE] Database assignment
    [STUDY] Algorithms lecture
    [WORK] Cafe shift
    [SOCIAL] Dinner with friends

The same labels may be supplied through an event's CATEGORIES property.
Sleep and pending errands remain manual inputs because an iCalendar feed does
not provide them reliably.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import recurring_ical_events
from icalendar import Calendar


MALAYSIA_TIMEZONE = timezone(timedelta(hours=8), name="Asia/Kuala_Lumpur")
UTC = timezone.utc
MAX_ICS_BYTES = 5 * 1024 * 1024

DEADLINE_WINDOW = timedelta(hours=48)
SCHEDULE_WINDOW = timedelta(days=7)
SOCIAL_WINDOW = timedelta(hours=72)

SUPPORTED_CATEGORIES = {"DEADLINE", "STUDY", "WORK", "SOCIAL"}
TAG_PATTERN = re.compile(r"^\s*\[([A-Za-z]+)]")


def load_calendar(source: str) -> Calendar:
    """Load an iCalendar file from a local path or an HTTPS URL.

    The source URL is never printed because private calendar subscription URLs
    often contain access tokens.
    """
    parsed = urlparse(source)

    if parsed.scheme.lower() == "https":
        request = Request(source, headers={"User-Agent": "Equilibrium-MVP/1.0"})
        with urlopen(request, timeout=10) as response:  # noqa: S310 - HTTPS only
            payload = response.read(MAX_ICS_BYTES + 1)
    elif "://" in source:
        raise ValueError("Calendar URLs must use HTTPS")
    else:
        payload = Path(source).read_bytes()

    if len(payload) > MAX_ICS_BYTES:
        raise ValueError("Calendar feed exceeds the 5 MB MVP limit")

    try:
        return Calendar.from_ical(payload)
    except Exception as exc:
        raise ValueError("Unable to parse the iCalendar data") from exc


def classify_event(event) -> str | None:
    """Return the event's supported category, or ``None`` when unclassified."""
    summary = str(event.get("summary", ""))
    tag_match = TAG_PATTERN.match(summary)
    if tag_match:
        tag = tag_match.group(1).upper()
        if tag in SUPPORTED_CATEGORIES:
            return tag

    categories = event.get("categories")
    if categories is not None:
        values = getattr(categories, "cats", [categories])
        for value in values:
            category = str(value).strip().upper()
            if category in SUPPORTED_CATEGORIES:
                return category

    return None


def _as_utc(value, *, all_day_deadline: bool = False) -> datetime:
    """Normalize an iCalendar date/datetime value to an aware UTC datetime."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=MALAYSIA_TIMEZONE)
        return value.astimezone(UTC)

    if isinstance(value, date):
        local_time = time.max if all_day_deadline else time.min
        return datetime.combine(value, local_time, MALAYSIA_TIMEZONE).astimezone(UTC)

    raise ValueError(f"Unsupported calendar date value: {value!r}")


def _event_interval(event) -> tuple[datetime, datetime]:
    start_value = event.decoded("dtstart")
    start = _as_utc(start_value)

    if event.get("dtend") is not None:
        end = _as_utc(event.decoded("dtend"))
    elif event.get("duration") is not None:
        end = start + event.decoded("duration")
    elif isinstance(start_value, date) and not isinstance(start_value, datetime):
        end = start + timedelta(days=1)
    else:
        end = start

    if end < start:
        raise ValueError("Calendar event ends before it starts")
    return start, end


def _deadline_time(event) -> datetime:
    start_value = event.decoded("dtstart")
    return _as_utc(start_value, all_day_deadline=True)


def _overlap(
    start: datetime,
    end: datetime,
    window_start: datetime,
    window_end: datetime,
) -> tuple[datetime, datetime] | None:
    clipped_start = max(start, window_start)
    clipped_end = min(end, window_end)
    if clipped_end <= clipped_start:
        return None
    return clipped_start, clipped_end


def _merged_hours(intervals: Iterable[tuple[datetime, datetime]]) -> float:
    """Return total hours without double-counting overlapping events."""
    ordered = sorted(intervals)
    if not ordered:
        return 0.0

    merged: list[list[datetime]] = [[ordered[0][0], ordered[0][1]]]
    for start, end in ordered[1:]:
        current = merged[-1]
        if start <= current[1]:
            current[1] = max(current[1], end)
        else:
            merged.append([start, end])

    seconds = sum((end - start).total_seconds() for start, end in merged)
    return round(seconds / 3600, 1)


def summarize_calendar(calendar: Calendar, *, now: datetime) -> dict:
    """Summarize calendar events into the three calendar-derived fields."""
    if now.tzinfo is None:
        raise ValueError("now must include timezone information")
    now_utc = now.astimezone(UTC)

    query_start = now_utc - SOCIAL_WINDOW
    query_end = now_utc + SCHEDULE_WINDOW
    events = recurring_ical_events.of(calendar).between(query_start, query_end)

    deadline_end = now_utc + DEADLINE_WINDOW
    schedule_end = now_utc + SCHEDULE_WINDOW
    social_start = now_utc - SOCIAL_WINDOW

    deadline_keys: set[tuple[str, datetime]] = set()
    scheduled_intervals: list[tuple[datetime, datetime]] = []
    social_intervals: list[tuple[datetime, datetime]] = []

    for event in events:
        if str(event.get("status", "")).upper() == "CANCELLED":
            continue

        category = classify_event(event)
        if category is None:
            continue

        if category == "DEADLINE":
            due = _deadline_time(event)
            if now_utc <= due <= deadline_end:
                uid = str(event.get("uid", ""))
                deadline_keys.add((uid, due))
            continue

        start, end = _event_interval(event)
        if category in {"STUDY", "WORK"}:
            interval = _overlap(start, end, now_utc, schedule_end)
            if interval:
                scheduled_intervals.append(interval)
        elif category == "SOCIAL":
            interval = _overlap(start, end, social_start, now_utc)
            if interval:
                social_intervals.append(interval)

    return {
        "deadlines_next_48h": len(deadline_keys),
        "scheduled_work_study_hours": _merged_hours(scheduled_intervals),
        "social_hours_last_72h": _merged_hours(social_intervals),
    }


def build_student_input(
    *,
    student_id: str,
    calendar: Calendar,
    pending_errands_count: int,
    sleep_hours: Iterable[float],
    now: datetime,
) -> dict:
    """Build the exact raw-input contract consumed by ``compute_capacity``."""
    if not isinstance(student_id, str) or not student_id.strip():
        raise ValueError("student_id must be a non-empty string")
    if not isinstance(pending_errands_count, int) or pending_errands_count < 0:
        raise ValueError("pending_errands_count must be a non-negative integer")

    sleep_values = [float(value) for value in sleep_hours]
    if not sleep_values:
        raise ValueError("At least one sleep value is required")
    if len(sleep_values) > 3:
        raise ValueError("Provide at most the previous three nights of sleep")
    if any(value < 0 or value > 24 for value in sleep_values):
        raise ValueError("Sleep hours must be between 0 and 24")

    calendar_values = summarize_calendar(calendar, now=now)
    return {
        "student_id": student_id.strip(),
        "deadlines_next_48h": calendar_values["deadlines_next_48h"],
        "scheduled_work_study_hours": calendar_values[
            "scheduled_work_study_hours"
        ],
        "pending_errands_count": pending_errands_count,
        "avg_sleep_hours": round(sum(sleep_values) / len(sleep_values), 1),
        "social_hours_last_72h": calendar_values["social_hours_last_72h"],
    }


def _parse_now(value: str | None) -> datetime:
    if value is None:
        return datetime.now(MALAYSIA_TIMEZONE)
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=MALAYSIA_TIMEZONE)
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create Person 2's raw capacity JSON from an iCalendar feed."
    )
    parser.add_argument("calendar", nargs="?", help="Local .ics path")
    parser.add_argument(
        "--calendar-url-env",
        metavar="VARIABLE",
        help="Name of an environment variable containing a private HTTPS feed URL",
    )
    parser.add_argument("--student-id", required=True)
    parser.add_argument("--pending-errands", required=True, type=int)
    parser.add_argument(
        "--sleep-hours",
        required=True,
        nargs="+",
        type=float,
        help="Sleep duration for up to the previous three nights",
    )
    parser.add_argument(
        "--now",
        help="Optional ISO timestamp for reproducible demos/tests",
    )
    args = parser.parse_args()

    if args.calendar_url_env:
        if args.calendar:
            parser.error("Use either a local calendar or --calendar-url-env, not both")
        source = os.environ.get(args.calendar_url_env)
        if not source:
            parser.error(
                f"Environment variable '{args.calendar_url_env}' is empty or missing"
            )
    else:
        if not args.calendar:
            parser.error("Provide a local .ics path or --calendar-url-env")
        if "://" in args.calendar:
            parser.error(
                "Keep private feed URLs out of terminal history; use --calendar-url-env"
            )
        source = args.calendar

    result = build_student_input(
        student_id=args.student_id,
        calendar=load_calendar(source),
        pending_errands_count=args.pending_errands,
        sleep_hours=args.sleep_hours,
        now=_parse_now(args.now),
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
