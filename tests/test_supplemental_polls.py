import json
import sys
import unittest
import tempfile
from unittest.mock import patch
from copy import deepcopy
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from supplemental_polls import merge_reviewed
import fetch_polls


class TestReviewedImport(unittest.TestCase):
    def setUp(self):
        self.reviewed = json.loads((ROOT / 'data/reviewed-polls.json').read_text())
        self.base = {'source': 'VoteHub Polling API', 'retrieved_at': '2026-11-01T19:24:40Z', 'polls': []}
        self.cutoff = date(2026, 11, 1)

    def merge(self):
        return merge_reviewed(self.base, self.reviewed, self.cutoff, '2026-11-01T20:00:00Z')

    def test_import_and_repeat_are_idempotent(self):
        first = self.merge()
        second = merge_reviewed(first, self.reviewed, self.cutoff, first['assembled_at'])
        self.assertEqual(first, second)
        self.assertEqual(len(first['polls']), len(self.reviewed['polls']))
        self.assertEqual(self.base['polls'], [])

    def test_original_collection_time_preserved(self):
        row = deepcopy(self.reviewed['polls'][0])
        for key in ('source', 'license', 'license_url', 'attribution', 'retrieved_at'):
            row.pop(key)
        self.base['polls'] = [row]
        self.assertEqual(self.merge()['polls'][0]['retrieved_at'], self.base['retrieved_at'])

    def test_cross_source_duplicate_not_counted_twice(self):
        row = deepcopy(self.reviewed['polls'][0])
        row.update(id='another-source-id', pollster='NPR/PBS/Marist')
        self.base['polls'] = [row]
        self.assertEqual(len(self.merge()['polls']), len(self.reviewed['polls']))

    def test_conflicting_duplicate_stops_import(self):
        row = deepcopy(self.reviewed['polls'][0])
        row['dem'] = 1  # Deliberately invalid test alteration, never production data.
        self.base['polls'] = [row]
        before = deepcopy(self.base)
        with self.assertRaisesRegex(RuntimeError, 'Conflicting'):
            self.merge()
        self.assertEqual(self.base, before)

    def test_unreviewed_or_malformed_records_rejected(self):
        for key, value in [('license', 'Unknown'), ('url', ''), ('start_date', '2026-12-01'),
                           ('sample_size', True), ('dem', float('nan')), ('geography', 'NY'),
                           ('poll_type', 'approval'), ('retrieved_at', '2026-01-01T00:00:00Z')]:
            with self.subTest(key=key):
                saved = deepcopy(self.reviewed)
                self.reviewed['polls'][0][key] = value
                with self.assertRaises(RuntimeError):
                    self.merge()
                self.reviewed = saved

    def test_cutoff_excludes_later_fieldwork(self):
        self.cutoff = date(2026, 10, 1)
        self.assertEqual(len(self.merge()['polls']), 1)

    def test_reviewed_file_required_schema(self):
        self.reviewed = {'polls': None}
        with self.assertRaises(RuntimeError):
            self.merge()

    def test_failed_cli_import_leaves_file_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'polls.json'
            additions = Path(directory) / 'reviewed.json'
            original = self.merge()
            output.write_text(json.dumps(original))
            before = output.read_bytes()
            self.reviewed['polls'][0]['license'] = 'Unverified'
            additions.write_text(json.dumps(self.reviewed))
            with patch.object(fetch_polls, 'REVIEWED', additions):
                self.assertEqual(fetch_polls.main(['--merge-existing', '--output', str(output),
                                                  '--as-of', '2026-11-01']), 1)
            self.assertEqual(output.read_bytes(), before)

    def test_cli_refuses_protected_snapshot(self):
        with patch.object(fetch_polls, 'fetch') as download:
            result = fetch_polls.main(['--output', str(fetch_polls.DEFAULT_OUT.with_name('pre_election_snapshot.json'))])
            self.assertEqual(result, 1)
            download.assert_not_called()


if __name__ == '__main__':
    unittest.main()
