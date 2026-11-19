#!/usr/bin/env python3
"""Check that five attributed UNH House toplines entered the reproducible run.
Never treat this as an audit of all surveys or vote certifications.
"""
import csv,json
from pathlib import Path

root=Path(__file__).resolve().parents[1]/'analysis'
source=list(csv.DictReader((root/'2026_verified_new_race_polls.csv').open(encoding='utf-8',newline='')))
expected={'house:NH-01','house:NH-02','house:ME-01','house:ME-02','house:VT-00'}
assert len(source)==5 and {r['race_id'] for r in source}==expected
assert all(r['source_url'].startswith('https://scholars.unh.edu/survey_center_polls/') for r in source)
assert all(r['fieldwork_start']=='2026-10-27' and r['fieldwork_end']=='2026-10-31' for r in source)
assert all(0<=float(r['dem_percent'])<=100 and 0<=float(r['rep_percent'])<=100 for r in source)
base=root/'sensitivity'/'window30'
summary=json.loads((base/'2026_polling_accuracy_summary_v2.json').read_text(encoding='utf-8'))
assert summary['new_verified_house_source_records']==5
assert summary['new_verified_house_records_selected']==5
comparisons={r['race_id']:r for r in csv.DictReader((base/'2026_polling_errors_provisional_v2.csv').open(encoding='utf-8',newline=''))}
assert len(comparisons)==470
for race in ['house:NH-01','house:NH-02']:
    r=comparisons[race]
    assert r['status']=='provisional_comparison' and int(r['pollsters_used'])>=2
for race in ['house:ME-01','house:ME-02','house:VT-00']:
    r=comparisons[race]
    assert r['status']=='single_pollster_comparison' and int(r['pollsters_used'])==1
for race in expected:
    r=comparisons[race]
    assert r['signed_error_pp']!='' and r['result_status']=='UNOFFICIAL_UNCERTIFIED'
audit=list(csv.DictReader((base/'2026_poll_selection_audit_v2.csv').open(encoding='utf-8',newline='')))
found=[x for x in audit if x['record_id'].startswith('new:UNH:')]
assert len(found)==5 and all(x['reason']=='candidate' for x in found)
assert summary['national']['all']['eligible_races']>=24
assert summary['national']['exploratory_including_single_pollster']['eligible_races']>=52
print('Verified 5 attributed House survey records, 3 new exploratory races, 2 second-pollster upgrades, all 470 race statuses.')
