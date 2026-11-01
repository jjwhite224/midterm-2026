import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {favorite,tally,filterRaces,control} from '../src/election-model.js';
const data=JSON.parse(readFileSync(new URL('../data/forecasts.json',import.meta.url)));
const baseline=JSON.parse(readFileSync(new URL('../data/congress-baseline.json',import.meta.url)));
test('complete chamber totals include Senate holdovers exactly once',()=>{
  const house=tally(data.house.races),senate=tally(data.senate.races,baseline.senate_holdovers);
  assert.equal(Object.values(house).reduce((a,b)=>a+b),435);
  assert.equal(Object.values(senate).reduce((a,b)=>a+b),100);
  assert.equal(senate.I,2);
  assert.equal(new Set(data.house.races.map(r=>r.state)).size,50);
});
test('independent challengers and exact ties are not silently Democratic',()=>{
  assert.equal(favorite({chance_left:.6,left_party:'I'}),'I');
  assert.equal(favorite({chance_left:.5,left_party:'D'}),'U');
  assert.equal(control({D:48,R:49,I:3},'senate'),'Control unresolved');
  assert.equal(control({D:48,R:50,I:2},'senate'),'Republican control');
});
test('state filters preserve national data and report unpolled races',()=>{
  const before=JSON.stringify(data.house.races);
  assert.equal(filterRaces(data.senate.races,'CA','all').length,0);
  assert.ok(filterRaces(data.house.races,'CA','all').length>0);
  assert.ok(filterRaces(data.house.races,'','unpolled').every(r=>r.polls_used===0));
  assert.equal(JSON.stringify(data.house.races),before);
});
