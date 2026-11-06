import {seatCalls, selectResults} from './results-model.js';

const root = document.querySelector('#election-results');
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const link = (text, href) => { const a = el('a', text); a.href = href; return a; };
const fmt = n => n.toLocaleString('en-US');
const date = s => new Date(s).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'}) + ' UTC';
async function read(path) { const response = await fetch(path); if (!response.ok) throw new Error(path); return response.json(); }
root.innerHTML = `<div class="wrap results-wrap">
  <p class="section-kicker">AFTER THE VOTE / NOVEMBER 3, 2026</p><h2>Returns &amp; the electorate</h2>
  <p class="results-deck">Follow the reported count, then explore what voter surveys tell us about the people behind it.</p>
  <p class="results-notice"><strong>UNOFFICIAL RESULTS · CERTIFICATION NOT VERIFIED.</strong> These are a dated snapshot of reported votes and civicAPI’s race calls. Counting, recounts and certification can change them. A race call or 100% reporting is not a certified final result.</p>
  <div id="returns-content"><p role="status">Loading reported returns…</p></div>
  <section class="exit-section" aria-labelledby="exit-heading"><p class="section-kicker">EXIT POLLS / VOTER SURVEYS</p><h3 id="exit-heading">Who voted, and how?</h3>
  <p>Demographic breakdowns are survey estimates of the <strong>national House vote</strong>, not certified vote totals. They do not describe the selected district, state or Senate race. The SSRS voter poll combines survey methods; it is not solely an Election Day exit poll.</p>
  <div id="exit-content"><p role="status">Loading voter-poll estimates…</p></div></section>
</div>`;

async function returnsView() {
  const box = root.querySelector('#returns-content');
  try {
    const [data, baseline] = await Promise.all([read('./data/results.json'), read('./data/congress-baseline.json')]);
    if (data.status !== 'unofficial' || data.races.length !== 470) throw new Error('Unsupported results');
    box.replaceChildren();
    box.append(el('p', `Snapshot collected ${date(data.collected_at)}. Source updated: House ${date(data.source_updated_at.house)}; Senate ${date(data.source_updated_at.senate)}. This page does not update automatically.`, 'results-small'));
    const cards = el('div', undefined, 'results-cards');
    for (const chamber of ['house', 'senate']) {
      const counts = seatCalls(data.races, chamber, baseline.senate_holdovers);
      const card = el('article', undefined, 'results-card');
      card.append(el('h3', chamber === 'house' ? 'House · 435 seats' : 'Senate · 100 seats'));
      const bar = el('div', undefined, 'results-seatbar'); bar.setAttribute('aria-hidden', 'true');
      for (const [party, count] of Object.entries(counts)) { const part = el('span', undefined, `result-${party}`); part.style.flexGrow = count; bar.append(part); }
      const track = el('div', undefined, 'results-seat-track');
      const majority = chamber === 'house' ? 218 : 51;
      const total = chamber === 'house' ? 435 : 100;
      const marker = el('span', `${majority} for majority`, 'majority-marker');
      marker.style.left = `${majority / total * 100}%`;
      track.append(bar, marker);
      card.append(track, el('p', `D ${counts.D} · R ${counts.R} · I ${counts.I}${counts.other ? ' · Other ' + counts.other : ''} · Uncalled ${counts.pending}`, 'results-tally'),
        el('p', chamber === 'senate' ? 'Publisher calls plus 65 holdover seats (32 D, 31 R, 2 I). Independents are shown separately; the two holdovers caucus with Democrats. Majority: 51 seats.' : 'Publisher calls, not certified seat awards. Majority: 218 seats.', 'results-small'));
      cards.append(card);
    }
    box.append(cards);
    const controls = el('div', undefined, 'results-controls');
    function select(id, label, choices) { const wrap = el('label', label); const s = el('select'); s.id = id; for (const [value, text] of choices) { const o = el('option', text); o.value = value; s.append(o); } wrap.append(s); controls.append(wrap); return s; }
    const chamber = select('results-chamber', 'Chamber', [['house', 'House'], ['senate', 'Senate']]);
    const state = select('results-state', 'State', [['', 'All states'], ...[...new Set(data.races.map(r => r.state))].sort().map(s => [s, s])]);
    const status = select('results-status', 'Race status', [['all', 'All races'], ['pending', 'No publisher call']]);
    const race = select('results-race', 'Race', []);
    const count = el('p'); count.setAttribute('role', 'status');
    const detail = el('div', undefined, 'results-detail');
    box.append(controls, count, detail);
    const provenance = el('p', undefined, 'results-small');
    provenance.append('Returns: ', link('civicAPI', 'https://civicapi.org/'), ' · ', link('Attribution and reuse terms', data.license_url), ' · ', link('Download results JSON', './data/results.json'), ' · ', link('Holdover sources', './data/congress-baseline.json'));
    box.append(provenance);
    function showRace() {
      detail.replaceChildren();
      const selected = data.races.find(r => r.id === race.value);
      if (!selected) { detail.append(el('p', 'No races match these filters. Choose all races or another state.')); return; }
      const winner = selected.candidates.find(c => c.source_called);
      detail.append(el('h3', `${selected.name}${selected.chamber === 'senate' ? ' · Senate' : ''}${selected.id.endsWith('-S') ? ' · Special election' : ''}`),
        el('p', `${selected.reporting_percent}% reporting, as supplied by civicAPI. ${winner ? `Publisher call: ${winner.name} (${winner.party}).` : 'No publisher call.'} Certification: not verified.`));
      const scroll = el('div', undefined, 'results-scroll'); scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Reported candidate vote totals');
      const table = el('table'); table.append(el('caption', 'Reported votes · unofficial. Percentages use the publisher’s denominator.'));
      const head = el('thead'); const hr = el('tr'); for (const text of ['Candidate', 'Party', 'Votes', 'Vote share']) { const th = el('th', text); th.scope = 'col'; hr.append(th); } head.append(hr); table.append(head);
      const body = el('tbody');
      for (const c of [...selected.candidates].sort((a, b) => b.votes - a.votes)) { const row = el('tr'); const th = el('th', c.name); th.scope = 'row'; const share = el('td');
        const shareValue = el('span', `${c.percent}%`, 'vote-share-value');
        const track = el('div', undefined, 'vote-share-track'); track.setAttribute('aria-hidden', 'true');
        const fill = el('span', undefined, c.party === 'Democratic' ? 'result-D' : c.party === 'Republican' ? 'result-R' : 'result-other');
        fill.style.width = `${Math.max(0, Math.min(100, c.percent))}%`; track.append(fill); share.append(shareValue, track);
        row.append(th, el('td', c.party), el('td', fmt(c.votes)), share); body.append(row); }
      table.append(body); scroll.append(table);
      detail.append(scroll, link('View source race record', selected.source_url), document.createTextNode(' · '), link('View pre-election polling history', `./index.html?race=${encodeURIComponent(selected.id)}#race-trends`));
    }
    function update() {
      const previous = race.value; const matches = selectResults(data.races, chamber.value, state.value, status.value);
      race.replaceChildren(); for (const r of matches) { const o = el('option', r.name + (r.id.endsWith('-S') ? ' (special)' : '')); o.value = r.id; race.append(o); }
      if (matches.some(r => r.id === previous)) race.value = previous;
      race.disabled = !matches.length; count.textContent = `${matches.length} races match. Select a race to inspect every candidate’s reported total.`; showRace();
    }
    for (const s of [chamber, state, status]) s.addEventListener('change', update);
    race.addEventListener('change', showRace);
    const query = new URLSearchParams(location.search).get('race');
    const initial = data.races.find(r => r.id === query);
    if (initial) { chamber.value = initial.chamber; state.value = initial.state; }
    update(); if (initial) { race.value = initial.id; showRace(); }
  } catch (error) { box.replaceChildren(el('p', 'Results could not be loaded. No substitute totals are shown. Please reload or consult civicAPI.')); }
}

async function exitView() {
  const box = root.querySelector('#exit-content');
  try {
    const data = await read('./data/exit-polls.json');
    if (data.scope !== 'national_house') throw new Error('Unsupported demographic scope');
    box.replaceChildren();
    const label = el('label', 'Break down the national electorate by'); const select = el('select'); select.id = 'results-demographic';
    for (const group of [...new Set(data.rows.map(r => r.group))]) select.append(el('option', group));
    label.append(select); box.append(label);
    const chart = el('div', undefined, 'demographic-chart');
    const tableWrap = el('div', undefined, 'results-scroll'); tableWrap.tabIndex = 0; tableWrap.setAttribute('role', 'region'); tableWrap.setAttribute('aria-label', 'Exact demographic survey estimates');
    box.append(el('p', 'Blue: Democratic vote share · Red: Republican vote share. Bars use a common 0–100% scale; unfilled space includes all remaining responses and rounding.', 'results-small'), chart, tableWrap);
    function draw() {
      chart.replaceChildren(); tableWrap.replaceChildren();
      const table = el('table'); table.append(el('caption', `${select.value} · national House voter-poll estimates. Shares may not sum to 100% because of rounding.`));
      const head = el('thead'); const hr = el('tr'); for (const title of ['Group', 'Electorate share', 'Democratic', 'Republican']) { const th = el('th', title); th.scope = 'col'; hr.append(th); } head.append(hr); table.append(head);
      const body = el('tbody');
      for (const r of data.rows.filter(r => r.group === select.value)) {
        const row = el('div', undefined, 'demographic-row'); row.append(el('strong', r.label));
        if (r.dem !== null) {
          const bar = el('div', undefined, 'demographic-bar'); bar.setAttribute('aria-hidden', 'true');
          for (const [party, value] of [['D', r.dem], ['R', r.rep]]) { const part = el('span', `${party} ${value}%`, `result-${party}`); part.style.width = value + '%'; bar.append(part); }
          row.append(bar);
        } else row.append(el('span', 'Withheld · source disagreement'));
        chart.append(row);
        const tr = el('tr'); const th = el('th', r.label); th.scope = 'row'; tr.append(th, el('td', `${r.electorate_share}%`), el('td', r.dem === null ? 'Withheld' : r.dem + '%'), el('td', r.rep === null ? 'Withheld' : r.rep + '%')); body.append(tr);
      }
      table.append(body); tableWrap.append(table);
    }
    select.addEventListener('change', draw); draw();
    box.append(el('p', 'Age 45–64 is withheld: the licensed compilation reports Republican 46%, while NBC reports 47%. We have not reconciled or silently corrected these figures. Group sample sizes and uncertainty intervals are unavailable; small differences should not be overinterpreted.', 'results-small'));
    box.append(el('p', `${data.fieldwork_note} Collected ${date(data.collected_at)}. Survey estimates may be revised. No local demographic breakdowns are available in this dataset.`, 'results-small'));
    const sources = el('p', undefined, 'results-small');
    sources.append('Adapted from ', link('Wikipedia contributors (dated revision)', data.source_url), ', citing ', link('NBC News / SSRS', data.original_source_url), '. Selected and relabeled tables; one conflicting row withheld. Dataset licensed ', link(data.license, data.license_url), '. · ', link('Survey methodology', data.method_url), ' · ', link('Download demographic JSON', './data/exit-polls.json'));
    box.append(sources);
  } catch (error) { box.replaceChildren(el('p', 'Voter-poll estimates could not be loaded. No demographic figures have been substituted.')); }
}
returnsView();
exitView();
