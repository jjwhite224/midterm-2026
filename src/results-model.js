export function seatCalls(races, chamber, holdovers) {
  const counts = chamber === 'senate' ? {...holdovers, other: 0, pending: 0} : {D: 0, R: 0, I: 0, other: 0, pending: 0};
  for (const race of races.filter(r => r.chamber === chamber)) {
    const called = race.candidates.filter(c => c.source_called);
    if (called.length !== 1) { counts.pending++; continue; }
    const party = {Democratic: 'D', Republican: 'R', Independent: 'I'}[called[0].party] || 'other';
    counts[party]++;
  }
  return counts;
}

export function selectResults(races, chamber, state = '', status = 'all') {
  return races.filter(r => r.chamber === chamber && (!state || r.state === state)
    && (status !== 'pending' || !r.candidates.some(c => c.source_called)));
}
