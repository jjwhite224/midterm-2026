# Returns and voter surveys — November 5, 2026

`results.json` is a separate, unofficial post-election snapshot of civicAPI's
House (87524) and Senate (87528) aggregate endpoints, including 435 district and
35 Senate race records. civicAPI permits reuse with attribution in its
[FAQ](https://civicapi.org/faq). Original race URLs, reporting percentages,
publisher update times and collection time are retained. `source_called` is the
publisher's `winner` flag; it is **not certification**. No certified final results
have been verified. Reporting percentages do not establish certification.

The UI counts those calls and adds the 65 Senate holdovers once, using the
existing sourced baseline. It does not use the provider's aggregate Senate party
seat totals, which group the independent holdovers with Democrats. Uncalled
seats remain unresolved. No final chamber-control or winner claim is made.

Refresh with `python scripts/fetch_results.py`, or the Pages workflow's manual
`refresh_results` input. The importer validates complete race coverage and rejects
test data, disputed aggregate records, wrong elections, invalid values and older
source snapshots before replacing the results file. Corrections to votes are
allowed; certification always remains unverified. Git history preserves previous
published results. No polling or forecast file is modified. Visitors only load
local static JSON. No background refresh is implied.

`exit-polls.json` adapts selected demographic tables from [Wikipedia revision
1383972331](https://en.wikipedia.org/w/index.php?title=2026_United_States_elections&oldid=1383972331),
attributed to Wikipedia contributors, citing [NBC News / SSRS](https://www.nbcnews.com/politics/2026-elections/exit-polls).
The adapted demographic dataset is **CC BY-SA 4.0**; this license is separate from
the site's code license. Education labels are shortened and only D/R shares are
shown. No remainder is inferred. All displayed numeric shares were compared to
NBC's All Voters national table on November 5. Age 45–64 conflicts (Wikipedia:
52 D / 46 R; NBC: 52 D / 47 R), so both vote shares are withheld pending review.
The electorate share agrees. No ambiguous record was silently corrected.

Scope is national House vote, not district or Senate results. These are survey
estimates, not a count of demographic votes. The SSRS voter-poll methodology uses
multiple survey modes. Sample sizes, exact fieldwork dates and subgroup margins
are not supplied by this licensed compilation; those fields are null, never
borrowed from a different publisher's sample. Future demographic refreshes require
manual source and licensing review; the results workflow does not update them.
