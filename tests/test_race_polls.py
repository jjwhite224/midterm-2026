import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from fetch_race_polls import normalize


class TestRacePolls(unittest.TestCase):
    def setUp(self):
        data = json.loads((ROOT / 'data/race-polls.json').read_text(encoding='utf-8'))
        row = next(p for p in data['polls'] if p['race'] == 'house:AK-00')
        self.collected = data['retrieved_at']
        self.catalog = json.loads((ROOT / 'data/forecasts.json').read_text())['house']['races']
        def source_date(value):
            return value[5:7] + '/' + value[8:10] + '/' + value[2:4]
        self.poll = {'cycle': '2026', 'electionDate': '2026-11-03', 'hypothetical': '',
                     'state': 'AK', 'type': 'house', 'officeType': 'U.S. House',
                     'pollId': row['poll_id'], 'pollster': row['pollster'], 'url': row['url'],
                     'startDate': source_date(row['start_date']), 'endDate': source_date(row['end_date']),
                     'questions': [{'questionId': row['id'].split(':')[0], 'stage': 'general',
                                    'seatNumber': '1', 'population': row['population'], 'sampleSize': row['sample_size'],
                                    'answers': [{'candidateId': a['id'], 'candidateName': a['name'], 'party': a['party'], 'pct': a['pct']} for a in row['answers']]}]}

    def run_normalize(self):
        return normalize(self.poll, 'house', self.catalog, self.collected)

    def test_explicit_single_member_district_mapping_and_source_preserved(self):
        rows, _ = self.run_normalize()
        self.assertEqual(rows[0]['race'], 'house:AK-00')
        self.assertEqual(rows[0]['url'], self.poll['url'])
        self.assertEqual(rows[0]['sample_size'], self.poll['questions'][0]['sampleSize'])

    def test_primary_subpopulation_and_other_elections_excluded(self):
        self.poll['questions'][0]['stage'] = 'primary'
        self.assertEqual(self.run_normalize()[0], [])
        self.poll['questions'][0]['stage'] = 'general'
        self.poll['questions'][0]['subpopulation'] = 'women'
        self.assertEqual(self.run_normalize()[0], [])
        self.poll['electionDate'] = '2026-01-31'
        self.assertEqual(self.run_normalize()[1], 'other election')

    def test_unknown_sample_kept_and_invalid_percent_rejected(self):
        self.poll['questions'][0]['sampleSize'] = None
        self.assertIsNone(self.run_normalize()[0][0]['sample_size'])
        self.poll['questions'][0]['answers'][0]['pct'] = float('nan')
        with self.assertRaises(ValueError):
            self.run_normalize()
