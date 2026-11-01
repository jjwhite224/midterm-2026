"""Download licensed model outputs, separately from raw polling measurements."""
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.pollingforecast.com'
STATES = set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())
SENATE = set('AK AL AR CO DE FL GA IA ID IL KS KY LA MA ME MI MN MS MT NC NE NH NJ NM OH OK OR RI SC SD TN TX VA WV WY'.split())


def validate(data, chamber):
    expected = 435 if chamber == 'house' else 35
    if data.get('dataset') != chamber or data.get('licence') != 'CC BY 4.0':
        raise ValueError('Unexpected forecast dataset or license')
    stamp = date.fromisoformat(data['asOf'])
    if stamp.year != 2026 or stamp > datetime.now(timezone.utc).date():
        raise ValueError('Invalid forecast date')
    rows = data['rows']
    if len(rows) != expected or len({r['key'] for r in rows}) != expected:
        raise ValueError('Incomplete or duplicate race coverage')
    if {r['state'] for r in rows} != (STATES if chamber == 'house' else SENATE):
        raise ValueError('Unexpected election geography')
    fields = ('key', 'state', 'name', 'special', 'left_party', 'polls_used',
              'best_bet_margin', 'range80_low', 'range80_high', 'chance_left', 'rating', 'page', 'licence')
    for row in rows:
        if row['kind'].lower() != chamber or row['licence'] != 'CC BY 4.0' or row['left_party'] not in ('D', 'I'):
            raise ValueError('Unreviewed race type, party or license')
        if not row['page'].startswith('/us/' + chamber + '/') or '?' in row['page'] or '#' in row['page']:
            raise ValueError('Unexpected source URL')
        for k in ('best_bet_margin', 'range80_low', 'range80_high', 'chance_left'):
            if type(row[k]) not in (int, float) or not math.isfinite(row[k]):
                raise ValueError('Invalid forecast number')
        if not 0 <= row['chance_left'] <= 1 or not -100 <= row['range80_low'] <= row['best_bet_margin'] <= row['range80_high'] <= 100:
            raise ValueError('Invalid probability or interval')
        if type(row['polls_used']) is not int or row['polls_used'] < 0:
            raise ValueError('Invalid poll coverage')
    return {'as_of': data['asOf'], 'url': BASE + '/us/data/' + chamber + '.json',
            'races': [{k: row[k] for k in fields} for row in rows]}


def main():
    result = {'source': 'Polling Forecast', 'license': 'CC BY 4.0',
              'license_url': 'https://creativecommons.org/licenses/by/4.0/',
              'license_evidence_url': BASE + '/us/data', 'method_url': BASE + '/us/method'}
    for chamber in ('house', 'senate'):
        req = Request(BASE + '/us/data/' + chamber + '.json',
                      headers={'User-Agent': 'Midterm2026 educational data-literacy project'})
        with urlopen(req, timeout=45) as response:
            result[chamber] = validate(json.load(response), chamber)
    if result['house']['as_of'] != result['senate']['as_of']:
        raise ValueError('Chambers must share a forecast date')
    result['retrieved_at'] = datetime.now(timezone.utc).isoformat()
    target = ROOT / 'data' / 'forecasts.json'
    temp = target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    temp.replace(target)
    print('Saved 435 House and 35 Senate model records; no raw polling files changed.')


if __name__ == '__main__':
    main()
