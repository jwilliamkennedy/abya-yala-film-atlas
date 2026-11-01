'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().replace(/[’‘ʻʼ`]/g,"'");
const safeURL = (value) => { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const filmIcon = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="2" y="3" width="16" height="14" rx="1"/><path d="M5 3v14M15 3v14M2 7h3m-3 6h3m10-6h3m-3 6h3"/></svg>';
const state = {region:'all', country:'all', query:'', scope:'map', sort:'name', view:'places'};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let archive, countryByCode, features, coastlines, projection, geoPath, svg, mapLayer, markersLayer, zoom;
let transform, width = 900, height = 700, resizeTimer, announcementTimer;
let filtered = [], initialised = false;
const featuredCountries = new Set(['CAN','USA','MEX','BRA','ARG','PER','COL','VEN']);

function statusLabel(record) {
  return record.status === 'Map Ready' ? ['Map selection','map-ready'] :
    record.status === 'Verification Needed' ? ['Verification needed','review'] : ['Candidate','candidate'];
}
function recordMatches(record, {ignoreCountry=false}={}) {
  if (state.scope === 'map' && record.status !== 'Map Ready') return false;
  if (state.scope === 'review' && record.status !== 'Verification Needed') return false;
  if (state.scope === 'candidate' && record.status !== 'Candidate') return false;
  if (state.region !== 'all' && countryByCode.get(record.country)?.region !== state.region) return false;
  if (!ignoreCountry && state.country !== 'all' && record.country !== state.country) return false;
  return normalize(state.query).trim().split(/\s+/).filter(Boolean).every(term => record.searchText.includes(term));
}
function currentRecords() {
  return archive.records.filter(r => recordMatches(r)).sort((a,b) => {
    if(state.sort==='films' && a.films.length !== b.films.length) return b.films.length-a.films.length;
    if(state.sort==='country' && a.countryName !== b.countryName) return a.countryName.localeCompare(b.countryName);
    return a.name.localeCompare(b.name, undefined, {sensitivity:'base'});
  });
}
function updateURL() {
  const url = new URL(location.href);
  const keyMap = {region:'region',country:'country',query:'q',scope:'scope',sort:'sort'};
  for(const [key,param] of Object.entries(keyMap)) {
    if(state[key] === ({region:'all',country:'all',query:'',scope:'map',sort:'name'})[key]) url.searchParams.delete(param);
    else url.searchParams.set(param,state[key]);
  }
  history.replaceState(null,'',url);
}
function readURL() {
  const params = new URLSearchParams(location.search);
  const regions = new Set(archive.countries.map(c=>c.region));
  if(regions.has(params.get('region'))) state.region=params.get('region');
  if(countryByCode.has(params.get('country'))) {
    state.country=params.get('country');
    if(state.region!=='all' && countryByCode.get(state.country).region!==state.region) state.region='all';
  }
  if(['map','all','review','candidate'].includes(params.get('scope')))state.scope=params.get('scope');
  if(['name','films','country'].includes(params.get('sort')))state.sort=params.get('sort');
  state.query=(params.get('q')||'').slice(0,300);
  if(['places','people','films','names'].includes(params.get('view')))state.view=params.get('view');
}
function updateControls() {
  $$('.region-control button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.region===state.region)));
  $('#country-select').innerHTML = '<option value="all">All country entry points</option>'+archive.countries
    .filter(c=>state.region==='all'||c.region===state.region)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(c=>`<option value="${c.code}">${escapeHTML(c.name)}</option>`).join('');
  $('#country-select').value=state.country;
  $('#scope-select').value=state.scope;
  $('#sort-select').value=state.sort;
  $('#search').value=state.query;
  $('#clear-filters').hidden=state.region==='all'&&state.country==='all'&&!state.query&&state.scope==='map';
}
function updateView({focusMap=false,scroll=false}={}) {
  if(state.view==='places'){document.body.dataset.browse='places';if(initialised)AtlasPlaces.renderView();return;}
  if(state.view==='names'){document.body.dataset.browse='names';$$('.view-control button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));if(initialised)AtlasNames.renderView();return;}
  document.body.dataset.browse=state.view;
  if(initialised)AtlasNames.syncBand();
  $('#archive-title').textContent='Explore the archive';
  $('.map-note').textContent='Country entry points are navigation aids, not Indigenous territorial boundaries or filmmakers’ locations.';
  $('#atlas-map').setAttribute('aria-label','Interactive map of country entry points. Use the country menu for an alternative to the map.');
  filtered=currentRecords();
  updateControls();
  $('#results-count').textContent=filtered.length;
  $('#map-count').textContent=filtered.length;
  $('#map-count').nextElementSibling.firstChild.textContent=state.scope==='map'?'map records':'research records';
  const represented=new Set(filtered.map(r=>r.country)).size;
  $('#map-count-caption').textContent=`across ${plural(represented,'country entry point')}`;
  const country=countryByCode.get(state.country);
  $('#selection-summary').textContent=country?.name || (state.region==='all'?'All country entry points':state.region);
  $('#map-region-label').textContent=country?.name || (state.region==='all'?'THE AMERICAS':state.region.toUpperCase());
  $('.map-panel').classList.toggle('filtered',state.region!=='all');
  $('.map-panel').classList.toggle('focused',state.country!=='all');
  renderCountryContext(country);
  renderRecords();
  if(initialised) {
    updateCountries();
    renderMarkers();
    if(focusMap)zoomToSelection();
    else showSelectionDrawing();
  }
  if(scroll)$('#results').scrollTop=0;
  updateURL();
  clearTimeout(announcementTimer);
  announcementTimer=setTimeout(()=>$('#announcement').textContent=`${plural(filtered.length,'record')} shown. ${$('#selection-summary').textContent}.`,180);
}
function renderRecords() {
  const list=$('#record-list');
  if(!filtered.length) {
    const isGap=state.country!=='all'&&!state.query&&state.scope==='map';
    const country=countryByCode.get(state.country);
    const title=isGap?'A place for further research.':'No matching records.';
    const message=isGap?`The current map selection has no record for ${country.name}. This is a gap in the collection, not an absence of Indigenous cinema.`:'Try another name, film title, or community reference, or widen the research scope.';
    list.innerHTML=`<div class="empty-state"><div class="empty-icon" aria-hidden="true">◌</div><h3>${title}</h3><p>${escapeHTML(message)}</p><button id="empty-reset">${isGap?'Explore all countries':'Reset search and filters'}</button></div>`;
    $('#empty-reset').addEventListener('click',resetFilters);
    return;
  }
  if(state.view==='films') {
    const works=filtered.flatMap(record=>record.films.map(film=>({record,film}))).sort((a,b)=>a.film.title.localeCompare(b.film.title));
    list.innerHTML=works.length?works.map(({record,film})=>`<button class="film-card" data-record="${record.id}" data-open-film="${escapeHTML(film.id)}"><span class="eyebrow">${escapeHTML(record.countryName)} · ${film.year||'Year unrecorded'}</span><h3>${escapeHTML(film.title)}</h3><p>${escapeHTML(record.name)}</p><span class="status-tag ${statusLabel(record)[1]}">${statusLabel(record)[0]}</span></button>`).join(''):'<div class="empty-state"><h3>No captured films in this selection.</h3><p>Switch to Filmmakers to explore the research records.</p></div>';
    return;
  }
  list.innerHTML=filtered.map(record=>{
    const status=statusLabel(record);
    const firstFilm=record.films[0];
    const legacy=record.evidence==='C';
    const community=record.community?`${legacy?'<span class="catalog-prefix">Catalog reference · </span>':''}${escapeHTML(record.community)}`:'<span class="catalog-prefix">Affiliation not recorded</span>';
    const filmText=firstFilm?`${escapeHTML(firstFilm.title)}${record.films.length>1?` <em>+${record.films.length-1} more</em>`:''}`:'No film title recorded yet';
    return `<button class="record-card" data-record="${record.id}" aria-label="Open ${escapeHTML(record.name)}, ${escapeHTML(record.countryName)}">
      <span class="record-emblem">${AtlasLinework.glyph(record)}</span>
      <div class="record-meta"><span>${escapeHTML(record.countryName)}</span><span class="record-id">${record.id.replace('DIR-','NO. ')}</span></div>
      <h3>${escapeHTML(record.name)}</h3><span class="record-arrow" aria-hidden="true">↗</span>
      <p class="record-affiliation">${community}</p>
      <p class="record-film">${filmIcon}<span>${filmText}</span></p>
      ${record.status!=='Map Ready'?`<div class="record-status"><span class="status-tag ${status[1]}">${status[0]}</span></div>`:''}
    </button>`;
  }).join('');
}
function renderCountryContext(country) {
  const node=$('#country-context');
  if(!country){node.hidden=true;node.innerHTML='';return;}
  node.hidden=false;node.className='country-context';
  const ready=archive.records.filter(r=>r.country===country.code&&r.status==='Map Ready').length;
  const research=archive.records.filter(r=>r.country===country.code).length;
  const note=country.note.replace(/\s*(Archive ready;|archive ready,|Public map|public map|current React map)[^.]*\.?/g,'').trim();
  const leads=country.leads.filter(l=>!l.status?.includes('Promoted'));
  const countryFeature=features?.find(f=>String(f.id).padStart(3,'0')===country.iso);
  const portraitPath=countryFeature?d3.geoPath(d3.geoMercator().fitExtent([[8,8],[164,102]],countryFeature))(countryFeature):'';
  node.innerHTML=`${portraitPath?`<svg class="country-portrait" viewBox="0 0 172 110" aria-hidden="true"><path d="${portraitPath}"/></svg>`:''}<p class="eyebrow">${escapeHTML(country.region)} · COUNTRY ENTRY POINT</p><h3>${escapeHTML(country.name)}</h3>
    <p>${plural(ready,'map record')} · ${plural(research,'research record')}</p>
    ${state.scope==='map'&&research>ready?`<button class="research-reveal" id="show-country-research">Explore all ${research} records <span>Including ${research-ready} awaiting review</span></button>`:''}
    ${note?`<p>${escapeHTML(note)}</p>`:''}
    ${leads.length?`<details><summary>${plural(leads.length,'research lead')}</summary>${leads.map(l=>`<div class="lead"><h4>${escapeHTML(l.name)}</h4><span class="lead-label">${escapeHTML(l.status)}</span><p>${escapeHTML(l.work)}</p><p>${escapeHTML(l.note)}</p><p>Next: ${escapeHTML(l.next)}</p>${safeURL(l.url)?`<a href="${escapeHTML(safeURL(l.url))}" target="_blank" rel="noopener noreferrer">Read the source ↗</a>`:''}</div>`).join('')}</details>`:''}`;
  $('#show-country-research')?.addEventListener('click',()=>{state.scope='all';updateView({scroll:true});});
}
function resetFilters() {
  if(state.view==='names'){state.query='';$('#search').value='';AtlasNames.reset();updateView();drawMap();return;}
  Object.assign(state,{region:'all',country:'all',query:'',scope:'map'});
  updateView({focusMap:true,scroll:true});
}
function selectRegion(region) {
  if(state.view==='names')setBrowseView('people');
  state.region=region;state.country='all';
  updateView({focusMap:true,scroll:true});
}
function selectCountry(code) {
  if(state.view==='names')setBrowseView('people');
  if(!countryByCode.has(code))return;
  state.country=code;
  if(state.region!=='all'&&countryByCode.get(code).region!==state.region)state.region='all';
  updateView({focusMap:true,scroll:true});
}

function openRecord(id) {
  const record=archive.records.find(r=>r.id===id);
  if(!record)return;
  const status=statusLabel(record);
  const legacy=record.evidence==='C';
  const evidenceLabel=legacy?'Catalog evidence':record.evidence==='A'?'Primary-source evidence':'Supporting-source evidence';
  const community=record.community||'Not recorded';
  let note=record.notes.replace(/(?:Research-ready\.?\s*)?(?:[Aa]rchive ready;?\s*)?(?:[Tt]he )?current React map[^.]*\.?/g,'').replace(/(?:[Pp]ublic map inclusion|[Pp]ublic map|[Aa]rchive ready; current React map)[^.]*\.?/g,'').trim();
  $('#record-number').textContent=`${record.id} · ${record.entity==='Person'?'RESEARCH RECORD':record.entity.toUpperCase()}`;
  $('#record-content').innerHTML=`
    ${record.id==='DIR-0331'?'<figure class="film-still"><img src="assets/drunktowns-finest.jpg" width="1000" height="563" alt="Magdalena Begay as Max Maryboy in Drunktown’s Finest"><figcaption>Drunktown’s Finest · Photo: Peter Holland. <a href="https://www.unitedstatesartists.org/artists/sydney-freeland" target="_blank" rel="noopener noreferrer">United States Artists ↗</a></figcaption></figure>':''}
    <div class="record-frontispiece" aria-hidden="true">${AtlasLinework.glyph(record,true)}<span>${plural(record.films.length,'captured work')}</span></div>
    <div class="record-intro"><button class="country-link" data-country="${record.country}">${escapeHTML(record.countryName)} ↗</button>
      <h2 id="record-title">${escapeHTML(record.name)}</h2>
      <span class="status-tag ${status[1]}">${status[0]}</span><span class="status-tag candidate">${evidenceLabel}</span>
      <dl class="record-facts"><div><dt>${legacy?'Community reference in catalog':'Recorded nation / community'}</dt><dd>${escapeHTML(community)}</dd></div><div><dt>Works captured</dt><dd>${plural(record.films.length,'film / work','films / works')}</dd></div></dl>
      ${legacy?'<p class="catalog-note">This legacy catalog association needs verification. A community named in a film’s subject or credits does not establish the filmmaker’s Indigenous identity.</p>':record.status!=='Map Ready'?'<p class="catalog-note">This record is in research. Its current status does not establish a verified Indigenous affiliation or complete directing credit.</p>':''}
    </div>
    ${note?`<section class="record-section"><h3>Research context</h3><p>${escapeHTML(note)}</p></section>`:''}
    <section class="record-section"><h3>Films & works <span class="count-badge">${record.films.length}</span></h3><p class="small-hint">Titles captured in the archive; not a complete filmography.</p>
      ${record.films.length?record.films.map((film,index)=>`<article class="film-item" data-film="${escapeHTML(film.id)}"><span class="film-index">${String(index+1).padStart(2,'0')}</span><div><h4>${escapeHTML(film.title)}</h4>
        <div class="film-meta">${[film.year,film.medium].filter(Boolean).map(escapeHTML).join(' · ')||'Year and format not recorded'}</div>
        ${film.languages?`<p>Languages: ${escapeHTML(film.languages.replaceAll('|','·'))}</p>`:''}
        ${film.notes?`<p>${escapeHTML(film.notes)}</p>`:''}
        ${safeURL(film.sourceURL)?`<a class="film-source" href="${escapeHTML(safeURL(film.sourceURL))}" target="_blank" rel="noopener noreferrer">Film / credit source ↗</a>`:''}
        ${film.review?'<span class="status-tag review">Credit needs review</span>':''}
      </div></article>`).join(''):'<p>No film title is recorded yet. See the sources and open questions for the next research step.</p>'}
    </section>
    ${matchingTitles(record)}
    <section class="record-section"><h3>Sources & evidence</h3>
      ${record.sources.length?record.sources.map(source=>{
        const url=safeURL(source.url);if(!url)return '';
        return `<a class="source-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHTML(source.type||new URL(url).hostname)}<span aria-hidden="true">↗</span></strong><small>${escapeHTML(source.evidence||'Research source')} · ${escapeHTML(new URL(url).hostname.replace('www.',''))}</small></a>`;
      }).join(''):'<p>This record comes from the project’s catalog or acquisition research. No external source URL is recorded for this entry.</p>'}
      <p class="small-hint">Source links reflect the research snapshot and may lead to profiles, catalog entries, or film information.</p>
    </section>
    ${record.issues.length?`<section class="record-section"><details class="research-details"><summary>${plural(record.issues.length,'open research question')}</summary><ul>${record.issues.map(issue=>`<li>${escapeHTML(issue.type)}: ${escapeHTML(issue.action)}</li>`).join('')}</ul></details></section>`:''}
    <div class="record-bottom">${record.reviewedAt?'Source review · '+escapeHTML(record.reviewedAt):'Film Map research archive · Snapshot 17 August 2026'}</div>`;
  $('#record-content [data-country]').addEventListener('click',()=>{closeDialog('record-dialog');selectCountry(record.country);});
  $$('#record-content [data-related-record]').forEach(button=>button.addEventListener('click',()=>{openRecord(button.dataset.relatedRecord);$('#record-dialog').scrollTop=0;}));
  showDialog('record-dialog');
  const url=new URL(location.href);url.searchParams.set('record',id);history.replaceState(null,'',url);
}
function showDialog(id) {
  const dialog=$(`#${id}`);
  if(dialog.open)return;
  dialog.showModal();dialog.scrollTop=0;
  document.body.classList.add('dialog-open');
}
function closeDialog(id) { $(`#${id}`).close(); }

function matchingTitles(record) {
  const titles=new Set(record.films.map(f=>normalize(f.title).trim()).filter(Boolean));
  if(!titles.size)return '';
  const matches=archive.records.filter(other=>other.id!==record.id&&other.films.some(f=>titles.has(normalize(f.title).trim())));
  if(!matches.length)return '';
  return `<section class="record-section"><h3>Follow a title</h3><p class="small-hint">Other records with an identical captured title. These links show catalog matches; they do not establish collaboration or resolve duplicate records.</p><div class="related-records">${matches.map(other=>`<button data-related-record="${escapeHTML(other.id)}"><span>${escapeHTML(other.name)}</span><small>${escapeHTML(other.countryName)}</small><span aria-hidden="true">↗</span></button>`).join('')}</div></section>`;
}

function drawingRecords(d) {
  return archive.records.filter(record=>recordMatches(record,{ignoreCountry:true})&&(d.isCluster?countryByCode.get(record.country)?.region===d.region:record.country===d.code));
}
function showSelectionDrawing() {
  if(state.view==='places'){AtlasLinework.clear();return;}
  if(state.view==='names'){AtlasNames.render();return;}
  if(!markersLayer)return;
  AtlasLinework.clear();
  if(state.country==='all')return;
  const d=markersLayer.selectAll('.marker').data().find(m=>m.code===state.country);
  if(d)AtlasLinework.show(d,drawingRecords(d));
}
function focusRecordOnMap(id) {
  if(!initialised)return;
  const record=archive.records.find(r=>r.id===id);
  if(!record)return;
  const d=markersLayer.selectAll('.marker').data().find(m=>m.code===record.country||(m.isCluster&&m.region===countryByCode.get(record.country)?.region));
  if(d)AtlasLinework.show({...d,key:record.id},[record]);
  mapLayer.selectAll('.country-shape').classed('record-hover',function(){return this.getAttribute('data-country')===record.country;});
}
function clearRecordFocus() {
  if(!initialised)return;
  mapLayer.selectAll('.country-shape').classed('record-hover',false);
  showSelectionDrawing();
}

function initialiseMap(world) {
  features=topojson.feature(world,world.objects.countries).features;
  coastlines=topojson.mesh(world,world.objects.countries,(a,b)=>a===b);
  svg=d3.select('#atlas-map');
  const defs=svg.append('defs');
  defs.html(`<pattern id="country-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><path d="M0 0V9" stroke="currentColor" stroke-width=".7" opacity=".3"/></pattern><pattern id="country-stipple" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".6" fill="currentColor" opacity=".4"/></pattern><pattern id="country-cross" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M4 2v4M2 4h4" stroke="currentColor" stroke-width=".6" opacity=".35"/></pattern>`);
  mapLayer=svg.append('g').attr('class','geography');
  mapLayer.append('g').attr('class','grid-layer');
  mapLayer.append('g').attr('class','shore-waves');
  mapLayer.append('g').attr('class','countries-layer');
  mapLayer.append('g').attr('class','texture-layer').attr('pointer-events','none');
  mapLayer.append('path').attr('class','coastline').attr('pointer-events','none');
  mapLayer.append('path').attr('class','country-trace').attr('pointer-events','none').attr('pathLength',1);
  mapLayer.append('g').attr('class','oceans-layer');
  markersLayer=svg.append('g').attr('class','markers-layer');
  transform=d3.zoomIdentity;
  zoom=d3.zoom().filter(event=>state.view!=='names'&&!event.target.closest('[role="button"]')&&(!event.ctrlKey||event.type==='wheel')&&!event.button).scaleExtent([.8,14]).on('zoom',event=>{
    transform=event.transform;mapLayer.attr('transform',transform);renderMarkers();
    hideTooltip();
    $('#zoom-in').disabled=transform.k>=13.99;
    $('#zoom-out').disabled=transform.k<=.81;
  }).on('end',showSelectionDrawing);
  svg.call(zoom).on('dblclick.zoom',null);
  initialised=true;
  AtlasLinework.init(svg);
  AtlasNames.init();
  AtlasPlaces.init();
  drawMap();
  if(state.view==='places')AtlasPlaces.renderView();else if(state.view==='names')AtlasNames.renderView();else renderCountryContext(countryByCode.get(state.country));
  new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawMap,120)}).observe($('#atlas-map'));
  $('#map-loading').hidden=true;
}
function drawMap() {
  const bounds=$('#atlas-map').getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  width=bounds.width;height=bounds.height;
  AtlasLinework.resize();
  svg.attr('viewBox',`0 0 ${width} ${height}`);
  projection=d3.geoEqualEarth().rotate([90,0]).center([0,10]);
  // Fit the visible hemisphere, retaining Alaska and the southern cone.
  const extent={type:'MultiPoint',coordinates:[[-166,70],[-50,75],[-33,-8],[-72,-56],[-120,28]]};
  const mobile=width<500;
  projection.fitExtent([[mobile?18:width*.15,mobile?140:72],[width-(mobile?12:65),height-(mobile?72:145)]],extent);
  if(AtlasNames.isWorld()||(state.view==='places'&&AtlasPlaces.isWorld()))projection=d3.geoEqualEarth().rotate([0,0]).fitExtent([[15,90],[width-15,height-145]],{type:'Sphere'});
  geoPath=d3.geoPath(projection);
  zoom.extent([[0,0],[width,height]]).translateExtent([[-width*3,-height*3],[width*4,height*4]]);
  const ids=new Set(archive.countries.map(c=>c.iso));
  mapLayer.select('.grid-layer').html('');
  mapLayer.select('.grid-layer').append('path').datum(d3.geoGraticule().step([15,15])()).attr('d',geoPath).attr('class','graticule');
  mapLayer.select('.grid-layer').append('path').datum({type:'LineString',coordinates:d3.range(-180,181,3).map(lon=>[lon,0])}).attr('d',geoPath).attr('class','equator');
  mapLayer.select('.countries-layer').selectAll('path').data(features, f=>f.id).join('path')
    .attr('d',geoPath).attr('class',f=>ids.has(f.id)?'country-shape':'context-land')
    .attr('data-country',f=>archive.countries.find(c=>c.iso===f.id)?.code||'')
    .attr('data-region',f=>archive.countries.find(c=>c.iso===f.id)?.region||'')
    .attr('aria-hidden','true')
    .on('pointerenter',(event,f)=>{if(state.view!=='places')traceCountry(f)})
    .on('pointerleave',()=>mapLayer.select('.country-trace').attr('d',null))
    .on('click',(event,f)=>{if(state.view==='places')return;const country=archive.countries.find(c=>c.iso===f.id);if(country){event.stopPropagation();selectCountry(country.code)}});
  mapLayer.select('.coastline').datum(coastlines).attr('d',geoPath);
  mapLayer.select('.shore-waves').selectAll('path').data([16,10,5]).join('path').attr('d',geoPath(coastlines)).attr('fill','none').attr('stroke','var(--stroke)').attr('stroke-width',d=>d).attr('stroke-opacity',.06).attr('pointer-events','none');
  mapLayer.select('.texture-layer').selectAll('path').data(features.filter(f=>ids.has(f.id)),f=>f.id).join('path').attr('d',geoPath).attr('fill',f=>`url(#${['country-hatch','country-stipple','country-cross'][Number(f.id)%3]})`).attr('color','var(--map-ink)').attr('opacity',.5);
  const oceans=[{text:'Pacific Ocean',coordinates:[-129,-15]},{text:'Atlantic Ocean',coordinates:[-35,18]}];
  mapLayer.select('.oceans-layer').selectAll('text').data(oceans).join('text').attr('class','ocean-label')
    .attr('x',d=>projection(d.coordinates)[0]).attr('y',d=>projection(d.coordinates)[1]).text(d=>d.text);
  updateCountries();
  drawCaribbean();
  AtlasPlaces.draw();
  zoomToSelection(false);
}
function drawCaribbean() {
  const inset=d3.select('#caribbean-map');
  const p=d3.geoMercator().fitExtent([[14,17],[304,142]],{type:'MultiPoint',coordinates:[[-86,27],[-58,9]]});
  const path=d3.geoPath(p);
  inset.selectAll('path').data(features).join('path').attr('d',path).attr('class','inset-land');
  const countries=archive.countries.filter(c=>c.region==='Caribbean');
  const nodes=inset.selectAll('g').data(countries,c=>c.code).join(enter=>{
    const g=enter.append('g').attr('role','button').attr('tabindex',0);
    g.append('circle').attr('r',10).attr('class','island-hit');g.append('circle').attr('r',3);
    g.append('title');return g;
  });
  nodes.attr('transform',d=>`translate(${p(d.coordinates)})`).attr('aria-label',d=>`Explore ${d.name}`)
    .on('click',(event,d)=>selectCountry(d.code)).on('keydown',(event,d)=>{if(['Enter',' '].includes(event.key)){event.preventDefault();selectCountry(d.code)}});
  nodes.select('title').text(d=>d.name);
  $('#island-list').innerHTML=countries.map(c=>`<button data-island="${c.code}">${escapeHTML(c.name)}</button>`).join('');
  $$('#island-list button').forEach(b=>b.addEventListener('click',()=>selectCountry(b.dataset.island)));
}
function updateCountries() {
  if(!initialised)return;
  const activeCountries=new Set(archive.records.filter(r=>recordMatches(r,{ignoreCountry:true})).map(r=>r.country));
  mapLayer.selectAll('.country-shape').each(function(){
    const element=d3.select(this), code=element.attr('data-country');
    const country=countryByCode.get(code);
    element.classed('available',activeCountries.has(code))
      .classed('pending',!activeCountries.has(code))
      .classed('selected',state.country===code)
      .classed('dim',(state.region!=='all'&&country.region!==state.region)||(state.country!=='all'&&state.country!==code));
  });
}
function traceCountry(feature) {
  const path=mapLayer.select('.country-trace');path.attr('d',geoPath(feature));
  path.classed('tracing',false);requestAnimationFrame(()=>path.classed('tracing',true));
}
function markerData() {
  const counts=d3.rollup(archive.records.filter(r=>recordMatches(r,{ignoreCountry:true})),v=>v.length,r=>r.country);
  const clusterRegions=state.region==='all'&&state.country==='all'&&transform.k<2.25;
  const visible=archive.countries.filter(c=>state.region==='all'||c.region===state.region);
  const markers=visible.filter(c=>!clusterRegions||!['Central America','Caribbean'].includes(c.region))
    .map(c=>({...c,key:c.code,count:counts.get(c.code)||0,isCluster:false}));
  if(clusterRegions) {
    for(const [region,coordinates] of [['Central America',[-87,10]],['Caribbean',[-64,23]]]) {
      markers.push({key:region,name:region,region,coordinates,count:visible.filter(c=>c.region===region).reduce((sum,c)=>sum+(counts.get(c.code)||0),0),isCluster:true});
    }
  }
  return markers;
}
function renderMarkers() {
  if(!initialised||!projection||!transform)return;
  if(state.view==='places'){markersLayer.style('display','none');svg.select('.names-map-layer').style('display','none');return;}
  if(state.view==='names'){AtlasNames.render();return;}
  markersLayer.style('display',null);svg.select('.names-map-layer').style('display','none');
  const data=markerData();
  const radius=d=>d.count?Math.min(20,11+Math.sqrt(d.count)*1.3):6;
  // Separate adjacent country controls without implying precise personal locations.
  // Fine leader lines keep each displaced control tied to its geographic anchor.
  for(const item of data) {
    [item.anchorX,item.anchorY]=transform.apply(projection(item.coordinates));
    item.x=item.anchorX;item.y=item.anchorY;
  }
  for(let pass=0;pass<32;pass++) {
    for(let i=0;i<data.length;i++)for(let j=i+1;j<data.length;j++) {
      const a=data[i],b=data[j];
      if(a.anchorX<-50||a.anchorX>width+50||b.anchorX<-50||b.anchorX>width+50)continue;
      let dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy);
      const minimum=Math.max(35,radius(a)+radius(b)+12);
      if(distance<minimum) {
        if(distance<.01){dx=.1;dy=1;distance=Math.hypot(dx,dy)}
        const shift=(minimum-distance)*.5;
        a.x-=dx/distance*shift;a.y-=dy/distance*shift;
        b.x+=dx/distance*shift;b.y+=dy/distance*shift;
      }
    }
  }
  const marker=markersLayer.selectAll('g.marker').data(data,d=>d.key).join(enter=>{
    const group=enter.append('g').attr('class','marker').attr('role','button').attr('tabindex',0);
    group.append('line').attr('class','marker-leader');
    group.append('circle').attr('class','hit-area').attr('r',24);
    group.append('circle').attr('class','halo');
    group.append('circle').attr('class','marker-dot');
    group.append('text').attr('class','marker-number');
    group.append('text').attr('class','marker-label');
    group.on('click',(event,d)=>{event.stopPropagation();d.isCluster?selectRegion(d.region):selectCountry(d.code)})
      .on('keydown',(event,d)=>{if(['Enter',' '].includes(event.key)){event.preventDefault();d.isCluster?selectRegion(d.region):selectCountry(d.code)}})
      .on('pointerenter',(event,d)=>showTooltip(d,event))
      .on('pointermove',(event,d)=>showTooltip(d,event))
      .on('pointerleave',hideTooltip)
      .on('focus',(event,d)=>showTooltip(d,event))
      .on('blur',hideTooltip);
    return group;
  });
  marker.attr('transform',d=>`translate(${d.x},${d.y})`)
    .attr('data-region',d=>d.region)
    .attr('aria-label',d=>`${d.name}: ${plural(d.count,'matching record')}. ${d.isCluster?'Explore region':'Select country entry point'}.`)
    .attr('aria-pressed',d=>String(state.country===d.code))
    .classed('is-selected',d=>state.country===d.code)
    .style('display',d=>d.x < -22 || d.y < -22 || d.x > width+22 || d.y > height+22?'none':null);
  marker.select('.marker-leader').attr('x1',d=>d.anchorX-d.x).attr('y1',d=>d.anchorY-d.y)
    .attr('x2',0).attr('y2',0).style('display',d=>Math.hypot(d.x-d.anchorX,d.y-d.anchorY)>5?'':'none');
  marker.select('.halo').attr('r',d=>radius(d)+5).style('display',d=>d.count?'':'none');
  marker.select('.marker-dot').attr('r',radius).classed('zero',d=>!d.count);
  marker.select('.marker-number').text(d=>d.count||'').classed('zero',d=>!d.count);
  marker.select('.marker-label').text(d=>!d.isCluster&&['Caribbean','Central America'].includes(d.region)&&state.country!==d.code?d.code:d.name.toUpperCase()).attr('y',d=>radius(d)+16)
    .style('display',d=>(d.isCluster||state.country===d.code||state.region!=='all'||transform.k>2.1||featuredCountries.has(d.code))?'':'none')
    .style('font-size','12px');
  const occupied=[];
  const labels=marker.select('.marker-label').nodes().sort((a,b)=>Number(b.__data__.code===state.country)-Number(a.__data__.code===state.country));
  labels.forEach(node=>{
    if(node.style.display==='none')return;
    const d=node.__data__, box=node.getBBox(), rect={x:d.x+box.x,y:d.y+box.y,w:box.width,h:box.height};
    const overlap=occupied.some(b=>rect.x<b.x+b.w+7&&rect.x+rect.w+7>b.x&&rect.y<b.y+b.h+5&&rect.y+rect.h+5>b.y);
    if(overlap&&d.code!==state.country)node.style.display='none';else occupied.push(rect);
  });
}
function showTooltip(d,event) {
  AtlasLinework.show(d,drawingRecords(d));
  const tooltip=$('#map-tooltip');
  const [mx,my]=[d.x,d.y];
  const root=$('.map-panel').getBoundingClientRect();
  const x=event.clientX ? event.clientX-root.left : mx;
  const y=event.clientY ? event.clientY-root.top : my;
  tooltip.innerHTML=`${escapeHTML(d.name)}<span>${d.count?plural(d.count,'matching record'):'No matching records in this selection'}</span><span>${d.isCluster?'Select to explore country entries':'Open country entry point'}</span>`;
  tooltip.hidden=false;
  tooltip.style.left=`${Math.min(Math.max(8,x+16),width-tooltip.offsetWidth-8)}px`;
  tooltip.style.top=`${Math.min(Math.max(8,y-30),height-tooltip.offsetHeight-8)}px`;
}
function hideTooltip() {$('#map-tooltip').hidden=true;if(['names','places'].includes(state.view))return;if(state.country==='all')AtlasLinework.clear();else showSelectionDrawing();}
function zoomToSelection(animate=true) {
  if(!initialised)return;
  if(AtlasNames.fit())return;
  if(state.view==='places'){svg.call(zoom.transform,d3.zoomIdentity);return;}
  let target=d3.zoomIdentity;
  const country=countryByCode.get(state.country);
  if(country) {
    const feature=features.find(f=>f.id===country.iso);
    let k=6;
    if(feature) {
      const [[x0,y0],[x1,y1]]=geoPath.bounds(feature);
      k=Math.max(1.4,Math.min(12,.65/Math.max((x1-x0)/width,(y1-y0)/height)));
    }
    // Large countries use geographic anchors to avoid centering on remote islands.
    const point=projection(country.coordinates);
    target=d3.zoomIdentity.translate(width*.5,height*.46).scale(k).translate(-point[0],-point[1]);
  } else if(state.region!=='all') {
    const countries=archive.countries.filter(c=>c.region===state.region);
    const points=countries.map(c=>projection(c.coordinates));
    const x0=d3.min(points,p=>p[0]),x1=d3.max(points,p=>p[0]);
    const y0=d3.min(points,p=>p[1]),y1=d3.max(points,p=>p[1]);
    const k=Math.min(8, .67/Math.max((x1-x0+25)/width,(y1-y0+25)/height));
    target=d3.zoomIdentity.translate(width*.5,height*.45).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2);
  }
  svg.interrupt();
  if(animate&&!reducedMotion)svg.transition().duration(600).call(zoom.transform,target);
  else svg.call(zoom.transform,target);
}

function setBrowseView(view) {
  state.view=view;document.body.dataset.browse=view;
  $$('.view-control button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  $('#search').placeholder=view==='names'?'Search every supplied name…':'Name, film, people, or community…';$('#search').value=state.query;
  const url=new URL(location.href);url.searchParams.set('view',view);if(view!=='names'){url.searchParams.delete('name');url.searchParams.delete('namesArea');}try{history.replaceState(null,'',url)}catch{}
  updateView();if(initialised)drawMap();
}
function bindControls() {
  $('#reading-open').addEventListener('click',()=>showDialog('reading-dialog'));
  $('#reading-close').addEventListener('click',()=>closeDialog('reading-dialog'));
  $('#load-li-cham').addEventListener('click',()=>{$('#li-cham-player').innerHTML='<iframe title="Li Cham (Morí) — festival trailer" src="https://www.youtube-nocookie.com/embed/p866LZfm69g" allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';});
  $('#reading-dialog').addEventListener('close',()=>{const player=$('#li-cham-player iframe');if(player)player.src=player.src;if(!$$('dialog[open]').length)document.body.classList.remove('dialog-open');});
  window.addEventListener('atlas-open-film',event=>{openRecord(event.detail.record);requestAnimationFrame(()=>{const item=$$('#record-content [data-film]').find(node=>node.dataset.film===event.detail.film);item?.scrollIntoView({block:'center',behavior:reducedMotion?'instant':'smooth'});item?.classList.add('film-selected');});});
  $$('.region-control button').forEach(button=>button.addEventListener('click',()=>selectRegion(button.dataset.region)));
  $('#country-select').addEventListener('change',event=>{state.country=event.target.value;updateView({focusMap:true,scroll:true})});
  $('#search').addEventListener('input',event=>{state.query=event.target.value;updateView({scroll:true})});
  $('#scope-select').addEventListener('change',event=>{state.scope=event.target.value;updateView({scroll:true})});
  $('#sort-select').addEventListener('change',event=>{state.sort=event.target.value;updateView({scroll:true})});
  $('#clear-filters').addEventListener('click',resetFilters);
  $$('.view-control button').forEach(button=>button.addEventListener('click',()=>setBrowseView(button.dataset.view)));
  $('#record-list').addEventListener('click',event=>{const button=event.target.closest('[data-record]');if(!button)return;if(button.dataset.openFilm)window.dispatchEvent(new CustomEvent('atlas-open-film',{detail:{record:button.dataset.record,film:button.dataset.openFilm}}));else openRecord(button.dataset.record)});
  $('#record-list').addEventListener('pointerover',event=>{const button=event.target.closest('[data-record]');if(button&&!button.contains(event.relatedTarget))focusRecordOnMap(button.dataset.record);});
  $('#record-list').addEventListener('pointerout',event=>{const button=event.target.closest('[data-record]');if(button&&!button.contains(event.relatedTarget))clearRecordFocus();});
  $('#record-list').addEventListener('focusin',event=>{const button=event.target.closest('[data-record]');if(button)focusRecordOnMap(button.dataset.record);});
  $('#record-list').addEventListener('focusout',clearRecordFocus);
  $('#zoom-in').addEventListener('click',()=>svg.transition().duration(reducedMotion?0:250).call(zoom.scaleBy,1.5));
  $('#zoom-out').addEventListener('click',()=>svg.transition().duration(reducedMotion?0:250).call(zoom.scaleBy,1/1.5));
  $('#zoom-reset').addEventListener('click',()=>{state.region='all';state.country='all';if(state.view==='names'){AtlasNames.reset();drawMap();}updateView({focusMap:true,scroll:true})});
  for(const id of ['about-open','method-open'])$(`#${id}`).addEventListener('click',()=>showDialog('about-dialog'));
  for(const id of ['record','about']) {
    $(`#${id}-close`).addEventListener('click',()=>closeDialog(`${id}-dialog`));
    $(`#${id}-dialog`).addEventListener('click',event=>{
      if(event.target!==event.currentTarget)return;
      const box=event.currentTarget.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDialog(`${id}-dialog`);
    });
    $(`#${id}-dialog`).addEventListener('close',()=>{
      if(!$$('dialog[open]').length)document.body.classList.remove('dialog-open');
      if(id==='record'){const url=new URL(location.href);url.searchParams.delete('record');history.replaceState(null,'',url)}
    });
  }
  document.addEventListener('keydown',event=>{
    if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!$$('dialog[open]').length) {
      event.preventDefault();(state.view==='names'?$('#ribbon-search'):$('#search')).focus();(state.view==='names'?$('#ribbon-search'):$('#search')).scrollIntoView({block:'nearest',behavior:reducedMotion?'instant':'smooth'});
    }
  });
}

async function boot() {
  try {
    const response=await fetch('assets/archive.json');
    if(!response.ok)throw new Error('Archive unavailable');
    archive=await response.json();
    countryByCode=new Map(archive.countries.map(c=>[c.code,c]));
    for(const record of archive.records)record.searchText=normalize([record.name,record.countryName,record.community,...record.films.flatMap(f=>[f.title,f.languages])].filter(Boolean).join(' '));
    readURL();if(!new URLSearchParams(location.search).has('view')&&new URLSearchParams(location.search).has('record'))state.view='people';bindControls();updateView();
    const recordId=new URLSearchParams(location.search).get('record');
    if(recordId)openRecord(recordId);
    try {
      if(!window.d3||!window.topojson)throw new Error('Map library unavailable');
      const worldResponse=await fetch('assets/world-50m.json');
      if(!worldResponse.ok)throw new Error('Map unavailable');
      initialiseMap(await worldResponse.json());
    } catch(error) {
      $('#map-loading').textContent='The map could not load. You can still explore the archive using search and the country menu.';
      $('#map-loading').classList.add('load-error');
      $$('.map-controls button').forEach(button=>button.disabled=true);
      $$('.appearance-options button').forEach(button=>button.disabled=true);
    }
  } catch(error) {
    $('#map-loading').innerHTML='<div class="load-error">The atlas could not load.<br><button id="retry">Try again</button></div>';
    $('#retry').addEventListener('click',()=>location.reload());
    $('#record-list').innerHTML='<div class="empty-state"><h3>The archive is unavailable.</h3><p>Please reload the page to try again.</p></div>';
    $$('.toolbar button,.toolbar select,.archive-top input,.archive-top select,.map-controls button').forEach(control=>control.disabled=true);
  }
}
boot();
