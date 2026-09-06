"""Local, stateless HTTP adapter for calendar ingestion and capacity scoring."""

import argparse
import json
import math
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import recurring_ical_events
from icalendar import Calendar

from data_ingestion import (
    MALAYSIA_TIMEZONE, MAX_ICS_BYTES, TAG_PATTERN, _deadline_time,
    _event_interval, build_student_input, classify_event,
)
from engine import compute_capacity

MAX_REQUEST_BYTES = MAX_ICS_BYTES * 2
DEMO_NOW = datetime(2026, 9, 2, 9, tzinfo=MALAYSIA_TIMEZONE)


def assess(payload, *, now=None):
    if not isinstance(payload, dict):
        raise ValueError("Send a calendar and check-in values.")
    errands = payload.get("pending_errands_count")
    sleep = payload.get("sleep_hours")
    if type(errands) is not int or not 0 <= errands <= 1000:
        raise ValueError("Pending errands must be a whole number between 0 and 1000.")
    if not isinstance(sleep, list) or not 1 <= len(sleep) <= 3:
        raise ValueError("Enter sleep hours for one to three recent nights.")
    if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 24 for v in sleep):
        raise ValueError("Sleep hours must be numbers between 0 and 24.")

    demo = payload.get("demo") is True
    if demo:
        raw = (Path(__file__).parent / "fixtures/sample_calendar.ics").read_bytes()
        now = DEMO_NOW
    else:
        raw = payload.get("calendar_text")
        if not isinstance(raw, str) or not raw.strip():
            raise ValueError("Choose an .ics calendar file first.")
        raw = raw.encode("utf-8")
        now = now or datetime.now(MALAYSIA_TIMEZONE)
    if len(raw) > MAX_ICS_BYTES:
        raise ValueError("Calendar files must be 5 MB or smaller.")

    try:
        calendar = Calendar.from_ical(raw)
        if calendar.name != "VCALENDAR":
            raise ValueError("Expected VCALENDAR")
        events = calendar.walk("VEVENT")
        if any(event.get("dtstart") is None for event in events):
            raise ValueError("An event has no start date")
        student_input = build_student_input(
            student_id="local_student", calendar=calendar,
            pending_errands_count=errands, sleep_hours=sleep, now=now,
        )
        schedule = forecast_schedule(calendar, now)
    except Exception as exc:
        raise ValueError("Unable to read this calendar. Upload a valid .ics export with event start dates.") from exc

    ignored = sum(classify_event(e) is None and str(e.get("status", "")).upper() != "CANCELLED" for e in events)
    warnings = []
    if ignored:
        warnings.append(f"{ignored} event definition(s) ignored: use [DEADLINE], [STUDY], [WORK] or [SOCIAL] in event titles.")
    if not events:
        warnings.append("This calendar contains no events. Calendar totals are zero.")
    if events and not schedule["tasks"] and not schedule["socialEvents"]:
        warnings.append("No tagged events fall in the forecast's seven-day window. Check the calendar dates.")
    return {
        "capacity": compute_capacity(student_input), "input": student_input,
        "source": "sample" if demo else "calendar", "as_of": now.isoformat(),
        "warnings": warnings,
        "schedule": {
            **schedule,
            "sleepLogs": [{"dayOffset": i, "hours": student_input["avg_sleep_hours"], "targetHours": 8} for i in range(7)],
            "baseDate": now.astimezone(MALAYSIA_TIMEZONE).date().isoformat() + "T00:00:00",
        },
    }


def forecast_schedule(calendar, now):
    """Adapt tagged event occurrences to the existing frontend forecast contract."""
    start = now.astimezone(MALAYSIA_TIMEZONE).replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    tasks, social, seen = [], [], set()
    for event in recurring_ical_events.of(calendar).between(start, end):
        category = classify_event(event)
        if category is None or str(event.get("status", "")).upper() == "CANCELLED":
            continue
        begins, ends = _event_interval(event)
        if category == "DEADLINE":
            begins = ends = _deadline_time(event)
        title = TAG_PATTERN.sub("", str(event.get("summary", "Untitled event"))).strip()
        key = (str(event.get("uid", "")), begins, category)
        if key in seen:
            continue
        seen.add(key)
        # Split multi-day time blocks into the calendar days they occupy.
        for day in range(7):
            day_start = start + timedelta(days=day)
            day_end = day_start + timedelta(days=1)
            hours = max(0, (min(ends, day_end) - max(begins, day_start)).total_seconds() / 3600)
            if not hours and not (begins == ends and day_start <= begins < day_end):
                continue
            item = {"id": f"calendar-{len(seen)}-{day}", "dayOffset": day}
            if category == "SOCIAL":
                if hours:
                    social.append({**item, "title": title, "durationHours": round(hours, 2)})
            else:
                tasks.append({**item, "text": title, "energy": "high", "isDeadline": category == "DEADLINE", "done": False, "hidden": False, "moved": False})
    return {"tasks": tasks, "socialEvents": social}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Calendar content and request details are never logged.

    def reply(self, status, data):
        encoded = json.dumps(data, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path == "/api/health":
            self.reply(200, {"status": "ok"})
        else:
            self.reply(404, {"error": "Endpoint not found."})

    def do_POST(self):
        if self.path != "/api/capacity":
            self.reply(404, {"error": "Endpoint not found."})
            return
        origin = self.headers.get("Origin")
        if origin and origin not in {
            f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in (5173, 4173, self.server.server_port)
        }:
            self.reply(403, {"error": "Use the local application to submit a calendar."})
            return
        if self.headers.get_content_type() != "application/json":
            self.reply(415, {"error": "Send application/json."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_REQUEST_BYTES:
                self.reply(413, {"error": "Request is empty or too large (10 MB limit)."})
                return
            self.connection.settimeout(15)
            payload = json.loads(self.rfile.read(length))
            result = assess(payload)
        except (ValueError, UnicodeError) as exc:
            # Validation messages are ours; JSON syntax errors get a fixed message.
            message = "Invalid JSON request." if isinstance(exc, (json.JSONDecodeError, UnicodeError)) else str(exc)
            self.reply(400, {"error": message})
            return
        except Exception:
            self.reply(500, {"error": "Calendar assessment failed. Please try again."})
            return
        self.reply(200, result)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
        print(f"Calendar API ready at http://127.0.0.1:{args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
