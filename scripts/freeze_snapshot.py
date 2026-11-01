#!/usr/bin/env python3
"""Freeze the first real pre-election poll dataset before polls open.

This deliberately refuses retroactive snapshots after the deadline. An archive
must never be misrepresented as having been created before Election Day.
"""
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'polls.json'
DEST = ROOT / 'data' / 'pre_election_snapshot.json'
DEADLINE = datetime(2026, 11, 3, 0, 0, tzinfo=ZoneInfo('America/New_York'))


def main():
    now = datetime.now(ZoneInfo('America/New_York'))
    if now >= DEADLINE:
        print('ERROR: Pre-election snapshot deadline passed. Never backdate an archive.', file=sys.stderr)
        return 1
    if DEST.exists():
        print('ERROR: Snapshot is immutable. Existing file will not be overwritten.',file=sys.stderr)
        return 1
    payload = json.loads(SOURCE.read_text(encoding='utf-8'))
    if not payload.get('retrieved_at') or not payload.get('polls'):
        print('ERROR: Download authentic polls before freezing a snapshot.',file=sys.stderr)
        return 1
    original = SOURCE.read_bytes()
    snapshot = {'snapshot_created_at': now.isoformat(), 'polls_sha256': hashlib.sha256(original).hexdigest(),
                'source': payload.get('source'), 'source_url': payload.get('source_url'),
                'license': payload.get('license'), 'retrieved_at': payload['retrieved_at'],
                'as_of': payload.get('as_of'), 'polls': payload['polls']}
    DEST.write_text(json.dumps(snapshot,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'Immutable snapshot created with {len(snapshot["polls"])} records. Commit immediately!')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
