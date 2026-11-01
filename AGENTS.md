# AI-agent project instructions: Midterm / 2026

## Goal
Build an accessible, publication-quality, **nonpartisan** data-literacy site
about publicly available polling for the 2026 U.S. midterm elections. The site
must be deployable as a static GitHub Pages site. This project is for Stephen
Zweibel's Fall 2026 AI-Assisted Programming class.

## IMPORTANT: do not fabricate election data
- Never insert invented polls, named candidate figures, historical election
  results, or purported forecasts into `data/polls.json`.
- `data/demo-polls.json` is synthetic UI-test data and MUST retain an obvious
  user-visible `DEMONSTRATION MODE` warning. Never relabel it as real.
- Polling measurements are **not** election outcomes or probabilities; never
  make qualitative winner claims without actual certified election results.
- Always preserve original source URL, pollster, fieldwork dates, population,
  sample size, collection time, and license for authentic polling records.
- Never quietly overwrite the pre-election snapshot. No backdating.
- Do not equate a national generic ballot with congressional district polls.

## Technology constraints
- Vanilla JavaScript ES modules, HTML, SVG and CSS: zero npm dependencies.
- Python 3 stdlib for the polling pipeline. Prefer simple, transparent code.
- External polling API must be requested only in the Python ingestion script,
  not from visitors' browsers. Do not expose credentials or secrets.
- Keep GitHub Pages relative paths (`./assets/...`, `./src/...`, `./data/...`).
- Do not introduce a server requirement for basic visualization.

## Before committing
1. `npm test`
2. `python -m unittest discover -s tests -p 'test_*.py'`
3. Start `python -m http.server 5173`, view it at http://localhost:5173,
   and test mobile layout, keyboard navigation, empty filters, and tooltip text.
4. Inspect the git diff and confirm there is no fabricated or unlicensed data.
5. Include test evidence and a concise change summary in each PR.

## Coding priorities
1. Preserve data provenance and transparent explanations.
2. Make filters and charts robust and keyboard-accessible; provide tabular data.
3. Keep presentation professional and responsive.
4. Add a race selector only after verifying the schema and licenses of
   Senate/House polls. Do not silently merge unlike race types.
5. Develop a historical evaluation notebook only with verified historical data.

## Scope of the first implementation
- Current working national generic-ballot explorer
- Working pollster, population, date and weighting controls
- Public data fetcher, validation tests and explicit demo fallback
- GitHub Pages workflow and optional time-restricted archive command

## Evaluation notes
A good follow-up assignment is a reusable 'poll data auditor' skill that flags
invalid answers, duplicates, implausible dates, missing citations, and
missing/unclear licenses. Never auto-correct ambiguous source records.
