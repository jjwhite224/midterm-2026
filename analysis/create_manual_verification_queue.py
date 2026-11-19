#!/usr/bin/env python3
"""Create a transparent ten-race source-verification queue, not a certification claim."""
import csv
from collections import defaultdict
from pathlib import Path
R=Path(__file__).resolve().parents[1]
P=R/'analysis'
scenario=P/'sensitivity'/'window30'
rows={r['race_id']:r for r in csv.DictReader((scenario/'2026_polling_errors_provisional_v2.csv').open(encoding='utf-8',newline=''))}
audits=defaultdict(list)
for r in csv.DictReader((scenario/'2026_poll_selection_audit_v2.csv').open(encoding='utf-8',newline='')):
    if r['reason']=='candidate': audits[r['race_id']].append(r)
targets=['house:CA-48','house:PA-07','house:PA-08','house:TX-35',
         'senate:CO','senate:IL','senate:NM','senate:MI','senate:TX','senate:ME']
headers=['race_id','status','poll_average_2party_pp','result_margin_2party_pp',
         'signed_error_pp','polls_used','pollsters_used','election_source',
         'original_poll_source_urls','manual_review_status','review_tasks']
out=[]
for rid in targets:
    r=rows.get(rid)
    if not r:raise ValueError('Missing expected race '+rid)
    uniq=list(dict.fromkeys(a['source_url'] for a in audits[rid] if a['source_url']))
    out.append(dict(zip(headers,[rid,r['status'],r['poll_average_d_minus_r_2party_pp'],r['result_d_minus_r_2party_pp'],
        r['signed_error_pp'],r['polls_used'],r['pollsters_used'],r['election_source_url'],
        ' | '.join(uniq),'NOT_INDEPENDENTLY_VERIFIED','Verify original candidate toplines, sample dates, duplicate survey IDs, reported candidate totals, certification status; log evidence and decisions'])))
with (P/'2026_manual_10_race_verification_queue.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=headers);w.writeheader();w.writerows(out)
print('Created 10-race original-source verification queue; no human verification claimed')
