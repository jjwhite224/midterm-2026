import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from fetch_forecasts import validate


class TestForecasts(unittest.TestCase):
    def setUp(self):
        snapshot = json.loads((ROOT / 'data/forecasts.json').read_text())
        self.data = {'dataset': 'senate', 'licence': 'CC BY 4.0',
                     'asOf': snapshot['senate']['as_of'], 'rows': deepcopy(snapshot['senate']['races'])}
        for row in self.data['rows']:
            row['kind'] = 'Senate'

    def test_valid_source_and_coverage(self):
        self.assertEqual(len(validate(self.data, 'senate')['races']), 35)

    def test_missing_duplicate_unlicensed_or_invalid_races_fail(self):
        for key, value in [('licence', 'Unknown'), ('chance_left', 1.2),
                           ('polls_used', -1), ('state', 'ZZ'), ('range80_low', 99),
                           ('kind', 'House')]:
            with self.subTest(key=key):
                bad = deepcopy(self.data)
                bad['rows'][0][key] = value
                with self.assertRaises(ValueError):
                    validate(bad, 'senate')
        self.data['rows'][0] = self.data['rows'][1]
        with self.assertRaises(ValueError):
            validate(self.data, 'senate')
