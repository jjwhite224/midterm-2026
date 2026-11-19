// Data journalism interface: versioned static CSV analyses, no synthetic data.
const $=id=>document.getElementById(id);
const ROOT='./analysis/sensitivity/';
const RESULT_FILE='2026_polling_errors_provisional_v2.csv';
const SCENARIOS={
  window21:'21-day nonpartisan polls',
  window30:'30-day nonpartisan polls (baseline)',
  window45:'45-day nonpartisan polls',
  window30_partisan:'30-day polls including partisan and internal records',
  window30_without_researchco:'30-day polls excluding Research Co.'
};
const state={scenario:'window30',tier:'strict',chamber:'all',evidence:'all',state:'all',query:'',sort:'state',page:0,rows:[],audit:[],summary:[]};
let racePreset='polled',raceVisible=9,activeRaceId=null,detailShowAll=false,activePollId=null,lastRaceTrigger=null;
const PAGE=35, fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parseCSV(text){
  const rows=[],out=[];let cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){out.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      out.push(cell);cell=''; if(out.some(x=>x!==''))rows.push(out.slice());out.length=0;
    }else cell+=c;
  }
  if(cell!==''||out.length){out.push(cell);rows.push(out);}
  const keys=rows.shift()||[];
  return rows.map(values=>Object.fromEntries(keys.map((k,i)=>[k,values[i]??''])));
}
function num(x){return x===''||x==null?null:Number(x);}
function eligible(r){return r.status==='provisional_comparison'||(state.tier==='exploratory'&&r.status==='single_pollster_comparison');}
function selectedRows(){return state.rows.filter(eligible);}
function labelStatus(status){
  return {'provisional_comparison':'2+ pollsters','single_pollster_comparison':'1 pollster · exploratory','no_eligible_polls':'No eligible polls','result_not_comparable':'Different candidate structure'}[status]||'Not comparable';
}
function signedText(v){const n=num(v);return n===null?'—':(n>0?'+':'')+fmt(n,2)+' pp';}
function setText(id,value){$(id).textContent=value;}
function appendText(tag,content,parent,cls){let x=document.createElement(tag);x.textContent=content;if(cls)x.className=cls;parent.append(x);return x;}
function renderKpis(){
  const rows=selectedRows(),errors=rows.map(r=>num(r.signed_error_pp)).filter(Number.isFinite);
  const average=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
  const positive=errors.filter(x=>x>0).length,negative=errors.filter(x=>x<0).length;
  setText('kpi-races',String(errors.length));
  setText('kpi-denominator','of 470 contests (not a representative sample)');
  setText('kpi-signed',signedText(average(errors)));
  setText('kpi-absolute',average(errors)!==null?fmt(average(errors.map(Math.abs)),2)+' pp':'—');
  setText('kpi-directions',positive+' / '+negative);
  const s=state.summary.find(x=>x.scenario===state.scenario),desc=state.tier==='strict'?
    'Main evidence tier: at least two distinct pollsters per race.':
    'Exploratory tier: includes races with only one polling organization. These comparisons are less robust.';
  setText('scenario-explain',SCENARIOS[state.scenario]+'. '+desc+' Each qualifying race is weighted equally; changing the scenario can change which races qualify.'+(s?' Updated provisional returns: '+s.result_collection_utc.slice(0,10)+'.':''));
}
function drawErrorChart(){
  const root=$('error-chart');root.replaceChildren();
  const eligibleRows=selectedRows().filter(r=>Number.isFinite(num(r.signed_error_pp)));
  if(!eligibleRows.length){appendText('p','No comparable races for this selection.',root);return;}
  // Histogram centred at zero. Bins 4 percentage points, clipping only by dynamic domain.
  const errors=eligibleRows.map(r=>num(r.signed_error_pp));
  const domain=Math.max(12,Math.ceil(Math.max(...errors.map(Math.abs))/4)*4);
  const binsCount=Math.ceil(domain/4)*2;
  const bins=Array.from({length:binsCount},(_,i)=>({start:-domain+4*i,count:0}));
  errors.forEach(v=>{let index=Math.floor((v+domain)/4);index=Math.max(0,Math.min(bins.length-1,index));bins[index].count++;});
  const W=740,H=285,left=47,right=15,top=16,bottom=48,plotW=W-left-right,plotH=H-top-bottom;
  const maxCount=Math.max(...bins.map(b=>b.count),1);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');
  svg.setAttribute('aria-label',`Histogram of ${errors.length} race polling errors: ${errors.filter(v=>v>0).length} positive and ${errors.filter(v=>v<0).length} negative`);
  const node=(tag,attrs,text)=>{let x=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs||{}))x.setAttribute(k,String(v));if(text!==undefined)x.textContent=text;svg.append(x);return x;};
  for(let i=0;i<=4;i++){const y=top+plotH*(1-i/4);node('line',{x1:left,y1:y,x2:W-right,y2:y,stroke:'#d6ded8','stroke-width':1});node('text',{x:left-8,y:y+4,'text-anchor':'end',fill:'currentColor','font-size':11},Math.round(maxCount*i/4));}
  const bw=plotW/bins.length;
  bins.forEach((b,i)=>{
    const h=plotH*b.count/maxCount;const x=left+i*bw,y=top+plotH-h;
    const bar=node('rect',{x:x+2,y,width:Math.max(1,bw-4),height:h,rx:2,fill:b.start>=0?'#34799a':'#b57465'});
    const tooltip=document.createElementNS('http://www.w3.org/2000/svg','title');
    tooltip.textContent=`${b.start} to ${b.start+4} pp: ${b.count} races`;
    bar.append(tooltip);
  });
  const zeroX=left+plotW/2;
  node('line',{x1:zeroX,y1:top,x2:zeroX,y2:top+plotH,stroke:'#213440','stroke-width':2,'stroke-dasharray':'4 3'});
  const ticks=[-domain,-domain/2,0,domain/2,domain];
  ticks.forEach(v=>node('text',{x:left+(v+domain)/(2*domain)*plotW,y:H-21,'text-anchor':'middle',fill:'currentColor','font-size':11},v===0?'0':(v>0?'+':'')+v));
  node('text',{x:left,y:H-4,'text-anchor':'start',fill:'currentColor','font-size':10},'Republican margin understated');
  node('text',{x:W-right,y:H-4,'text-anchor':'end',fill:'currentColor','font-size':10},'Democratic margin understated');
  root.append(svg);
  setText('error-chart-caption',errors.length+' qualifying races. Bins are 4 percentage points wide. Bars represent counts, not vote totals.');
}
function drawScenarioComparison(){
  const root=$('sensitivity-chart');if(!root)return;
  root.replaceChildren();
  if(!state.summary.length){appendText('p','Scenario summary unavailable. Consult the downloadable datasets.',root);return;}
  const max=Math.max(1,...state.summary.map(d=>Math.abs(Number(d.multi_mean_signed_error_pp)||0)));
  for(const d of state.summary){
    const label=SCENARIOS[d.scenario]||d.scenario;
    const line=document.createElement('div');line.className='sensitivity-line';
    if(d.scenario===state.scenario)line.classList.add('is-selected');
    const btn=document.createElement('button');btn.type='button';btn.className='sensitivity-choose';
    btn.textContent=label;btn.setAttribute('aria-label','Use '+label);
    btn.setAttribute('aria-pressed',d.scenario===state.scenario?'true':'false');
    btn.addEventListener('click',()=>{$('scenario').value=d.scenario;state.scenario=d.scenario;selectScenario();});
    const bar=document.createElement('span');bar.className='sensitivity-track';
    const fill=document.createElement('i');fill.className='sensitivity-fill';
    fill.style.width=((Math.abs(d.multi_mean_signed_error_pp)/max)*100)+'%';
    bar.append(fill);
    const value=appendText('strong',signedText(d.multi_mean_signed_error_pp),line,'sensitivity-value');
    const count=appendText('small',d.multi_pollster_races+' races',line,'sensitivity-count');
    line.prepend(btn,bar);root.append(line);
  }
  appendText('p','These averages have different denominators. Select a method to inspect its race-level records.',root,'accuracy-caption');
}
function drawChambers(){
  const root=$('chamber-chart');if(!root)return;
  root.replaceChildren();
  const rows=selectedRows().filter(r=>num(r.signed_error_pp)!==null);
  for(const [chamber,label] of [['house','House'],['senate','Senate']]){
    const errors=rows.filter(r=>r.chamber===chamber).map(r=>Number(r.signed_error_pp));
    const mean=errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null;
    const block=document.createElement('div');block.className='chamber-line';
    appendText('span',label,block);
    appendText('strong',signedText(mean),block,'chamber-value');
    appendText('small',errors.length+' comparable '+(errors.length===1?'race':'races'),block);
    const track=document.createElement('div');track.className='chamber-track';
    const baseline=document.createElement('i');baseline.className='chamber-zero';track.append(baseline);
    if(mean!==null){
      const filled=document.createElement('i');filled.className='chamber-bar';
      const width=Math.min(50,Math.abs(mean)/20*50);
      filled.style.width=width+'%';
      filled.style.left=mean<0?(50-width)+'%':'50%';
      filled.style.background=mean<0?'#b57465':'#34799a';
      track.append(filled);
    }
    block.append(track);root.append(block);
  }
  appendText('p','Equal-weight race averages by chamber. The horizontal guide represents −20 to +20 percentage points, with zero at the center.',root,'accuracy-caption');
}
function drawRaceComparison(row){
  const root=$('race-compare-chart');if(!root)return;
  root.replaceChildren();
  const poll=num(row.poll_average_d_minus_r_2party_pp);
  const result=num(row.result_d_minus_r_2party_pp);
  if(poll===null||result===null){appendText('p','This race has no directly comparable polling and election margins.',root);return;}
  const domain=Math.max(10,Math.ceil(Math.max(Math.abs(poll),Math.abs(result))/10)*10);
  const W=700,H=154,left=56,right=45,lo=left,hi=W-right;
  const x=v=>lo+(v+domain)/(2*domain)*(hi-lo);
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('role','img');svg.setAttribute('aria-label',`Polling margin ${signedText(poll)}, reported election margin ${signedText(result)}, difference ${signedText(result-poll)}`);
  const node=(tag,attrs,content)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(content!=null)el.textContent=content;svg.append(el);return el;};
  for(const v of [-domain,0,domain]){
    const pos=x(v);
    node('line',{x1:pos,x2:pos,y1:20,y2:113,stroke:v===0?'#172c35':'#b8c8bf','stroke-dasharray':v===0?'4 3':'2 4'},null);
    node('text',{x:pos,y:143,fill:'currentColor','text-anchor':'middle','font-size':11},(v>0?'+':'')+v);
  }
  node('line',{x1:x(poll),x2:x(result),y1:68,y2:68,stroke:'#778f98','stroke-width':4},null);
  for(const [v,color,label,y] of [[poll,'#315f77','POLL',48],[result,'#ba7352','RESULT',92]]){
    const dot=node('circle',{cx:x(v),cy:68,r:9,fill:color,stroke:'#fff','stroke-width':2},null);
    const t=document.createElementNS(ns,'title');t.textContent=label+': '+signedText(v);dot.append(t);
    node('text',{x:x(v),y:y,'text-anchor':'middle','font-size':11,fill:'currentColor'},label+' '+(v>0?'+':'')+fmt(v));
  }
  root.append(svg);
  appendText('p','Two-party Democratic-minus-Republican margin. Difference: '+signedText(result-poll)+'. Results are unofficial and may change.',root,'accuracy-caption');
}
function drawCoverage(){
  const root=$('coverage-chart');root.replaceChildren();
  const stages=['provisional_comparison','single_pollster_comparison','no_eligible_polls','result_not_comparable'];
  const counts=Object.fromEntries(stages.map(k=>[k,state.rows.filter(r=>r.status===k).length]));
  const total=state.rows.length||470;let bar=document.createElement('div');bar.className='coverage-stack';
  const palette={'provisional_comparison':'#2d799a','single_pollster_comparison':'#83b5c4','no_eligible_polls':'#c3cbc7','result_not_comparable':'#997e70'};
  for(const kind of stages){
    const seg=document.createElement('span');seg.style.width=(counts[kind]/total*100)+'%';seg.style.background=palette[kind];seg.title=labelStatus(kind)+': '+counts[kind]+' races';bar.append(seg);
  }
  root.append(bar);
  const list=document.createElement('dl');list.className='coverage-legend';
  for(const kind of stages){
    const row=document.createElement('div');row.className='coverage-row';
    const label=document.createElement('dt');const dot=document.createElement('span');dot.className='coverage-dot';dot.style.background=palette[kind];label.append(dot,document.createTextNode(labelStatus(kind)));
    const value=document.createElement('dd');value.textContent=counts[kind]+' / '+total;row.append(label,value);list.append(row);
  }
  root.append(list);
  setText('coverage-caption','Percentages use all '+total+' contests as the denominator. No polls is not zero polling error.');
}
function filtered(){
  const q=state.query.toLowerCase();
  const result=state.rows.filter(r=>(state.chamber==='all'||r.chamber===state.chamber)&&
    (state.evidence==='all'||r.status===state.evidence)&&
    (state.state==='all'||r.state===state.state)&&
    (!q||(r.race_id+' '+r.race_name+' '+r.pollster_names).toLowerCase().includes(q)));
  if(state.sort==='positive'||state.sort==='negative'){
    result.sort((a,b)=>{
      const aa=num(a.signed_error_pp),bb=num(b.signed_error_pp);
      if(aa===null)return 1;if(bb===null)return -1;
      return state.sort==='positive'?bb-aa:aa-bb;
    });
  }else if(state.sort==='polls'){
    result.sort((a,b)=>Number(b.polls_used)-Number(a.polls_used));
  }else result.sort((a,b)=>a.state.localeCompare(b.state)||a.race_id.localeCompare(b.race_id));
  return result;
}
function showRaceSources(row){
  const panel=$('race-sources');
  if(!panel)return;
  const heading=$('race-sources-heading'),body=$('race-sources-list');
  heading.textContent=(row.race_name||row.race_id)+' — polling evidence';
  drawRaceComparison(row);
  body.replaceChildren();
  const selected=state.audit.filter(a=>a.race_id===row.race_id&&a.reason==='candidate');
  if(!selected.length){
    appendText('p','No qualifying survey observations are available for this race under the selected methodology.',body);
  }else{
    appendText('p',selected.length+' selected survey questions. A survey can have multiple question variants; see the original sources and exclusion audit before interpreting independence.',body);
    const ul=document.createElement('ul');
    for(const obs of selected){
      const li=document.createElement('li');
      appendText('strong',obs.pollster+' · '+obs.end_date,li);
      appendText('span',' · D–R two-party margin: '+signedText(obs.margin),li);
      if(/^https:\/\//.test(obs.source_url||'')){
        const a=appendText('a','Original release',li);a.href=obs.source_url;a.target='_blank';a.rel='noopener noreferrer';
      }
      ul.append(li);
    }
    body.append(ul);
  }
  panel.hidden=false;
  panel.scrollIntoView({behavior:'auto',block:'nearest'});
}
/* Race-first exploratory UX: keyboard-friendly cards, deep links and survey drilldown. */
const raceHasPolls=r=>Number(r.polls_used)>0;
function viewableRaces(){
  let rows=filtered();
  if(racePreset==='polled')rows=rows.filter(raceHasPolls);
  if(racePreset==='largest')rows=rows.filter(r=>num(r.signed_error_pp)!==null).sort((a,b)=>Math.abs(Number(b.signed_error_pp))-Math.abs(Number(a.signed_error_pp)));
  if(racePreset==='closest')rows=rows.filter(r=>num(r.result_d_minus_r_2party_pp)!==null&&raceHasPolls(r)).sort((a,b)=>Math.abs(Number(a.result_d_minus_r_2party_pp))-Math.abs(Number(b.result_d_minus_r_2party_pp)));
  return rows;
}
function raceCard(row){
  const button=document.createElement('button');button.type='button';button.className='race-tile';
  button.dataset.raceId=row.race_id;button.setAttribute('aria-label','Explore '+row.race_name+' polling and election results');
  button.addEventListener('click',()=>openRace(row.race_id,button));
  const top=document.createElement('div');top.className='race-tile-top';
  appendText('span',(row.chamber==='senate'?'SENATE':'HOUSE')+' / '+row.state,top,'race-tile-overline');
  appendText('span',Number(row.polls_used)>0?row.polls_used+' poll'+(Number(row.polls_used)===1?'':'s'):'NO POLLS',top,'race-tile-count');
  button.append(top);
  appendText('h4',row.race_name,button,'race-tile-name');
  const graph=document.createElement('div');graph.className='race-tile-graphic';
  const p=num(row.poll_average_d_minus_r_2party_pp),e=num(row.result_d_minus_r_2party_pp);
  if(p!==null&&e!==null){
    const max=Math.max(15,Math.ceil(Math.max(Math.abs(p),Math.abs(e))/10)*10);
    const track=document.createElement('div');track.className='race-tile-track';
    const zero=document.createElement('span');zero.className='race-tile-zero';track.append(zero);
    const line=document.createElement('span');line.className='race-tile-connector';
    line.style.left=(50+Math.min(p,e)/(2*max)*100)+'%';
    line.style.width=(Math.abs(p-e)/(2*max)*100)+'%';track.append(line);
    for(const [value,kind] of [[p,'poll'],[e,'result']]){
      const dot=document.createElement('span');dot.className='race-tile-dot '+kind;
      dot.style.left=(50+value/(2*max)*100)+'%';dot.title=kind+': '+signedText(value);track.append(dot);
    }
    graph.append(track);
    const leg=document.createElement('div');leg.className='race-tile-legend';
    appendText('span','● Poll '+signedText(p),leg);
    appendText('span','● Result '+signedText(e),leg);
    graph.append(leg);
  }else{
    appendText('p','No comparable poll-versus-result graphic for this race.',graph,'race-tile-empty');
  }
  button.append(graph);
  const bottom=document.createElement('div');bottom.className='race-tile-bottom';
  appendText('span',row.status==='provisional_comparison'?'2+ pollsters':row.status==='single_pollster_comparison'?'Exploratory · one pollster':labelStatus(row.status),bottom);
  const delta=num(row.signed_error_pp);
  appendText('strong',delta===null?'Explore →':signedText(delta)+' →',bottom);
  button.append(bottom);
  return button;
}
function renderRaceCards(){
  const root=$('race-card-grid');if(!root)return;
  const rows=viewableRaces();
  root.replaceChildren();
  for(const row of rows.slice(0,raceVisible))root.append(raceCard(row));
  if(!rows.length)appendText('p','No races match this selection. Try another filter or choose All 470 races.',root,'race-empty-state');
  setText('race-card-count',rows.length+' matching '+(rows.length===1?'race':'races'));
  $('show-more-races').hidden=rows.length<=raceVisible;
  for(const btn of document.querySelectorAll('[data-race-preset]')){
    const on=btn.dataset.racePreset===racePreset;
    btn.classList.toggle('is-active',on);btn.setAttribute('aria-pressed',String(on));
  }
}
const safeSrc=url=>/^https:\/\//.test(url||'');
function eligibleRaceRoute(){
  const filteredRows=viewableRaces();
  const has=filteredRows.some(r=>r.race_id===activeRaceId);
  return has?filteredRows:state.rows.filter(r=>raceHasPolls(r)).sort((a,b)=>a.race_id.localeCompare(b.race_id));
}
function updateRaceUrl(raceId){
  const url=new URL(location.href);
  if(raceId)url.searchParams.set('race',raceId);
  else url.searchParams.delete('race');
  url.searchParams.set('scenario',state.scenario);
  history.replaceState({},'',url.pathname+url.search+url.hash);
}
function openRace(raceId,trigger=null,fromUrl=false){
  const row=state.rows.find(x=>x.race_id===raceId);
  if(!row)return false;
  activeRaceId=raceId;detailShowAll=false;activePollId=null;
  if(trigger)lastRaceTrigger=trigger;
  renderRaceDialog();
  const dialog=$('race-detail-dialog');
  if(!dialog.open)dialog.showModal();
  if(!fromUrl)updateRaceUrl(raceId);
  return true;
}
function closeRace(){
  const dialog=$('race-detail-dialog');
  if(dialog.open)dialog.close();
}
function raceSurveyRecords(row){
  return state.audit.filter(a=>a.race_id===row.race_id).sort((a,b)=>String(b.end_date).localeCompare(String(a.end_date))||String(a.pollster).localeCompare(String(b.pollster)));
}
function raceSurveyList(row){
  const all=raceSurveyRecords(row);
  return detailShowAll?all:all.filter(r=>r.reason==='candidate');
}
function renderPollInspector(row,entry){
  const host=$('detail-poll-inspector');host.replaceChildren();
  if(!entry){appendText('p','Select a poll to see its source and inclusion decision.',host);return;}
  const top=document.createElement('div');top.className='detail-inspector-head';
  appendText('h4',entry.pollster||'Unspecified organization',top);
  const included=entry.reason==='candidate';
  appendText('span',included?'Used in selected average':'Not used · '+(entry.reason||'not eligible').replaceAll('_',' '),top,included?'detail-used':'detail-excluded');
  host.append(top);
  const grid=document.createElement('div');grid.className='detail-inspector-grid';
  const fields=[['FIELDWORK END',entry.end_date||'Not reported'],['QUESTION POPULATION',(entry.population||'Unspecified').toUpperCase()],['TWO-PARTY MARGIN',signedText(entry.margin)],['INCLUSION',included?'Included':'Excluded']];
  for(const [key,value] of fields){const x=document.createElement('div');appendText('small',key,x);appendText('strong',value,x);grid.append(x);}
  host.append(grid);
  const foot=document.createElement('p');foot.className='detail-note';foot.textContent='A poll question is not necessarily an independent survey. The source may use different fieldwork dates, weighting or candidate-choice conventions.';host.append(foot);
  if(safeSrc(entry.source_url)){const link=appendText('a','Open original polling source ↗',host,'detail-original-link');link.href=entry.source_url;link.target='_blank';link.rel='noopener noreferrer';}
}
function renderPollList(row){
  const root=$('detail-poll-list');root.replaceChildren();
  const entries=raceSurveyList(row);
  setText('detail-poll-count',entries.filter(x=>x.reason==='candidate').length+' used / '+raceSurveyRecords(row).length+' archived questions');
  for(const id of ['detail-only-used','detail-all-polls']){
    const on=(id==='detail-all-polls')===detailShowAll;
    $(id).classList.toggle('is-active',on);$(id).setAttribute('aria-pressed',String(on));
  }
  if(!entries.length){
    appendText('p',detailShowAll?'No polling-question records were collected for this race.':'No qualifying polling questions under this method. Select All archived questions to inspect exclusions.',root,'detail-empty');
    renderPollInspector(row,null);return;
  }
  if(!activePollId||!entries.some(x=>x.record_id===activePollId))activePollId=(entries.find(x=>x.reason==='candidate')||entries[0]).record_id;
  for(const entry of entries){
    const button=document.createElement('button');button.type='button';button.className='detail-poll-row';
    button.classList.toggle('is-selected',entry.record_id===activePollId);
    button.setAttribute('aria-pressed',String(entry.record_id===activePollId));
    button.setAttribute('aria-label',(entry.pollster||'Poll')+', '+(entry.end_date||'no date')+', '+(entry.reason==='candidate'?'included':'excluded')+'. Inspect details');
    appendText('span',entry.end_date||'Date unavailable',button,'detail-date');
    appendText('strong',entry.pollster||'Unknown pollster',button,'detail-pollster');
    appendText('span',entry.reason==='candidate'?signedText(entry.margin):'Not used',button,entry.reason==='candidate'?'detail-margin':'detail-margin muted');
    const icon=appendText('span','→',button,'detail-arrow');icon.setAttribute('aria-hidden','true');
    button.addEventListener('click',()=>{activePollId=entry.record_id;renderPollList(row);});
    root.append(button);
  }
  renderPollInspector(row,entries.find(x=>x.record_id===activePollId)||entries[0]);
}
function renderMarginComparison(row){
  const root=$('detail-main-chart');root.replaceChildren();
  const poll=num(row.poll_average_d_minus_r_2party_pp),result=num(row.result_d_minus_r_2party_pp);
  if(poll===null||result===null){
    appendText('p',poll===null?'No eligible polls are available to calculate an average for this race.':'The election result cannot be directly compared under the current candidate-matching rule.',root,'detail-no-chart');return;
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 760 190');svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Poll margin '+signedText(poll)+', election margin '+signedText(result)+', signed error '+signedText(result-poll));
  const d=Math.max(10,Math.ceil(Math.max(Math.abs(poll),Math.abs(result))/10)*10), x=v=>60+(v+d)/(2*d)*640;
  const ns='http://www.w3.org/2000/svg';
  const node=(type,attrs,text)=>{const el=document.createElementNS(ns,type);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text!=null)el.textContent=text;svg.append(el);return el;};
  node('line',{x1:60,y1:94,x2:700,y2:94,stroke:'#cdd8db','stroke-width':2});
  for(const v of [-d,0,d]){const xx=x(v);node('line',{x1:xx,y1:34,x2:xx,y2:143,stroke:v===0?'#29475a':'#d8e1e5','stroke-dasharray':v===0?'5 4':'3 5'});node('text',{x:xx,y:166,'text-anchor':'middle',fill:'currentColor','font-size':13},(v>0?'+':'')+v+' pp');}
  node('line',{x1:x(poll),y1:94,x2:x(result),y2:94,stroke:'#879daa','stroke-width':8,'stroke-linecap':'round'});
  for(const [v,y,color,label] of [[poll,59,'#267b9f','POLL AVG'],[result,133,'#c97d52','RESULT']]){
    node('circle',{cx:x(v),cy:94,r:11,fill:color,stroke:'#fff','stroke-width':3});
    node('text',{x:x(v),y,'text-anchor':'middle',fill:'currentColor','font-size':13,'font-weight':700},label+' '+signedText(v));
  }
  root.append(svg);
}
function renderRaceDialog(){
  const row=state.rows.find(r=>r.race_id===activeRaceId);if(!row)return;
  setText('detail-eyebrow','2026 / '+(row.chamber==='house'?'U.S. HOUSE':'U.S. SENATE')+' / '+row.state);
  setText('detail-title',row.race_name);
  setText('detail-subtitle','Pre-election surveys vs. provisional reported election results');
  setText('detail-confidence',labelStatus(row.status));
  const list=eligibleRaceRoute(),at=list.findIndex(x=>x.race_id===activeRaceId);
  setText('detail-position',at<0?'Selected race':(at+1)+' of '+list.length+' races');
  $('detail-previous').disabled=at<=0;
  $('detail-next').disabled=at<0||at===list.length-1;
  const root=$('detail-summary');root.replaceChildren();
  for(const [label,value] of [['POLL AVERAGE',signedText(row.poll_average_d_minus_r_2party_pp)],['REPORTED RESULT',signedText(row.result_d_minus_r_2party_pp)],['SIGNED ERROR',signedText(row.signed_error_pp)],['POLLSTERS',String(row.pollsters_used||0)]]){
    const block=document.createElement('div');appendText('span',label,block);appendText('strong',value,block);root.append(block);
  }
  renderMarginComparison(row);
  setText('detail-visual-note','Margins are Democratic minus Republican (two-party normalized). Positive error means Democratic performance exceeded the published average. Returns are unofficial; this is not an uncertainty interval.');
  renderPollList(row);
  const e=num(row.signed_error_pp);
  const text=e===null?'This race does not have a comparable error under the selected method. Missing polling should not be treated as zero error.':e>0?'In this race, the reported Democratic margin exceeded the pre-election polling average by '+fmt(e,2)+' percentage points. That does not establish why the polls missed.':e<0?'In this race, the reported Republican margin exceeded what the polling average implied by '+fmt(Math.abs(e),2)+' percentage points. That does not establish a cause.':'The currently calculated margins are equal; this does not establish that individual surveys were perfectly accurate.';
  setText('detail-takeaway',text+' '+(row.status==='single_pollster_comparison'?'Only one distinct polling organization qualifies, so this comparison is exploratory.':''));
  const links=$('detail-source-links');links.replaceChildren();
  if(safeSrc(row.election_source_url)){const a=appendText('a','Reported vote totals ↗',links);a.href=row.election_source_url;a.target='_blank';a.rel='noopener noreferrer';}
  const a=appendText('a','How errors are calculated →',links);a.href='./methods.html';
  const sourceLink=appendText('a','Open original polling history →',links);sourceLink.href='./index.html?race='+encodeURIComponent(row.race_id)+'#race-trends';
}
function navigateRace(step){
  const list=eligibleRaceRoute(),at=list.findIndex(r=>r.race_id===activeRaceId);
  if(at<0||at+step<0||at+step>=list.length)return;
  activeRaceId=list[at+step].race_id;detailShowAll=false;activePollId=null;
  renderRaceDialog();updateRaceUrl(activeRaceId);
}
function renderTable(){
  const data=filtered(),pages=Math.max(1,Math.ceil(data.length/PAGE));
  state.page=Math.min(state.page,pages-1);
  setText('table-count',data.length+' of 470 contests');
  setText('page-state',`Page ${state.page+1} of ${pages}`);
  $('prev').disabled=state.page===0;$('next').disabled=state.page>=pages-1;
  const body=$('accuracy-rows');body.replaceChildren();
  if(!data.length){let tr=document.createElement('tr');let td=document.createElement('td');td.colSpan=7;td.textContent='No races match these filters. Try another chamber, state or evidence level.';tr.append(td);body.append(tr);return;}
  for(const r of data.slice(state.page*PAGE,(state.page+1)*PAGE)){
    const tr=document.createElement('tr');
    let a=document.createElement('td');const raceButton=appendText('button',r.race_name||r.race_id,a,'race-table-open');raceButton.type='button';raceButton.addEventListener('click',()=>openRace(r.race_id,raceButton));appendText('small',r.race_id,a,'accuracy-small');tr.append(a);
    let status=document.createElement('td');status.textContent=labelStatus(r.status);tr.append(status);
    for(const key of ['poll_average_d_minus_r_2party_pp','result_d_minus_r_2party_pp','signed_error_pp']){
      const td=document.createElement('td');td.className='accuracy-num';td.textContent=signedText(r[key]);if(key==='signed_error_pp'&&r[key]!=='')td.classList.add(Number(r[key])>=0?'error-pos':'error-neg');tr.append(td);
    }
    a=document.createElement('td');a.textContent=r.pollsters_used||'0';tr.append(a);
    a=document.createElement('td');
    const raw=r.election_source_url;
    if(/^https:\/\//.test(raw||'')){const x=appendText('a','Result',a);x.href=raw;x.target='_blank';x.rel='noopener noreferrer';}
    if(r.source_poll_ids){
      const btn=document.createElement('button');
      btn.type='button';btn.className='accuracy-source-button';btn.textContent='Review polls';btn.addEventListener('click',()=>showRaceSources(r));a.append(btn);
      const ids=r.source_poll_ids.split(';').filter(Boolean).length;
      appendText('small',ids+' survey IDs',a,'accuracy-small');
      const deep=appendText('a','Polling history',a);deep.href='./index.html?race='+encodeURIComponent(r.race_id)+'#race-trends';
    }
    tr.append(a);body.append(tr);
  }
}
function render(){
  renderKpis();drawErrorChart();drawCoverage();drawScenarioComparison();drawChambers();renderTable();renderRaceCards();
}
async function selectScenario(){
  $('scenario').disabled=true;setText('accuracy-status','Loading selected comparison…');
  $('race-sources').hidden=true;
  closeRace();
  try{
    const response=await fetch(ROOT+state.scenario+'/'+RESULT_FILE);
    if(!response.ok)throw Error('HTTP '+response.status);
    const rows=parseCSV(await response.text());
    const auditResponse=await fetch(ROOT+state.scenario+'/2026_poll_selection_audit_v2.csv');
    state.audit=auditResponse.ok?parseCSV(await auditResponse.text()):[];
    if(rows.length!==470||new Set(rows.map(r=>r.race_id)).size!==470)throw Error('Invalid race coverage');
    state.rows=rows;state.page=0;
    $('download-csv').href=ROOT+state.scenario+'/'+RESULT_FILE;
    const states=[...new Set(rows.map(r=>r.state))].sort();
    const s=$('state'),last=s.value;s.replaceChildren();
    let option=document.createElement('option');option.value='all';option.textContent='All states';s.append(option);
    for(const stateCode of states){option=document.createElement('option');option.value=stateCode;option.textContent=stateCode;s.append(option);}
    if(states.includes(last))s.value=last;else {s.value='all';state.state='all';}
    render();
    const requested=new URL(location.href).searchParams.get('race');
    if(requested&&state.rows.some(r=>r.race_id===requested))openRace(requested,null,true);
    setText('accuracy-status','Data loaded. Source: versioned congressional polling analysis; results remain unofficial.');
  }catch(err){
    state.rows=[];for(const id of ['error-chart','coverage-chart'])$(id).replaceChildren();
    setText('accuracy-status','Could not load the versioned analysis ('+err.message+'). No substitute data will be shown.');
    const body=$('accuracy-rows');body.replaceChildren();let tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='Analysis unavailable; please reload or use the downloadable dataset link.';tr.append(td);body.append(tr);
  }finally{$('scenario').disabled=false;}
}
async function boot(){
  try{
    const r=await fetch('./analysis/2026_sensitivity_summary.json');
    if(r.ok)state.summary=await r.json();
  }catch(_){}
  for(const [id,k] of [['tier','tier'],['chamber','chamber'],['evidence','evidence'],['state','state'],['sort','sort']]){
    $(id).addEventListener('change',()=>{
      state[k]=$(id).value;state.page=0;raceVisible=9;render();
    });
  }
  $('search-race').addEventListener('input',()=>{state.query=$('search-race').value;state.page=0;raceVisible=9;renderTable();renderRaceCards();});
  $('close-race-sources').addEventListener('click',()=>{$('race-sources').hidden=true;$('races-head').focus?.();});
  $('prev').addEventListener('click',()=>{state.page=Math.max(0,state.page-1);renderTable();});
  $('next').addEventListener('click',()=>{state.page+=1;renderTable();});
  $('scenario').addEventListener('change',()=>{state.scenario=$('scenario').value;selectScenario();});
  for(const chip of document.querySelectorAll('[data-race-preset]')){
    chip.addEventListener('click',()=>{racePreset=chip.dataset.racePreset;raceVisible=9;renderRaceCards();});
  }
  $('show-more-races').addEventListener('click',()=>{raceVisible+=9;renderRaceCards();});
  $('detail-close').addEventListener('click',closeRace);
  $('detail-previous').addEventListener('click',()=>navigateRace(-1));
  $('detail-next').addEventListener('click',()=>navigateRace(1));
  $('detail-only-used').addEventListener('click',()=>{detailShowAll=false;activePollId=null;renderPollList(state.rows.find(r=>r.race_id===activeRaceId));});
  $('detail-all-polls').addEventListener('click',()=>{detailShowAll=true;activePollId=null;renderPollList(state.rows.find(r=>r.race_id===activeRaceId));});
  $('race-detail-dialog').addEventListener('close',()=>{
    activeRaceId=null;updateRaceUrl(null);
    if(lastRaceTrigger?.isConnected)lastRaceTrigger.focus({preventScroll:true});
  });
  $('race-detail-dialog').addEventListener('click',e=>{if(e.target===$('race-detail-dialog'))closeRace();});
  window.addEventListener('popstate',()=>{
    const requested=new URL(location.href).searchParams.get('race');
    if(requested&&state.rows.some(r=>r.race_id===requested))openRace(requested,null,true);
    else closeRace();
  });
  const params=new URL(location.href).searchParams;
  if(SCENARIOS[params.get('scenario')]){state.scenario=params.get('scenario');$('scenario').value=state.scenario;}
  await selectScenario();
}
boot();
