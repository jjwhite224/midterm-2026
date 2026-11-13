#!/usr/bin/env python3
"""Reproducible *provisional* 2026 U.S. House/Senate polling averages and errors.

Primary definition: last 30 fieldwork-end dates through Nov 2, 2026; one
matched D/R candidate matchup and one question per survey; LV > RV > adults;
exclude partisan/internal records, known fabricated pollsters, RCV variations,
and contests with >5% votes outside the two major parties. The poll margin and
election margin are both D-minus-R normalized to the two-party D+R denominator.
At least two independent pollsters are required for a reported accuracy estimate.
These are exploratory descriptive averages, NOT election forecasts.
"""
import csv
import json
import re
import statistics
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'analysis'
START, END = date(2026, 10, 4), date(2026, 11, 2)
BANNED = ('wedgewood', 'median strategies')
POP_RANK = {'lv': 0, 'rv': 1, 'a': 2}
SUFFIXES = {'jr', 'sr', 'ii', 'iii', 'iv', 'v'}
FIELDS = ['race_id','chamber','state','race_name','status','result_status',
          'poll_average_d_minus_r_2party_pp','result_d_minus_r_2party_pp',
          'signed_error_pp','absolute_error_pp','polls_used','pollsters_used',
          'latest_poll_date','earliest_poll_date','pollster_names',
          'source_poll_ids','election_source_url','results_collected_at',
          'notes']

def dte(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None

def candidate_key(name):
    # Conservative match: first token and last nonsuffix token, lowercase.
    # Unclear aliases are excluded rather than silently mapped.
    t = re.findall(r"[a-z]+", (name or '').casefold())
    while t and t[-1] in SUFFIXES:
        t.pop()
    return (t[0], t[-1]) if len(t) >= 2 else tuple(t)

def party(p):
    p=(p or '').strip().casefold()
    return 'D' if p in ('dem','d','democratic','democrat') else 'R' if p in ('rep','r','republican') else 'O'

def result_info(row):
    d=[x for x in row['candidates'] if party(x.get('party'))=='D']
    r=[x for x in row['candidates'] if party(x.get('party'))=='R']
    total=sum(x.get('votes',0) for x in row['candidates'])
    other=total-sum(x.get('votes',0) for x in d+r)
    if len(d)!=1 or len(r)!=1 or not all(x.get('votes',0)>0 for x in d+r):
        return None,'missing_unique_major_party_candidates',None
    if total <= 0 or other/total>0.05:
        return None,'significant_other_or_nonpartisan_vote',None
    margin=100*(d[0]['votes']-r[0]['votes'])/(d[0]['votes']+r[0]['votes'])
    return margin,None,{'D':candidate_key(d[0]['name']),'R':candidate_key(r[0]['name'])}

def poll_record(p, candidates):
    answers=p.get('answers',[])
    ds=[a for a in answers if party(a.get('party'))=='D']
    rs=[a for a in answers if party(a.get('party'))=='R']
    if len(ds)!=1 or len(rs)!=1: return None,'missing_unique_D_R_answers'
    if candidate_key(ds[0].get('name'))!=candidates['D'] or candidate_key(rs[0].get('name'))!=candidates['R']:
        return None,'candidate_matchup_mismatch'
    d,r=ds[0].get('pct'),rs[0].get('pct')
    if not isinstance(d,(int,float)) or not isinstance(r,(int,float)) or d+r<=0:
        return None,'invalid_percentages'
    return 100*(d-r)/(d+r),None

def is_standard_round(p):
    round_key=p.get('round') or []
    # Blank round plus false reallocation and false final: original question.
    return (not round_key or
            (str(round_key[0])=='' and all(str(x).lower() in ('false','', 'none') for x in round_key[1:])))

def canonical_pollster(p):
    key=re.sub(r'[^a-z0-9]+','',p.casefold())
    if ('siena' in key and ('newyorktimes' in key or 'nyt' in key)):
        return 'nytsiena'
    if key.startswith('researchco'): return 'researchco'
    return key

def main():
    original=json.loads((ROOT/'data/race-polls.json').read_text(encoding='utf-8'))
    res=json.loads((ROOT/'data/results.json').read_text(encoding='utf-8'))
    supplements=list(csv.DictReader((OUT/'2026_congressional_poll_master.csv').open(encoding='utf-8',newline='')))
    if len(res['races'])!=470 or len(original['races'])!=470:
        raise ValueError('Expected complete 470-race election catalog')
    results={r['id']:r for r in res['races']}
    if len(results)!=470: raise ValueError('Duplicate results IDs')
    by_race=defaultdict(list)
    for p in original['polls']:
        by_race[p['race']].append(p)
    # Supplemental entries were checked separately at source, but they lack
    # candidate identifiers in their CSV; only allow the explicitly curated IDs.
    curated={'supp:CO:APRL:20261020','supp:CO:RESEARCHCO:20261102',
             'supp:NV03:REDBOX:20261023'}
    for p in supplements:
        if p['record_id'] not in curated: continue
        d,r=p.get('dem_percent'),p.get('rep_percent')
        if not d or not r: continue
        by_race[p['race_id']].append({
          'id':p['record_id'],'race':p['race_id'],'poll_id':p['poll_id'],
          'pollster':p['pollster'],'end_date':p['fieldwork_end'],
          'start_date':p['fieldwork_start'],'population':p['population'],
          'partisan':p['partisan_flag'],'internal':'','url':p['source_url'],
          'answers':[{'name':'curated','party':'DEM','pct':float(d)},
                     {'name':'curated','party':'REP','pct':float(r)}],
          'round':['','FALSE','FALSE'],'curated':True
        })
    original_polled_races=len({p['race'] for p in original['polls']})
    master_polled_races=len(by_race)
    # Add independently released final-poll toplines. The original historical
    # archive is never modified. Match by candidate names and pollster/end date.
    late=list(csv.DictReader((OUT/'2026_final_poll_releases_nov1_2.csv').open(encoding='utf-8',newline='')))
    final_source_keys=set()
    for lp in late:
        rid=lp['race_id']
        if rid not in results or dte(lp['fieldwork_end']) is None:
            continue
        source_key=(rid,canonical_pollster(lp['pollster']),lp['fieldwork_end'])
        if source_key in final_source_keys: continue
        final_source_keys.add(source_key)
        by_race[rid].append({
          'id':lp['source_id'],'race':rid,'poll_id':lp['source_id'],
          'pollster':lp['pollster'],'end_date':lp['fieldwork_end'],
          'start_date':'','population':lp['population'].lower(),
          'partisan':'','internal':'','url':lp['source_url'],
          'answers':[{'name':lp['candidate_d'],'party':'DEM','pct':float(lp['dem_percent'])},
                     {'name':lp['candidate_r'],'party':'REP','pct':float(lp['rep_percent'])}],
          'round':['','FALSE','FALSE'],'curated':True,'late_release':True,
          'published_at':lp['published_at'],'note':lp['note']})
    original_polled_races=len({p['race'] for p in original['polls']})
    master_polled_races=len(by_race)
    issues=Counter()
    audit=[]
    outcomes=[]
    chosen_all=[]
    for race_id, race in sorted(results.items()):
        result_margin, result_exclusion, candidate_names=result_info(race)
        collection=[]
        for p in by_race[race_id]:
            why=''
            end=dte(p.get('end_date'))
            flag=(str(p.get('partisan') or '')+' '+str(p.get('internal') or '')).strip()
            if end is None or not START<=end<=END: why='outside_final_30_day_window'
            elif any(b in p.get('pollster','').casefold() for b in BANNED): why='known_fabricated_pollster'
            elif flag: why='partisan_or_internal_flag'
            elif p.get('population') not in POP_RANK: why='unsupported_population'
            elif not is_standard_round(p): why='ranked_choice_variant'
            elif result_exclusion: why='result_'+result_exclusion
            else:
                if p.get('curated'):
                    if p.get('late_release') and (candidate_key(p['answers'][0]['name'])!=candidate_names['D'] or candidate_key(p['answers'][1]['name'])!=candidate_names['R']):
                        why='late_release_candidate_mismatch'
                    else:
                        d,r=(float(p['answers'][0]['pct']),float(p['answers'][1]['pct']))
                        margin=100*(d-r)/(d+r) if d+r>0 else None
                        if margin is None: why='invalid_curated_percentages'
                else:
                    margin,reason=poll_record(p,candidate_names)
                    if reason: why=reason
            record={'race_id':race_id,'record_id':p.get('id'),'poll_id':p.get('poll_id'),
                    'pollster':p.get('pollster'),'end_date':p.get('end_date'),
                    'population':p.get('population'),'source_url':p.get('url'),
                    'reason':why or 'candidate','margin':margin if not why else None}
            collection.append(record)
        good=[p for p in collection if p['reason']=='candidate']
        # Prefer matching likely-voter questions; if none, use RV, then adults.
        if good:
            chosen_pop=min((POP_RANK[p['population']] for p in good))
            for p in good:
                if POP_RANK[p['population']]!=chosen_pop:p['reason']='population_not_preferred'
        good=[p for p in collection if p['reason']=='candidate']
        seen_ids=set()
        for p in sorted(good,key=lambda x:(x['end_date'],x['record_id'] or ''),reverse=True):
            pollid=p.get('poll_id')
            if pollid in seen_ids:
                p['reason']='same_survey_question_variant'
            else:
                seen_ids.add(pollid)
        # Cross-provider and question aliases: same pollster and fieldwork end date.
        good=[p for p in collection if p['reason']=='candidate']
        seen_cross=set()
        for p in sorted(good,key=lambda x:(not str(x['record_id']).startswith('late:'),not str(x['record_id']).startswith('supp:'),x['record_id'] or ''),reverse=True):
            key=(canonical_pollster(p['pollster']),p['end_date'])
            if key in seen_cross:p['reason']='same_pollster_same_end_date_review'
            else:seen_cross.add(key)
        selected=[p for p in collection if p['reason']=='candidate']
        for p in collection:
            issues[p['reason']]+=1
            audit.append({k:p.get(k) for k in ('race_id','record_id','poll_id','pollster','end_date','population','source_url','reason','margin')})
        pollsters={canonical_pollster(p['pollster']) for p in selected}
        if result_exclusion:
            status='result_not_comparable'
        elif not selected:
            status='no_eligible_polls'
        elif len(pollsters)<2:
            status='single_pollster_comparison'
        else:
            status='provisional_comparison'
        avg=statistics.mean(p['margin'] for p in selected) if selected else None
        signed=(result_margin-avg) if avg is not None and result_margin is not None and status in ('provisional_comparison','single_pollster_comparison') else None
        line={'race_id':race_id,'chamber':race['chamber'],'state':race['state'],
           'race_name':race['name'],'status':status,
           'result_status':'UNOFFICIAL_UNCERTIFIED',
           'poll_average_d_minus_r_2party_pp':avg,
           'result_d_minus_r_2party_pp':result_margin,
           'signed_error_pp':signed,'absolute_error_pp':abs(signed) if signed is not None else None,
           'polls_used':len(selected),'pollsters_used':len(pollsters),
           'latest_poll_date':max((p['end_date'] for p in selected),default=''),
           'earliest_poll_date':min((p['end_date'] for p in selected),default=''),
           'pollster_names':'; '.join(sorted({p['pollster'] for p in selected})),
           'source_poll_ids':'; '.join(sorted({p['poll_id'] for p in selected})),
           'election_source_url':race.get('source_url'),
           'results_collected_at':res['collected_at'],
           'notes':'Results not certified; conditional on 30-day window and valid D/R matchup'}
        outcomes.append(line)
        for p in selected:chosen_all.append(p)
    with (OUT/'2026_race_polling_averages.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(outcomes)
    with (OUT/'2026_polling_errors_provisional.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(outcomes)
    with (OUT/'2026_poll_selection_audit.csv').open('w',encoding='utf-8',newline='') as f:
        fields=['race_id','record_id','poll_id','pollster','end_date','population','source_url','reason','margin']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(audit)
    compared=[x for x in outcomes if x['status']=='provisional_comparison']
    exploratory=[x for x in outcomes if x['status'] in ('provisional_comparison','single_pollster_comparison')]
    detail={}
    for label,group in [('all',compared),('house',[x for x in compared if x['chamber']=='house']),('senate',[x for x in compared if x['chamber']=='senate'])]:
        errors=[x['signed_error_pp'] for x in group]
        detail[label]={'eligible_races':len(group),'mean_signed_error_pp':statistics.mean(errors) if errors else None,
          'median_signed_error_pp':statistics.median(errors) if errors else None,
          'mean_absolute_error_pp':statistics.mean(abs(e) for e in errors) if errors else None,
          'races_understating_democrats':sum(e>0 for e in errors),
          'races_understating_republicans':sum(e<0 for e in errors),
          'ties':sum(e==0 for e in errors)}
    exploratory_errors=[r['signed_error_pp'] for r in exploratory if r['signed_error_pp'] is not None]
    detail['exploratory_including_single_pollster']={
      'eligible_races':len(exploratory_errors),
      'mean_signed_error_pp':statistics.mean(exploratory_errors) if exploratory_errors else None,
      'median_signed_error_pp':statistics.median(exploratory_errors) if exploratory_errors else None,
      'mean_absolute_error_pp':statistics.mean(abs(x) for x in exploratory_errors) if exploratory_errors else None,
      'races_understating_democrats':sum(x>0 for x in exploratory_errors),
      'races_understating_republicans':sum(x<0 for x in exploratory_errors),
      'caution':'Sensitivity analysis only. Single-pollster races are not robust multi-poll estimates.'
    }
    summary={'as_of_results':res['collected_at'],'source_status':res['status'],
      'poll_window_start':str(START),'poll_window_end':str(END),
      'final_release_candidates_reviewed':len(late),
      'late_release_questions_added_to_input':len(final_source_keys),
      'late_release_question_selections':sum(x.get('record_id','').startswith('late:') and x.get('reason')=='candidate' for x in audit),
      'assumption':'equal weight per unique poll; LV preferred else RV else adults; two-party-normalized margins',
      'minimum_distinct_pollsters':2,
      'races_total':len(outcomes),'polled_races_in_original_archive':original_polled_races,
      'races_with_original_or_curated_polls':master_polled_races,
      'statuses':dict(Counter(x['status'] for x in outcomes)),
      'selected_questions':len(chosen_all),'selection_reasons':dict(issues),
      'national':detail,
      'limitations':['Results are provisional and not certified.',
        'The Nov 1 archived collection is supplemented by Nov 1–2 pollster releases, with cross-source deduplication by pollster and date.',
        'Candidate name aliases and unusual matchups are excluded conservatively.',
        'Self-selected polled districts are not representative of all House districts.',
        'No causal claim about polling weighting is supported by these observational errors.',
        'Do not present these numbers as final election-polling accuracy.']}
    (OUT/'2026_polling_accuracy_summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2))
if __name__=='__main__': main()
