import sys
import unittest
import json
from unittest.mock import patch, MagicMock
from datetime import date
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from fetch_polls import normalize, build_dataset, fetch

GOOD = {
    'id': 'gen202demorv', 'poll_type': 'generic-ballot', 'subject': '2026',
    'end_date': '2026-10-31', 'start_date': '2026-10-29',
    'pollster': 'Test Survey', 'sample_size': '1,000', 'population': 'rv',
    'answers': [{'choice': 'Dem', 'pct': 46}, {'choice': 'Rep', 'pct': 44}],
    'url': 'https://example.org/poll', 'internal': False
}
class TestDataIngestion(unittest.TestCase):
    def test_api_response_shapes(self):
        for payload in ([GOOD], {'polls': [GOOD]}):
            with self.subTest(payload=type(payload).__name__):
                response = MagicMock()
                response.__enter__.return_value = response
                response.status = 200
                response.read.return_value = json.dumps(payload).encode()
                with patch('fetch_polls.urlopen', return_value=response):
                    self.assertEqual(fetch(date(2026, 11, 1)), [GOOD])
    def test_invalid_api_response_rejected(self):
        for payload in ({'error': 'unavailable'}, {'polls': None}, [42]):
            with self.subTest(payload=payload):
                response = MagicMock()
                response.__enter__.return_value = response
                response.status = 200
                response.read.return_value = json.dumps(payload).encode()
                with patch('fetch_polls.urlopen', return_value=response):
                    with self.assertRaises(RuntimeError):
                        fetch(date(2026, 11, 1))
    def test_valid_poll(self):
        row = normalize(GOOD, date(2026, 11, 1))
        self.assertEqual(row['sample_size'],1000)
        self.assertEqual(row['dem'],46)
        self.assertEqual(row['rep'],44)
    def test_future_poll_excluded(self):
        self.assertIsNone(normalize(GOOD,date(2026,10,25)))
    def test_invalid_percentages_excluded(self):
        bad={**GOOD,'answers':[{'choice':'Dem','pct':70},{'choice':'Rep','pct':45}]}
        self.assertIsNone(normalize(bad,date(2026,11,1)))
    def test_non_generic_excluded(self):
        self.assertIsNone(normalize({**GOOD,'poll_type':'approval'},date(2026,11,1)))
    def test_other_cycle_excluded(self):
        self.assertIsNone(normalize({**GOOD,'subject':'2024'},date(2026,11,1)))
    def test_deduplicates(self):
        x=build_dataset([GOOD,GOOD],date(2026,11,1),'2026-11-01T12:00:00Z')
        self.assertEqual(len(x['polls']),1)

if __name__ == '__main__': unittest.main()
