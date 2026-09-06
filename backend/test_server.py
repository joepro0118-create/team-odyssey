import http.client
import json
import threading
import unittest
from datetime import datetime
from http.server import ThreadingHTTPServer

from data_ingestion import MALAYSIA_TIMEZONE
from server import DEMO_NOW, Handler, MAX_REQUEST_BYTES, assess


def calendar(*events):
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\n' + ''.join(
        f'BEGIN:VEVENT\r\nUID:test-{i}\r\n{event}\r\nEND:VEVENT\r\n'
        for i, event in enumerate(events)
    ) + 'END:VCALENDAR\r\n'


class AssessmentTests(unittest.TestCase):
    def test_sample_runs_actual_ingestion_and_scoring(self):
        result = assess({'demo': True, 'sleep_hours': [5, 6, 5.5], 'pending_errands_count': 4})
        self.assertEqual(result['input'], {
            'student_id': 'local_student', 'deadlines_next_48h': 2,
            'scheduled_work_study_hours': 13.0, 'social_hours_last_72h': 2.0,
            'avg_sleep_hours': 5.5, 'pending_errands_count': 4,
        })
        self.assertEqual(result['capacity']['total_capacity_percent'], 51)
        self.assertEqual(result['schedule']['baseDate'], '2026-09-02T00:00:00')
        self.assertEqual(len(result['schedule']['tasks']), 8)
        self.assertEqual(result['schedule']['socialEvents'], [])

    def test_uploaded_recurring_calendar_excludes_cancelled_and_untagged(self):
        raw = calendar(
            'DTSTART:20260902T060000Z\r\nDTEND:20260902T080000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nSUMMARY:[STUDY] Revision',
            'DTSTART;VALUE=DATE:20260903\r\nSUMMARY:[DEADLINE] Essay',
            'DTSTART:20260902T060000Z\r\nDTEND:20260902T080000Z\r\nSUMMARY:[SOCIAL] Cancelled\r\nSTATUS:CANCELLED',
            'DTSTART:20260902T060000Z\r\nSUMMARY:Unclassified',
        )
        result = assess({'calendar_text': raw, 'sleep_hours': [8], 'pending_errands_count': 0}, now=DEMO_NOW)
        self.assertEqual(result['source'], 'calendar')
        self.assertEqual(result['input']['scheduled_work_study_hours'], 6)
        self.assertEqual(result['input']['deadlines_next_48h'], 1)
        self.assertEqual(len(result['schedule']['tasks']), 4)
        self.assertEqual(result['schedule']['socialEvents'], [])
        self.assertTrue(any('1 event definition' in w for w in result['warnings']))

    def test_sleep_and_errands_change_score(self):
        base = {'demo': True, 'sleep_hours': [8], 'pending_errands_count': 0}
        rested = assess(base)['capacity']['total_capacity_percent']
        tired = assess({**base, 'sleep_hours': [5], 'pending_errands_count': 8})['capacity']['total_capacity_percent']
        self.assertGreater(tired, rested)

    def test_empty_calendar_is_valid_with_zero_calendar_values(self):
        result = assess({'calendar_text': calendar(), 'sleep_hours': [8], 'pending_errands_count': 0}, now=DEMO_NOW)
        self.assertEqual(result['input']['scheduled_work_study_hours'], 0)
        self.assertEqual(result['schedule']['tasks'], [])
        self.assertTrue(result['warnings'])

    def test_cross_midnight_events_split_into_days(self):
        raw = calendar('DTSTART:20260902T150000Z\r\nDTEND:20260902T170000Z\r\nSUMMARY:[SOCIAL] Late dinner')
        result = assess({'calendar_text': raw, 'sleep_hours': [8], 'pending_errands_count': 0}, now=DEMO_NOW)
        self.assertEqual([s['durationHours'] for s in result['schedule']['socialEvents']], [1, 1])
        self.assertEqual([s['dayOffset'] for s in result['schedule']['socialEvents']], [0, 1])

    def test_stale_calendar_is_not_treated_as_demo(self):
        raw = calendar('DTSTART:20260902T060000Z\r\nSUMMARY:[DEADLINE] Old deadline')
        result = assess({'calendar_text': raw, 'sleep_hours': [8], 'pending_errands_count': 0}, now=datetime(2027, 1, 1, tzinfo=MALAYSIA_TIMEZONE))
        self.assertEqual(result['input']['deadlines_next_48h'], 0)
        self.assertEqual(result['source'], 'calendar')

    def test_invalid_input(self):
        valid = {'demo': True, 'sleep_hours': [8], 'pending_errands_count': 0}
        invalid = [None, [], {}, {**valid, 'sleep_hours': []},
                   {**valid, 'sleep_hours': [float('nan')]}, {**valid, 'sleep_hours': [True]},
                   {**valid, 'sleep_hours': [25]}, {**valid, 'sleep_hours': [8] * 4},
                   {**valid, 'pending_errands_count': True}, {**valid, 'pending_errands_count': -1},
                   {**valid, 'pending_errands_count': 1.5},
                   {**valid, 'demo': False, 'calendar_text': 'not a calendar'},
                   {**valid, 'demo': False, 'calendar_text': calendar('SUMMARY:No date')}]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                assess(payload)


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        try:
            connection.request(method, path, body=body, headers=headers or {})
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_health_and_routes(self):
        self.assertEqual(self.request('GET', '/api/health'), (200, {'status': 'ok'}))
        self.assertEqual(self.request('GET', '/missing')[0], 404)

    def test_real_http_assessment_and_validation(self):
        payload = json.dumps({'demo': True, 'sleep_hours': [5, 6, 5.5], 'pending_errands_count': 4})
        headers = {'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:5173'}
        status, result = self.request('POST', '/api/capacity', payload, headers)
        self.assertEqual(status, 200)
        self.assertEqual(result['capacity']['total_capacity_percent'], 51)
        self.assertEqual(self.request('POST', '/api/capacity', '{', headers)[0], 400)
        self.assertEqual(self.request('POST', '/api/capacity', payload, {'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.request('POST', '/api/capacity', payload, {**headers, 'Origin': 'https://unrelated.example'})[0], 403)
        self.assertEqual(self.request('POST', '/api/capacity', '', {**headers, 'Content-Length': str(MAX_REQUEST_BYTES + 1)})[0], 413)


if __name__ == '__main__':
    unittest.main()
