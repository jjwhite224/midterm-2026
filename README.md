# MIDTERM / 2026 — Reading the Polls

An open-source, interactive polling-literacy project for **Stephen Zweibel's
Fall 2026 AI-Assisted Programming class at the CUNY Graduate Center**.

**Project stage:** working static starter. Includes pollster search, population
and date filters, editable recency weighting, SVG visualization, full poll table,
unit tests, data validation, and a GitHub Pages deployment workflow.

> **Data warning:** This repository does **not** ship with a real polling
> snapshot. Until `scripts/fetch_polls.py` successfully retrieves authentic
> VoteHub survey records, the app uses an explicitly marked *synthetic demo*.
> Demo numbers and pollster names are invented and are NOT election evidence.

## Local quick start

Requires Python 3.9+ and a recent browser. Node 18+ is used only for JS tests.
No `npm install`, package manager, API key or paid service is required.

```bash
python -m http.server 5173
```

Open <http://localhost:5173>. Do **not** open `index.html` as a `file://` URL;
ES modules and fetch require HTTP.

## Run tests

```bash
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
```

## Load authentic public polling data

The ingestion script uses only stdlib modules and the [documented VoteHub API](https://votehub.com/polls/api/):

```bash
python scripts/fetch_polls.py --as-of 2026-11-01
```

If successful, `data/polls.json` contains the source records plus UTC retrieval
timestamp, source attribution, and fieldwork date cutoff. The site will display
the authentic polls rather than demo values after reload. Errors refuse to
overwrite existing data. If the API schema changed, update the parser and
corresponding tests. The `--as-of` flag **does not** create a historical snapshot;
it is a query filter only.

### Authentic pre-election snapshot

Only while it is still before midnight Eastern, November 3, 2026:

```bash
python scripts/fetch_polls.py
python scripts/freeze_snapshot.py
git add data/polls.json data/pre_election_snapshot.json
git commit -m "Archive authentic pre-election polling snapshot"
```

Both the Git commit date and the actual retrieval date matter. Do not claim a
later collection is a contemporary pre-election snapshot. After the deadline,
the script deliberately refuses creation. The archive can be used for audit
research once election results are verified.

## Publish with GitHub Pages

1. Create a **new public GitHub repository** named `midterm-2026` (do not
   overwrite an older class repository called `Midterm`).
2. Push these files to the `main` branch, preserving `.github/workflows/pages.yml`.
3. In repository **Settings → Pages**, set **Source → GitHub Actions**.
4. After the workflow succeeds, the site is at
   `https://<YOUR-USERNAME>.github.io/midterm-2026/`.
5. In **Actions → Deploy Midterm 2026 to GitHub Pages → Run workflow**, choose
   `refresh_data: true` for an authentic download. Optionally enable
   `freeze_snapshot` only before the verified deadline.

`index.html` uses relative URLs, so no Vite base-path configuration is required.

## Codex workflow

The repository includes `AGENTS.md` (project guardrails and verification) and
`CODEX_NEXT_TASK.md` (a concrete next task). In Codex, connect/open the new
GitHub repository and give the agent this instruction:

> Read AGENTS.md and CODEX_NEXT_TASK.md. Run both test suites; verify the
> polling ingestion and Pages deployment; inspect the browser at mobile and
> desktop sizes; make any needed repairs; then open a PR with tests and screenshots.

## Ethics and limits

A national generic-ballot average is **not** a district vote forecast or an
estimate of national seat allocation. The website provides descriptive
statistics and transparency about sampling limitations, and does not endorse
any party or candidate. See [METHODOLOGY.md](METHODOLOGY.md).

## Attribution

Polling records sourced from VoteHub's API are CC BY 4.0 and should be credited
to VoteHub **and original pollsters**, with original release URLs retained.
Other source licensing must be reviewed independently before adding data.

Code in this starter is MIT licensed; see LICENSE. Synthetic data in
`data/demo-polls.json` are solely for demonstration, not research.
