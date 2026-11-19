# Step 6: Expansion of congressional race polling coverage
**Date:** November 19, 2026
**Status:** Sources reviewed; results are still provisional and have not been independently certified.

## Goal and approach
Expand the set of *distinct congressional races* with usable pre-election polling, not merely the number of question rows in the original November 1 archive. Maintain the original 30-day window (Oct 4–Nov 2), likely-voter preference, normalized D−R margin, equal survey weights, strict candidate matching, partisan/internal exclusion, and two separate evidentiary tiers (2+ pollsters vs one-pollster exploratory).

## Five newly verified House survey observations

All five derive from the University of New Hampshire Survey Center's original November 1 final releases, corroborated with full-text reproductions of the university's published reports. Fieldwork was October 27–31, 2026. The published two-party candidate shares are reported as given, including leaners; no imputed sample sizes or fabricated percentage values are used.

| Race | Democratic candidate | Republican candidate | D% | R% | Sample (LV) | University source | Effect in 30-day analysis |
|---|---|---|---:|---:|---:|---|---|
| NH-01 | Stefany Shaheen | Anthony DiLorenzo | 56 | 43 | 1,032 | https://scholars.unh.edu/survey_center_polls/1011/ | Second independent polling organization; now passes strict tier |
| NH-02 | Maggie Goodlander | Lily Tang Williams | 56 | 41 | 1,005 | https://scholars.unh.edu/survey_center_polls/1011/ | Second independent polling organization; now passes strict tier |
| ME-01 | Chellie Pingree | Ronald Russell | 65 | 32 | 843 | https://scholars.unh.edu/survey_center_polls/1013/ | New exploratory comparison |
| ME-02 | Matt Dunlap | Paul LePage | 47 | 52 | 802 | https://scholars.unh.edu/survey_center_polls/1013/ | New exploratory comparison |
| VT-00 | Becca Balint | Gerald Malloy | 66 | 31 | unverified district LV count | https://scholars.unh.edu/survey_center_polls/1012/ | New exploratory comparison |

**Exact alias:** The Maine 2nd district university release uses `Matt Dunlap`; the results file uses `Matthew Dunlap`. Code applies only that documented alias to the matched candidate; the original source CSV preserves the published name.

**Review record:** `analysis/2026_verified_new_race_polls.csv`. The original `data/race-polls.json` remains frozen; its omission is not silently erased. These 5 records are *new poll observations*, not 5 statistically independent pollsters in 5 existing races.

## After rerunning the five selection scenarios

| Scenario | Old qualifying surveys | New selected | Old strict races | New strict | Old exploratory races | New exploratory | New multi-pollster mean signed error |
|---|---:|---:|---:|---:|---:|---:|---:|
| Final 21 days | 134 | 139 | 18 | 20 | 42 | 45 | +5.56 pp |
| Final 30 days (baseline) | 174 | 179 | 22 | **24** | 49 | **52** | **+6.21 pp** |
| Final 45 days | 233 | 238 | 26 | 26 | 56 | 57 | +6.14 pp |
| Final 30 days, partisan/internal included | 238 | 243 | 35 | 37 | 73 | 76 | +4.98 pp |
| Final 30 days, Research Co. excluded | 165 | 170 | 19 | 21 | 49 | 52 | +5.86 pp |

**The strict 30-day comparison now comprises 8 House and 16 Senate contests.** All 24 have positive Democratic-direction signed errors under the *current provisional vote counts*. The strict race-average is +6.21 pp. The combined exploratory 30-day set comprises 52 races, with **42 Democratic-direction** and **10 Republican-direction** errors; its mean signed error is **+4.85 pp**. These results remain descriptive and nonrepresentative of the full 470-race universe.

## Effect of the five releases on race coverage
- NH-01: one existing St. Anselm survey + one University of New Hampshire survey → **2 independent organizations**, qualifying for strict comparisons.
- NH-02: same upgrade from 1 to 2.
- ME-01, ME-02 and VT-00: previously no usable 30-day survey, now one each → **3 genuinely newly represented races**, included only in the exploratory tier.
- No survey record was invented for districts where the published source cannot be inspected.

## Reproducibility
- Poll rows: `analysis/2026_verified_new_race_polls.csv`
- Pipeline: `analysis/calculate_polling_accuracy_sensitivity.py`, `analysis/run_sensitivity.py`
- Scenario output: `analysis/sensitivity/`; summary: `analysis/2026_sensitivity_summary.csv`
- Source audit: `analysis/sensitivity/window30/2026_poll_selection_audit_v2.csv`
- Results snapshots: `data/results.json` and Git history
- Website: `accuracy.html` (loads the updated scenario CSV and JSON files without hardcoded totals)
- GitHub Actions: `.github/workflows/step5-sensitivity.yml`

## Outstanding coverage opportunities and editorial cautions
- Other published House polls, including partisan/internal surveys, remain in separate source-review collections and must not be merged without checks for original percentages, matchup, independence, fieldwork end, duplicates and licensing.
- A 30-day window leaves many races with zero qualifying observations; the absence of published district surveys should be shown explicitly, not replaced with forecasts.
- The results source is unofficial; state-certified data should replace it in a versioned snapshot when available.
- This is not evidence that a specific pollster's weighting adjustment caused the direction of error. Changes in the number of qualifying races also alter the composition of the average.
