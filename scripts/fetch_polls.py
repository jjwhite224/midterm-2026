#!/usr/bin/env python3
"""Fetch 2026 national generic-ballot polls from VoteHub.

Only the documented VoteHub schema is supported. Errors never overwrite an
existing snapshot. Poll results are descriptive survey measurements, NOT forecasts.
"""
import argparse
import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = 'https://api.votehub.com/polls'
LICENSE = 'CC BY 4.0'
END_OF_PRE_ELECTION = date(2026, 11, 2)
DEFAULT_OUT = Path(__file__).resolve().parents[1] / 'data' / 'polls.json'


def parse_ymd(value):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def party(answer):
    label = str(answer.get('choice') or '').strip().lower()
    if label in {'dem', 'democrat', 'democrats', 'democratic', 'democratic candidate'}:
        return 'dem'
    if label in {'rep', 'republican', 'republicans', 'gop', 'republican candidate'}:
        return 'rep'
    return None


def numeric_pct(v):
    try:
        number = float(v)
        return number if 0 <= number <= 100 else None
    except (ValueError, TypeError):
        return None


def normalize(raw, cutoff):
    if not isinstance(raw, dict) or raw.get('poll_type') != 'generic-ballot':
        return None
    end = parse_ymd(raw.get('end_date'))
    if not end or end.year != 2026 or end > cutoff:
        return None
    if str(raw.get('subject') or '').strip() != '2026':
        return None
    source_id = raw.get('id')
    pollster = str(raw.get('pollster') or '').strip()
    if not source_id or not pollster:
        return None
    percentages = {}
    for answer in raw.get('answers') or []:
        if not isinstance(answer, dict):
            continue
        key = party(answer)
        if key and key not in percentages:
            percentages[key] = numeric_pct(answer.get('pct'))
    dem, rep = percentages.get('dem'), percentages.get('rep')
    if dem is None or rep is None or dem + rep > 100.01:
        return None
    population = str(raw.get('population') or '').strip().lower()
    if population not in {'lv', 'rv', 'a'}:
        population = 'unknown'
    size = re.sub(r'[^0-9]', '', str(raw.get('sample_size') or ''))
    size = int(size) if size else None
    url = raw.get('url') or ''
    if not isinstance(url, str) or not url.startswith(('https://','http://')):
        url = ''
    return {
        'id': str(source_id), 'end_date': end.isoformat(),
        'start_date': raw.get('start_date') if parse_ymd(raw.get('start_date')) else None,
        'pollster': pollster, 'population': population, 'sample_size': size,
        'dem': dem, 'rep': rep, 'url': url,
        'internal': bool(raw.get('internal')), 'partisan': raw.get('partisan'),
    }


def build_dataset(raw_polls, cutoff, retrieved_at):
    by_id = {}
    for raw in raw_polls:
        cleaned = normalize(raw, cutoff)
        if cleaned:
            by_id[cleaned['id']] = cleaned
    rows = sorted(by_id.values(), key=lambda p: (p['end_date'], p['id']))
    return {'source': 'VoteHub Polling API', 'source_url': 'https://votehub.com/polls/api/',
            'license': LICENSE, 'retrieved_at': retrieved_at, 'as_of': cutoff.isoformat(),
            'polls': rows}


def fetch(cutoff):
    query = urlencode({'poll_type': 'generic-ballot', 'subject': '2026',
                       'from_date': '2026-01-01', 'to_date': cutoff.isoformat()})
    req = Request(f'{API}?{query}', headers={'User-Agent':'Midterm2026DataExplorer/0.1 (research; GitHub Pages)', 'Accept':'application/json'})
    with urlopen(req, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f'API returned HTTP {response.status}')
        body = response.read(15_000_000)
    payload = json.loads(body)
    # The live endpoint returns a list; documentation also shows a polls envelope.
    polls = payload.get('polls') if isinstance(payload, dict) else payload
    if not isinstance(polls, list) or any(not isinstance(row, dict) for row in polls):
        raise RuntimeError('Unexpected VoteHub response: expected a poll list or JSON with polls list')
    return polls


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', default=date.today().isoformat(), help='YYYY-MM-DD cutoff')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUT)
    parser.add_argument('--min-polls', type=int, default=1, help='Refuse to overwrite with fewer than this many polls')
    args = parser.parse_args(argv)
    cutoff = parse_ymd(args.as_of)
    if cutoff is None or cutoff < date(2026,1,1):
        parser.error('--as-of must be a date in 2026 or later')
    retrieved = datetime.now(timezone.utc).isoformat(timespec='seconds')
    try:
        raw = fetch(cutoff)
        dataset = build_dataset(raw, cutoff, retrieved)
        if len(dataset['polls']) < args.min_polls:
            raise RuntimeError(f'Only {len(dataset["polls"])} usable 2026 generic-ballot polls returned; refusing to overwrite existing data.')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        tmp = args.output.with_suffix(args.output.suffix + '.tmp')
        tmp.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        tmp.replace(args.output)
        print(f'Wrote {len(dataset["polls"])} validated polls to {args.output}; retrieved {retrieved}')
    except (HTTPError, URLError, RuntimeError, json.JSONDecodeError, TimeoutError) as e:
        print(f'ERROR: {e}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
