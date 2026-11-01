import {matchupKey,matchups,filterHistory,roundLabel} from './race-history.mjs';
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
let dataset,groups=[],racePolls=[];
const counts=new Map();
function setText(id,value){$(id).textContent=value;}
function option(select,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
function svgNode(tag,attrs,parent){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));parent.append(n);return n;}
function updateRaces(preferred){
  const chamber=$('history-chamber').value,state=$('history-state').value;
  const options=dataset.races.filter(r=>r.chamber===chamber&&(!state||r.state===state));
  const select=$('history-race');select.replaceChildren();
  for(const r of options)option(select,r.id,`${r.name} — ${counts.get(r.id)||0} questions`);
  if(options.some(r=>r.id===preferred))select.value=preferred;
  updateMatchups();
}
function updateStates(){
  const previous=$('history-state').value,states=[...new Set(dataset.races.filter(r=>r.chamber===$('history-chamber').value).map(r=>r.state))].sort();
  $('history-state').replaceChildren();option($('history-state'),'','All states');for(const state of states)option($('history-state'),state,state);
  if(states.includes(previous))$('history-state').value=previous;
  updateRaces();
}
function updateMatchups(){
  racePolls=dataset.polls.filter(p=>p.race===$('history-race').value);groups=matchups(racePolls);
  const select=$('history-matchup');select.replaceChildren();
  groups.forEach((g,i)=>option(select,String(i),`${g.answers.map(a=>`${a.name} (${a.party})`).join(' / ')} · ${roundLabel(g.round)} · ${g.count} questions`));
  if(!groups.length)option(select,'','No verified questions available');
  select.disabled=!groups.length;render();
}
function colorSeries(answers){
  const used={};return [...answers].sort((a,b)=>a.party.localeCompare(b.party)||a.name.localeCompare(b.name)).map(a=>{
    const palette=a.party==='DEM'?['#246f93','#164961','#5497aa']:a.party==='REP'?['#ad4836','#79362c','#cd7950']:a.party==='IND'?['#79569b','#51416c']:['#836521','#27746a','#8b5471'];
    const i=used[a.party]||0;used[a.party]=i+1;return {...a,color:palette[i%palette.length]};
  });
}
function draw(polls,series){
  const box=$('history-chart');box.replaceChildren();
  const svg=svgNode('svg',{viewBox:'0 0 840 340',role:'img','aria-label':'Candidate poll percentages by fieldwork end date. Exact figures and provenance appear in the table.'},box);
  const title=svgNode('title',{},svg);title.textContent='Polling history; percentages as published, not probabilities';
  const left=45,right=815,top=15,bottom=295;
  const stamps=polls.map(p=>Date.parse(p.end_date+'T12:00:00Z'));
  const min=stamps.length?Math.min(...stamps):0,max=stamps.length?Math.max(...stamps):86400000;
  const x=d=>min===max?(left+right)/2:left+(Date.parse(d+'T12:00:00Z')-min)/(max-min)*(right-left);
  const y=p=>bottom-p/100*(bottom-top);
  for(let v=0;v<=100;v+=20){svgNode('line',{x1:left,x2:right,y1:y(v),y2:y(v),stroke:'#d7e0d7'},svg);svgNode('text',{x:4,y:y(v)+4,fill:'#54675d','font-size':11},svg).textContent=v+'%';}
  if(!polls.length){svgNode('text',{x:420,y:150,'text-anchor':'middle',fill:'#54675d'},svg).textContent='No verified polls in this selection';return;}
  for(let i=0;i<=(min===max?0:4);i++){const stamp=min+(max-min)*i/4;svgNode('text',{x:min===max?(left+right)/2:left+(right-left)*i/4,y:327,'text-anchor':min===max?'middle':i===0?'start':i===4?'end':'middle',fill:'#54675d','font-size':11},svg).textContent=new Date(stamp).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'2-digit'});}
  for(const s of series)for(const p of polls){const answer=p.answers.find(a=>a.id===s.id);if(!answer)continue;
    const description=`${s.name} (${s.party}): ${answer.pct}%; ${p.pollster}; ${p.start_date}–${p.end_date}; ${p.population.toUpperCase()}; sample ${p.sample_size??'not reported'}`;
    const dot=svgNode('circle',{cx:x(p.end_date),cy:y(answer.pct),r:4.5,fill:s.color,stroke:'#fff','stroke-width':1,tabindex:0,'aria-label':description},svg);
    svgNode('title',{},dot).textContent=description;
    for(const event of ['focus','mouseenter'])dot.addEventListener(event,()=>setText('history-point',description));
    for(const event of ['blur','mouseleave'])dot.addEventListener(event,()=>setText('history-point','Hover or focus a dot for its poll details. Exact values are also in the table.'));
  }
}
function link(parent,label,url){if(!/^https?:\/\//.test(url||''))return;const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
function render(){
  const race=dataset.races.find(r=>r.id===$('history-race').value),group=groups[Number($('history-matchup').value)];
  const polls=group?filterHistory(racePolls,{race:race.id,matchup:group.key,population:$('history-population').value,from:$('history-from').value,to:$('history-to').value,pollster:$('history-pollster').value}):[];
  const series=colorSeries(group?.answers||[]);
  setText('history-title',race?.name||'Choose a race');
  setText('history-count',`${new Set(polls.map(p=>p.poll_id)).size} surveys · ${polls.length} question records`);
  setText('history-period',polls.length?`${polls[0].end_date} – ${polls.at(-1).end_date}`:'No matching fieldwork');
  setText('history-note',!racePolls.length?'No verified polling questions are available for this race in this snapshot. This is a coverage gap, not evidence that the race is tied or uncompetitive.':!polls.length?'No questions match these filters. Try All populations, clear the dates or pollster search, or choose another matchup.':`${roundLabel(group.round)}. Different question variants can come from the same survey. Dots show individual responses; no forecast or average is calculated. Undecided and other answers remain in the table.`);
  setText('history-point','Hover or focus a dot for its poll details. Exact values are also in the table.');
  const legend=$('history-legend');legend.replaceChildren();for(const s of series){const item=document.createElement('span'),dot=document.createElement('i');dot.style.background=s.color;item.append(dot,document.createTextNode(`${s.name} (${s.party})`));legend.append(item);}
  draw(polls,series);
  const body=$('history-rows');body.replaceChildren();
  if(!polls.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No verified polling questions match this selection.';row.append(td);body.append(row);}
  for(const p of [...polls].reverse()){
    const row=document.createElement('tr');
    for(const value of [`${p.start_date}–${p.end_date}`,p.pollster,p.population.toUpperCase(),p.sample_size??'Not reported',p.answers.map(a=>`${a.name} (${a.party}): ${a.pct}%`).join('; ')]){const td=document.createElement('td');td.textContent=value;row.append(td);}
    const source=document.createElement('td');link(source,'Original release ↗',p.url);
    const details=document.createElement('details'),summary=document.createElement('summary'),info=document.createElement('p');summary.textContent='Question & provenance';
    info.textContent=`${dataset.attribution}. Collected: ${dataset.retrieved_at}. License: ${dataset.license}. Sponsor: ${p.sponsors||'not reported'}. Partisan flag: ${p.partisan||'none reported'}. Internal flag: ${p.internal||'none reported'}. ${roundLabel(p.round)}. Question ID: ${p.id}. Survey ID: ${p.poll_id}.${p.notes?' Notes: '+p.notes:''}`;
    details.append(summary,info);link(details,'Compilation & reuse terms',dataset.source_url);source.append(details);row.append(source);body.append(row);
  }
}
async function load(){try{
  const response=await fetch('./data/race-polls.json');if(!response.ok)throw Error('Missing snapshot');dataset=await response.json();
  if(dataset.races.length!==470||!Array.isArray(dataset.polls))throw Error('Incomplete catalog');
  for(const p of dataset.polls)counts.set(p.race,(counts.get(p.race)||0)+1);
  for(const id of ['history-matchup','history-population','history-from','history-to','history-pollster'])$(id).addEventListener('input',render);
  $('history-chamber').addEventListener('change',updateStates);$('history-state').addEventListener('change',()=>updateRaces());$('history-race').addEventListener('change',updateMatchups);
  $('history-reset').addEventListener('click',()=>{$('history-population').value='all';$('history-from').value='';$('history-to').value='';$('history-pollster').value='';render();});
  const requested=new URLSearchParams(location.search).get('race'),match=dataset.races.find(r=>r.id===requested);
  if(match)$('history-chamber').value=match.chamber;
  updateStates();if(match){$('history-state').value=match.state;updateRaces(match.id);}
  setText('history-source',`${dataset.source} · ${dataset.license} · collected ${dataset.retrieved_at}. ${counts.size} of 470 races have imported questions. Missing sample sizes remain “Not reported”.`);
  $('history-controls').disabled=false;
}catch(error){setText('history-source','Race polling snapshot unavailable. No synthetic or forecast data are substituted.');setText('history-note','Please reload or check the data source.');}}
load();
