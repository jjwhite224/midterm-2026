import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seatCalls, selectResults} from '../src/results-model.js';
const data = JSON.parse(readFileSync(new URL('../data/results.json', import.meta.url)));
const baseline = JSON.parse(readFileSync(new URL('../data/congress-baseline.json', import.meta.url)));

test('seat calls count holdovers once and account for every seat', () => {
  for (const [chamber, total] of [['house', 435], ['senate', 100]]) {
    const counts = seatCalls(data.races, chamber, baseline.senate_holdovers);
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), total);
    assert.equal(counts.pending, data.races.filter(r => r.chamber === chamber && !r.candidates.some(c => c.source_called)).length);
  }
  assert.equal(seatCalls([], 'senate', baseline.senate_holdovers).I, 2);
});

test('filters preserve chamber, state and uncalled race boundaries', () => {
  assert.equal(selectResults(data.races, 'house').length, 435);
  assert.equal(selectResults(data.races, 'senate').length, 35);
  assert.equal(selectResults(data.races, 'senate', 'CA').length, 0);
  for (const r of selectResults(data.races, 'house', 'CA', 'pending')) {
    assert.equal(r.state, 'CA'); assert.equal(r.chamber, 'house');
    assert.ok(!r.candidates.some(c => c.source_called));
  }
});

test('demographics remain national estimates with conflicting values withheld', () => {
  const exit = JSON.parse(readFileSync(new URL('../data/exit-polls.json', import.meta.url)));
  assert.equal(exit.scope, 'national_house');
  assert.equal(exit.license, 'CC BY-SA 4.0');
  assert.equal(exit.rows.length, 15);
  const withheld = exit.rows.filter(r => r.status.startsWith('withheld'));
  assert.equal(withheld.length, 1);
  assert.equal(withheld[0].dem, null); assert.equal(withheld[0].rep, null);
  for (const row of exit.rows.filter(r => r.status === 'reviewed')) {
    assert.ok(row.dem >= 0 && row.rep >= 0 && row.dem + row.rep <= 101);
    assert.equal(row.sample_size, null);
  }
});
