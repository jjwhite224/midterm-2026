# MIDTERM / 2026 — Reading the Polls

An open-source, interactive polling-literacy project for **Stephen Zweibel's
Fall 2026 AI-Assisted Programming class at the CUNY Graduate Center**.

**Project stage:** working static starter. Includes pollster search, population
and date filters, editable recency weighting, SVG visualization, full poll table,
unit tests, data validation, and a GitHub Pages deployment workflow.

> **Data coverage:** `data/polls.json` contains 311 national generic-ballot
> records: 307 VoteHub records and four reviewed supplemental surveys.
> Fieldwork ends January 3–October 30, 2026. Collection times and reuse terms
> are recorded separately for every row; assembly time is not fieldwork time.
> Fourteen source records have unreported sample sizes, retained as null.
> This dataset is not the separately frozen pre-election archive.
>
> If authentic data are unavailable, the app uses an explicitly marked
> *synthetic demo*. Demo numbers and pollster names are invented and are NOT
> election evidence.

## House and Senate polling histories on the main page

The **Race polls** explorer lists every 2026 November 3 House district and
Senate election (435 + 35). Its separate `data/race-polls.json` snapshot contains
1,354 question records across 146 races as collected November 1. Unpolled races
remain selectable and show an explicit coverage gap. Charts use actual published
candidate percentages, including independents and third parties; no model
estimates fill polling gaps. Question variants are counted separately from surveys.

Choose chamber, state and race, then the candidate matchup/RCV round. Population,
fieldwork dates and pollster filters control the timeline and full-answer table.
Different candidate sets and ranked-choice rounds are never joined. The latest
available matchup is selected by default; earlier candidate matchups remain
available. Hover or keyboard-focus a dot for exact survey details. Every row
retains original source, fieldwork, sample (including explicit nulls), population,
question/survey IDs, sponsors and partisan flags. Collection time and CC BY 4.0
terms apply to every question via the snapshot envelope, and appear in row details.

The licensed compilation is [The New York Times via PollResults.org](https://pollresults.org/api/).
Race names/identifiers alone come from Polling Forecast under CC BY 4.0; forecast
values do not enter the polling explorer. NYT's district 1 is explicitly mapped
to the atlas's district 00 only in verified single-member states. National generic
ballot records, other elections, primary/subpopulation questions and ambiguous
records are excluded. The snapshot records exclusion counts, and a local
`race-import-audit.tmp` lists IDs/reasons for review. No ambiguous value is corrected.

```bash
python scripts/fetch_race_polls.py
```

Refresh can also be run through GitHub Actions using `refresh_race_polls`.
Downloads validate the license on each page, detect cursor loops and conflicting
question IDs, and finish both chambers before replacing the snapshot. The
`--from-cache` option reprocesses `race-download.tmp` while retaining its original
collection time. National polls and the protected pre-election archive are untouched.

## Separate election atlas

Open `elections.html` for a keyboard-accessible 50-state tile map with House
and Senate views, official membership, and a clearly labeled race-favorite
scenario. It uses a separate `data/forecasts.json` snapshot from
[Polling Forecast](https://www.pollingforecast.com/us/data), CC BY 4.0,
dated October 31, 2026. This is one publisher's model, not a consensus or raw
poll dataset. Every race links to its model page and shows polling coverage,
probability and an 80% margin interval. No-poll estimates are identified.

The scenario counts each race's model favorite, adds 65 Senate holdovers,
and keeps independent challengers separate. It is not the publisher's
simulated median or a chamber win probability. The baseline and its dated
official sources are in `data/congress-baseline.json`; the House source was
last updated September 2. Model incumbent labels differ from that official
baseline, so the atlas does not claim individual district flips. All 435
House voting seats and the 35 Senate races (including FL/OH specials) are covered.

Refresh forecast outputs separately with Python stdlib:

```bash
python scripts/fetch_forecasts.py
```

The importer validates licenses, dates, coverage, unique races, probabilities
and intervals before replacing the snapshot. A failed download or validation
leaves the existing file untouched. Membership requires separate source review.
Neither polling data nor the frozen pre-election archive is modified.

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

`data/reviewed-polls.json` contains verified supplemental records. The importer
merges them on every refresh, so VoteHub updates do not remove them. To merge
reviewed additions without downloading or redating the existing VoteHub rows:

```bash
python scripts/fetch_polls.py --merge-existing --as-of 2026-11-01
```

New supplemental releases require manual verification of original figures,
national scope, dates, population, sample size and reuse terms. The current
allowlist admits Marist sources under its attribution-based redistribution
permission. September 14–15 (1,280 RV) and October 19–20 (1,289 RV) were checked
against original releases; October results were checked in the original PDF,
page 52. Only the registered-voter version of each survey is added, avoiding
counting October's likely-voter reweighting as a second survey. The original
VoteHub records can still include multiple population versions; averages remain
descriptive record averages, not averages of independent samples.

Matching Marist pollster aliases, end date and population are checked across
sources; conflicting values stop the write for manual review. New licenses
require a code review of the allowlist. Future releases are not auto-approved.
The October 22–30 ActiVote (2,000 LV) and October 27–30 Big Data Poll
(3,214 LV) records come from Call the Map's CC BY 4.0 polling compilation,
cross-checked against original releases. Each row retains the compilation URL,
original release, license evidence and attribution to the pollster, Call the Map,
VoteHub and The New York Times. This license covers the compiled polling data,
not the pollsters' article text. ActiVote reports a two-way result; its percentages
are retained as published. Emerson remains excluded pending reuse review.

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

Supplemental records credit the Marist Institute for Public Opinion, in
partnership with NPR and PBS News. Marist permits redistribution with attribution
under [section 3 of its terms](https://maristpoll.marist.edu/terms-of-use/).
These records are not relabeled CC BY 4.0 or MIT. Each table row exposes its
source, collection time, evidence and reuse terms under **Source & reuse**.

Code in this starter is MIT licensed; see LICENSE. Synthetic data in
`data/demo-polls.json` are solely for demonstration, not research.


## Reported returns and voter demographics

Both pages now include a separate November 5 results snapshot for all 470
House/Senate races, candidate vote tables, publisher seat-call tallies, and
national House voter-poll charts by age, race and education. Results are
unofficial and certification is unverified. Demographic estimates cannot be
applied to individual races. One conflicting age row is withheld.

See [source and licensing notes](data/RESULTS-SOURCES.md). Update only returns
with `python scripts/fetch_results.py` or the manual Pages `refresh_results`
input. Survey tables require manual review. Polling and forecast archives stay
unchanged. The demographic adaptation is CC BY-SA 4.0, separately from site code.

Validation for this change: 14 JavaScript tests (the `npm test` command's Node
runner) and 25 Python tests passed. Browser checks covered both pages, desktop
and 390px mobile layouts, keyboard focus, race/special-election filters, an
empty Senate/California selection, and all three demographic chart categories.
