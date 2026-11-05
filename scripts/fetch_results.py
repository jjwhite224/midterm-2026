"""Fetch attributed, UNOFFICIAL returns. Never infer certification from reporting %."""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
IDS = {'house': 87524, 'senate': 87528}


def number(value, maximum=None):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or (maximum is not None and value > maximum):
        raise ValueError('Invalid numeric result')
    return value


def normalize(raw, collected):
    catalog = json.loads((ROOT / 'data/race-polls.json').read_text(encoding='utf-8'))['races']
    known = {r['id'] for r in catalog}
    races = []
    updated = {}
    for chamber, source in raw.items():
        if chamber not in IDS or source.get('test_data') is not False or source.get('is_disputed') is not False or source.get('election_date', '')[:10] != '2026-11-03' or source.get('country') != 'US' or source.get('election_scope') != 'General':
            raise ValueError('Wrong election, test data or disputed source')
        expected = 'House of Representatives' if chamber == 'house' else 'US Senate'
        if source.get('election_type') != expected:
            raise ValueError('Wrong office')
        updated[chamber] = source['last_updated']
        if not '2026-11-03' <= updated[chamber][:10] <= collected[:10]:
            raise ValueError('Invalid source update date')
        for key, row in source['region_results'].items():
            seat = key.upper().replace('-AL', '-00')
            if chamber == 'senate' and seat in ('FL', 'OH'):
                seat += '-S'
            race_id = chamber + ':' + seat
            if race_id not in known:
                raise ValueError('Unknown race: ' + race_id)
            candidates = []
            for c in row['candidates']:
                votes = number(c['votes'])
                if int(votes) != votes or not c.get('name') or not c.get('party') or not isinstance(c.get('winner'), bool):
                    raise ValueError('Invalid candidate')
                candidates.append({'name': c['name'], 'party': c['party'], 'votes': votes,
                                   'percent': number(c['percent'], 100), 'source_called': c['winner']})
            if not candidates or sum(c['source_called'] for c in candidates) > 1:
                raise ValueError('Missing candidates or conflicting calls')
            if sum(c['percent'] for c in candidates) > 101:
                raise ValueError('Invalid percentage total')
            races.append({'id': race_id, 'chamber': chamber, 'state': key[:2].upper(),
                          'name': row['name'], 'reporting_percent': number(row['percent_reporting'], 100),
                          'certification': 'unverified', 'candidates': candidates,
                          'source_url': 'https://civicapi.org/api/v2/race/' + str(int(row['election_id']))})
    if set(r['id'] for r in races) != known or len(races) != 470:
        raise ValueError('Incomplete or duplicate race coverage')
    return {'election_date': '2026-11-03', 'status': 'unofficial', 'source': 'civicAPI',
            'source_urls': {c: 'https://civicapi.org/api/v2/race/' + str(i) for c, i in IDS.items()},
            'license': 'Reuse permitted with attribution under civicAPI FAQ',
            'license_url': 'https://civicapi.org/faq', 'collected_at': collected,
            'source_updated_at': updated, 'races': races}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-cache', type=Path)
    args = parser.parse_args()
    collected = datetime.now(timezone.utc).isoformat()
    if args.from_cache:
        raw = json.loads(args.from_cache.read_text(encoding='utf-8'))
        collected = datetime.fromtimestamp(args.from_cache.stat().st_mtime, timezone.utc).isoformat()
    else:
        raw = {}
        for chamber, ident in IDS.items():
            request = Request(f'https://civicapi.org/api/v2/race/{ident}', headers={'User-Agent': 'Midterm2026 educational project'})
            with urlopen(request, timeout=45) as response:
                raw[chamber] = json.load(response)
    data = normalize(raw, collected)
    target = ROOT / 'data/results.json'
    if target.exists():
        previous = json.loads(target.read_text(encoding='utf-8'))
        if any(data['source_updated_at'][c] < previous['source_updated_at'][c] for c in IDS):
            raise ValueError('Refusing an older results snapshot')
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)
    print(f'Wrote {len(data["races"])} unofficial races; polling archives unchanged.')


if __name__ == '__main__':
    main()
