import test from 'node:test';
import assert from 'node:assert/strict';
import {sortAndFilter,describe,formatGap,formatPercent} from '../src/analysis.mjs';
const data=[
  {id:'b',pollster:'Example B',population:'rv',end_date:'2026-10-30',dem:46,rep:44},
  {id:'a',pollster:'Example A',population:'lv',end_date:'2026-10-01',dem:48,rep:42},
];
test('filters by pollster, population, date',()=>{
  assert.equal(sortAndFilter(data,{search:'example a',population:'lv',startDate:'2026-09-01'}).length,1);
  assert.equal(sortAndFilter(data,{search:'example',population:'all',startDate:'2026-10-15'}).length,1);
  assert.deepEqual(sortAndFilter(data).map(x=>x.id),['a','b']);
});
test('simple averages equal poll weights',()=>{
  const x=describe(data,'simple');assert.equal(x.count,2);assert.equal(x.demMean,47);assert.equal(x.repMean,43);assert.equal(x.gap,4);
});
test('recency weights newer polls more strongly',()=>{
  const x=describe(data,'recency',7);assert.ok(x.demMean<47);assert.ok(x.repMean>43);
});
test('no polls or bad half-life',()=>{
  assert.equal(describe([]),null);assert.throws(()=>describe(data,'recency',0));
});
test('formatting',()=>{
  assert.equal(formatGap(-2.41),'-2.4 pts');assert.equal(formatPercent(48.62),'48.6%');
});
