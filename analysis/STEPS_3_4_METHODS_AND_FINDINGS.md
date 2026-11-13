# Steps 3–4: 2026 Congressional Polling Averages and Errors

**Status: PROVISIONAL RESEARCH OUTPUT — NOT CERTIFIED RETURNS OR FINAL POLLING AUDIT**

Built from `data/race-polls.json` (archived November 1, 2026), separately reviewed supplemental records in `analysis/2026_congressional_poll_master.csv`, and `data/results.json` (updated November 12, 2026, 8:15 p.m. Eastern). No fabricated demo surveys, model forecasts or unreviewed candidate discoveries are used.

## Results
- 470 rows: 435 House districts and 35 Senate elections.
- 146 original races with polling records; 148 including 2 reviewed supplementary races.
- 160 unique qualifying survey/question observations after the main selection process (including observations in races with fewer than two distinct pollsters).
- 20 races meet the at-least-two-independent-pollsters rule: 6 House, 14 Senate.
- 29 races have survey observations but insufficient independent pollsters for headline comparison.
- 376 races have no eligible questions under the selected 30-day rules.
- 45 races have noncomparable election results under the two-major-party margin rule.
- **All 20 comparable races show a positive Democratic-minus-Republican signed error** with the current provisional returns. The simple race-average signed error is **+5.98 percentage points**; 6 House races average +8.18 and 14 Senate races average +5.04. These are descriptive statistics on a small nonrandom subset, **NOT** an estimate of a nationwide polling-industry bias.

## Step 3: Polling selection and averages

1. Use race IDs as an exact join key, preserving the 470-race catalog.
2. Require fieldwork-end date between **October 4 and November 2, 2026** inclusive. The dataset collected November 1 is not a true Election Day eve poll census; some final surveys ending Nov 1–2 are missing. Only the separately checked source supplements are added.
3. Exclude Wedgewood and Median Strategies records by name, plus all records flagged partisan or internal. Known partisan surveys remain in the archives for later sensitivity analysis, not the headline average.
4. Accept original, non-reallocated/non-final-ranked-choice question variants. Require **exact conservative first-and-last candidate-name match** against the general-election Democratic and Republican result candidates. Unmatched candidate names are excluded rather than guessed. Curated supplements have separately checked matchups.
5. Prefer likely-voter questions; if none exist for a race, use registered-voter questions; if none, use all-adult questions. Do not mix population groups inside one race's headline average.
6. Deduplicate identical poll IDs, then exclude obvious cross-listed same-pollster/same-end-date variants. A stricter version of deduplication may remove legitimate multiple independent surveys with the same end date, requiring human audit.
7. Calculate each survey's **two-party-normalized** D minus R margin: `100*(D-R)/(D+R)` from original candidate percentages, not a publisher's adjusted/model margin. Weight surveys equally; a pollster that fields many distinct surveys has more influence.
8. Arithmetic mean of selected survey margins is the provisional polling average. Use at least **two distinct pollsters** for a headline comparison; one-pollster races retain their survey-level data but are not scored.
9. Keep all exclusion reasons and original URLs in `2026_poll_selection_audit.csv` so the research choices can be challenged.

## Step 4: Results joining and errors

1. Use updated civicAPI 2026 results for each race, preserving its source link and data retrieval time.
2. Require exactly one Democratic and one Republican candidate, both with positive votes, and at most 5% of all reported votes assigned to other or nonpartisan candidates. This **conservative two-party assumption** excludes Alaska-like independent/RCV contests and some other races.
3. Compute result D−R two-party margin as `100*(Democratic_votes-Republican_votes)/(Democratic_votes+Republican_votes)`.
4. Signed error = **result D−R margin minus polling average D−R margin**. Positive indicates Democratic performance was understated by polls; negative indicates Republican performance was understated. Absolute error is its magnitude.
5. Only compute signed/absolute error when the race meets the two-pollster threshold and result comparability rule. Display all other races with a reason for missing error, not an invented zero.
6. Do not equate a published race call with certification; the result file is **unofficial**. Percent reporting has moved down in many states during updates and is not a reliable certification flag.

## Exclusions recorded in audit

The audit records 1,354 original question records plus 3 curated additions, of which 160 were selected. Its detailed reason counters include:
- 1,031 outside the Oct 4–Nov 2 window.
- 102 partisan/internal.
- 14 unmatched candidate matchups.
- 10 ranked-choice variants.
- 20 non-preferred population questions.
- 5 duplicate questions from same survey.
- 1 same-pollster/end-date candidate duplicate.
- 2 missing a unique Democratic/Republican answer.
Some additional records are excluded for a noncomparable election result. The counts are **question-record filtering outcomes, not survey or race counts**.

## Files
- `analysis/calculate_polling_accuracy.py` — source, selection, normalization, error calculations
- `analysis/2026_race_polling_averages.csv` — 470-race averages / coverage / metadata
- `analysis/2026_polling_errors_provisional.csv` — all 470 rows with error only when eligible
- `analysis/2026_poll_selection_audit.csv` — original question IDs and explicit inclusion/exclusion reason
- `analysis/2026_polling_accuracy_summary.json` — status counts, separate House/Senate summary, methodological caveats
- `tests/test_polling_accuracy.py` — basic tests
- `.github/workflows/calculate-polling-accuracy.yml` — reproducible workflow

## Required review BEFORE publishing factual conclusions
- Cross-check at least 10 selected races manually with original poll releases and state election results.
- Add the missing late surveys from November 1–2; inspect third-party and partisan sensitivity.
- Fix candidate aliases and multiround RCV cases only with documented evidence.
- Update state results when certified; preserve successive data snapshots for transparency.
- Analyze selection bias from the tiny eligible sample and distinguish House from Senate.
- Add sensitivity analyses (21 vs 30 vs 45 days, RV/LV rules, pollster weights, partisan exclusions).
- Do not treat the +5.98 points, 20-of-20 result, or any secondary derived score as an industry-wide conclusion, an election forecast, or proof that pollster methodological changes caused errors.
