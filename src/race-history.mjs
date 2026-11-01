export function matchupKey(p) {
  return JSON.stringify([p.answers.filter(a=>a.party!=='NONE').map(a=>[a.id,a.party]).sort((a,b)=>a[0].localeCompare(b[0])),p.round]);
}
export function matchups(polls) {
  const groups=new Map();
  for(const p of polls){const key=matchupKey(p);if(!groups.has(key))groups.set(key,{key,answers:p.answers.filter(a=>a.party!=='NONE'),round:p.round,count:0,latest:p.end_date});const g=groups.get(key);g.count++;if(p.end_date>g.latest)g.latest=p.end_date;}
  return [...groups.values()].sort((a,b)=>b.latest.localeCompare(a.latest)||b.count-a.count||a.key.localeCompare(b.key));
}
export function filterHistory(polls,{race,matchup,population='all',from='',to='',pollster=''}){
  return polls.filter(p=>p.race===race&&matchupKey(p)===matchup&&(!from||p.end_date>=from)&&(!to||p.end_date<=to)&&(population==='all'||p.population===population)&&p.pollster.toLowerCase().includes(pollster.trim().toLowerCase()))
    .sort((a,b)=>a.end_date.localeCompare(b.end_date)||a.id.localeCompare(b.id));
}
export function roundLabel(round){return `${round[0]?`RCV round ${round[0]}`:'No RCV round reported'}${round[2]==='TRUE'?' · final':''}${round[1]==='TRUE'?' · reallocated':''}`;}
