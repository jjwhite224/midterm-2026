/** Pure, testable descriptive statistics. No electoral predictions. */
export function sortAndFilter(polls, { search = '', population = 'all', startDate = '2026-08-01' } = {}) {
  const q = search.trim().toLowerCase();
  return polls.filter(p =>
    (!q || String(p.pollster).toLowerCase().includes(q)) &&
    (population === 'all' || p.population === population) &&
    (!startDate || p.end_date >= startDate)
  ).sort((a, b) => a.end_date.localeCompare(b.end_date) || a.id.localeCompare(b.id));
}
export function describe(polls, weighting = 'simple', halfLife = 14) {
  if (!polls.length) return null;
  if (!Number.isFinite(halfLife) || halfLife <= 0) throw new Error('Half-life must be positive');
  const newest = Date.parse(polls.reduce((max, p) => p.end_date > max ? p.end_date : max, polls[0].end_date) + 'T00:00:00Z');
  let sum = 0, dem = 0, rep = 0;
  for (const p of polls) {
    const ageDays = Math.max(0, (newest - Date.parse(p.end_date + 'T00:00:00Z')) / 86400000);
    const weight = weighting === 'recency' ? Math.pow(.5, ageDays / halfLife) : 1;
    sum += weight; dem += weight * Number(p.dem); rep += weight * Number(p.rep);
  }
  const demMean = dem / sum, repMean = rep / sum;
  return { count: polls.length, demMean, repMean, gap: demMean - repMean, newest: polls[polls.length - 1].end_date };
}
export function formatPercent(x) { return Number.isFinite(x) ? `${x.toFixed(1)}%` : '—'; }
export function formatGap(x) { return Number.isFinite(x) ? `${x > 0 ? '+' : ''}${x.toFixed(1)} pts` : '—'; }
