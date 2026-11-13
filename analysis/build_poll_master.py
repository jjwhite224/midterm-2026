#!/usr/bin/env python3
"""Create original + independently checked supplemental 2026 congressional polls.
The original data/race-polls.json is never rewritten. Each observation is a QUESTION,
not automatically an independent survey. Supplemental coverage isn't a causal claim.
"""
import csv, json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'analysis'
source=json.loads((ROOT/'data/race-polls.json').read_text(encoding='utf-8'))
catalog={r['id'] for r in source['races']}
fields=['record_id','race_id','pollster','fieldwork_start','fieldwork_end','population','sample_size','dem_percent','rep_percent','dem_minus_rep_margin','poll_id','source_url','source_tier','partisan_flag','source_license','verification_note','include_in_primary_analysis']
def shares(answers):
    d=[float(a['pct']) for a in answers if str(a.get('party','')).upper() in ('DEM','D','DEMOCRATIC')]
    r=[float(a['pct']) for a in answers if str(a.get('party','')).upper() in ('REP','R','REPUBLICAN')]
    return (d[0],r[0]) if len(d)==1 and len(r)==1 else (None,None)
rows=[]
for p in source['polls']:
    d,r=shares(p.get('answers',[]))
    rows.append(dict(zip(fields,[p.get('id'),p.get('race'),p.get('pollster'),p.get('start_date'),p.get('end_date'),p.get('population'),p.get('sample_size'),d,r,(round(d-r,3) if d is not None else None),p.get('poll_id'),p.get('url'),'existing_NYT_PollResults',p.get('partisan'),source.get('license'), 'Existing published question; matchup and RCV still require review', 'candidate' if d is not None else 'no'])))
# Independently examined original releases; DO NOT normalize undecided voters away.
# These are source-derived percentages, not model-adjusted margins.
curated=[
 dict(id='supp:CO:APRL:20261020',race='senate:CO',pollster='University of Colorado / YouGov',start='2026-10-09',end='2026-10-20',population='lv',n=710,d=57,r=39,partisan='',url='https://www.colorado.edu/lab/aprl/media/84',note='Original 2026 Colorado Political Climate Survey, p10, independently checked'),
 dict(id='supp:CO:RESEARCHCO:20261102',race='senate:CO',pollster='Research Co.',start='2026-10-31',end='2026-11-02',population='lv',n=450,d=57,r=35,partisan='',url='https://researchco.ca/wp-content/uploads/2026/11/Tables_MidTerms_USA_02Nov2026.pdf',note='Original Research Co. Nov 2 data tables p1; ALL surveyed, not decided-voter reweighting'),
 dict(id='supp:NV03:REDBOX:20261023',race='house:NV-03',pollster='RedBox Research',start='2026-10-20',end='2026-10-23',population='lv',n=687,d=49,r=42,partisan='D',url='https://afightworthhaving.com/polling/2026/nv-03',note='Original pollster release checked; sponsored by super PAC; exclude from nonpartisan primary analysis')
]
existing_keys={(str(p.get('race')),str(p.get('end_date')),str(p.get('pollster','')).casefold()) for p in source['polls']}
added=[];skipped=[]
for p in curated:
    if p['race'] not in catalog:
        skipped.append({'record':p['id'],'why':'unmapped race'});continue
    # Strong duplicate check; manual independent cross-source names can vary.
    key=(p['race'],p['end'],p['pollster'].casefold())
    if key in existing_keys:
        skipped.append({'record':p['id'],'why':'same race/pollster/end date already in source'});continue
    d,r=p['d'],p['r']
    item=dict(zip(fields,[p['id'],p['race'],p['pollster'],p['start'],p['end'],p['population'],p['n'],d,r,d-r,p['id'],p['url'],'supplement_original_release_checked',p['partisan'],'Original-source figures with attribution; check original reuse terms before republication',p['note'],'no_partisan' if p['partisan'] else 'yes']))
    rows.append(item);added.append(p['id'])
OUT.mkdir(exist_ok=True)
with (OUT/'2026_congressional_poll_master.csv').open('w',newline='',encoding='utf-8') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
covered={x['race_id'] for x in rows};original_covered={p['race'] for p in source['polls']}
audit={'original_question_records':len(source['polls']),'master_rows':len(rows),'original_race_coverage':len(original_covered),'master_race_coverage':len(covered),'total_races':len(catalog),'new_races':sorted(covered-original_covered),'independently_checked_added':added,'skipped':skipped,'discovery_candidate_records':555,'discovery_candidate_new_races':['house:CT-02','house:NV-03','senate:CO'],'unmerged_new_race':'house:CT-02 — source document not independently verified; review queue retains it','important':'Question records are not independent surveys. Additional 555 discovery candidates were not automatically merged; many are duplicates, partisan, or Wikipedia-derived CC BY-SA. Provisional election returns are not certified. Do not call this a complete all-races polling dataset.','source_archive_timestamp':source.get('retrieved_at')}
(OUT/'2026_poll_master_audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print(json.dumps(audit,indent=2))
