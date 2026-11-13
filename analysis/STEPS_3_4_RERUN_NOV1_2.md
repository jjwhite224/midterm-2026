# Steps 3–4 rerun: November 1–2 final polls and two-tier coverage
_Updated November 12, 2026 (Eastern). Results remain unofficial and uncertified._

## What changed
- The historical `data/race-polls.json` (retrieved November 1) is unchanged.
- Added **16 primary-source final Senate poll release records** to `analysis/2026_final_poll_releases_nov1_2.csv`:
  - Seven state final Senate poll toplines from Siena Research Institute / New York Times, published Nov. 1: AK, IA, KS, ME, MI, OH, TX.
  - Nine Senate poll toplines from Research Co., published Nov. 1 or Nov. 2: CO, FL, GA, IL, NM, TX, MI, MN, OH.
- Source provenance and dates are recorded for each row. The Siena release states election eve results, but exact initial field dates and state sample sizes must be checked in linked toplines; no unknown start dates or sample sizes were invented.
- `analysis/calculate_polling_accuracy_v2.py` checks that each supplemental candidate matchup matches the election-result candidate names, excludes non-comparable races, and deduplicates repeated pollster/race/end-date records. A publication/release record does not become two independent surveys when also present in the original archive.
- Preserved **the October 4–November 2 polling window, LV→RV→adult hierarchy, two-party-normalized D−R margins, equal weights, conservative candidate matching and partisan/internal exclusions**.
- Added a **single-pollster exploratory comparison** for races with one qualifying polling organization. These are visibly marked `single_pollster_comparison` and excluded from the stricter multi-pollster national headline statistics.

## Results
Comparison | Previous | Rerun
---|---:|---:
Multi-pollster eligible races | 20 | **22**
House (multi-pollster) | 6 | **6**
Senate (multi-pollster) | 14 | **16**
Mean signed D−R error, multi-pollster | +5.98 pp | **+6.28 pp**
Democratic understatement among multi-pollster races | 20 / 20 | **22 / 22**
Exploratory including single-pollster races | not scored | **49**
Mean signed error for all 49 exploratory races | not scored | **+5.11 pp**
Democratic understatement among exploratory races | not scored | **41 / 49**
Republican understatement among exploratory races | not scored | **8 / 49**

Newly eligible multi-pollster Senate contests: **Illinois and New Mexico**, both supported by a late Research Co. survey and an additional distinct pollster in the original archive.

Poll-level accounting in v2: 16 new release records were examined, 15 passed the candidate-and-election comparability screen; the Alaska Senate result lacks a unique D and R general-election candidate in the source snapshot and is excluded under the two-party contest rule. Following other duplicate/question selections, 174 observations were retained across races, including in races with only one pollster.

## Strong-caution interpretation
The **22/22** direction is a descriptive result for the selected polled races, not a representative sample of 470 congressional contests and **not proof** that polling methods caused Democratic underestimation. The larger **41/49** exploratory set includes single-pollster districts; it should be a secondary, sensitivity view rather than the main headline.

The House part of this project remains thinly polled: six races met the strict two-pollster cutoff. While 49 comparisons are useful for testing site features, the project does *not* have an all-races polling-error estimate. Results remain uncertified and may be revised.

## Sources
- Siena Research Institute / NYT original November 1 release: https://sri.siena.edu/2026/11/01/nytimes-siena-poll-of-likely-voters-alaska-iowa-kansas-maine-michigan-ohio-and-texas/
- Research Co. original November 1 release: https://researchco.ca/2026/11/01/midterms-2026-one/
- Research Co. original November 2 release: https://researchco.ca/2026/11/02/midterms-2026-two/
- Original archived polling: `data/race-polls.json` and `analysis/2026_congressional_poll_master.csv`
- Results source: `data/results.json` collected 2026-11-13 01:15 UTC (Nov 12 local Eastern).

## New reproducible outputs
- `analysis/2026_final_poll_releases_nov1_2.csv` — source-level additions, reported candidate shares and dates
- `analysis/calculate_polling_accuracy_v2.py` — rerun script
- `analysis/2026_race_polling_averages_v2.csv` — 470 rows, polling coverage and sources
- `analysis/2026_polling_errors_provisional_v2.csv` — 470 rows, two distinct comparison tiers
- `analysis/2026_poll_selection_audit_v2.csv` — per-record inclusion/exclusion and provenance
- `analysis/2026_polling_accuracy_summary_v2.json` — machine-readable summary of both tiers
- `.github/workflows/calculate-polling-accuracy-v2.yml` — automation and validation (completed successfully)

## Still required before publication
1. Inspect original Siena state toplines to verify field starts, sample sizes, and whether later poll releases overlap the baseline provider survey records under alternate pollster names.
2. Compare candidate names against primary official state election results and later certification; resolve extraordinary contests separately.
3. Check new Research Co. reported *decided voter* figures against its linked tables for the raw likely-voter data; do not mix adjusted and unadjusted shares without documentation.
4. Audit sample composition, cases of repeatedly polling the same participants, and heterogeneous survey modes; run 21- and 45-day and partisan-inclusion sensitivities.
5. Extend November 1–2 search for House districts and non-New-York-Times pollsters; the late source supplement is **not an exhaustive census**.
6. Do not describe these calculations as predictions or probabilities. No claim about fake surveys causing any error is supported.
