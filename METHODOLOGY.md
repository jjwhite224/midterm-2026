# Methodology — Early prototype

This repository is an early *polling explorer*, not a model of who wins an
election. No seat counts or winning probabilities are estimated here.

## Collection
`scripts/fetch_polls.py` requests VoteHub `GET /polls` with `poll_type=generic-ballot`,
`subject=2026`, `from_date=2026-01-01`, and a collection cutoff date. It preserves
only valid year-2026 national generic-ballot records with identifiable Democrat
and Republican answer percentages (0–100). Poll IDs are deduplicated. A failed
request or an empty valid response refuses to overwrite the existing dataset.

### Attribution
Polling data: [VoteHub Polling API](https://votehub.com/polls/api/) under CC BY 4.0;
individual poll sources are retained with each record. Any reuse should also
credit original pollsters and comply with applicable pollster-specific terms.
The website is independently produced and not affiliated with VoteHub.

## Display
Each dated mark represents a poll's own response percentages. Connecting marks
with straight segments is purely a visual guide, not smoothing or interpolation.
An equal-weight descriptive average treats each included poll as one record.
The alternative recency weighting gives a poll a weight of `0.5^(age_days / half_life)`
relative to the most recent included poll. This is a sensitivity tool, **not a
pollster-quality adjustment, prediction, election probability, or seat model.**
The averages are unadjusted for house effects, correlated errors, methodology,
turnout, the electoral map, and nonresponse. Multiple polls from the same
pollster can have disproportionate influence.

## Dates and snapshots
`retrieved_at` is the real download time in UTC. `as_of` is the cutoff on the
poll fieldwork end date, not evidence that a snapshot existed on that cutoff.
A credible pre-election snapshot must be physically created and committed to
version control before November 3, 2026, midnight America/New_York. The freeze
script refuses creation after that date and refuses overwriting an existing file.
There is currently **no authentic pre-election snapshot** in this starter.

## Synthetic preview
`data/demo-polls.json` is completely invented for visual testing and should not
be cited as public opinion data. The app displays a prominent warning whenever
this fallback is active. Remove reliance on demo only after genuine polls have
been downloaded and the UI has been checked.

## Future work
- Race-specific Senate or House explorer, after verifying feed schemas and terms.
- Explicitly dated historical data and model validation.
- Results audit that separates certified from provisional counts.
- Per-poll metadata and alternative weighting / exclusion diagnostics.
