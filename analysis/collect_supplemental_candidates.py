#!/usr/bin/env python3
"""Candidate discovery, preserving source provenance. Never silently append unverified polls."""
import csv, json, re, urllib.request
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'analysis'; OUT.mkdir(exist_ok=True)
src='https://www.pollingforecast.com/api/us/polls'
with urllib.request.urlopen(urllib.request.Request(src,headers={'User-Agent':'CUNY-midterms-methodology-audit/1.0'}),timeout=60) as response:
    feed=json.load(response)
if feed.get('dataset')!='polls' or not isinstance(feed.get('rows'),list):raise ValueError('Unexpected feed schema')
archive=json.loads((ROOT/'data/race-polls.json').read_text())
known={r['id'] for r in archive['races']}
covered={p['race'] for p in archive['polls']}
existing={(str(p.get('pollster','')).casefold(),p.get('end_date'),p.get('race')) for p in archive['polls']}
def race_id(p):
    kind=p.get('kind'); raw=str(p.get('race',''))
    if kind=='House': return 'house:'+raw
    if kind=='Senate':
        state=raw.split('-')[0]
        return 'senate:'+state if state else ''
    return ''
def validdate(value):
    try:return date.fromisoformat(str(value)[:10])
    except (ValueError,TypeError):return None
fields=['poll_id','race_id','pollster','fieldwork_start','fieldwork_end','population','sample','figures','published_margin','adjusted_margin_NOT_RAW','original_source_url','source_grade','license','partisan','already_covered_race','potential_existing_duplicate','review_status']
rows=[]
for p in feed['rows']:
    rid=race_id(p);end=validdate(p.get('fieldwork_end'))
    if p.get('stage')!='vote' or rid not in known or end is None or not date(2026,9,3)<=end<=date(2026,11,2):continue
    url=str(p.get('source_url') or '')
    if not url.startswith('https://'):continue
    duplicate=(str(p.get('pollster','')).casefold(),str(end),rid) in existing
    rows.append([p.get('poll_id'),rid,p.get('pollster'),p.get('fieldwork_start'),p.get('fieldwork_end'),p.get('population'),p.get('sample'),p.get('figures'),p.get('margin'),p.get('adjusted_margin'),url,p.get('source_grade'),p.get('licence'),p.get('partisan'),rid in covered,duplicate,'REVIEW_ORIGINAL_RELEASE_MATCHUP_REUSE'])
rows.sort(key=lambda r:(r[1],str(r[4]),str(r[2])))
with (OUT/'supplemental_poll_candidates_REVIEW.csv').open('w',encoding='utf-8',newline='') as file:
    writer=csv.writer(file);writer.writerow(fields);writer.writerows(rows)
fresh={r[1] for r in rows if not r[14]}
metadata={'source':src,'feed_as_of':feed.get('asOf'),'feed_license':feed.get('licence'),'feed_license_note':feed.get('licenceNote'),'candidate_records':len(rows),'covered_races_in_base':len(covered),'candidate_races_not_in_base':len(fresh),'candidate_race_ids_not_in_base':sorted(fresh),'potential_duplicate_records':sum(bool(r[15]) for r in rows),'review_warning':'Source discovery only. Do not merge Wikipedia-derived CC BY-SA 4.0 records into the CC BY 4.0 base without respecting license and validating originals; adjusted_margin is a model adjustment, NOT the original poll margin.'}
(OUT/'supplemental_poll_source_metadata.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in metadata.items() if k!='candidate_race_ids_not_in_base'},indent=2))
