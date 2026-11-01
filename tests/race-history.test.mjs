import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchupKey,matchups,filterHistory} from '../src/race-history.mjs';
const data=JSON.parse(readFileSync(new URL('../data/race-polls.json',import.meta.url)));
test('all 470 races selectable without inventing polls for empty races',()=>{
  assert.equal(data.races.filter(r=>r.chamber==='house').length,435);
  assert.equal(data.races.filter(r=>r.chamber==='senate').length,35);
  const unpolled=data.races.find(r=>!data.polls.some(p=>p.race===r.id));
  assert.ok(unpolled);assert.equal(filterHistory(data.polls,{race:unpolled.id,matchup:''}).length,0);
});
test('race and candidate matchup never leak across timelines',()=>{
  const p=data.polls[0],key=matchupKey(p),filtered=filterHistory(data.polls,{race:p.race,matchup:key});
  assert.ok(filtered.length);assert.ok(filtered.every(r=>r.race===p.race&&matchupKey(r)===key));
  assert.deepEqual(filtered.map(r=>r.end_date),filtered.map(r=>r.end_date).sort());
  assert.equal(filterHistory(data.polls,{race:p.race,matchup:key,from:'2026-12-01'}).length,0);
});
test('independents retain their identity; RCV rounds are separate matchups',()=>{
  const independent=data.polls.find(p=>p.answers.some(a=>a.party==='IND'));
  assert.ok(matchups([independent])[0].answers.some(a=>a.party==='IND'));
  const copy=structuredClone(independent);copy.round=['9','TRUE','TRUE'];
  assert.notEqual(matchupKey(copy),matchupKey(independent));
  assert.equal(matchups([independent,copy]).length,2);
});
