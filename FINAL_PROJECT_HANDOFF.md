# Midterm / 2026 — Final website handoff
**Prepared:** November 19, 2026
**Class:** Stephen Zweibel's Fall 2026 AI-Assisted Programming
**Status:** Public, functional, research-release website; election results provisional.

## Pages
- https://jjwhite224.github.io/midterm-2026/accuracy.html — primary reported interactive story
- https://jjwhite224.github.io/midterm-2026/methods.html — public methodology, sources, limitations, AI-use disclosure
- https://jjwhite224.github.io/midterm-2026/ — national generic-ballot and race history
- https://jjwhite224.github.io/midterm-2026/elections.html — separate House/Senate election atlas

## Working features
1. Story structure: the October fake-poll crisis, November 2 weighting uncertainty, and a measurable post-election data audit.
2. Comparison selector: 21-day, 30-day (default), 45-day, include partisan/internal, and exclude Research Co.
3. Evidence selector: at least two pollsters (headline) or add single-pollster exploratory comparisons.
4. Automatic KPI summaries: race counts, mean signed/absolute errors, positive and negative error counts.
5. Zero-centered signed-error histogram, scenario comparison bars, House/Senate comparison, and all-470-race evidence coverage.
6. Race table with chamber, state, evidence, search and sorting; 35 rows per page.
7. Race source drill-down with a poll-to-result margin chart and links to included original releases.
8. CSV downloads and open source methodology, source register, limitations and AI coding disclosure.
9. Mobile-responsive and keyboard-accessible controls with labels, data text fallbacks and clear error/empty states.

## Source and statistical safeguards
- The reported +6.33-point mean signed error across 22 baseline qualifying races is provisional and **not** representative of all 470 congressional races.
- One-pollster figures are exploratory, labeled separately.
- Races without qualifying polls are not assigned zero error.
- The original polling and election snapshots are kept in Git history; data source IDs are retained.
- Known fabricated or flagged partisan/internal surveys excluded from the default scenario.
- Source URLs and calculation code are public.
- Election results are **unofficial** as of the November 19 collection.

## Validation
- GitHub Actions QA workflow checks all five scenario CSVs, 470 unique race IDs, Python and Node tests, and JS syntax.
- Playwright browser smoke test checks 1440px, 768px, and 375px viewports; source inspection, selector and filter flows; no JavaScript page exceptions; no horizontal overflow.
- Current page is deployed with GitHub Pages static workflow. The workflow includes `accuracy.html`, `methods.html`, JS/CSS and the versioned analysis datasets.

## Publication limitations still open
- Finish ten-race independent original-source reconciliation.
- Obtain UNH original candidate tables for final 2026 House polls; currently held out.
- Verify the complete final-poll releases, fieldwork details, candidate aliases and cross-provider duplicates.
- Reconcile currently unofficial election results against state-certified totals when available.
- Obtain editorial peer review and interpret alternative weighting methodologies only with causal evidence.
- A browser automation test confirms functionality, but visual editorial critique and user testing remain advisable.

## Reproduce and inspect
- Source analysis: `analysis/calculate_polling_accuracy_sensitivity.py`, `analysis/run_sensitivity.py`
- Scenarios: `analysis/sensitivity/` and `analysis/2026_sensitivity_summary.csv`
- Release explanation: `analysis/STEP5_VALIDATION_AND_SENSITIVITY_REPORT.md`
- UI: `accuracy.html`, `src/accuracy.js`, `assets/accuracy.css`
- Methods page: `methods.html`
- CI: `.github/workflows/qa-accuracy.yml`, `.github/workflows/browser-accuracy.yml`, `.github/workflows/pages.yml`
- Agent skill instructions: `.agents/skills/ui-ux/SKILL.md`, `.agents/skills/data-visualization/SKILL.md`

## Suggested 90-second classroom demo
Open accuracy.html. Identify the two pre-election questions: authentic data vs accurate measurement. Show the 30-day headline evidence summary (22 races), click the exploratory tier (49 races), switch to include partisan polls, and explain how the eligible-race count and mean error change. Search Michigan Senate, inspect the survey links, open Methods & Sources, and close by distinguishing a reproducible descriptive finding from an industry-wide causal conclusion.
