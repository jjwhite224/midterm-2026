# Step 5 — Late poll verification, sensitivity checks and refreshed returns

Date: 2026-11-19 America/New_York. **Research status: provisional; not a national industry accuracy estimate.**

## Work completed
1. Searched primary sources for late House polling. University of New Hampshire Survey Center verified November 1 releases for NH-01, NH-02 and ME-02. The hosting university's PDF data tables returned 403 and could not be inspected sufficiently for original numeric candidate shares; **not merged**. The review queue is `2026_final_house_poll_source_review.csv`.
2. Confirmed Siena's Nov 1 seven-state Senate release on its institute website, and the existence of Research Co.'s Nov 1–2 releases. Research Co.'s summaries explicitly use some **decided-voter shares**, so comparability was tested by excluding all Research Co. entries, rather than mixing measures without a check.
3. Refreshed civicAPI results November 19, 05:19 UTC. Preserved the previous results in Git history and wrote `2026_results_refresh_audit.json`. New source: 470 races, 465 called, 5 uncalled. Calls are not certified votes. Candidate reported vote totals increased by 1,232,801 from the November 12 snapshot, with changes in 304 race entries.
4. Ran five reproducible polling sensitivity scenarios, preserving the original survey selection standards and considering a separate lower-confidence single-pollster tier. All scenarios use the same new provisional election results:
  
| Scenario | Selected surveys | Multi-pollster races | Mean signed error (pp) | Understated Democrats (multi) | Single-pollster-inclusive races | Inclusive mean signed error (pp) |
|---|---:|---:|---:|---:|---:|---:|
| Final 21 days, exclude partisan/internal | 134 | 18 | +5.64 | 18/18 | 42 | +5.35 |
| Final 30 days, exclude partisan/internal | 174 | 22 | +6.33 | 22/22 | 49 | +5.19 |
| Final 45 days, exclude partisan/internal | 233 | 26 | +6.27 | 26/26 | 56 | +5.77 |
| Final 30 days, include partisan/internal | 238 | 35 | +4.99 | 31/35 | 73 | +4.63 |
| Final 30 days, exclude Research Co. | 165 | 19 | +5.96 | 19/19 | 49 | +5.25 |

These are sample-dependent *race-equal-weighted descriptive averages* of 2-party normalized D-minus-R signed errors. Positive indicates polls understated the Democratic margin. Negative indicates understated Republican performance. Scenario changes modify both poll composition and number of represented races. None estimates all 470 contests.

5. Created a **ten-race manual verification queue** listing exact original polling URLs, source results, calculated margins, and checkboxes/statuses. This is **not** a claim that all ten were independently reconciled. See `2026_manual_10_race_verification_queue.csv`.

## Methodology caveats
- All 470 contests are in the data catalog, but just 22 pass the 30-day, two-independent-pollster strict criterion. The sample is nonrandom, likely competitive, and strongly unbalanced between the House and Senate.
- Some pollsters published raw likely-voter candidate shares; others published decided-voter shares. The two-party normalization `100 * (D-R)/(D+R)` reduces—but does not automatically eliminate—all methodological mismatch.
- In the partisan-inclusive scenario, the 35-race strict comparison includes 4 Republican-direction errors. This means the uniform 22/22 result is conditioned on the nonpartisan filtering criteria.
- The 2026-Nov-1 archived race polling feed predates some Election Day eve releases. Newly added final polls have source-specific release metadata, but some Siena fieldwork start dates/sample sizes remain to be confirmed against full toplines. Do not claim a comprehensive November 2 poll universe.
- Results are **provisional**. Never treat source calls or reporting percent as certification. Avoid interpreting recent fluctuations in reported-percent-complete as independent evidence of vote counting accuracy.
- The observed error cannot by itself establish that the NYT's weighting changes or any fake pollster caused a systematic Democratic understatement.
- The audit flag `partisan` may include survey sponsor metadata that warrants individual review; this is a conservative rule, not an accreditation score for a pollster.

## Exact repository outputs
- `analysis/2026_sensitivity_summary.csv` and `analysis/2026_sensitivity_summary.json`
- `analysis/sensitivity/window21/`, `window30/`, `window45/`, `window30_partisan/`, `window30_without_researchco/`: full 470-row comparison, selection audit and national summary for each scenario.
- `analysis/2026_results_refresh_audit.json`
- `analysis/2026_final_house_poll_source_review.csv`
- `analysis/2026_manual_10_race_verification_queue.csv`
- `analysis/run_sensitivity.py`
- `analysis/calculate_polling_accuracy_sensitivity.py`
- `.github/workflows/step5-sensitivity.yml`

## Next release gates
A. Manually reconcile 10 sampled races against full original poll toplines and state-level official canvasses. Mark each row reviewed with precise evidence and resolution. Retain uncertain rows as provisional.
B. Check late UNH numeric poll tables for NH-01, NH-02, and ME-02. Until originals accessible, leave unmerged.
C. Validate source/license rules for each pollster, double-check candidate aliases and final candidate lineups, and compare old/new Siena weighting only where published data supports it.
D. Choose a defensible headline analysis population (primary = >=2 pollsters, nonpartisan 30-day; sensitivity = alternatives). Report percentages **with sample counts** and publish the missing coverage table.
E. Build race explorer and national distribution visualizations directly from `analysis/sensitivity/window30/2026_polling_errors_provisional_v2.csv`, with optional scenario selector; badge all results **unofficial** until certified.
F. Draft the story around the Times October fake-poll caveat and Nov 2 weighting discussion without asserting causality.
