"""Merge manually verified national polls; never infer missing source values."""
from copy import deepcopy
from datetime import datetime
from urllib.parse import urlsplit

MARIST_TERMS = 'https://maristpoll.marist.edu/terms-of-use/'
MARIST_LICENSE = 'Marist permission to redistribute with attribution'


def valid_url(value):
    return isinstance(value, str) and urlsplit(value).scheme == 'https' and bool(urlsplit(value).netloc)


def validate_reviewed(row, cutoff):
    from fetch_polls import parse_ymd, numeric_pct
    if not isinstance(row, dict):
        raise RuntimeError('Reviewed poll must be an object')
    required = ('id', 'pollster', 'source', 'attribution', 'review_notes')
    if any(not isinstance(row.get(k), str) or not row[k].strip() for k in required):
        raise RuntimeError('Reviewed poll missing identification or review evidence')
    if row.get('poll_type') != 'generic-ballot' or row.get('geography') != 'US' or row.get('cycle') != 2026:
        raise RuntimeError('Only national 2026 generic-ballot polls may be merged')
    start, end = parse_ymd(row.get('start_date')), parse_ymd(row.get('end_date'))
    if not start or not end or start > end or end.year != 2026:
        raise RuntimeError('Invalid reviewed fieldwork dates')
    for key in ('retrieved_at', 'reviewed_at'):
        try:
            stamp = datetime.fromisoformat(row.get(key, '').replace('Z', '+00:00'))
            if stamp.tzinfo is None or stamp.date() < end or stamp > datetime.now(stamp.tzinfo):
                raise ValueError()
        except (ValueError, TypeError):
            raise RuntimeError('Invalid reviewed collection/review timestamp') from None
    if row.get('population') not in {'rv', 'lv', 'a'}:
        raise RuntimeError('Unrecognized reviewed population')
    n = row.get('sample_size')
    if type(n) is not int or n <= 0:
        raise RuntimeError('Reviewed poll requires a verified positive sample size')
    values = [row.get(k) for k in ('dem', 'rep')]
    if any(type(v) not in (int, float) or numeric_pct(v) is None for v in values) or sum(values) > 100.01:
        raise RuntimeError('Invalid reviewed percentages')
    if any(not valid_url(row.get(k)) for k in ('url', 'evidence_url', 'license_url')):
        raise RuntimeError('Reviewed poll requires original evidence and license URLs')
    # Explicit allowlist: new sources need their own terms reviewed before use.
    marist = (row.get('license') == MARIST_LICENSE and row.get('license_url') == MARIST_TERMS
              and all(urlsplit(row[k]).hostname == 'maristpoll.marist.edu' for k in ('url', 'evidence_url'))
              and 'marist' in row['pollster'].lower())
    compiled = (row.get('license') == 'CC BY 4.0'
                and row.get('license_url') == 'https://creativecommons.org/licenses/by/4.0/'
                and row.get('source') == 'Call the Map polling archive'
                and row.get('source_url') in {
                    'https://www.callthemap.com/polls/pollsters/activote',
                    'https://www.callthemap.com/polls?archive=60&view=house'}
                and row.get('license_evidence_url') == row.get('source_url')
                and (row['pollster'], urlsplit(row['url']).hostname) in {
                    ('ActiVote', 'www.activote.net'), ('Big Data Poll', 'www.bigdatapoll.com')}
                and row['evidence_url'] == row['url'])
    if not (marist or compiled):
        raise RuntimeError('Unreviewed source or reuse permission')
    return end <= cutoff


def pollster_key(name):
    name = name.casefold().strip()
    return 'marist' if 'marist' in name else name


def merge_reviewed(dataset, reviewed, cutoff, assembled_at):
    if not isinstance(reviewed, dict) or not isinstance(reviewed.get('polls'), list):
        raise RuntimeError('Expected reviewed polls list')
    result = deepcopy(dataset)
    rows = result['polls']
    for row in rows:
        # Upgrade the existing single-source snapshot without changing its collection time.
        if not row.get('source'):
            if dataset.get('source') != 'VoteHub Polling API':
                raise RuntimeError('Cannot infer provenance of existing mixed-source data')
            row.update(source='VoteHub Polling API', license='CC BY 4.0',
                       license_url='https://creativecommons.org/licenses/by/4.0/',
                       retrieved_at=dataset['retrieved_at'],
                       attribution='VoteHub and ' + row['pollster'])
    for candidate in reviewed['polls']:
        if not validate_reviewed(candidate, cutoff):
            continue
        matches = [row for row in rows if row['id'] == candidate['id'] or (
            row['population'] == candidate['population']
            and pollster_key(row['pollster']) == pollster_key(candidate['pollster'])
            and row['end_date'] == candidate['end_date'])]
        if matches:
            fields = ('start_date', 'end_date', 'dem', 'rep', 'population', 'sample_size')
            if len(matches) != 1 or any(matches[0].get(k) != candidate.get(k) for k in fields):
                raise RuntimeError('Conflicting poll requires manual review: ' + candidate['id'])
            continue  # Matching measurement already present; keep its original provenance.
        rows.append(deepcopy(candidate))
    rows.sort(key=lambda p: (p['end_date'], p['id']))
    result.update(source=' + '.join(sorted({row['source'] for row in rows})),
                  license='Mixed; see each record for reuse terms',
                  assembled_at=assembled_at,
                  latest_fieldwork_end=max((row['end_date'] for row in rows), default=None))
    return result
