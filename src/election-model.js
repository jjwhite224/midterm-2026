// Model outputs are never treated as certified outcomes or raw polls.
export function favorite(race) {
  return race.chance_left === 0.5 ? 'U' : race.chance_left > 0.5 ? race.left_party : 'R';
}
export function tally(races, base = {}) {
  const counts = {D: 0, R: 0, I: 0, U: 0, V: 0, ...base};
  for (const race of races) counts[favorite(race)]++;
  return counts;
}
export function competitive(race) { return race.chance_left >= 0.25 && race.chance_left <= 0.75; }
export function filterRaces(races, state, coverage) {
  return races.filter(r => (!state || r.state === state) &&
    (coverage === 'all' || (coverage === 'close' ? competitive(r) : r.polls_used === 0)));
}
export function control(counts, chamber) {
  const threshold = chamber === 'house' ? 218 : 51;
  // Only the two existing Senate independents are known to caucus with Democrats.
  const aligned = counts.D + (chamber === 'senate' ? 2 : 0);
  if (aligned >= threshold) return 'Democratic majority';
  if (counts.R >= (chamber === 'senate' ? 50 : 218)) return 'Republican control';
  return 'Control unresolved';
}
