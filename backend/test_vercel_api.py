import sys
import unittest
from pathlib import Path

# Add root and api to path so we can import api.index
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from api.index import app


class VercelAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoints(self):
        res1 = self.client.get('/api/health')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json(), {'status': 'ok'})

        res2 = self.client.get('/health')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json(), {'status': 'ok'})

    def test_capacity_sample_assessment(self):
        payload = {'demo': True, 'sleep_hours': [5, 6, 5.5], 'pending_errands_count': 4}
        res = self.client.post('/api/capacity', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['capacity']['total_capacity_percent'], 51)
        self.assertEqual(data['source'], 'sample')
        self.assertEqual(len(data['schedule']['tasks']), 8)

    def test_capacity_alias_endpoint(self):
        payload = {'demo': True, 'sleep_hours': [5, 6, 5.5], 'pending_errands_count': 4}
        res = self.client.post('/capacity', json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['capacity']['total_capacity_percent'], 51)

    def test_vercel_origin_accepted_on_capacity(self):
        payload = {'demo': True, 'sleep_hours': [7], 'pending_errands_count': 0}
        res = self.client.post(
            '/api/capacity',
            json=payload,
            headers={'Origin': 'https://team-odyssey.vercel.app'},
        )
        self.assertEqual(res.status_code, 200)

    def test_unauthorized_foreign_origin_rejected_on_capacity(self):
        payload = {'demo': True, 'sleep_hours': [7], 'pending_errands_count': 0}
        res = self.client.post(
            '/api/capacity',
            json=payload,
            headers={'Origin': 'https://malicious-site.com'},
        )
        self.assertEqual(res.status_code, 403)
        body = res.json()
        message = body.get('detail') or body.get('error')
        self.assertIn('Use the local', message)

    def test_capacity_invalid_input(self):
        # Empty body
        res = self.client.post('/api/capacity', content=b'', headers={'Content-Type': 'application/json'})
        self.assertEqual(res.status_code, 413)

        # Invalid content type
        res = self.client.post('/api/capacity', content=b'hello', headers={'Content-Type': 'text/plain'})
        self.assertEqual(res.status_code, 415)

        # Invalid json payload
        res = self.client.post('/api/capacity', json={'sleep_hours': [-5], 'pending_errands_count': 0})
        self.assertEqual(res.status_code, 400)

    def test_chat_health_endpoints(self):
        res1 = self.client.get('/chat/health')
        self.assertEqual(res1.status_code, 200)
        self.assertIn('status', res1.json())
        self.assertEqual(res1.json()['status'], 'ok')

        res2 = self.client.get('/api/chat/health')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()['status'], 'ok')

    def test_vercel_cors_options(self):
        res = self.client.options(
            '/chat',
            headers={
                'Origin': 'https://team-odyssey-git-main.vercel.app',
                'Access-Control-Request-Method': 'POST',
            },
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res.headers.get('access-control-allow-origin'),
            'https://team-odyssey-git-main.vercel.app',
        )


if __name__ == '__main__':
    unittest.main()
