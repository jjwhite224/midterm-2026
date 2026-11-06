import { sortAndFilter, describe, formatPercent, formatGap } from './analysis.mjs';
const $ = sel => document.querySelector(sel);
const fields = { search: $('#search'), population: $('#population'), startDate: $('#start-date'), weighting: $('#weighting'), halfLife: $('#half-life') };
const ns = 'http://www.w3.org/2000/svg';
let allPolls = [];
let demo = false;
function el(name, attributes = {}, parent) { const node = document.createElementNS(ns, name); for (const [k,v] of Object.entries(attributes)) node.setAttribute(k, String(v)); if (parent) parent.append(node); return node; }
function fmtDate(s) { return new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US', {timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}); }
function validData(p) { return typeof p.id === 'string' && typeof p.end_date === 'string' && /^2026-\d\d-\d\d$/.test(p.end_date) && typeof p.pollster === 'string' && Number.isFinite(p.dem) && Number.isFinite(p.rep) && p.dem >= 0 && p.dem <= 100 && p.rep >= 0 && p.rep <= 100 && p.dem+p.rep <= 100.01; }
async function load() {
  try {
    const res = await fetch('./data/polls.json', {cache:'no-store'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.polls)) throw new Error('Invalid polls data shape');
    if (json.polls.length) {
      allPolls = json.polls.filter(validData);
      if (allPolls.length) {
        $('#status').textContent = 'PUBLIC POLLS · DATA LOADED';
        $('#source-status').textContent = `SOURCE: ${json.source || 'VoteHub'}`;
        $('#retrieved').textContent = `DATA ASSEMBLED: ${json.assembled_at || json.retrieved_at || 'UNKNOWN'}`;
        $('#snapshot').textContent = `LATEST FIELDWORK: ${[...allPolls].map(p=>p.end_date).sort().at(-1)} · COLLECTION TIMES: SEE ROW DETAILS`;
        return;
      }
    }
  } catch (error) { console.warn('No valid live polling data available:', error.message); }
  const response = await fetch('./data/demo-polls.json');
  if (!response.ok) throw new Error('Demo dataset unavailable');
  allPolls = (await response.json()).polls.filter(validData);
  demo = true;
  $('#status').textContent = 'DEMO DATA · NOT REAL POLLS';
  $('#demo-warning').hidden = false;
  $('#source-status').textContent = 'SOURCE: SYNTHETIC UI DEMONSTRATION';
  $('#retrieved').textContent = 'RETRIEVED: NOT APPLICABLE';
}
function drawChart(polls) {
  const container = $('#chart'); container.replaceChildren();
  const svg = el('svg', {viewBox:'0 0 820 310',preserveAspectRatio:'none','role':'group','aria-label':'Individual polling observations'});container.append(svg);
  const left=49,right=795,top=17,bottom=270;
  const values = polls.flatMap(p => [p.dem, p.rep]);
  const low = Math.max(0, Math.floor(Math.min(30, ...values) / 5) * 5);
  const high = Math.min(100, Math.ceil(Math.max(65, ...values) / 5) * 5);
  $('#national-point').textContent = 'Hover or focus a dot for poll details.';
  const dates = polls.map(p=>Date.parse(`${p.end_date}T00:00:00Z`));
  const min = dates.length ? Math.min(...dates) : Date.parse('2026-08-01T00:00:00Z');
  const max = dates.length ? Math.max(...dates) : Date.parse('2026-11-01T00:00:00Z');
  const span = Math.max(max - min, 24*3600*1000);
  const x = d => left+(Date.parse(`${d}T00:00:00Z`)-min)/span*(right-left);
  const y = v => bottom-(v-low)/(high-low)*(bottom-top);
  for (let val = low; val <= high; val += 5) { el('line',{x1:left,y1:y(val),x2:right,y2:y(val),class:'grid-line'},svg); const t=el('text',{x:5,y:y(val)+4},svg);t.textContent=`${val}%`; }
  const xTicks=4; for(let i=0;i<=xTicks;i++){const stamp=min+span*(i/xTicks);const label=new Date(stamp).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'});const t=el('text',{x:left+(right-left)*(i/xTicks),y:299,'text-anchor':i===0?'start':i===xTicks?'end':'middle'},svg);t.textContent=label;}
  if(!polls.length){const label=el('text',{x:420,y:147,'text-anchor':'middle'},svg);label.textContent='No polls match these filters';return;}
  for(const [key,color] of [['dem','#2f768a'],['rep','#d56f55']]){
    // Lines connect observations by date as a visual guide only; overlapping same-day observations are not interpolated trends.
    const path=polls.map((p,i)=>`${i?'L':'M'} ${x(p.end_date).toFixed(2)} ${y(p[key]).toFixed(2)}`).join(' ');
    el('path',{d:path,class:'plot-line',stroke:color,opacity:.77},svg);
    for(const p of polls){const dot=el('circle',{cx:x(p.end_date),cy:y(p[key]),r:4.7,fill:color,class:'poll-point',tabindex:0,role:'img'},svg);const title=el('title',{},dot);title.textContent=`${p.pollster}, ${fmtDate(p.end_date)}: ${key==='dem'?'Dem':'Rep'} ${p[key].toFixed(1)}%${demo?' (synthetic demo)':''}`;dot.setAttribute('aria-label',title.textContent);
      const show = () => { $('#national-point').textContent = title.textContent; };
      dot.addEventListener('focus',show);dot.addEventListener('mouseenter',show);dot.addEventListener('click',show);}
  }
}
function tableRow(p) {
  const tr=document.createElement('tr');
  const cells=[fmtDate(p.end_date),p.pollster,({lv:'Likely voters',rv:'Registered voters',a:'All adults'})[p.population]||p.population||'Not reported',p.sample_size?Number(p.sample_size).toLocaleString('en-US'):'—',formatPercent(p.dem),formatPercent(p.rep)];
  for(const value of cells){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const td=document.createElement('td');
  if(!demo && /^https?:\/\//.test(p.url||'')){const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='View release ↗';td.append(a);}else{td.textContent=demo?'Illustrative only':'Not available';}
  if(!demo && p.source){
    const details=document.createElement('details'),summary=document.createElement('summary'),info=document.createElement('p');
    details.className='source-details';
    summary.textContent='Source & reuse';
    info.textContent=`${p.attribution || p.source}. Fieldwork: ${p.start_date || 'Not reported'} to ${p.end_date}. Collected: ${p.retrieved_at || 'Unknown'}. Reuse: ${p.license || 'Unknown'}.`;
    details.append(summary,info);
    for(const [label,url] of [['Reuse terms',p.license_url],['Verified evidence',p.evidence_url],['Source compilation',p.source_url]]){
      if(/^https:\/\//.test(url||'')){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=label;details.append(link,document.createElement('br'));}
    }
    td.append(details);
  }
  tr.append(td);return tr;
}
function render() {
  const opts={search:fields.search.value,population:fields.population.value,startDate:fields.startDate.value};
  const polls=sortAndFilter(allPolls,opts);
  $('#half-life-control').hidden=fields.weighting.value!=='recency';
  $('#half-life-value').textContent=`${fields.halfLife.value} days`;
  const summary=describe(polls,fields.weighting.value,Number(fields.halfLife.value));
  $('#count').textContent=String(polls.length);
  $('#dem-mean').textContent=summary?formatPercent(summary.demMean):'—';
  $('#rep-mean').textContent=summary?formatPercent(summary.repMean):'—';
  $('#gap-mean').textContent=summary?formatGap(summary.gap):'—';
  $('#period').textContent=polls.length?`${fmtDate(polls[0].end_date)} – ${fmtDate(polls.at(-1).end_date)}`:'No matching polls';
  $('#insight-text').textContent=summary?`Among these ${polls.length} ${demo?'illustrative':'reported'} surveys, the ${fields.weighting.value==='recency'?'recency-weighted':'equal-weight'} descriptive average is ${formatPercent(summary.demMean)} Democratic and ${formatPercent(summary.repMean)} Republican. This is not a seat forecast, election probability, or probability sample of polls.`:'No surveys match your selections. Try a broader date range, pollster query, or population filter.';
  $('#table-count').textContent=`${polls.length} RECORDS`;
  const tbody=$('#poll-rows');tbody.replaceChildren();
  if(!polls.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.className='empty-table';td.textContent='No matching polls. Try resetting the filters.';tr.append(td);tbody.append(tr);}else{for(const p of [...polls].reverse())tbody.append(tableRow(p));}
  drawChart(polls);
}
for(const control of Object.values(fields))control.addEventListener('input',render);
$('#reset').addEventListener('click',()=>{fields.search.value='';fields.population.value='all';fields.startDate.value='2026-08-01';fields.weighting.value='simple';fields.halfLife.value='14';render();});
load().then(render).catch(error=>{$('#status').textContent='DATA LOAD ERROR';$('#insight-text').textContent='Unable to load polling data. Check the repository and run the ingestion script.';console.error(error);});
