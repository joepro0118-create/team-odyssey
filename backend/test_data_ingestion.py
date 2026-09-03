"""Tests for Person 2's iCalendar-to-contract data pipeline."""

import unittest
from datetime import datetime
from pathlib import Path

from icalendar import Calendar

from data_ingestion import (
    MALAYSIA_TIMEZONE,
    build_student_input,
    classify_event,
    load_calendar,
    summarize_calendar,
)
from engine import compute_capacity


FIXTURE = Path(__file__).parent / "fixtures" / "sample_calendar.ics"
REFERENCE_NOW = datetime(2026, 9, 2, 9, 0, tzinfo=MALAYSIA_TIMEZONE)


class TestCalendarSummary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.calendar = load_calendar(str(FIXTURE))

    def test_sample_calendar_summary(self):
        self.assertEqual(
            summarize_calendar(self.calendar, now=REFERENCE_NOW),
            {
                "deadlines_next_48h": 2,
                "scheduled_work_study_hours": 13.0,
                "social_hours_last_72h": 2.0,
            },
        )

    def test_builds_exact_engine_input_contract(self):
        result = build_student_input(
            student_id=" student_01 ",
            calendar=self.calendar,
            pending_errands_count=4,
            sleep_hours=[5.0, 6.0, 5.5],
            now=REFERENCE_NOW,
        )

        self.assertEqual(
            result,
            {
                "student_id": "student_01",
                "deadlines_next_48h": 2,
                "scheduled_work_study_hours": 13.0,
                "pending_errands_count": 4,
                "avg_sleep_hours": 5.5,
                "social_hours_last_72h": 2.0,
            },
        )

    def test_generated_contract_is_accepted_by_scoring_engine(self):
        raw_input = build_student_input(
            student_id="student_01",
            calendar=self.calendar,
            pending_errands_count=4,
            sleep_hours=[5.0, 6.0, 5.5],
            now=REFERENCE_NOW,
        )

        result = compute_capacity(raw_input)

        self.assertEqual(result["total_capacity_percent"], 51)
        self.assertEqual(result["status_level"], "BALANCED")

    def test_overlapping_schedule_is_not_double_counted(self):
        calendar = Calendar.from_ical(
            b"""BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:first@example.test\r
DTSTART:20260902T020000Z\r
DTEND:20260902T040000Z\r
SUMMARY:[STUDY] First block\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:second@example.test\r
DTSTART:20260902T030000Z\r
DTEND:20260902T050000Z\r
SUMMARY:[WORK] Overlapping block\r
END:VEVENT\r
END:VCALENDAR\r
"""
        )
        summary = summarize_calendar(calendar, now=REFERENCE_NOW)
        self.assertEqual(summary["scheduled_work_study_hours"], 3.0)

    def test_all_day_deadline_remains_due_until_end_of_local_day(self):
        calendar = Calendar.from_ical(
            b"""BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:all-day@example.test\r
DTSTART;VALUE=DATE:20260902\r
SUMMARY:[DEADLINE] All-day assignment\r
END:VEVENT\r
END:VCALENDAR\r
"""
        )
        summary = summarize_calendar(calendar, now=REFERENCE_NOW)
        self.assertEqual(summary["deadlines_next_48h"], 1)


class TestClassificationAndValidation(unittest.TestCase):
    def test_categories_property_can_classify_an_event(self):
        calendar = Calendar.from_ical(
            b"""BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:category@example.test\r
DTSTART:20260902T020000Z\r
DTEND:20260902T030000Z\r
CATEGORIES:SOCIAL\r
SUMMARY:Coffee with a friend\r
END:VEVENT\r
END:VCALENDAR\r
"""
        )
        event = calendar.walk("VEVENT")[0]
        self.assertEqual(classify_event(event), "SOCIAL")

    def test_rejects_insecure_calendar_url_before_fetch(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            load_calendar("http://example.test/private-calendar.ics")

    def test_rejects_more_than_three_sleep_values(self):
        calendar = load_calendar(str(FIXTURE))
        with self.assertRaisesRegex(ValueError, "at most"):
            build_student_input(
                student_id="student_01",
                calendar=calendar,
                pending_errands_count=1,
                sleep_hours=[7, 7, 7, 7],
                now=REFERENCE_NOW,
            )

    def test_rejects_negative_pending_errands(self):
        calendar = load_calendar(str(FIXTURE))
        with self.assertRaisesRegex(ValueError, "non-negative"):
            build_student_input(
                student_id="student_01",
                calendar=calendar,
                pending_errands_count=-1,
                sleep_hours=[7],
                now=REFERENCE_NOW,
            )


if __name__ == "__main__":
    unittest.main()
