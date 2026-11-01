import {favorite,tally,filterRaces,control,competitive} from './election-model.js';

const names = 'AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming';
const states = Object.fromEntries(names.split('|').map(s=>s.split(':')));
// An original equal-area tile arrangement, not a district-boundary dataset.
const layout = ['AK:0:0','ME:11:0','VT:10:1','NH:11:1','WA:0:2','ID:1:2','MT:2:2','ND:3:2','MN:4:2','WI:5:2','MI:7:2','NY:9:2','MA:10:2','RI:11:2','OR:0:3','NV:1:3','WY:2:3','SD:3:3','IA:4:3','IL:5:3','IN:6:3','OH:7:3','PA:8:3','NJ:9:3','CT:10:3','CA:0:4','UT:1:4','CO:2:4','NE:3:4','MO:4:4','KY:6:4','WV:7:4','VA:8:4','MD:9:4','DE:10:4','AZ:1:5','NM:2:5','KS:3:5','AR:4:5','TN:5:5','NC:7:5','SC:8:5','OK:3:6','LA:4:6','MS:5:6','AL:6:6','GA:7:6','HI:0:7','TX:3:7','FL:8:7'];
const $ = id => document.getElementById(id);
const text = (id,value) => { $(id).textContent=value; };
const label = {D:'Democratic',R:'Republican',I:'Independent',U:'Unresolved',V:'Vacant'};
let data, baseline, chamber='senate', selected='';
const countsText = c => Object.entries(label).filter(([k])=>c[k]).map(([k])=>`${c[k]} ${k === 'V' ? 'vacant' : k}`).join(' · ');
const margin = n => `${n>0?'+':''}${n.toFixed(1)}`;
function bar(id,counts,total) {
  const el=$(id);el.replaceChildren();el.setAttribute('role','img');el.setAttribute('aria-label',countsText(counts));
  for(const k of ['D','I','U','V','R']) if(counts[k]){
    const segment=document.createElement('span');segment.className=k;segment.style.width=`${counts[k]/total*100}%`;
    segment.title=`${label[k]}: ${counts[k]} seats`;el.append(segment);
  }
}
function selectState(state) {selected=state;$('state-select').value=state;render();}
function render() {
  const focusedTile = document.activeElement?.closest('#state-map') ? document.activeElement.getAttribute('aria-label') : null;
  const senate=chamber==='senate', races=data[chamber].races;
  const current=baseline[chamber], projected=tally(races,senate?baseline.senate_holdovers:{});
  for(const c of ['senate','house']) $(c).setAttribute('aria-pressed',String(c===chamber));
  text('current-title','Republican control');text('projected-title',control(projected,chamber)+' scenario');
  bar('current-bar',current,senate?100:435);bar('projected-bar',projected,senate?100:435);
  text('current-counts',countsText(current));text('projected-counts',countsText(projected));
  text('baseline-note',`Official source: ${current.source_date}; reviewed ${baseline.reviewed_at}. ${senate?'The 2 independents caucus with Democrats.':'Membership includes vacancies; this is not the 2024 election result.'}`);
  const change=projected.D-current.D;
  text('swing',`Democratic seats: ${change>=0?'+':''}${change} versus the membership baseline. ${races.filter(competitive).length} races have a 25–75% D/I model chance. This is a race-favorite tally, not a chamber win probability.`);
  text('majority-note',senate?'35 seats on the ballot + 65 holdovers = 100. Democrats need 51 aligned seats; 50 Republican seats can control with the Republican vice president’s tie-break. Existing independent senators are shown separately.':'All 435 voting seats are on the ballot across all 50 states. A full-House majority requires 218. State totals below count district favorites, not statewide vote shares.');
  text('coverage',senate?'35 races · 35 states':'435 districts · 50 states');
  text('map-explanation',senate?'One tile per state. Colored tiles have a Senate election; FL and OH are special elections. Gray tiles have no Senate race.':'One tile per state. Numbers count Democratic and Republican district favorites; split delegations use the mixed color.');
  const tiles=$('state-map');tiles.replaceChildren();
  for(const entry of layout){
    const [code,x,y]=entry.split(':'),subset=races.filter(r=>r.state===code),counts=tally(subset);
    const parties=['D','R','I','U'].filter(k=>counts[k]);
    const color=!subset.length?'none':parties.length===1?parties[0]:'mixed';
    const button=document.createElement('button');button.className=`state-tile ${color}`;
    button.style.gridColumn=Number(x)+1;button.style.gridRow=Number(y)+1;
    button.setAttribute('aria-pressed',String(selected===code));
    const description=`${states[code]}: ${subset.length?`${subset.length} ${senate?'Senate race':'House districts'}, model favorites ${countsText(counts)}`:'no Senate election'}`;
    button.setAttribute('aria-label',description);button.title=description;button.textContent=code;
    const small=document.createElement('small');small.textContent=!subset.length?'—':senate?(subset[0].special?'SPECIAL':favorite(subset[0])):`${counts.D}D ${counts.R}R`;
    button.append(small);button.addEventListener('click',()=>selectState(code));tiles.append(button);
    if(focusedTile===description)button.focus({preventScroll:true});
  }
  const stateRaces=races.filter(r=>!selected||r.state===selected), stateCounts=tally(stateRaces);
  text('state-heading',selected?states[selected]:'All states');
  text('state-summary',stateRaces.length?`${stateRaces.length} ${senate?'Senate seats':'House seats'} on the ballot. Model favorites: ${countsText(stateCounts)}.`:'No Senate race in this state in 2026. Its senators’ seats are included in the national holdovers.');
  text('poll-coverage',`${stateRaces.filter(r=>r.polls_used>0).length} of ${stateRaces.length} races have race polls in this model. Poll counts are publisher-reported; the underlying polls are not imported into this view.`);
  const filtered=filterRaces(races,selected,$('race-filter').value);
  text('table-status',`${filtered.length} races shown. Filters affect the table only; national totals and the map retain full coverage.`);
  const body=$('race-rows');body.replaceChildren();
  if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No races match these filters. Choose All races or another state.';tr.append(td);body.append(tr);}
  for(const race of filtered){
    const tr=document.createElement('tr'), party=favorite(race);
    const values=[race.name,`${label[party]}${party==='U'?'':' favored'} · ${race.rating}`,`${(race.chance_left*100).toFixed(1)}% (${race.left_party})`,`${race.left_party}−R ${margin(race.best_bet_margin)} pts [${margin(race.range80_low)}, ${margin(race.range80_high)}]`,race.polls_used?String(race.polls_used):'0 · model only'];
    for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    const td=document.createElement('td'),a=document.createElement('a');a.href='https://www.pollingforecast.com'+race.page;a.textContent='Race model ↗';a.setAttribute('aria-label',`Source model for ${race.name}`);td.append(a);
    const history=document.createElement('a');history.href='./index.html?race='+encodeURIComponent(chamber+':'+race.key)+'#race-trends';history.textContent='Polling history ↗';history.setAttribute('aria-label',`Polling history for ${race.name}`);td.append(document.createElement('br'),history);tr.append(td);body.append(tr);
  }
}
async function start(){
  try{
    const responses=await Promise.all(['./data/forecasts.json','./data/congress-baseline.json'].map(u=>fetch(u)));
    if(responses.some(r=>!r.ok))throw Error('Missing snapshot');
    [data,baseline]=await Promise.all(responses.map(r=>r.json()));
    if(data.house.races.length!==435||data.senate.races.length!==35)throw Error('Incomplete snapshot');
    for(const [code,name] of Object.entries(states).sort((a,b)=>a[1].localeCompare(b[1]))){const option=document.createElement('option');option.value=code;option.textContent=name;$('state-select').append(option);}
    for(const c of ['house','senate'])$(c).addEventListener('click',()=>{chamber=c;render();});
    $('state-select').addEventListener('change',e=>selectState(e.target.value));$('race-filter').addEventListener('change',render);$('clear-state').addEventListener('click',()=>selectState(''));
    text('snapshot',`MODEL SNAPSHOT / ${data.senate.as_of} · Polling Forecast · CC BY 4.0`);
    text('provenance',`Forecast collected ${data.retrieved_at}. Membership reviewed ${baseline.reviewed_at}. This page reads local snapshots only. Refreshes require the Python importer; no automatic live polling requests are made from your browser.`);
    $('loaded').hidden=false;render();
  }catch(error){text('snapshot','FORECAST UNAVAILABLE');$('load-error').hidden=false;}
}
start();
