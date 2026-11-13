#!/usr/bin/env python3
"""Non-destructive enrichment with source-discovery candidates. Unverified rows are never analysis-ready."""
import csv,json,re
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'analysis'
master=list(csv.DictReader((OUT/'2026_congressional_poll_master.csv').open(encoding='utf-8',newline='')))
candidates=list(csv.DictReader((OUT/'supplemental_poll_candidates_REVIEW.csv').open(encoding='utf-8',newline='')))
fields=list(master[0])
output=list(master)
existing={(r['race_id'],r['fieldwork_end'],r['pollster'].strip().casefold()) for r in master}
counts=Counter()
pattern=re.compile(r'([^;]+?)\s*\(([DR])\)\s*(\d+(?:\.\d+)?)\s*(?:;|$)')
for p in candidates:
    end=p['fieldwork_end'][:10]
    key=(p['race_id'],end,p['pollster'].strip().casefold())
    if key in existing:
        counts['same_pollster_date_race_duplicate_held_in_review']+=1
        continue
    # Multiple question variants from a survey must remain visible but not multiply in averages.
    shares={'D':[],'R':[]}
    for match in pattern.finditer(p['figures']+';'):
        shares[match.group(2)].append(float(match.group(3)))
    d,r=(shares['D'][0] if len(shares['D'])==1 else None),(shares['R'][0] if len(shares['R'])==1 else None)
    record={
        'record_id':'discovery:'+p['poll_id'],
        'race_id':p['race_id'],'pollster':p['pollster'],
        'fieldwork_start':p['fieldwork_start'][:10],'fieldwork_end':end,
        'population':p['population'].lower(),'sample_size':p['sample'],
        'dem_percent':d,'rep_percent':r,
        'dem_minus_rep_margin':round(d-r,3) if d is not None and r is not None else '',
        'poll_id':'discovery:'+p['poll_id'],
        'source_url':p['original_source_url'],
        'source_tier':'supplement_unverified_secondary_compilation',
        'partisan_flag':p['partisan'],
        'source_license':p['license'],
        'verification_note':'Public-source discovery only; original release and candidate matchup not independently verified; possible cross-provider duplication',
        'include_in_primary_analysis':'no'
    }
    output.append(record)
    existing.add(key)
    counts['supplemental_candidate_records_added']+=1
    if d is None or r is None:counts['supplemental_missing_unique_DR_percentages']+=1
    if p['already_covered_race']=='False':counts['candidate_records_in_new_races']+=1
with (OUT/'2026_congressional_poll_master_with_candidates.csv').open('w',encoding='utf-8',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(output)
audit={'verified_master_rows':len(master),'supplemental_discovery_rows':len(candidates),'combined_rows':len(output),'coverage_races':len({r['race_id'] for r in output}),'counts':dict(counts),'warning':'Unverified discovery entries are preserved for research but explicitly excluded from polling-error calculations. No claims of validation or independent surveys. License and provenance remain row-specific.'}
(OUT/'2026_candidate_enrichment_audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print(json.dumps(audit,indent=2))
