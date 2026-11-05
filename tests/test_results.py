import copy
import json
from pathlib import Path
import unittest
from scripts.fetch_results import normalize, number

ROOT = Path(__file__).resolve().parents[1]


class ResultsTests(unittest.TestCase):
    def test_committed_results_complete_and_uncertified(self):
        data = json.loads((ROOT / 'data/results.json').read_text(encoding='utf-8'))
        catalog = json.loads((ROOT / 'data/race-polls.json').read_text(encoding='utf-8'))
        self.assertEqual(data['status'], 'unofficial')
        self.assertEqual({r['id'] for r in data['races']}, {r['id'] for r in catalog['races']})
        self.assertEqual(len(data['races']), 470)
        self.assertTrue(data['license_url'].startswith('https://'))
        for row in data['races']:
            self.assertEqual(row['certification'], 'unverified')
            number(row['reporting_percent'], 100)
            self.assertLessEqual(sum(c['source_called'] for c in row['candidates']), 1)
            for c in row['candidates']:
                number(c['votes']); number(c['percent'], 100)

    def test_invalid_numbers(self):
        for value in [-1, float('nan'), float('inf'), True, '10', None, 101]:
            with self.assertRaises(ValueError):
                number(value, 100)

    def test_reject_partial_test_wrong_election(self):
        source = {'test_data': False, 'is_disputed': False, 'election_date': '2026-11-03',
                  'country': 'US', 'election_scope': 'General', 'election_type': 'US Senate',
                  'last_updated': '2026-11-05T00:00:00Z', 'region_results': {}}
        for key, value in [('test_data', True), ('election_date', '2024-11-05'),
                           ('election_type', 'Governor'), ('is_disputed', True)]:
            bad = copy.deepcopy(source); bad[key] = value
            with self.assertRaises(ValueError):
                normalize({'senate': bad}, '2026-11-05T23:00:00Z')
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            normalize({'senate': source}, '2026-11-05T23:00:00Z')


if __name__ == '__main__':
    unittest.main()
