#!/usr/bin/env python3
"""Run comparable 2026 polling sensitivity checks without rewriting baseline v2."""
import csv, importlib.util, json
from datetime import date, timedelta
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('polling_sensitivity',HERE/'calculate_polling_accuracy_sensitivity.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

scenarios=[
    ('window21',21,False,False),
    ('window30',30,False,False),
    ('window45',45,False,False),
    ('window30_partisan',30,True,False),
    ('window30_without_researchco',30,False,True),
]
results=[]
for name,days,partisan,exclude_research in scenarios:
    mod.START=date(2026,11,2)-timedelta(days=days-1)
    mod.END=date(2026,11,2)
    mod.INCLUDE_PARTISAN=partisan
    mod.EXCLUDE_RESEARCH_CO=exclude_research
    mod.OUT=HERE/'sensitivity'/name
    mod.main()
    data=json.loads((mod.OUT/'2026_polling_accuracy_summary_v2.json').read_text())
    strict=data['national']['all'];expl=data['national']['exploratory_including_single_pollster']
    results.append({
        'scenario':name,'window_days':days,
        'allow_partisan_or_internal':partisan,'exclude_research_co':exclude_research,
        'polls_selected':data['selected_questions'],
        'multi_pollster_races':strict['eligible_races'],
        'multi_mean_signed_error_pp':strict['mean_signed_error_pp'],
        'multi_mean_absolute_error_pp':strict['mean_absolute_error_pp'],
        'multi_positive_error_races':strict['races_understating_democrats'],
        'multi_negative_error_races':strict['races_understating_republicans'],
        'exploratory_races':expl['eligible_races'],
        'exploratory_mean_signed_error_pp':expl['mean_signed_error_pp'],
        'exploratory_mean_absolute_error_pp':expl['mean_absolute_error_pp'],
        'exploratory_positive_error_races':expl['races_understating_democrats'],
        'exploratory_negative_error_races':expl['races_understating_republicans'],
        'result_collection_utc':data['as_of_results']
    })
out=HERE/'2026_sensitivity_summary.csv'
with out.open('w',newline='',encoding='utf-8') as f:
    writer=csv.DictWriter(f,fieldnames=list(results[0]));writer.writeheader();writer.writerows(results)
(HERE/'2026_sensitivity_summary.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results,indent=2))
