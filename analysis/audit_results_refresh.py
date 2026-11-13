#!/usr/bin/env python3
"""Audit updated provisional returns against the prior committed source snapshot."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
current=json.loads((ROOT/'data/results.json').read_text(encoding='utf-8'))
old=json.loads(subprocess.check_output(['git','show','HEAD:data/results.json'],cwd=ROOT,text=True))
def summarise(x):
    total=len(x['races']);calls=sum(any(c['source_called'] for c in r['candidates']) for r in x['races'])
    return {'races':total,'called_races':calls,'uncalled_races':total-calls,
      'reporting_under_95_percent':sum((r['reporting_percent'] or 0)<95 for r in x['races']),
      'reported_candidate_votes':sum(sum(int(c['votes']) for c in r['candidates']) for r in x['races'])}
prev={r['id']:r for r in old['races']}
changes=[]
for row in current['races']:
    prior=prev.get(row['id'])
    if not prior:raise ValueError('New/unrecognized race ID '+row['id'])
    before={c['name']:c['votes'] for c in prior['candidates']}
    after={c['name']:c['votes'] for c in row['candidates']}
    if before!=after or prior['reporting_percent']!=row['reporting_percent']:
        changes.append({'race':row['id'],'old_reporting_percent':prior['reporting_percent'],
                        'new_reporting_percent':row['reporting_percent'],
                        'prior_votes':sum(before.values()),'new_votes':sum(after.values())})
if len(current['races'])!=470 or set(prev)!={r['id'] for r in current['races']}:
    raise ValueError('Unexpected change in catalog')
a={'previous_collection':old['collected_at'],'current_collection':current['collected_at'],
   'previous_source_updated':old['source_updated_at'],'current_source_updated':current['source_updated_at'],
   'previous':summarise(old),'current':summarise(current),
   'changed_race_count':len(changes),'changed_races':changes,
   'status':'provisional, NOT certified','note':'This is a report of source-file changes, not an accuracy analysis. State certification and independent vote verification remain outstanding.'}
(ROOT/'analysis/2026_results_refresh_audit.json').write_text(json.dumps(a,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in a.items() if k!='changed_races'},indent=2))
