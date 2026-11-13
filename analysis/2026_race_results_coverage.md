# 2026 congressional race result baseline (November 5 source snapshot)

This is a **470-race baseline** extracted from the site's existing `data/results.json`, not a completed polling-error dataset. Includes 435 House and 35 Senate contests, as of 2026-11-05T22:46:52.225938+00:00. Results are **unofficial, incomplete, and not certified**. A result margin is **not** a polling error. Original result URLs are preserved per row.

`dr_margin_all_percent_points` = 100 × (Democratic votes − Republican votes) / all reported candidate votes; `dr_margin_two_party_percent_points` = 100 × (Democratic votes − Republican votes) / (Democratic + Republican votes). Both null if denominator zero. For nonstandard candidate matchups, do not assume these margins are suitable for comparing polls. 25 races have more than 5% other/nonpartisan vote; 21 do not have both D and R candidate votes in the snapshot. Verify matching candidates, RCV treatment, and ballot access before comparisons.

The separate `pre_election_model_margin_points_NOT_POLL` column originates from the existing dated Polling Forecast snapshot (2026-10-31 House / 2026-10-31 Senate), and **must never be treated as a polling average**. Model margins can use a different party/candidate definition (including independent candidates). The reported `model_polls_used_reported` is provider metadata, not raw surveys. This CSV intentionally does not compute a forecast error or a polling error.

Provenance: `data/results.json` (civicAPI, collected 2026-11-05T22:46:52.225938+00:00), `data/forecasts.json` (Polling Forecast CC BY 4.0); see `data/RESULTS-SOURCES.md` and `README.md`. Races: 470.

Next: run the polling-error builder on the existing >1MB `data/race-polls.json`, preserve distinct poll/question IDs, exclude post-Election Day fieldwork, dedupe survey variants and inspect matches. Add pre-election verified supplements only where license/provenance and original release allow it.
