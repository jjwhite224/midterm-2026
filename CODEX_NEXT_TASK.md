# Codex handoff — next development task

You are continuing the project described in AGENTS.md, not starting from scratch.

## User goal
Create an excellent portfolio-quality, politically neutral interactive GitHub
Pages site that analyzes 2026 midterm polling, exposes method choices, and
later audits polling measurement error without retroactive revision.

## Existing starter
- `index.html`, `assets/styles.css`, `src/app.js`, `src/analysis.mjs`:
  tested zero-dependency interactive polling explorer.
- `scripts/fetch_polls.py`: documented VoteHub 2026 generic-ballot ingestion.
- `scripts/freeze_snapshot.py`: immutable deadline-checked archive tool.
- `data/demo-polls.json`: synthetic data with mandatory prominent UI warning.
- `data/polls.json`: empty until verified authentic API retrieval.
- `.github/workflows/pages.yml`: GitHub Pages build and manual refresh.
- `tests/`: existing unit tests.

## First Codex mission
1. Read AGENTS.md and inspect each file; do not replace the existing design.
2. Run all tests. Start local server and inspect desktop and mobile layouts.
3. Audit ingestion against current VoteHub API responses and add any missing
   schema checks and retry handling. If service unavailable, keep demo mode and
   document failure rather than inventing data.
4. Verify the GitHub Actions Pages workflow, especially push behavior and
   conditional snapshot handling. Keep snapshot immutable and time-limited.
5. Add useful pollster/date/selection tests and browser smoke tests if possible.
6. Open a PR with changes, screenshot, test outputs, and any known gaps.

## Follow-up milestone
Add Senate polling explorer after validating a legitimate public feed and its
actual field schema. Keep Senate data separate from national generic ballot;
link to original source per observation, clearly distinguish polls from
model-generated estimates, and never assert a future winner.

## Definition of done
- All tests pass and website renders locally with no uncaught JS errors.
- Live source fetch either works or fails safely without overwriting data.
- Every displayed authentic poll links to its source.
- Any synthetic data are impossible to mistake for authentic records.
- No secrets, extra user data, or unlicensed third-party material are committed.
- Mobile, desktop, keyboard controls, and empty filter state are verified.
