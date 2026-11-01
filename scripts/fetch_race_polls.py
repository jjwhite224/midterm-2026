"""Import attributed 2026 general-election questions; never use forecasts as polls."""
import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import json
import math
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
API = 'https://api.pollresults.org/v1.0/politics/results/'
LICENSE = 'https://creativecommons.org/licenses/by/4.0/'


def download(chamber):
    rows, seen, cursor = [], set(), None
    for _ in range(100):
        params = {'limit': 100}
        if cursor:
            params['cursor'] = cursor
        req = Request(API + chamber + '?' + urlencode(params),
                      headers={'User-Agent': 'Midterm2026 educational data-literacy project'})
        with urlopen(req, timeout=45) as response:
            page = json.load(response)
        if page.get('license', '').split('?')[0] != LICENSE or not isinstance(page.get('results'), list):
            raise ValueError('Unrecognized source license or schema')
        rows.extend(page['results'])
        cursor = page.get('cursor')
        if not cursor:
            return rows
        if cursor in seen:
            raise ValueError('Repeated pagination cursor; refusing partial download')
        seen.add(cursor)
    raise ValueError('Pagination limit reached')


def parsedate(value):
    return datetime.strptime(value, '%m/%d/%y').date().isoformat()


def normalize(poll, chamber, catalog, collected):
    if poll.get('cycle') != '2026' or poll.get('electionDate') != '2026-11-03':
        return [], 'other election'
    if poll.get('hypothetical') not in ('', None, 'FALSE', False):
        return [], 'hypothetical matchup'
    state = poll.get('state')
    if state == 'US':
        return [], 'national generic ballot'
    if poll.get('type') != chamber or poll.get('officeType') != ('U.S. House' if chamber == 'house' else 'U.S. Senate'):
        raise ValueError('Unexpected office')
    start, end = parsedate(poll['startDate']), parsedate(poll['endDate'])
    if not '2025-01-01' <= start <= end <= collected[:10]:
        raise ValueError('Invalid fieldwork dates')
    if not poll.get('pollId') or not poll.get('pollster') or urlsplit(poll.get('url', '')).scheme not in ('http', 'https'):
        raise ValueError('Missing provenance')
    output = []
    for q in poll['questions']:
        if q.get('stage') != 'general' or q.get('subpopulation'):
            continue
        if chamber == 'house':
            seat = q.get('seatNumber')
            # NYT calls single-member states district 1; atlas uses 00 (at-large).
            if str(seat).isdigit():
                key = state + '-' + str(int(seat)).zfill(2)
                state_seats = [r for r in catalog if r['state'] == state]
                if str(seat) == '1' and len(state_seats) == 1 and state_seats[0]['key'] == state + '-00':
                    key = state + '-00'
            else:
                continue
        else:
            candidates = [r['key'] for r in catalog if r['state'] == state]
            if len(candidates) != 1:
                continue
            key = candidates[0]
        if key not in {r['key'] for r in catalog}:
            continue
        if not q.get('questionId') or q.get('population') not in ('lv', 'rv', 'a'):
            continue
        n = q.get('sampleSize')
        if n is not None and (type(n) is not int or n <= 0):
            raise ValueError('Invalid sample size')
        groups = defaultdict(list)
        for a in q['answers']:
            value = a.get('pct')
            if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 100:
                raise ValueError('Invalid percentage')
            if not a.get('candidateId') or not a.get('candidateName') or not a.get('party'):
                raise ValueError('Missing answer identity')
            round_key = (str(a.get('rankedChoiceRound') or ''), str(a.get('rankedChoiceReallocated') or 'FALSE'), str(a.get('rankedChoiceFinal') or 'FALSE'))
            groups[round_key].append({'id': a['candidateId'], 'name': a['candidateName'], 'party': a['party'], 'pct': value})
        for round_key, answers in groups.items():
            if len({a['id'] for a in answers}) != len(answers):
                raise ValueError('Duplicate answer identity')
            # Source rounding may make published totals slightly above/below 100.
            if sum(a['pct'] for a in answers) > 100 + len(answers) * .51:
                raise ValueError('Implausible answer total')
            if len([a for a in answers if a['party'] != 'NONE']) < 2:
                continue
            output.append({'id': q['questionId'] + ':' + '|'.join(round_key),
                           'poll_id': poll['pollId'], 'race': chamber + ':' + key,
                           'pollster': poll['pollster'], 'start_date': start, 'end_date': end,
                           'population': q['population'], 'sample_size': n,
                           'sponsors': poll.get('sponsors', ''), 'partisan': poll.get('partisan', ''),
                           'internal': poll.get('internal', ''), 'notes': poll.get('notes', ''),
                           'url': poll['url'], 'round': list(round_key), 'answers': answers})
    return output, 'out-of-scope or unmapped questions' if not output else None


def build(raw, forecast):
    collected = raw['retrieved_at']
    result = {'source': 'The New York Times via PollResults.org', 'license': 'CC BY 4.0',
              'license_url': LICENSE, 'source_url': 'https://pollresults.org/api/',
              'attribution': 'The New York Times, PollResults.org and the original pollsters',
              'retrieved_at': collected, 'catalog_source': 'Polling Forecast race identifiers and names only; CC BY 4.0; https://www.pollingforecast.com/us/data', 'races': [], 'polls': []}
    excluded, seen = [], {}
    for chamber in ('house', 'senate'):
        catalog = forecast[chamber]['races']
        result['races'].extend({'id': chamber + ':' + r['key'], 'name': r['name'], 'chamber': chamber,
                                'state': r['state']} for r in catalog)
        for poll in raw[chamber]:
            try:
                rows, reason = normalize(poll, chamber, catalog, collected)
            except (ValueError, KeyError, TypeError) as error:
                rows, reason = [], 'requires review: ' + str(error)
            if reason:
                excluded.append({'poll_id': poll.get('pollId'), 'reason': reason})
            for row in rows:
                if row['id'] in seen:
                    if row != seen[row['id']]:
                        raise ValueError('Conflicting question ID: ' + row['id'])
                    continue
                seen[row['id']] = row
                result['polls'].append(row)
    if not all(any(p['race'].startswith(c + ':') for p in result['polls']) for c in ('house', 'senate')):
        raise ValueError('Missing chamber polling coverage')
    result['polls'].sort(key=lambda p: (p['race'], p['end_date'], p['id']))
    result['exclusion_counts'] = dict(Counter(r['reason'] for r in excluded))
    result['coverage_note'] = 'Only mapped November 3 general-election, whole-population questions. Other elections, primaries, subpopulations and ambiguous records excluded. Question variants are not independent polls.'
    return result, excluded


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--from-cache', action='store_true', help='Reuse original collection timestamp from local race-download.tmp')
    args = parser.parse_args()
    cache = ROOT / 'race-download.tmp'
    if args.from_cache:
        raw = json.loads(cache.read_text(encoding='utf-8'))
    else:
        raw = {c: download(c) for c in ('house', 'senate')}
        raw['retrieved_at'] = datetime.now(timezone.utc).isoformat()
        cache.write_text(json.dumps(raw), encoding='utf-8')
    result, excluded = build(raw, json.loads((ROOT / 'data/forecasts.json').read_text()))
    target = ROOT / 'data/race-polls.json'
    temp = target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(result, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')
    temp.replace(target)
    (ROOT / 'race-import-audit.tmp').write_text(json.dumps(excluded, indent=2), encoding='utf-8')
    print(json.dumps({'questions': len(result['polls']), 'polled_races': len({r['race'] for r in result['polls']}),
                      'catalog': len(result['races']), 'excluded': result['exclusion_counts']}))


if __name__ == '__main__':
    main()
