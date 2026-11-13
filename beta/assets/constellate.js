/* Constellate — one module (consolidated 2026-11-12).
   Sections keep their original order and code; each was a separate file before, named in its banner.
   Edit here. Do not add overlay scripts that relabel or restyle Constellate from outside this file. */
'use strict';

/* ================================================================
   Embedded view
   (was constellation-embed.js)
   ================================================================ */
if(new URLSearchParams(location.search).get('constellation-embed')==='1'){
 document.body.classList.add('constellation-embedded');
 (async()=>{const app=window.Atlas;await app.ready;app.state.cinema=false;document.querySelector('#layer-cinema').checked=false;app.refresh();window.dispatchEvent(new Event('resize'));
 function receive(e){if(e.origin!==location.origin||e.source!==parent||!e.data||typeof e.data!=='object')return;if(e.data.type==='atlas-workspace-map-controls'){document.querySelector('#zoom-in')?.focus({preventScroll:true});return;}if(e.data.type==='atlas-workspace-overview'){app.resetWorkspace();app.state.cinema=false;document.querySelector('#layer-cinema').checked=false;app.refresh();return;}if(e.data.type!=='atlas-workspace-focus')return;const r=app.recordById(e.data.record);if(!r)return;if(e.data.film&&r.films.some(f=>f.id===e.data.film))app.openProfileFilm(r.id,e.data.film);else app.selectRecord(r.id);const ref=app.recordMapFocus(r.id);parent.postMessage({type:'atlas-workspace-reference',record:r.id,label:ref.label,kind:ref.kind,message:ref.message},location.origin);}
 window.addEventListener('message',receive);parent.postMessage({type:'atlas-workspace-ready'},location.origin);window.AtlasWorkspaceEmbed={receive};
 })();
}
;

/* ================================================================
   Engine: state, map drawing, panel, Follow, Play, share
   (was atlas-constellate62.js)
   ================================================================ */
(async()=>{
 const A=window.Atlas,S=window.AtlasCollections;if(!A||!S||new URLSearchParams(location.search).has('constellation-embed'))return;const inbound=window.AtlasWeaveIncoming||location.href;await A.ready;
 // Beta 1103: themes from published synopses (themes-1103-data.js); older seed terms are mapped to the 30-tag vocabulary.
 const TH=window.ATLAS_THEMES_1103||{families:{},films:{}},FAM={},FAMC={'Land and Environment':['#2f7d46','#7fd39a'],'Sovereignty and Politics':['#a8392b','#ff8f7a'],'Knowledge and Continuity':['#6447a8','#b9a2ff'],'Lives and Relations':['#a86a0e','#ffc163'],'Expression and Representation':['#1f6f99','#7cc8f0']};for(const[f,ts]of Object.entries(TH.families))for(const t of ts)FAM[t]=f;
 {const old={'land defense':'Land Defense','sovereignty':'Sovereignty and Self-Determination','language return':'Linguistic Preservation','memory':'Memory and Oral History','kinship':'Kinship','gender':'Women and Gender','youth':'Youth','water':'Water','environmental change':'Environmental Change','migration':'Displacement and Migration','healing':'Health and Healing','archives':'Archives, Museums and Repatriation','urban life':'Urban Indigeneity'};for(const r of A.allRecords())for(const f of r.films){const d=TH.films[f.id];if(d){f.themes=d[0].map(term=>({term,source:'curator',family:FAM[term]}));f.primaryTheme=d[1];f.weaveForm=d[2];f.weaveLength=d[3];f.themeSource=d[4];}else if(Array.isArray(f.themes))f.themes=f.themes.filter(t=>t.source!=='curator'||old[t.term]||FAM[t.term]).map(t=>t.source==='curator'&&old[t.term]?{...t,term:old[t.term],family:FAM[old[t.term]]}:t);/* tags already in the current vocabulary (flat beta) are kept as they are */}}
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],map=$('.map-panel'),main=$('main'),trigger=$('.constellate-link');if(!map||!trigger)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),copy=v=>JSON.parse(JSON.stringify(v)),norm=v=>String(v||'').replace(/[’‘ʼꞌ`']/gu,"'").normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const palette={blue:['#175fac','#7db6e8'],orange:['#a64c00','#f0ab68'],teal:['#00735b','#70c9b0'],purple:['#7141a3','#c5a2e6'],rose:['#a23361','#efa0be'],olive:['#657114','#c2cc7b'],cyan:['#006c83','#74cee1'],red:['#ad3030','#ed9292']};
 Object.assign(palette,{indigo:['#175fac','#7f95f5'],achiote:['#a64c00','#ec8a3d'],jade:['#00735b','#4fbf98'],cochineal:['#a23361','#d8475e'],maize:['#80661c','#ebc867'],cotton:['#8a8170','#efe6d2']});// Beta 105: thread colors follow the colors of stars, blue to red; older weaves keep their order of colors.
 const STAR={"star-blue": ["#3a5bbf", "#8fb4ff"], "star-bluewhite": ["#5a72a8", "#cbd9ff"], "star-white": ["#6f7480", "#f2f4fb"], "star-yellow": ["#99700f", "#ffd35c"], "star-orange": ["#a8521a", "#ffa95a"], "star-red": ["#a8302c", "#ff6f5a"]};Object.assign(palette,STAR,{indigo:STAR['star-blue'],jade:STAR['star-bluewhite'],cotton:STAR['star-white'],maize:STAR['star-yellow'],achiote:STAR['star-orange'],cochineal:STAR['star-red'],midnight:STAR['star-blue'],ocean:STAR['star-bluewhite'],sky:STAR['star-bluewhite'],glacier:STAR['star-white']});const DYES=[['star-blue','Blue'],['star-bluewhite','Blue-white'],['star-white','White'],['star-yellow','Yellow'],['star-orange','Orange'],['star-red','Red']];
 const color=t=>(palette[t.color]||palette.indigo)[1],motion=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width:700px)');
 const drawStarts=new Map();let unmapped=false,relX='order',relCache={key:'',map:null},selPushed=false,skipPop=false,suggestOpen=false,cardsAll=(()=>{try{return localStorage.getItem('weave-cards-all')==='1';}catch{return false;}})(),playThread=null,stepThread=null,timelineOn=false,lastFound=[],player=null,playTimer=null,playIndex=0,playPaused=true,playEntry=null;
 const raw=A.allRecords().flatMap(r=>[...r.films.map(f=>({...S.item({type:'film',record:r.id,film:f.id,title:f.title,maker:r.name,year:f.year,image:A.mediaForFilm(f)?.image}),community:r.community})),{...S.item({type:'maker',record:r.id,title:r.name,maker:r.name}),community:r.community}]);
 const key=x=>x.type==='film'?'t:'+norm(x.title).replace(/[^a-z0-9]+/g,' ').trim()+'|'+(x.year||''):x.id,grouped=new Map();const byFilm=new Map();for(const x of raw){let k=key(x);if(x.type==='film'&&x.film){if(byFilm.has(x.film))k=byFilm.get(x.film);else byFilm.set(x.film,k);}if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(x);}const catalog=[...grouped.values()].map(g=>({...g[0],image:g.find(x=>x.image)?.image||'',credits:g,maker:[...new Set(g.map(x=>x.maker))].join(' · ')}));const catalogById=new Map(catalog.map(x=>[x.id,x]));let azTab='film',azKey='',browsePageStart=0,browsePageLimit=48,browseSignature='',focusThread=false;const azSort=new Intl.Collator(undefined,{sensitivity:'base',numeric:true}),sortKey=v=>String(v||'').replace(/^[\s"'“”‘’¡¿(\[«.…-]+/u,''),letterOf=x=>{const raw=String(x.title||'').trim();if(!/^\p{L}/u.test(raw))return '#';const ch=norm(raw).charAt(0).toUpperCase();return /^[A-Z]$/.test(ch)?ch:'#';},azCache={},azAll=type=>azCache[type]||(azCache[type]=catalog.filter(x=>x.type===type).sort((a,b)=>{const la=letterOf(a),lb=letterOf(b);return la==='#'&&lb!=='#'?1:lb==='#'&&la!=='#'?-1:azSort.compare(la==='#'?a.title:sortKey(a.title),lb==='#'?b.title:sortKey(b.title));}));
 function tags(x){const r=A.recordById(x.record),fs=x.type==='film'?r?.films.filter(f=>f.id===x.film):r?.films;return [...new Map((fs||[]).flatMap(f=>f.themes||[]).map(t=>[t.term+'|'+t.source,t])).values()];}
 function filmOf(x){if(x?.type!=='film')return null;return A.recordById(x.record)?.films.find(f=>f.id===x.film)||null;}
 function publishedValues(v){
  if(Array.isArray(v))return v.flatMap(publishedValues);
  if(typeof v==='string')return v.split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
  if(v&&typeof v==='object')return publishedValues(v.name||v.term||v.label||v.language||'');
  return [];
 }
 function languageValues(x){const f=filmOf(x);return new Set(publishedValues(f?.languages||f?.language).map(norm).filter(Boolean));}
 function collectiveValues(x){const r=A.recordById(x?.record),f=filmOf(x);return new Set([f?.collective,f?.collectives,r?.collective,r?.collectives,r?.collectiveName].flatMap(publishedValues).map(norm).filter(Boolean));}
 function commonValue(a,b){return [...a].find(x=>b.has(x))||null;}
 function atlasConfirms(link){
  const a=S.current().items.find(x=>x.id===link.source),b=S.current().items.find(x=>x.id===link.target);
  if(!a||!b)return false;
  if(link.label==='shares land')return !!(reference(a)?.id&&reference(a).id===reference(b)?.id);
  if(link.label==='shares language')return !!commonValue(languageValues(a),languageValues(b));
  if(link.label==='same collective')return !!commonValue(collectiveValues(a),collectiveValues(b));
  return false;
 }
 function connectionKind(l){return l.kind==='atlas-record'?'confirmed by atlas record':l.sourceURL?'sourced':'interpretation';}
 function connectionText(l,fromId){
  const other=S.current().items.find(x=>x.id===(l.source===fromId?l.target:l.source));
  return l.label+' → '+(other?.title||'Other film')+' ('+connectionKind(l)+')';
 }
 function connectionHTML(l,fromId){
  return '<b>'+esc(l.label)+' → '+esc(S.current().items.find(x=>x.id===(l.source===fromId?l.target:l.source))?.title||'Other film')+'</b>'+
   ' <small class="weave-connection-kind">'+esc(connectionKind(l))+'</small>'+
   (l.note?' · '+esc(l.note):'')+
   (l.sourceURL?' <a href="'+esc(l.sourceURL)+'" target="_blank" rel="noopener noreferrer">Source ↗</a>':'');
 }
 // The store sanitizes imported links. Recover the atlas-record kind and the
 // content-edited date from the exact persisted JSON, never from a guess.
 function restorePersistedAnnotations(collectionRaw){
  const c=S.current(),raw=collectionRaw||{};
  if(c.id!==raw.id)return;
  if(raw.editedAt)c.editedAt=String(raw.editedAt);
  const byId=new Map((raw.links||[]).map(l=>[l.id,l]));
  for(const l of c.links)if(byId.get(l.id)?.kind==='atlas-record')l.kind='atlas-record';
 }
 try{
  const raw=JSON.parse(localStorage.getItem('atlas-collections-v1')||'{}');
  for(const c of S.state.collections){
   const saved=(raw.collections||[]).find(x=>x.id===c.id);
   if(!saved)continue;
   if(saved.editedAt)c.editedAt=String(saved.editedAt);
   const kinds=new Map((saved.links||[]).map(l=>[l.id,l.kind]));
   for(const l of c.links)if(kinds.get(l.id)==='atlas-record')l.kind='atlas-record';
  }
 }catch{}


 // Constellate shows the actual film image when the atlas has one. A letter tile is
 // deliberately a placeholder, not an inferred still or filmmaker portrait.
 function sourceImage(x){
  if(!x||x.type!=='film')return '';
  return window.AtlasArtwork.imageForItem(x)||catalogById.get(x.id)?.image||x.image||'';
 }
 function initials(x){
  const words=String(x?.title||'').trim().split(/\s+/).filter(Boolean);
  return words.slice(0,2).map(w=>Array.from(w)[0]).join('').toUpperCase()||'·';
 }
 function thumb(x){
  const image=sourceImage(x),kind=x?.type==='film'?'Film':x?.type==='maker'?'Filmmaker':'Idea';
  return `<span class="weave-media-thumb${image?' has-source':''}" role="img" aria-label="${image?'Atlas film image':'No sourced image — title placeholder'}" title="${image?'Image recorded for this film':'No sourced image on the atlas yet'}">${image?`<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`:''}<span class="weave-media-placeholder" aria-hidden="true"><b>${esc(initials(x))}</b><small>${esc(kind)}</small></span></span>`;
 }
 // An unavailable external image falls back gracefully; it is never substituted
 // with a different film's artwork.
 document.addEventListener('error',e=>{
  if(e.target.matches?.('.weave-media-thumb img'))e.target.closest('.weave-media-thumb')?.classList.add('is-broken');
   if(e.target.matches?.('image.weave-card-art'))e.target.style.display='none';
 },true);

 const terms=x=>tags(x).map(t=>t.term).filter(t=>FAM[t]),yearNum=x=>{const n=parseInt(x?.year);return n>1800&&n<2100?n:null;},itemTitle=id=>S.current().items.find(x=>x.id===id)?.title||'';
 function famColor(x){const f=filmOf(x),p=f?.primaryTheme||(x?terms(x)[0]:null),fam=p&&FAM[p];return fam?FAMC[fam][document.documentElement.dataset.readingTheme==='night'?1:0]:null;}
 function summary(t){const xs=t.items.map(id=>S.current().items.find(x=>x.id===id)).filter(Boolean),count=new Map();for(const x of xs)for(const term of terms(x))count.set(term,(count.get(term)||0)+1);const top=[...count].sort((a,b)=>b[1]-a[1]).filter(([,n])=>n>1||xs.length<3).slice(0,2).map(([k])=>k),ys=xs.map(yearNum).filter(Boolean),lo=Math.min(...ys),hi=Math.max(...ys),span=ys.length?(lo===hi?String(lo):lo+'–'+hi):'';return [top.length?'Mostly '+top.join(' and '):'',span].filter(Boolean).join(' · ');}
 map.insertAdjacentHTML('beforeend',`<svg id="constellate-graph" hidden tabindex="0" role="group" aria-label="Threads, film cards and land references"></svg><div id="constellate-mode" hidden><a class="weave-skip-to-graph" href="#constellate-graph">Skip to the constellation</a><span></span><span id="weave-stepper" hidden><button id="weave-step-prev" aria-label="Previous card on this thread" title="Previous on thread ( [ )">‹</button><small id="weave-step-pos"></small><button id="weave-step-next" aria-label="Next card on this thread" title="Next on thread ( ] )">›</button></span><button id="constellate-edit" aria-pressed="true">Build</button><button id="weave-draw-thread" aria-pressed="false" title="Connect film thumbnail cards in order; their land affiliations remain visible as reference markers">Draw thread</button><button id="weave-browse-films" title="Find films and add them to your thread">Find films</button><button id="constellate-read" aria-pressed="false">Follow</button><button id="weave-play" aria-pressed="false" title="Play the films in this constellation in sequence">Play</button><button id="constellate-share">Share</button><button id="weave-unmap" aria-pressed="false" title="Disappear the cartography: lay the constellation out by relation instead of by map">Disappear map</button><span class="weave-tool-group"><button id="constellate-undo" class="weave-quick-history" aria-label="Undo" title="Undo" disabled>↶</button><button id="constellate-redo" class="weave-quick-history" aria-label="Redo" title="Redo" disabled>↷</button></span><button id="constellate-clear" title="Clear this constellation (confirmation required; Undo can restore it)">Clear</button><details class="weave-more"><summary aria-label="Options and layout" title="Options and layout"><span class="weave-options-label">Options</span><span class="weave-options-icon" aria-hidden="true">⋯</span></summary><div class="weave-more-menu"><small class="weave-menu-heading">Layout and display</small><button id="constellate-fit" title="Fit the map to the constellation">Fit map to threads</button><button id="weave-timeline-toggle" aria-pressed="false">Show timeline</button><button id="weave-atlas-toggle" aria-pressed="false">Show atlas markers</button><button id="weave-cards-toggle" aria-pressed="false">Show every card</button><small class="weave-menu-heading">Analysis</small><button id="weave-compare-open">Compare two threads</button></div></details><button id="constellate-exit">Exit</button></div><p id="weave-notice" aria-hidden="true" hidden></p><div id="weave-peek" hidden aria-hidden="true"></div><div id="weave-timeline" hidden aria-label="Timeline of the visible threads"></div><div id="weave-relbar" hidden><span>No map. Left to right:</span><button type="button" data-relx="order" aria-pressed="true">thread order</button><button type="button" data-relx="year" aria-pressed="false">year</button><button type="button" data-relx="circle" aria-pressed="false">a circle</button><small>Closeness follows shared themes. Each card keeps its people and land.</small></div><section id="weave-empty-hint" hidden aria-label="Get started with a constellation"><p class="weave-intro-kicker">CONSTELLATE · VISUAL RESEARCH</p><h2>How can films encounter each other?</h2><p class="weave-intro-lede">Follow a question across cinema, peoples and lands. Start with a sourced theme, or build your own relations.</p><div id="weave-intro-films" class="weave-intro-films" role="list" aria-label="Films in an example thread"></div><p id="weave-intro-label" class="weave-intro-label"></p><div class="weave-intro-actions"><button type="button" id="weave-example">Explore example constellation</button><button type="button" id="weave-intro-browse">Browse films</button></div><div class="weave-intro-themes"><span>Or begin with a theme</span><div id="weave-hint-themes"></div></div></section>`);
 main.insertAdjacentHTML('beforeend',`<aside id="constellate-popup" hidden aria-label="Constellation editor"><div class="constellate-heading"><h2 id="constellate-title">Constellate</h2><button type="button" id="weave-find-films" title="Find and add films (shortcut: /)">Find films</button><button id="constellate-close" aria-label="Close constellation editor">×</button></div><details id="constellate-how"><summary aria-label="How it works" title="How it works">Help</summary><ol><li><strong>Build:</strong> choose films, or begin with a theme. Large themes open with six films; unfold more when you need them.</li><li><strong>Draw thread:</strong> select two film cards to link them. Add a note to explain the connection.</li><li><strong>Follow:</strong> move through films, themes, land references and your notes at your own pace.</li><li><strong>Play:</strong> use the main Play button for an automatic, full-screen presentation. Sharing and other tools are under Options.</li></ol></details><div class="constellate-collection"><label class="sr-only" for="constellate-collection">Constellation</label><select id="constellate-collection"></select><button id="constellate-new" title="Start a new constellation">+ New</button></div><form id="constellate-new-form" hidden><label for="constellate-name">Constellation name</label><input id="constellate-name" maxlength="120" required><label for="constellate-weeks">Weeks, for a course (optional)</label><input id="constellate-weeks" type="number" min="0" max="16" inputmode="numeric" placeholder="One thread per week"><button>Create constellation</button><button type="button" data-cancel-form>Cancel</button></form><details id="weave-settings"><summary>Details</summary><form id="weave-settings-form"><label for="weave-title">Title</label><input id="weave-title" maxlength="120" required><label for="weave-author">Author (optional)</label><input id="weave-author" maxlength="180"><label for="weave-note">Introduction (optional)</label><textarea id="weave-note" rows="2" maxlength="10000"></textarea><button>Save</button></form><label for="weave-import">Import a constellation (JSON)</label><input id="weave-import" type="file" accept="application/json,.json"><button type="button" id="weave-discard" class="weave-discard">Delete this constellation</button></details><div id="weave-editor"><div class="weave-thread-heading"><h3>Threads</h3><button id="weave-new-thread">+ Thread</button><button id="constellate-idea" title="Write a question or idea as a card">+ Idea</button></div><form id="weave-thread-form" hidden><label for="weave-thread-name">Thread name</label><input id="weave-thread-name" maxlength="100" required placeholder="Water defense"><fieldset class="weave-dyes"><legend>Star color</legend>${DYES.map(([k,n],i)=>`<label title="${n}"><input type="radio" name="weave-dye" value="${k}"${i===0?" checked":""}><i style="background:${palette[k][1]}"></i><span>${n}</span></label>`).join("")}</fieldset><label for="weave-thread-description">Description (optional)</label><textarea id="weave-thread-description" maxlength="1200" rows="2"></textarea><button>Create thread</button><button type="button" data-cancel-thread>Cancel</button><div class="weave-theme-start"><label for="weave-theme-start">Or start from a theme</label><select id="weave-theme-start"></select></div></form><div id="weave-draw-help" role="status" hidden><span>Drawing on <b id="weave-draw-name"></b>. Click cards on the map in order, or drag from one card’s connector to another.</span><button type="button" id="weave-draw-done">Done drawing</button></div><div id="weave-legend" aria-label="Threads and visibility"></div><div class="constellate-actions"><button id="constellate-add-current" hidden>Add selected film</button><button id="constellate-connect" aria-pressed="false" hidden>Connect</button></div><div id="constellate-context" role="group" aria-label="Selected card" hidden></div><section id="constellate-inline" hidden aria-label="Connection note"></section><div id="constellate-detail"></div><section id="weave-order"><div class="weave-order-head"><h3 id="weave-order-title"></h3><span class="weave-order-tools"><button type="button" id="weave-sort-year" title="Order this thread by year">By year</button><button type="button" id="weave-sort-place" title="Order this thread as a route between places">By place</button><button type="button" id="weave-thread-edit">Edit</button></span></div><p id="weave-order-summary"></p><form id="weave-thread-edit-form" hidden><label for="weave-edit-name">Thread name</label><input id="weave-edit-name" maxlength="100" required><fieldset class="weave-dyes"><legend>Star color</legend>${DYES.map(([k,n])=>`<label title="${n}"><input type="radio" name="weave-edit-dye" value="${k}"><i style="background:${palette[k][1]}"></i><span>${n}</span></label>`).join('')}</fieldset><label for="weave-edit-description">Description</label><textarea id="weave-edit-description" maxlength="1200" rows="3"></textarea><div class="constellate-actions"><button>Save thread</button><button type="button" id="weave-edit-cancel">Cancel</button><button type="button" id="weave-thread-dup">Duplicate thread</button><button type="button" id="weave-edit-delete" class="weave-discard">Delete thread</button></div></form><ol id="weave-order-list" aria-label="Thread order"></ol></section><section id="weave-suggest" hidden aria-label="Suggested next films"></section><section id="weave-compare" hidden aria-label="Compare two threads"></section><div class="weave-browse"><div class="weave-browse-head"><span>Adding to <b id="weave-target-name"></b></span><select id="weave-target" hidden aria-hidden="true" tabindex="-1"></select></div><div class="weave-az-tabs"><button data-az-tab="film" aria-pressed="true">Films</button><button data-az-tab="maker" aria-pressed="false">Filmmakers</button><span id="weave-az-count"></span></div><label class="sr-only" for="constellate-search">Find films, filmmakers, nations or themes</label><input id="constellate-search" type="search" placeholder="Search titles, filmmakers, peoples or themes…" autocomplete="off" aria-keyshortcuts="/"><p class="weave-media-note">Sourced film images where available; lettered tiles indicate no verified image yet.</p><nav id="weave-az-letters" aria-label="Jump to letter"></nav><div id="constellate-results"></div></div></div><section id="weave-read-panel" hidden aria-label="Follow this constellation"></section><section id="weave-share-panel" hidden><h3>Share this constellation</h3><label for="weave-share-mode">Open link in</label><select id="weave-share-mode"><option value="read">Follow film by film</option><option value="play">Play this constellation</option></select><p>A share link contains this saved snapshot.</p><label class="sr-only" for="weave-url">Constellation URL</label><input id="weave-url" readonly><div class="constellate-actions"><button id="weave-copy-url">Copy link</button><button id="weave-copy-citation">Copy citation</button><button id="weave-export-json">JSON</button><button id="weave-export-csv">CSV</button></div><p id="weave-citation"></p></section><p id="constellate-status" role="status" aria-live="polite"></p></aside>`);
 map.insertAdjacentHTML('beforeend',`<section id="weave-player" aria-label="Play this constellation" hidden><div class="weave-player-controls"><button id="weave-play-prev" aria-label="Previous film">← Previous</button><button id="weave-play-pause">Play</button><span id="weave-play-progress" role="status" aria-live="polite"></span><label class="weave-play-speed" for="weave-play-speed">Pace <select id="weave-play-speed" aria-label="Time per film"><option value="4000">4s</option><option value="6000" selected>6s</option><option value="10000">10s</option></select></label><button id="weave-play-next" aria-label="Next film">Next →</button><button id="weave-play-close">Close ×</button></div><div class="weave-title-card"><span class="weave-play-art"><img id="weave-play-image" alt="" hidden><span id="weave-play-fallback" class="weave-play-fallback" role="img" aria-label="Title-based image placeholder">·</span></span><div><small id="weave-play-thread"></small><h2 id="weave-play-title"></h2><p id="weave-play-maker"></p><p id="weave-play-themes"></p><p id="weave-play-subtitle"></p></div></div></section>`);
 $('#constellate-graph').insertAdjacentHTML('afterend','<section id="weave-offmap-rail" hidden aria-label="Films whose land has not yet been mapped"><div class="weave-offmap-heading"><strong>Off the map</strong><small>Land not yet mapped</small></div><div class="weave-offmap-items" role="list" aria-label="Off the map films in thread order"></div></section>');
 // Put the SVG after the toolbar in keyboard tab order; explicit z-index preserves map stacking.
 $('#constellate-mode').after($('#constellate-graph'));
 const graph=$('#constellate-graph'),offMapRail=$('#weave-offmap-rail'),offMapItems=offMapRail.querySelector('.weave-offmap-items'),panel=$('#constellate-popup'),context=$('#constellate-context'),inline=$('#constellate-inline');
 $('#constellate-mode .weave-skip-to-graph').addEventListener('click',e=>{
  e.preventDefault();graph.focus({preventScroll:true});
 });
 $('#constellate-search').insertAdjacentHTML('afterend','<div id="weave-discovery-tools" class="weave-discovery-tools"><label>Order <select id="weave-discovery-order" aria-label="Sort discovered films"><option value="relevance">Relevance / A–Z</option><option value="title">Title A–Z</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label><label><input id="weave-discovery-unadded" type="checkbox"> Not on thread</label><label><input id="weave-discovery-art" type="checkbox"> With sourced image</label><label class="weave-discovery-facet">Country <select id="weave-discovery-country" aria-label="Filter by recorded country"><option value="">All countries</option></select></label><label class="weave-discovery-facet">Decade <select id="weave-discovery-decade" aria-label="Filter by decade"><option value="">All decades</option></select></label><label class="weave-discovery-facet">Form <select id="weave-discovery-form" aria-label="Filter by published film form"><option value="">All forms</option></select></label><label class="weave-discovery-facet">Length <select id="weave-discovery-length" aria-label="Filter by published film length"><option value="">All lengths</option></select></label><button type="button" id="weave-discovery-clear" aria-label="Clear film search and filters">Clear</button></div><p class="weave-discovery-hint">Search titles, filmmakers, peoples, places and themes. Press / to search; Esc clears.</p><p id="weave-discovery-count" role="status" aria-live="polite" class="weave-discovery-count"></p>');
 $('#weave-legend').insertAdjacentHTML('beforebegin','<div class="weave-focus-actions"><button id="weave-focus-thread" type="button" aria-pressed="false" title="Temporarily display only the selected thread; no saved content changes">Focus selected thread</button></div>');
  $('#weave-order').insertAdjacentHTML('beforeend','<section id="weave-theme-more" class="weave-theme-more" aria-label="Explore more films in this theme" hidden></section>');
 let enabled=false,reading=false,drawThread=false,drawLast=null,active=null,connecting=false,first=null,shiftFirst=null,pointer=null,drag=null,dragLink=null,suppress=null,busy=false,entry=null,draft=null,draftKey=null,frame=0,readIndex=0,orderDrag=null,pendingPicker=null,size={width:900,height:650},positions=new Map(),anchors=new Map(),offMapIds=new Set(),offMapSignature='',offMapActive='',offMapScrollSignature='',cameraBasePositions=new Map(),cameraBaseAnchors=new Map(),cameraBaseWarp=null;const histories=new Map(),known=new Map(S.state.collections.map(c=>[c.id,copy(c)]));
 const dimensions=()=>{const b=$('#atlas').getBoundingClientRect();size={width:b.width||900,height:b.height||650};$('#atlas').style.setProperty('--weave-map-height',size.height+'px');return size;},NW=()=>size.width<500?132:158,NH=42,top=()=>size.width<681?128:112;
 const snapshot=c=>{const x=copy(c);delete x.updatedAt;return x;};
 const clearNotice=()=>{clearTimeout(status.t);$('#weave-notice').hidden=true;$('#weave-notice').textContent='';};const status=message=>{$('#constellate-status').textContent=message;clearNotice();$('#weave-notice').textContent=message;$('#weave-notice').hidden=!message;if(message)status.t=setTimeout(clearNotice,4000);};
 function history(){if(!histories.has(S.current().id))histories.set(S.current().id,{undo:[],redo:[]});return histories.get(S.current().id);}
 function record(before,after,label){if(JSON.stringify(snapshot(before))===JSON.stringify(snapshot(after)))return;const h=history();h.undo.push({before,after,label});if(h.undo.length>40)h.undo.shift();h.redo=[];}
 function transaction(label,fn,redraw=true){const before=copy(S.current());busy=true;let result;try{result=fn();}finally{busy=false;}const after=copy(S.current());
 const changed=JSON.stringify(snapshot(before))!==JSON.stringify(snapshot(after));
 if(changed&&result!==false&&!S.failed){
  S.current().editedAt=new Date().toISOString();after.editedAt=S.current().editedAt;
  busy=true;try{S.save();}finally{busy=false;}
 }
 for(const t of after.threads)if(t.items.length>(before.threads.find(x=>x.id===t.id)?.items.length||0))drawStarts.set(t.id,Date.now());
 record(before,after,label);known.set(after.id,after);if(redraw)render();else updateHistory();if(result===false||S.failed){status('Could not save in this browser. Export JSON before leaving.');return false;}return result===undefined?true:result;}
 function restoreSnapshot(value){busy=true;Object.assign(S.current(),copy(value));const ok=S.save();busy=false;known.set(S.current().id,copy(S.current()));if(!S.current().items.some(x=>x.id===active))active=null;cancelConnect();context.hidden=inline.hidden=true;render();if(!ok)status('Could not save. Export JSON before leaving.');}
 function undo(){const h=history(),x=h.undo.pop();if(x){h.redo.push(x);restoreSnapshot(x.before);status('Undid '+x.label.toLowerCase()+'.');}}
 function redo(){const h=history(),x=h.redo.pop();if(x){h.undo.push(x);restoreSnapshot(x.after);status('Redid '+x.label.toLowerCase()+'.');}}
 function updateHistory(){const h=history();$('#constellate-undo').disabled=!h.undo.length;$('#constellate-redo').disabled=!h.redo.length;$('#constellate-undo').title=h.undo.length?'Undo '+h.undo.at(-1).label.toLowerCase():'Nothing to undo';$('#constellate-redo').title=h.redo.length?'Redo '+h.redo.at(-1).label.toLowerCase():'Nothing to redo';}
 function restoreAtlas(value){A.restoreStop(copy(value));const{center,scale,zoom,...st}=copy(value);Object.assign(A.state,st);A.refresh();}
 function relayout(){if(!enabled)return;const view=A.captureState();document.body.classList.toggle('weave-dock-open',!panel.hidden||document.body.classList.contains('weave-browsing'));restoreAtlas(view);dimensions();renderGraph();}
 function open(){const opening=!enabled;document.body.classList.remove('weave-browsing');if(!enabled){entry={state:copy(A.captureState()),scroll:$('#index').scrollTop,url:location.href,x:window.scrollX||0,y:window.scrollY||0};enabled=true;window.AtlasFitCap=8;document.body.classList.add('is-constellating','is-theme-weaving');graph.hidden=false;graph.removeAttribute('hidden');$('#constellate-mode').hidden=false;}
  panel.hidden=false;trigger.setAttribute('aria-expanded','true');A.closeWorkspacePanels();relayout();render();updateAddress();if(opening&&S.current().items.some(x=>x.type!=='concept'))requestAnimationFrame(()=>requestAnimationFrame(()=>{if(enabled&&!unmapped&&!player)fit('quiet');}));}
 function browse(){if(!enabled||document.body.classList.contains('weave-browsing'))return;panel.hidden=true;document.body.classList.add('weave-browsing');trigger.setAttribute('aria-expanded','false');relayout();}
 function close(){document.body.classList.remove('weave-browsing');panel.hidden=true;trigger.setAttribute('aria-expanded','false');document.body.classList.remove('weave-dock-open');relayout();}
 function exit({restore=true}={}){drawThread=false;drawLast=null;focusThread=false;selPushed=false;const browsing=document.body.classList.contains('weave-browsing'),browseState=browsing?copy(A.captureState()):null;if(player)stopPlay();cancelConnect();enabled=false;window.AtlasFitCap=null;graph.setAttribute('hidden','');offMapRail.hidden=true;panel.hidden=true;$('#constellate-mode').hidden=true;$('#weave-notice').hidden=true;$('#weave-timeline').hidden=true;if(unmapped)setUnmapped(false);$('#weave-stepper').hidden=true;document.body.classList.remove('is-constellating','is-theme-weaving','weave-dock-open','weave-browsing');trigger.setAttribute('aria-expanded','false');const prior=entry;entry=null;if(browsing&&browseState)restoreAtlas(browseState);if(restore&&prior&&!browsing){restoreAtlas(prior.state);$('#index').scrollTop=prior.scroll;requestAnimationFrame(()=>{$('#index').scrollTop=prior.scroll;window.scrollTo?.({left:prior.x,top:prior.y,behavior:'instant'});});}if(prior)historyReplace(prior.url);{const u=new URL(location.href);['constellate','weave','read','play'].forEach(k=>u.searchParams.delete(k));if(u.hash.startsWith('#weave='))u.hash='';historyReplace(u.href);}if(browsing)window.AtlasNavigation?.commit('replace');trigger.focus({preventScroll:true});}
 function historyReplace(url){try{window.history.replaceState(window.history.state,'',url);}catch{}}
 function updateAddress(){if(!enabled)return;const u=new URL(location.href);u.searchParams.set('constellate','1');u.searchParams.set('weave',S.current().id);if(reading)u.searchParams.set('read','1');else u.searchParams.delete('read');if(u.hash.startsWith('#weave='))u.hash='';historyReplace(u.href);}
 function landCaption(x){if(!x)return '';if(x.type==='concept')return 'Idea';const r=reference(x);if(r?.name)return r.name;const a=anchors.get(x.id)||anchor(x);return a?.name||'Land not indexed';}
 function memberships(id){return S.current().threads.filter(t=>t.items.includes(id));}
 function visibleItem(id){return memberships(id).some(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));}
 function references(x){return x.record?A.recordLandReferences(x.record).filter(r=>r.mapped):[];}
 function reference(x){const refs=references(x);return refs.find(r=>r.id===S.current().pins[x.id])||refs[0]||null;}
 // A country centre cannot stand in for a people's land. Unmapped films use
 // the separate Off the map rail; no country coordinate is ever a surrogate pin.
 function anchor(x){if(x.type==='concept')return null;const ref=reference(x);if(!ref)return null;const p=A.landMarkerReference(ref.id);return p?{...p,status:ref.status}:null;}
 function syncOffMapRail(){
  const visible=S.current().threads.filter(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));
  const seen=new Set(),items=[];
  if(!unmapped)for(const t of visible)for(const id of t.items){
   if(seen.has(id))continue;const x=S.current().items.find(x=>x.id===id);
   if(x?.type!=='film'||anchor(x))continue;
   seen.add(id);items.push(x);
  }
  offMapIds=new Set(items.map(x=>x.id));
  offMapRail.hidden=unmapped||!items.length;
  const signature=items.map(x=>x.id).join('|');
  if(signature!==offMapSignature){
   offMapSignature=signature;
   offMapItems.innerHTML=items.map(x=>`<button type="button" role="listitem" data-offmap-item="${esc(x.id)}" title="Land not yet mapped · ${esc(x.title)}">${thumb(x)}<span class="weave-offmap-copy"><b>${esc(x.title)}</b><small>${esc(x.maker||'Film')} · Land not yet mapped</small></span></button>`).join('');
   offMapItems.querySelectorAll('[data-offmap-item]').forEach(b=>b.onclick=()=>choose(b.dataset.offmapItem));
  }
  offMapItems.querySelectorAll('[data-offmap-item]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.offmapItem===active)));
  // Reveal the selected off-map film when navigation advances; respect manual scrolling.
  if(offMapActive!==active||signature!==offMapScrollSignature){
   offMapActive=active;offMapScrollSignature=signature;
   const selected=[...offMapItems.querySelectorAll('[data-offmap-item]')].find(b=>b.dataset.offmapItem===active);
   if(selected){
    const a=selected.getBoundingClientRect(),v=offMapItems.getBoundingClientRect();
    if(a.left<v.left)offMapItems.scrollLeft-=v.left-a.left+8;
    else if(a.right>v.right)offMapItems.scrollLeft+=a.right-v.right+8;
   }
  }
 }
 function offMapPoint(id){
  const b=[...offMapItems.querySelectorAll('[data-offmap-item]')].find(b=>b.dataset.offmapItem===id);
  if(!b)return null;const r=b.getBoundingClientRect(),m=map.getBoundingClientRect();
  return {x:Math.max(18,Math.min(size.width-18,r.left+r.width/2-m.left)),y:Math.max(top()+30,Math.min(size.height-18,r.top-m.top+4)),rail:true};
 }
 offMapItems.addEventListener('scroll',()=>{if(enabled&&!unmapped&&offMapIds.size)renderGraph();},{passive:true});
 function offsetFor(x,i){if(unmapped)return{dx:(i%2?1:-1)*84,dy:-36};return S.current().offsets[x.id]||{dx:90+(i%2)*30,dy:-60+(i%3)*88};}
 function point(x,i){if(x.type==='concept'){const p=drag?.id===x.id&&drag.moved?drag.point:S.current().positions[x.id]||{x:.42,y:.44};return{x:Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,p.x*size.width)),y:Math.max(top()+NH/2,Math.min(size.height-65-NH/2,p.y*size.height))};}
  if(!unmapped&&offMapIds.has(x.id))return offMapPoint(x.id);const a=anchors.get(x.id);if(!a)return{x:Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,NW()/2+24+(i%3)*(NW()+16))),y:size.height-65-NH/2,edge:true};const offscreen=a.x<0||a.x>size.width||a.y<65||a.y>size.height-50;const o=drag?.id===x.id&&drag.moved?drag.offset:offsetFor(x,i);return{x:Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,a.x+o.dx)),y:Math.max(top()+NH/2,Math.min(size.height-65-NH/2,a.y+o.dy)),edge:offscreen};}
 function selectedItem(){const r=A.recordById(A.state.record);return r?raw.find(x=>x.record===r.id&&x.type===(A.state.film?'film':'maker')&&(!A.state.film||x.film===A.state.film)):null;}
 function existingWork(x){return S.current().items.find(i=>i.id===x.id||(x.type==='film'&&i.type==='film'&&key(i)===key(x)));}
 function add(x,threadId=S.current().activeThread){const existing=existingWork(x),beforeCount=S.current().items.length;let id=existing?.id;
  const ok=transaction(existing?'Add card to thread':x.type==='concept'?'Add idea':'Add film',()=>{if(existing)return S.addToThread(existing.id,threadId);const saved=S.add(x,{threadId});id=S.current().selectedItem;if(saved&&x.type==='concept')S.position(id,{x:.42,y:.44});return saved;});if(!ok)return false;active=id;if(drawThread&&threadId===S.current().activeThread)drawLast=id;const item=S.current().items.find(x=>x.id===id),ref=item&&reference(item);if(ref){const a=anchor(item);if(a){if(beforeCount===0)A.focusLandOnMap(ref.id);else if(a.x<0||a.x>size.width||a.y<100||a.y>size.height-60)fit();}}render();status('Added to '+(S.current().threads.find(t=>t.id===threadId)?.name||'thread')+'.');return true;}
 function fit(mode){
  const items=S.current().items.filter(x=>visibleItem(x.id)&&x.type!=='concept');
  const ids=[...new Set(items.filter(x=>anchor(x)).map(x=>reference(x).id))];
  // Fit mapped territories only. Unmapped films stay in the rail, never at a
  // country's centre or an invented territorial coordinate.
  if(ids.length&&!unmapped)A.fitLandReferences(ids);
  renderGraph();
  if(mode!=='quiet')status(ids.length?'Fitted to the mapped land references.':items.length?'The visible films have no mapped land references yet.':'Ideas stay in your free arrangement.');
 }
 function wrap(title){const lines=[''];for(const word of String(title).split(/\s+/)){if((lines.at(-1)+' '+word).trim().length>20&&lines.length<2)lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();}return lines.map(l=>l.length>23?l.slice(0,22)+'…':l);}
 let tpCache=new Map();function threadPoints(t,...rest){if(rest.length)return threadPointsRaw(t,...rest);if(!tpCache.has(t.id))tpCache.set(t.id,threadPointsRaw(t));return tpCache.get(t.id);}
 function threadPointsRaw(thread){const runs=[];let pts=[];const flush=()=>{if(pts.length)runs.push(curve(pts));pts=[];};for(const id of thread.items){const item=S.current().items.find(x=>x.id===id),p=positions.get(id);if(!p){flush();continue;}const prior=pts.at(-1);if(prior&&Math.hypot(p.x-prior.x,p.y-prior.y)<2)continue;pts.push({x:p.x,y:p.y});}flush();return runs;}
 function curve(points){if(points.length<2)return points;const c=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(!a.loop&&!b.loop){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,lift=Math.min(d*.17,70);c.push({x:(a.x+b.x)/2-dy/d*lift,y:(a.y+b.y)/2+dx/d*lift});}c.push(b);}const out=[c[0]];for(let i=0;i<c.length-1;i++){const p0=c[Math.max(0,i-1)],p1=c[i],p2=c[i+1],p3=c[Math.min(c.length-1,i+2)],seg=Math.max(4,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/4));for(let k=1;k<=seg;k++){const t=k/seg,t2=t*t,t3=t2*t;out.push({x:.5*(2*p1.x+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),y:.5*(2*p1.y+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)});}}return out;}
 function threadMid(thread){const run=threadPoints(thread).sort((a,b)=>b.length-a.length)[0];return run&&run.length>1?run[Math.floor(run.length/2)]:null;}
 function loomWarp(){let out='';for(let lon=-175;lon<=-10;lon+=5){let d='',pen=false;for(let lat=-58;lat<=84;lat+=2){const q=A.screenPoint([lon,lat]);if(!q||!isFinite(q[0])||!isFinite(q[1])){pen=false;continue;}d+=(pen?'L':'M')+q[0].toFixed(1)+','+q[1].toFixed(1);pen=true;}if(d)out+=`<path d="${d}"/>`;}return out;}
 function shade(hex,amt){const n=parseInt(String(hex).slice(1),16);if(isNaN(n))return hex;const f=c=>Math.round(amt>0?c+(255-c)*amt:c*(1+amt));return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(f).map(v=>v.toString(16).padStart(2,'0')).join('');}
 function threadKnots(t){const runs=threadPoints(t);if(!runs.length||!runs[0].length)return '';const night=document.documentElement.dataset.readingTheme==='night'||!!player,dye=palette[t.color]||palette.indigo,c=night?dye[1]:dye[0],dk=shade(c,night?-.45:-.4),lt=shade(c,night?.45:.5),r0=runs[0],rz=runs.at(-1),a=r0[0],a2=r0[Math.min(r0.length-1,4)],z=rz.at(-1),z2=rz[Math.max(0,rz.length-5)],ang=(p,q)=>(Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI).toFixed(1),f=v=>v.toFixed(1);
  const loop=`<g class="weave-cord-loop" transform="translate(${f(a.x)},${f(a.y)}) rotate(${ang(a2,a)})"><ellipse cx="13" rx="6" ry="3.8" stroke="${dk}"/><ellipse cx="13" rx="6" ry="3.8" stroke="${c}" class="ply"/></g>`;
  const tassel=rz.length>1?`<g class="weave-tassel" transform="translate(${f(z.x)},${f(z.y)}) rotate(${ang(z2,z)})">${[-24,-9,7,22].map((d,i)=>`<path d="M7,0 L${f(7+15*Math.cos(d*Math.PI/180))},${f(15*Math.sin(d*Math.PI/180))}" stroke="${i%2?lt:c}"/>`).join('')}</g>`:'';
  const groups=new Map();t.items.forEach((id,i)=>{const item=S.current().items.find(x=>x.id===id),p=item&&item.type!=='concept'?positions.get(id):null;if(!p)return;const k=Math.round(p.x)+','+Math.round(p.y);if(!groups.has(k))groups.set(k,{p,ids:[],nums:[],others:new Set()});const g=groups.get(k);g.ids.push(id);g.nums.push(i+1);S.current().threads.filter(o=>o.visible&&o.id!==t.id&&o.items.includes(id)).forEach(o=>g.others.add(o));});
  const label=n=>{if(n.length===1)return String(n[0]);const run=n.every((v,k)=>!k||v===n[k-1]+1);return run?n[0]+'–'+n.at(-1):n.length<=2?n.join('·'):n[0]+' +'+(n.length-1);};
  const stops=[...groups.values()].map(g=>{const txt=label(g.nums),feat=g.ids.some(x=>filmOf(S.current().items.find(y=>y.id===x))?.weaveLength==='F'),r=Math.max(8.5,4.5+txt.length*3.1)+(feat?2.2:0),fc=famColor(S.current().items.find(y=>y.id===g.ids[0])),others=[...g.others],id=g.ids[0],cur=player&&g.ids.includes(active);const titles=g.ids.map(x=>S.current().items.find(y=>y.id===x)?.title||'').join(', ');return `<g class="weave-stop${cur?' current':''}${!player&&active&&g.ids.includes(active)?' selected':''}${others.length?' crossing':''}" data-weave-knot="${esc(id)}" role="button" tabindex="-1" aria-label="${esc(txt)}. ${esc(titles)}${others.length?' · crosses '+esc(others.map(o=>o.name).join(', ')):''}" transform="translate(${f(g.p.x)},${f(g.p.y)})">${others.length?`<circle class="weave-crossing-ring" r="${(r+5).toFixed(1)}"/><text class="weave-cross-count" x="${(r+3).toFixed(1)}" y="${(-r-3).toFixed(1)}">×${others.length+1}</text>`:''}${fc?`<circle class="weave-family-ring" r="${(r+1.9).toFixed(1)}" stroke="${fc}"/>`:''}<circle r="${r.toFixed(1)}" fill="${dk}" stroke="${lt}"/><text y="3.4" text-anchor="middle">${txt}</text></g>`;}).join('');
  const marks=t.items.map((id,i)=>{if(!i||!t.notes[id])return '';const a=positions.get(t.items[i-1]),b=positions.get(id);if(!a||!b)return '';const seg=curve([{x:a.x,y:a.y},{x:b.x,y:b.y}]),m=seg[Math.floor(seg.length/2)];return `<g class="weave-note-mark" data-weave-knot="${esc(id)}" data-note="${esc(t.notes[id].slice(0,280))}" transform="translate(${f(m.x)},${f(m.y)})"><rect x="-5" y="-5" width="10" height="10" rx="1.5" transform="rotate(45)" fill="${lt}" stroke="${dk}"/></g>`;}).join('');
  return marks+stops;}
 function threadMid(t){const run=threadPoints(t).slice().sort((a,b)=>b.length-a.length)[0];return run&&run.length?run[Math.floor(run.length/2)]:null;}
 function threadLabelPath(t){const run=threadPoints(t).slice().sort((a,b)=>b.length-a.length)[0];if(!run||run.length<24)return '';const pts=run[0].x>run.at(-1).x?run.slice().reverse():run;return 'M'+pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join('L');}
 function braided(thread,strand=0){return threadPoints(thread).map(points=>{let distance=0;return points.map((p,i)=>{const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;if(i)distance+=Math.hypot(p.x-prev.x,p.y-prev.y);const total=points.length-1||1,taper=Math.min(1,i/8,(total-i)/8),wave=strand<0?0:Math.sin(distance/22*Math.PI*2+strand*Math.PI*2/3)*2.6*Math.max(0,taper);return(i?'L':'M')+(p.x-dy/len*wave).toFixed(2)+','+(p.y+dx/len*wave).toFixed(2);}).join('');}).join('');}
 function knotRings(id,x,y){const all=memberships(id),visible=all.filter(t=>t.visible);if(all.length<2)return '';return `<g class="weave-knot" data-weave-knot="${esc(id)}" role="button" tabindex="0" aria-label="Knot: ${esc(all.map(t=>t.name).join(', '))}">${visible.map((t,i)=>`<circle cx="${x}" cy="${y}" r="${11+i*3}" fill="none" stroke="${color(t)}" stroke-width="3"/>`).join('')}<title>${esc(all.map(t=>t.name).join(' × '))}</title></g>`;}
 // Beta 86: cards that land on top of each other are eased apart on screen; saved positions are untouched.
 const chipText=(v,n)=>{v=String(v||'');return v.length>n?v.slice(0,n-1).trimEnd()+'…':v;};
 function relax(shown){const ids=[...positions.keys()].filter(id=>(!shown||shown.has(id))&&!(drag?.id===id&&drag.moved)&&(unmapped||!offMapIds.has(id))),w=NW()+10,h=NH+8;for(let it=0;it<60;it++){let moved=false;for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){const p=positions.get(ids[a]),q=positions.get(ids[b]),dx=q.x-p.x,dy=q.y-p.y;if(Math.abs(dx)>=w||Math.abs(dy)>=h)continue;const oy=(h-Math.abs(dy))/2+.5,ox=(w-Math.abs(dx))/2+.5;if(oy<=ox){const d=dy>0||(dy===0&&a%2)?1:-1;p.y-=d*oy;q.y+=d*oy;}else{const d=dx>=0?1:-1;p.x-=d*ox;q.x+=d*ox;}moved=true;}for(const id of ids){const p=positions.get(id);p.x=Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,p.x));p.y=Math.max(top()+NH/2,Math.min(size.height-65-NH/2,p.y));}if(!moved)break;}}
 function renderGraph(){if(!enabled)return;graph.classList.toggle('weave-drawing-mode',drawThread);graph.classList.toggle('weave-play-focus',!!player);if(player)requestAnimationFrame(playLight);tpCache=new Map();applyNight();dimensions();syncOffMapRail();anchors=unmapped?relationLayout():new Map();if(!unmapped)for(const x of S.current().items){const p=anchor(x);if(p)anchors.set(x.id,p);}positions=new Map();const shown=cardSet();S.current().items.forEach((x,i)=>{if(visibleItem(x.id)){const p=point(x,i);if(p)positions.set(x.id,p);}});if(starMode&&shown)for(const [id,p] of positions){const a=anchors.get(id);if(a&&!shown.has(id)){p.x=Math.max(14,Math.min(size.width-14,a.x));p.y=Math.max(top()+10,Math.min(size.height-60,a.y));}}relax(shown);graph.dataset.density=S.current().items.filter(x=>visibleItem(x.id)).length>12?'dense':'normal';graph.setAttribute('viewBox',`0 0 ${size.width} ${size.height}`);
  const visibleThreads=S.current().threads.filter(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));
  const threads=visibleThreads.map((t,ti)=>{
   const elapsed=Date.now()-(drawStarts.get(t.id)||0),drawing=elapsed<1400&&!motion.matches;
   const anim=drawing?' weave-drawing':'',delay=`style="--draw-delay:-${elapsed}ms"`;
   const night=document.documentElement.dataset.readingTheme==='night'||!!player,dye=palette[t.color]||palette.indigo;
   const base=braided(t,-1),ink=night?dye[1]:dye[0],highlight=shade(ink,night?.35:.55),start=t.name?threadPoints(t)[0]?.[0]:null;
   const selected=S.activeThread().id===t.id;
   return `<g class="weave-thread${selected?' is-active':''}${!selected&&visibleThreads.length>1?' is-quiet':''}${player&&playThread===t.id?' is-focus':''}" data-thread="${esc(t.id)}"><path class="weave-thread-shadow" d="${base}"/><path class="weave-thread-halo" d="${base}"/><path class="weave-thread-glow" stroke="${ink}" d="${base}"/>${[shade(ink,-.28),ink,highlight].map((col,k)=>`<path class="weave-cord weave-strand${anim}" pathLength="1" ${delay} stroke="${col}" d="${braided(t,k)}"/>`).join("")}${threadKnots(t)}${start?(m=>`<text class="weave-thread-name weave-thread-name-path" text-anchor="middle" x="${m.x.toFixed(1)}" y="${(m.y-11).toFixed(1)}" fill="${ink}">${esc(t.name.slice(0,40))}</text>`)(threadMid(t)||start):''}<title>${esc(t.name)}</title></g>`;
  }).join('');
  const edges=S.current().links.map(l=>{const a=positions.get(l.source),b=positions.get(l.target);if(!a||!b)return '';return `<g data-constellate-edge="${esc(l.id)}" role="button" tabindex="0" aria-label="${(l.sourceURL||l.kind==='atlas-record')?'Source linked':'Interpretive dream thread'}: ${esc(l.label)}"><path class="constellate-edge-hit" d="M${a.x},${a.y}Q${(a.x+b.x)/2},${(a.y+b.y)/2-38} ${b.x},${b.y}"/><path class="constellate-edge ${(l.sourceURL||l.kind==='atlas-record')?'sourced-thread':'dream-thread'}" d="M${a.x},${a.y}Q${(a.x+b.x)/2},${(a.y+b.y)/2-38} ${b.x},${b.y}"/><text class="constellate-edge-label" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-24}" text-anchor="middle">${esc(l.label.slice(0,32))}</text></g>`;}).join('');
  /* star names keep clear of thread names, and a film whose land is off-screen shows no name at the map edge (its thread still runs to the edge) */starBoxes=starMode?visibleThreads.map(t=>{const m=threadMid(t),w=Math.min(40,t.name.length)*7.4+10;return m?[m.x-w/2,m.y-26,m.x+w/2,m.y-4]:null;}).filter(Boolean):[];const onScreen=a=>a&&a.x>=0&&a.x<=size.width&&a.y>=top()&&a.y<=size.height;const nodes=S.current().items.map((x,i)=>{const p=positions.get(x.id),a=anchors.get(x.id);if(!p||(!unmapped&&offMapIds.has(x.id)))return '';if(shown&&!shown.has(x.id))return starMode&&x.type!=='concept'&&visibleItem(x.id)&&(unmapped||onScreen(a))?starLabel(x,p):'';const image=sourceImage(x),pict=x.type!=='concept',member=memberships(x.id),t=member.find(t=>t.visible),land=a?.name||'Idea';return `<g class="weave-item" data-weave-item="${esc(x.id)}">${p.edge?`<path class="weave-edge-arrow" d="M${p.x-6},${p.y-31} l6,-8 l6,8 z" fill="${color(t||S.activeThread())}" aria-hidden="true"><title>Thread continues beyond visible map</title></path>`:''}${a?`<line class="weave-leader" x1="${a.x}" y1="${a.y}" x2="${p.x}" y2="${p.y}"/>${t?'':`<circle class="weave-land-pin" cx="${a.x}" cy="${a.y}" r="5" fill="${color(t||S.activeThread())}" data-land-pin="${esc(a.id)}"><title>${esc(a.name)}</title></circle>`}`:''}<g class="constellate-card${x.type==='concept'?' concept':' pinned'}${active===x.id||first===x.id||shiftFirst===x.id?' selected':''}" data-constellate-node="${esc(x.id)}" data-land="${esc(a?.id||'')}" transform="translate(${p.x-NW()/2},${p.y-NH/2})" style="--weave-focus-color:${color(t||S.activeThread())}" tabindex="0" role="button" aria-label="${esc(x.title)}. ${esc(land)}. ${a?'Drag or use arrow keys to offset this label; its land pin stays fixed.':'Idea: drag freely.'}"><rect width="${NW()}" height="${NH}" rx="5"/>${pict?`<rect x="5" y="5" width="32" height="32" rx="5" style="fill:${color(t||S.activeThread())};fill-opacity:.19;stroke:none"/><text x="21" y="25" text-anchor="middle" font-size="11" font-weight="600" fill="var(--reading-ink)">${esc(initials(x).slice(0,2))}</text>${image?`<clipPath id="weave-chip-${i}"><rect x="5" y="5" width="32" height="32" rx="5"/></clipPath><image class="weave-card-art" href="${esc(image)}" onerror="this.style.display='none'" x="5" y="5" width="32" height="32" preserveAspectRatio="xMidYMid slice" clip-path="url(#weave-chip-${i})"/>`:''}<rect class="weave-chip-ring" x="5" y="5" width="32" height="32" rx="5" stroke="${color(t||S.activeThread())}"/>`:''}<text class="weave-chip-title" x="${pict?43:11}" y="19">${esc(chipText(x.title,pict?16:21))}</text><text class="weave-land-caption" x="${player?NW()/2+(lw=>Math.max(8+lw-p.x,Math.min(size.width-8-lw-p.x,0)))(Math.min(64,land.length)*(size.width<700?4:5.2)):pict?43:11}" y="${player?NH/2+37:32}">${esc(chipText(land,player?64:pict?20:25))}</text><path class="weave-film-star" d="M0,-6 L2,-2 L6,0 L2,2 L0,6 L-2,2 L-6,0 L-2,-2Z" transform="translate(3,3)"/><circle class="weave-connect-handle" data-connect-handle="${esc(x.id)}" cx="${NW()-9}" cy="${NH/2}" r="6" role="button" tabindex="0" aria-label="Connect from ${esc(x.title)}"/>${knotRings(x.id,NW()-24,NH/2)}<title>${esc(x.title)} · ${esc(land)} · ${esc(member.map(t=>t.name).join(' / '))}</title></g></g>`;}).join('');
  const warp=unmapped?'':loomWarp();$('#weave-empty-hint').hidden=!!S.current().items.length||!!player;graph.innerHTML=`<g id="constellate-world"><g class="loom-warp" aria-hidden="true">${warp}</g>${unmapped?relAxis():''}${threads}${edges}<path id="constellate-preview" class="constellate-preview"/>${nodes}</g>`;cameraBasePositions=new Map([...positions].map(([id,p])=>[id,{...p}]));cameraBaseAnchors=new Map([...anchors].map(([id,p])=>[id,{...p}]));const wa=A.screenPoint([-120,30]),wb=A.screenPoint([-80,30]);cameraBaseWarp=wa?.every(Number.isFinite)&&wb?.every(Number.isFinite)?{a:wa,b:wb}:null;renderPreview();}
 function renderPreview(){const line=$('#constellate-preview'),source=dragLink?.source||(drawThread?drawLast:null)||first||shiftFirst,a=source&&positions.get(source);if(!line)return;if(!a||(!drawThread&&!connecting&&!dragLink&&!shiftFirst)){line.setAttribute('d','');return;}const b=pointer||{x:a.x+45,y:a.y-25};line.setAttribute('d',`M${a.x},${a.y}Q${(a.x+b.x)/2},${(a.y+b.y)/2-35} ${b.x},${b.y}`);}
 function cancelConnect(){connecting=false;first=shiftFirst=pointer=dragLink=null;draftKey=null;draft=null;}
 function setDrawThread(on){
  drawThread=!!on;drawLast=drawThread?(S.activeThread().items.at(-1)||null):null;
  pointer=null;cancelConnect();
  if(drawThread){open();setRead(false);setTab('thread');}
  if(enabled)render();
  status(drawThread?'Drawing on “'+S.activeThread().name+'.” Select thumbnail cards in order or drag a connector between them. Use Find films to add new cards.':'Drawing finished. The path remains in the constellation.');
 }
 function drawStep(id){
  const x=S.current().items.find(v=>v.id===id);
  if(!x||x.type==='concept'){status('Draw threads through film or filmmaker cards.');return;}
  const t=S.activeThread(),already=t.items.includes(id);
  // A thread is an ordered sequence. Drawing from an older thumbnail creates a
  // named cross-film connection instead of silently reordering that sequence.
  if(drawLast&&drawLast!==t.items.at(-1)&&drawLast!==id){
    const source=drawLast;
    setDrawThread(false);
    connectionForm({source,target:id,label:'',kind:'interpretation'});
    status('Name the direct film-to-film connection.');
    return;
  }
  if(already&&t.items.at(-1)!==id){
    active=id;drawLast=id;pointer=null;renderGraph();
    status('Starting at '+x.title+'. Select or drag to another thumbnail to name a direct connection.');
    return;
  }
  if(!already&&!transaction('Draw thread to '+x.title,()=>S.addToThread(id,t.id)))return;
  active=id;drawLast=id;pointer=null;context.hidden=inline.hidden=true;
  render();status((already?'Selected ':'Connected to ')+x.title+' · '+S.activeThread().items.length+' cards on '+t.name+'. Select the next card.');
 }
 function startLink(id=null){drawThread=false;drawLast=null;reading=false;connecting=true;first=id;shiftFirst=null;pointer=null;inline.hidden=context.hidden=true;open();render();status(id?'Choose another card.':'Choose the first card.');}
 function choose(id,{shift=false}={}){if(drawThread&&!shift){drawStep(id);return;}active=id;if(shift){if(!shiftFirst){shiftFirst=id;first=null;connecting=false;renderGraph();status('Shift-click another card.');return;}if(shiftFirst===id)return;const source=shiftFirst;shiftFirst=null;connectionForm({source,target:id,label:'',kind:'interpretation'});return;}
  if(connecting){if(!first){first=id;renderGraph();$('#constellate-mode span').textContent='Choose another card';status('Choose another card.');return;}if(first===id){status('Choose a different card.');return;}const source=first;connecting=false;first=pointer=null;connectionForm({source,target:id,label:'',kind:'interpretation'});status('Name this connection.');return;}renderGraph();showContext();}
 function showContext(){if(reading)setRead(false);setTab('thread');const x=S.current().items.find(x=>x.id===active);if(!x)return;openDock();if(!selPushed&&enabled){try{window.history.pushState({...(window.history.state||{}),weaveSelection:true},'',location.href);selPushed=true;}catch{}}if(!phone.matches)requestAnimationFrame(()=>context.hidden||context.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'}));inline.hidden=true;const member=memberships(x.id),noteThread=member.find(t=>t.id===S.current().activeThread)||member.find(t=>t.visible)||member[0]||S.activeThread(),refs=references(x),r=reference(x),links=S.current().links.filter(l=>l.source===x.id||l.target===x.id);context.hidden=false;context.innerHTML=`${stepNav(x)}<div class="weave-context-preview">${thumb(x)}<h3>${esc(x.title)}</h3></div>${terms(x).length?`<p class="weave-context-themes">${esc(terms(x).join(' · '))}${filmOf(x)?.themeSource?` · <a href="${esc(filmOf(x).themeSource)}" target="_blank" rel="noopener noreferrer">synopsis ↗</a>`:''}</p>`:''}${x.maker?`<p>${esc(x.maker)}</p>`:''}<p class="weave-placement">${x.type==='concept'?'Freely placed idea':r?esc(r.name)+(r.status==='sourced'?'':' · catalog link'):'Land not indexed · kept off the map'}</p><div class="constellate-actions"><button id="constellate-start-link">Connect</button>${x.record?'<button id="constellate-view">View '+(x.film?'film':'filmmaker')+'</button>':''}<button id="constellate-remove">Remove card</button></div><h4>${member.length>1?'Knot · crossing threads':'Thread membership'}</h4><div class="weave-memberships">${S.current().threads.map(t=>`<label><input type="checkbox" data-member-thread="${esc(t.id)}" ${t.items.includes(x.id)?'checked':''}><i style="background:${color(t)}"></i>${esc(t.name)}</label>`).join('')}</div>${refs.length>1?`<label for="weave-pin-reference">Land marker</label><select id="weave-pin-reference">${refs.map(ref=>`<option value="${esc(ref.id)}"${ref.id===r?.id?' selected':''}>${esc(ref.name)}</option>`).join('')}</select>`:''}<label for="weave-card-note">Note on ${esc(noteThread.name)} <small>shown on the thread just before this film</small></label><textarea id="weave-card-note" rows="3" maxlength="10000">${esc(noteThread.notes[x.id]||'')}</textarea>${links.length?'<h4>Connections</h4>'+links.map(l=>`<button class="weave-note-link" data-edit-connection="${esc(l.id)}">${esc(l.label)}</button>${l.note?`<p>${esc(l.note)}</p>`:''}`).join(''):''}`;
  context.querySelectorAll('[data-weave-step]').forEach(b=>b.onclick=()=>stepBy(+b.dataset.weaveStep));context.querySelector('[data-weave-back]').onclick=backToList;updateStepper();renderOrder();$('#constellate-start-link').onclick=()=>startLink(x.id);$('#constellate-view')?.addEventListener('click',()=>{exit({restore:false});x.film?A.openProfileFilm(x.record,x.film):A.selectRecord(x.record);});$('#constellate-remove').onclick=()=>{transaction('Remove card',()=>S.remove(x.id));active=null;context.hidden=true;};context.querySelectorAll('[data-member-thread]').forEach(input=>input.onchange=()=>{transaction('Edit thread membership',()=>input.checked?S.addToThread(x.id,input.dataset.memberThread):S.removeFromThread(x.id,input.dataset.memberThread));showContext();});$('#weave-pin-reference')?.addEventListener('change',e=>{transaction('Choose land reference',()=>{S.current().pins[x.id]=e.target.value;return S.save();});A.focusLandOnMap(e.target.value);showContext();});$('#weave-card-note').onchange=e=>transaction('Edit thread note',()=>S.threadNote(noteThread.id,x.id,e.target.value));context.querySelectorAll('[data-edit-connection]').forEach(b=>b.onclick=()=>connectionForm(S.current().links.find(l=>l.id===b.dataset.editConnection)));}
 function openDock(){document.body.classList.remove('weave-browsing');if(panel.hidden){panel.hidden=false;trigger.setAttribute('aria-expanded','true');relayout();}}
 function connectionForm(link){openDock();$('#constellate-mode span').textContent=link.id?'Edit connection':'Name this connection';reading=false;$('#weave-editor').hidden=false;$('#weave-read-panel').hidden=true;$('#weave-share-panel').hidden=true;context.hidden=true;connecting=false;first=shiftFirst=dragLink=pointer=null;draft=copy(link);draftKey=link.id||link.source+'|'+link.target;inline.hidden=false;const title=id=>S.current().items.find(x=>x.id===id)?.title||'';inline.innerHTML=`<form id="constellate-link-form"><h3>Connect</h3><p>${esc(title(link.source))} → ${esc(title(link.target))}</p><div class="weave-quick-labels">${['answers','echoes','shares land','shares language','same collective','counterpoint'].map(label=>`<button type="button" data-quick-label="${label}">${label}</button>`).join('')}</div><label for="constellate-link-label">Connection label</label><input id="constellate-link-label" required maxlength="180" value="${esc(link.label||'')}" placeholder="Or write your own"><details><summary>Note &amp; source</summary><label for="constellate-link-kind">Type</label><select id="constellate-link-kind"><option value="interpretation">Interpretation</option><option value="question">Question</option><option value="sourced-note">Sourced note</option><option value="atlas-record">Confirmed by atlas record</option></select><label for="constellate-link-note">Note (optional)</label><textarea id="constellate-link-note" rows="2">${esc(link.note||'')}</textarea><label for="constellate-link-source">https source (optional)</label><input id="constellate-link-source" type="url" value="${esc(link.sourceURL||'')}"></details><div class="constellate-actions"><button>Save connection</button>${link.id?'<button type="button" id="constellate-remove-link">Remove</button>':''}<button type="button" id="constellate-cancel-link">Cancel</button></div></form>`;$('#constellate-link-kind').value=link.kind||'interpretation';$('#constellate-link-form').onsubmit=e=>{e.preventDefault();const value={...link,label:$('#constellate-link-label').value.trim(),kind:$('#constellate-link-kind').value,note:$('#constellate-link-note').value,sourceURL:$('#constellate-link-source').value.trim()};if(!value.label)return;if(value.sourceURL&&!/^https:\/\//i.test(value.sourceURL)){status('Use an https source.');return;}if(value.kind==='sourced-note'&&!value.sourceURL){status('Add an https source for a sourced note.');return;}
 if(value.kind==='atlas-record'&&!atlasConfirms(value)){status('The published atlas records do not confirm this claim. Add a note or source as an interpretation.');return;}
 if(transaction(link.id?'Edit connection':'Add connection',()=>{
  const saved=S.link(value);if(saved&&value.kind==='atlas-record'){
   const c=S.current(),l=link.id?c.links.find(l=>l.id===link.id):c.links.at(-1);
   if(l){l.kind='atlas-record';S.save();}
  }
  return saved;
 })){inline.hidden=true;draft=draftKey=null;active=link.target;showContext();status('Connection saved.');}};inline.querySelectorAll('[data-quick-label]').forEach(b=>b.onclick=()=>{
  const label=b.dataset.quickLabel;
  $('#constellate-link-label').value=label;
  if(['shares land','shares language','same collective'].includes(label)){
   if(atlasConfirms({...link,label})){
    $('#constellate-link-kind').value='atlas-record';
    $('#constellate-link-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   }else{
    $('#constellate-link-kind').value='interpretation';
    $('#constellate-link-form details').open=true;
    $('#constellate-link-note').focus({preventScroll:true});
    status('Not confirmed by the published atlas record. Explain or source this interpretation.');
   }
  }else $('#constellate-link-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 });$('#constellate-cancel-link').onclick=()=>{inline.hidden=true;draft=draftKey=null;};$('#constellate-remove-link')?.addEventListener('click',()=>{transaction('Remove connection',()=>S.removeLink(link.id));inline.hidden=true;draft=draftKey=null;});renderGraph();const head=$('#constellate-popup .constellate-heading');if(head&&head.nextElementSibling!==inline)head.after(inline);inline.scrollIntoView({block:'nearest'});$('#constellate-popup').scrollTop=0;$('#constellate-link-label').focus({preventScroll:true});}

 function resetBrowsePage(){
  browsePageStart=0;browsePageLimit=48;browseSignature='';azKey='';
 }

 // Search only published records and mapped land names. Normalise punctuation
 // but never infer Indigenous identity or a land from a surname or subject.
 const searchLoose=v=>norm(v).replace(/['\u2010-\u2015\-]/g,'').replace(/\s+/g,' ').trim();
 const wordTokens=v=>searchLoose(v).split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
 function oneEditOrSwap(a,b){
  if(a.length<6||b.length<5||Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length){
   const diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);
   return diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]];
  }
  const longer=a.length>b.length?a:b,shorter=a.length>b.length?b:a;
  for(let i=0,j=0,skipped=false;i<longer.length;i++,j++){
   if(longer[i]!==shorter[j]){if(skipped)return false;skipped=true;j--;}
  }
  return true;
 }
 const mappedNamesCache=new Map(),searchIndexCache=new Map();
 function mappedLandNames(x){
  if(!x?.record)return [];
  if(!mappedNamesCache.has(x.record)){
   const names=new Set();
   for(const ref of A.recordLandReferences(x.record).filter(r=>r.mapped)){
    if(ref.name)names.add(ref.name);
    const land=A.landById?.(ref.id);
    for(const name of [land?.name,...(Array.isArray(land?.aliases)?land.aliases:[]),land&&A.landDisplayName?.(land)])
     if(typeof name==='string'&&name.trim())names.add(name.trim());
   }
   mappedNamesCache.set(x.record,[...names]);
  }
  return mappedNamesCache.get(x.record);
 }
 function indexedSearchFields(x){
  if(!searchIndexCache.has(x.id)){
   const r=x.record&&A.recordById(x.record),country=r?.country?A.countryByCode?.(r.country)?.name:'';
   const fields=[x.title,x.maker,x.community,...mappedLandNames(x),x.year,country,...tags(x).flatMap(t=>[t.term,t.indigenousTerm,t.gloss,t.language])].filter(Boolean);
   searchIndexCache.set(x.id,{fields:fields.map((v,i)=>({v:norm(v),plain:searchLoose(v),weight:i===0?0:i===1?2:i===2?4:i<3+mappedLandNames(x).length?5:9})),
    tokens:[...new Set(fields.flatMap(wordTokens))]});
  }
  return searchIndexCache.get(x.id);
 }
 function matchSearch(x,q){
  if(!q)return 0;
  const ix=indexedSearchFields(x),plain=searchLoose(q);
  let score=Infinity;
  for(const f of ix.fields){
   if(f.v===q)score=Math.min(score,f.weight);
   else if(plain&&f.plain===plain)score=Math.min(score,5+f.weight);
   else if(f.v.startsWith(q))score=Math.min(score,10+f.weight);
   else if(f.v.includes(q))score=Math.min(score,20+f.weight);
   else if(plain&&f.plain.includes(plain))score=Math.min(score,30+f.weight);
  }
  if(score!==Infinity)return score;
  const tokens=wordTokens(q);
  return tokens.length&&tokens.every(t=>ix.tokens.some(w=>w===t||oneEditOrSwap(t,w)))?50:Infinity;
 }
 const facetKinds=['country','decade','form','length'];
 const facetSelect=k=>$('#weave-discovery-'+k);
 const facetCache=new Map();
 function facetValue(x,kind){
  let value=facetCache.get(x.id);if(!value){
   const r=x.record&&A.recordById(x.record),f=filmOf(x),yr=yearNum(x);
   value={country:r?.country||'',decade:yr?String(Math.floor(yr/10)*10):'',
          form:String(f?.weaveForm||''),length:String(f?.weaveLength||'')};
   facetCache.set(x.id,value);
  }
  return value[kind];
 }
 const facetLabel=(kind,value)=>{
  if(kind==='country')return A.countryByCode?.(value)?.name||value;
  if(kind==='decade')return value+'s';
  if(kind==='length')return ({S:'Short',M:'Mid-length',F:'Feature',R:'Series'})[value]||value;
  return ({D:'Documentary',F:'Fiction',A:'Animation',E:'Experimental',H:'Hybrid',M:'Music Video'})[value]||value;
 };
 function selectedFacets(){return Object.fromEntries(facetKinds.map(k=>[k,facetSelect(k).value]));}
 function passesFacets(x,selected,omit=''){return facetKinds.every(k=>k===omit||!selected[k]||facetValue(x,k)===selected[k]);}
 function refreshFacetOptions(all,q,onlyNew,withArt,thread){
  const chosen=selectedFacets();
  for(const kind of facetKinds){
   const select=facetSelect(kind),eligible=all.filter(x=>{
    const own=onlyNew&&existingWork(x);
    return !(own&&thread.items.includes(own.id))&&(!withArt||!!sourceImage(x))&&
           passesFacets(x,chosen,kind)&&Number.isFinite(matchSearch(x,q));
   });
   const counts=new Map();
   for(const x of eligible){const value=facetValue(x,kind);if(value)counts.set(value,(counts.get(value)||0)+1);}
   const values=[...counts.keys()].sort((a,b)=>kind==='decade'?Number(a)-Number(b):facetLabel(kind,a).localeCompare(facetLabel(kind,b)));
   if(chosen[kind]&&!counts.has(chosen[kind]))values.push(chosen[kind]);
   const label=({country:'All countries',decade:'All decades',form:'All forms',length:'All lengths'})[kind];
   const html='<option value="">'+label+' ('+eligible.length+')</option>'+
     values.map(v=>'<option value="'+esc(v)+'">'+esc(facetLabel(kind,v))+' ('+(counts.get(v)||0)+')</option>').join('');
   if(select.innerHTML!==html){select.innerHTML=html;select.value=chosen[kind];}
  }
 }
 function renderResults({resetScroll=false}={}){
  const input=$('#constellate-search'),q=norm(input.value).trim(),order=$('#weave-discovery-order').value;
  const onlyNew=$('#weave-discovery-unadded').checked,withArt=$('#weave-discovery-art').checked;
  const box=$('#constellate-results'),thread=S.activeThread(),noun=azTab==='film'?'films':'filmmakers';
  const all=azAll(azTab),membership=onlyNew?thread.items.join('|'):'';
   refreshFacetOptions(all,q,onlyNew,withArt,thread);const facets=selectedFacets();
  const filterSignature=[azTab,q,order,onlyNew,withArt,thread.id,...facetKinds.map(k=>facets[k])].join('|');
  if(filterSignature!==browseSignature){browsePageStart=0;browsePageLimit=48;browseSignature=filterSignature;}
  const cacheKey=[filterSignature,membership,browsePageStart,browsePageLimit].join('|');
  if(cacheKey!==azKey){
   const oldScroll=box.scrollTop;
   const rank=x=>matchSearch(x,q);
   let found=all.filter(x=>{
    if(onlyNew){const own=existingWork(x);if(own&&thread.items.includes(own.id))return false;}
    if(withArt&&!sourceImage(x))return false;
    return passesFacets(x,facets)&&Number.isFinite(matchSearch(x,q));
   });
   if(order==='oldest'||order==='newest'){
    found=found.map((x,i)=>({x,i,y:yearNum(x)})).sort((a,b)=>((a.y==null)-(b.y==null))||
     (a.y!=null&&b.y!=null?(order==='oldest'?a.y-b.y:b.y-a.y):0)||a.i-b.i).map(o=>o.x);
   }else if(order==='relevance'&&q){
    found=found.map((x,i)=>({x,i,r:rank(x)})).sort((a,b)=>a.r-b.r||a.i-b.i).map(o=>o.x);
   }
   // Every A-Z position is available without putting thousands of rows in the DOM.
   const alphabetic=order==='title'||(order==='relevance'&&!q);
   const showLetters=alphabetic&&!q;
   const available=new Set(found.map(letterOf));
   lastFound=found;
   if(browsePageStart>=found.length)browsePageStart=0;
   const page=found.slice(browsePageStart,browsePageStart+browsePageLimit);
   let html='',lastLetter='';
   if(q&&azTab==='film'&&found.length>1){
    const n=Math.min(6,found.length);
    html+='<button type="button" class="weave-add-matching" data-add-matching>+ Add first '+n+' matching films</button>';
   }
   for(const x of page){
    const letter=letterOf(x);
    if(showLetters&&letter!==lastLetter){html+='<h4 class="weave-az-letter" id="weave-az-'+(letter==='#'?'num':letter)+'">'+esc(letter)+'</h4>';lastLetter=letter;}
    const sub=x.type==='film'?[x.maker,x.year].filter(Boolean).join(' · '):x.community;
    const tagList=tags(x).slice(0,3).map(t=>t.term);
    const filmCount=x.type==='maker'?(A.recordById(x.record)?.films.length||0):0;
    html+='<div class="constellate-result" draggable="true" data-drag-film="'+esc(x.id)+'">'+thumb(x)+
      '<span><strong>'+esc(x.title)+'</strong>'+(sub?'<small>'+esc(sub)+'</small>':'')+
      (tagList.length?'<small class="weave-theme-tags">'+esc(tagList.join(' · '))+'</small>':'')+'</span>'+
      (filmCount?'<button type="button" class="weave-add-films" data-add-films="'+esc(x.record)+'" title="Add up to six films by '+esc(x.title)+'">'+(filmCount>6?'+ First 6':'+ Films')+'</button>':'')+
      '<button type="button" data-constellate-add="'+esc(x.id)+'" aria-label="Add '+esc(x.title)+' to '+esc(thread.name)+'">+ Add</button></div>';
   }
   if(!found.length)html='<div class="weave-discovery-empty"><strong>No matching '+noun+'</strong>'+
    '<p>Try a shorter name, another spelling, or remove the current filters.</p>'+
    '<button type="button" data-discovery-reset>Clear search and filters</button></div>';
   if(browsePageStart>0)html+='<button type="button" class="weave-results-home" data-results-home>← Back to A–Z beginning</button>';
   const remaining=found.length-(browsePageStart+page.length);
   if(remaining>0)html+='<button type="button" class="weave-results-more" data-results-more>Show '+Math.min(48,remaining)+' more '+noun+' · '+remaining+' remaining</button>';
   box.innerHTML=html;
   if(resetScroll)box.scrollTop=0;else box.scrollTop=oldScroll;
   azKey=[filterSignature,membership,browsePageStart,browsePageLimit].join('|');
   const start=page.length?browsePageStart+1:0,end=browsePageStart+page.length;
   const status='Showing '+start+'–'+end+' of '+found.length.toLocaleString()+' matching '+noun;
   $('#weave-discovery-count').textContent=status;
   $('#weave-az-count').textContent=found.length.toLocaleString()+' of '+all.length.toLocaleString()+' '+noun;
   $('#weave-az-letters').innerHTML=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'].map(L=>
    '<button type="button" data-az-letter="'+(L==='#'?'num':L)+'" aria-label="Jump to '+(L==='#'?'numbered titles':L)+'"'+
    (showLetters&&available.has(L)?'':' disabled title="A–Z navigation is available in title order without a search"')+'>'+L+'</button>').join('');
   document.querySelectorAll('[data-az-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.azTab===azTab)));
  }
  box.querySelectorAll('[data-constellate-add]').forEach(b=>{
   const x=catalogById.get(b.dataset.constellateAdd),own=x&&existingWork(x),has=!!(own&&thread.items.includes(own.id));
   b.classList.toggle('on',has);
   b.textContent=has?'✓ On thread':'+ Add';
   b.title=has?'Open '+x.title+' on the map':'Add to '+thread.name;
   b.setAttribute('aria-label',has?'Open '+x.title+' on this thread':'Add '+x.title+' to '+thread.name);
  });
  $('#weave-target-name').textContent=thread.name+' · '+thread.items.length+' cards';
  const opts=S.current().threads.map((t,i)=>'<option value="'+esc(t.id)+'"'+(t.id===S.current().activeThread?' selected':'')+'>'+ (i+1)+'. '+esc(t.name)+'</option>').join('');
  if($('#weave-target').innerHTML!==opts)$('#weave-target').innerHTML=opts;
  $('#weave-discovery-clear').disabled=!input.value&&!onlyNew&&!withArt&&order==='relevance'&&!facetKinds.some(k=>facets[k]);
 }

 function renderLegend(){const c=S.current();const f=$('#weave-focus-thread');f.hidden=!focusThread&&c.threads.filter(t=>t.visible).length<2;f.setAttribute('aria-pressed',String(focusThread));f.textContent=focusThread?'Show all threads':'Focus selected thread';$('#weave-legend').innerHTML=c.threads.map((t,i)=>`<div class="weave-legend-row${t.id===c.activeThread?' active':''}"><label title="Show ${esc(t.name)}"><input type="checkbox" data-thread-visible="${esc(t.id)}"${t.visible?' checked':''}><span class="sr-only">Show thread</span></label><button data-thread-active="${esc(t.id)}" aria-pressed="${t.id===c.activeThread}"><i style="background:${color(t)}"></i><span>${i+1}. ${esc(t.name)}</span><small>${t.items.length}</small></button></div>`).join('');$('#weave-legend').querySelectorAll('[data-thread-visible]').forEach(el=>el.onchange=()=>transaction('Toggle thread',()=>{c.threads.find(t=>t.id===el.dataset.threadVisible).visible=el.checked;return S.save();}));$('#weave-legend').querySelectorAll('[data-thread-active]').forEach(b=>b.onclick=()=>{busy=true;c.activeThread=b.dataset.threadActive;S.save();busy=false;known.set(c.id,copy(c));render();if(active&&!context.hidden)showContext();});}
 function renderOrder(){const t=S.activeThread();$('#weave-order-title').textContent='Order';$('#weave-order-list').innerHTML=t.items.map((id,i)=>{const x=S.current().items.find(x=>x.id===id),a=x&&reference(x);return x?`<li draggable="true" data-thread-position="${i}"${id===active?' class="is-active" aria-current="true"':''}><button data-order-select="${esc(id)}"><b>${i+1}</b>${thumb(x)}<span>${esc(x.title)}<small>${esc(landCaption(x))}</small></span></button><div class="weave-order-move"><button type="button" data-note-edit="${esc(id)}" title="Explain this film’s position in the thread">Why here?</button><button data-order-remove="${esc(id)}" aria-label="Remove ${esc(x.title)} from this thread" title="Remove from thread">×</button><button data-order-move="${i}" data-direction="-1" aria-label="Move ${esc(x.title)} earlier"${i===0?' disabled':''}>↑</button><button data-order-move="${i}" data-direction="1" aria-label="Move ${esc(x.title)} later"${i===t.items.length-1?' disabled':''}>↓</button></div>${t.notes[id]?`<p class="weave-order-note-text">${esc(chipText(t.notes[id],90))}</p>`:''}</li>`:'';}).join('')||'<li class="weave-empty">Add the first card to this thread.</li>';$('#weave-order-list').querySelectorAll('[data-order-select]').forEach(b=>b.onclick=()=>{const x=S.current().items.find(x=>x.id===b.dataset.orderSelect),ref=reference(x);if(ref)A.focusLandOnMap(ref.id);choose(x.id);});$('#weave-order-list').querySelectorAll('[data-order-remove]').forEach(b=>b.onclick=()=>{const id=b.dataset.orderRemove,other=S.current().threads.some(o=>o.id!==t.id&&o.items.includes(id));transaction('Remove from thread',()=>other?S.removeFromThread(id,t.id):S.remove(id));});$('#weave-order-list').querySelectorAll('[data-order-move]').forEach(b=>b.onclick=()=>transaction('Reorder thread',()=>S.reorderThread(t.id,+b.dataset.orderMove,+b.dataset.orderMove+Number(b.dataset.direction))));$('#weave-order-list').querySelectorAll('[data-note-edit]').forEach(b=>b.onclick=()=>{const id=b.dataset.noteEdit,row=b.closest('li'),i=t.items.indexOf(id);row.innerHTML=`<label class="sr-only" for="weave-seg-note">${i?'Why this follows':'Opening note'}</label><textarea id="weave-seg-note" rows="3" maxlength="10000" placeholder="${i?'Why does this film follow '+esc(itemTitle(t.items[i-1]))+'?':'How does this thread open?'}">${esc(t.notes[id]||'')}</textarea><div class="constellate-actions"><button type="button" data-note-save>Save note</button><button type="button" data-note-cancel>Cancel</button></div>`;const ta=row.querySelector('textarea');ta.focus({preventScroll:true});row.querySelector('[data-note-save]').onclick=()=>transaction('Edit thread note',()=>S.threadNote(t.id,id,ta.value));row.querySelector('[data-note-cancel]').onclick=()=>renderOrder();});{const d=t.description?`<span>${esc(t.description)}</span>`:'',m=summary(t);$('#weave-order-summary').innerHTML=d+(m?`<small>${esc(m)}</small>`:'');$('#weave-order-summary').hidden=!d&&!m;}renderSuggest();renderThemeMore();}
 function readSteps(){return S.current().threads.filter(t=>t.visible).flatMap(t=>t.items.map(id=>({thread:t,item:S.current().items.find(x=>x.id===id)})).filter(x=>x.item));}
 let readCollectionId='';
 function renderRead(){const c=S.current(),steps=readSteps(),trailWasOpen=!!$('#weave-read-panel .weave-read-trail')?.open;if(readCollectionId!==c.id){readIndex=0;readCollectionId=c.id;}readIndex=Math.max(0,Math.min(steps.length-1,readIndex));if(steps.length)active=steps[readIndex].item.id;$('#weave-read-panel').innerHTML=`<h3>${esc(c.name)}</h3>${c.author?`<p>${esc(c.author)}</p>`:''}${c.note?`<p class="weave-prose">${esc(c.note)}</p>`:''}<nav class="weave-read-nav"><button id="weave-read-prev"${readIndex<=0?' disabled':''}>← Previous</button><span>${steps.length?readIndex+1:0} / ${steps.length}</span><button id="weave-read-next"${readIndex>=steps.length-1?' disabled':''}>Next →</button></nav>${c.threads.filter(t=>t.visible).map(t=>`<section class="weave-read-thread"><h4><i style="background:${color(t)}"></i>${esc(t.name)}<button type="button" class="weave-cite-thread" data-cite-thread="${esc(t.id)}">Cite</button></h4>${t.description?`<p class="weave-prose">${esc(t.description)}</p>`:''}${summary(t)?`<p class="weave-read-summary">${esc(summary(t))}</p>`:''}<ol>${t.items.map((id,i)=>{const x=c.items.find(x=>x.id===id);if(!x)return '';const at=steps.findIndex(s=>s.thread.id===t.id&&s.item.id===id),links=c.links.filter(l=>l.source===id||l.target===id);return `<li class="has-art"${at===readIndex?' aria-current="step"':''}>${thumb(x)}<button data-read-step="${at}">${esc(x.title)}</button>${x.maker?`<small>${esc(x.maker)}${x.year?' · '+esc(x.year):''}</small>`:''}<small class="weave-read-land">${esc(landCaption(x))}</small>${terms(x).length?`<small class="weave-read-themes">${esc(terms(x).join(' · '))}</small>`:''}${t.notes[id]?`<p class="weave-prose">${esc(t.notes[id])}</p>`:''}${links.map(l=>`<p class="weave-read-note">${connectionHTML(l,id)}</p>`).join('')}${x.href?`<a href="${esc(x.href)}" target="_blank" rel="noopener noreferrer">Open in the atlas ↗</a>`:''}</li>`;}).join('')}</ol></section>`).join('')||''}<div class="constellate-actions"><button id="weave-read-print">Print reading path</button><button id="weave-read-download">Download reading path</button></div>`;$('#weave-read-download').onclick=()=>download(readingHTML(),'text/html;charset=utf-8',(S.current().name||'constellation').replace(/[^\p{L}\p{N}]+/gu,'-').toLowerCase()+'-reading-path.html');$('#weave-read-panel').querySelectorAll('[data-cite-thread]').forEach(b=>b.onclick=()=>{
  const tid=b.dataset.citeThread;promptCitationAuthor();
  const t=S.current().threads.find(t=>t.id===tid);if(t)copyText(threadCitation(t));
 });const step=at=>{const stepsNow=readSteps();if(!Number.isInteger(at)||at<0||at>=stepsNow.length)return;const origin=document.activeElement?.id;readIndex=at;active=stepsNow[at].item.id;renderRead();renderGraph();panel.scrollTop=0;if(origin==='weave-read-prev'||origin==='weave-read-next'){const next=$('#'+origin);if(next&&!next.disabled)next.focus({preventScroll:true});else $('#weave-read-panel .weave-read-focus')?.focus({preventScroll:true});}};$('#weave-read-prev').onclick=()=>step(readIndex-1);$('#weave-read-next').onclick=()=>step(readIndex+1);$('#weave-read-panel').querySelectorAll('[data-read-step]').forEach(b=>b.onclick=()=>step(+b.dataset.readStep));
  // Read presents one step at a time; the complete sourced path remains expandable.
  const readPanel=$('#weave-read-panel'),readNav=readPanel.querySelector('.weave-read-nav');
  if(readNav){
   readNav.setAttribute('aria-label','Read the constellation in order');
   const count=readNav.querySelector('span');
   if(count)count.textContent=steps.length?'Film '+(readIndex+1)+' of '+steps.length:'No films yet';
  }
  if(readNav){const progress=document.createElement('progress');progress.className='weave-read-progress';progress.max=Math.max(1,steps.length);progress.value=steps.length?readIndex+1:0;progress.setAttribute('aria-label','Progress through the constellation');readNav.after(progress);}
  if(steps.length&&readNav){
   const currentStep=steps[readIndex],x=currentStep.item,t=currentStep.thread;
   const connections=c.links.filter(l=>l.source===x.id||l.target===x.id);
   const art=document.createElement('article');art.className='weave-read-focus';
   art.setAttribute('aria-label','Current film in the constellation');art.setAttribute('tabindex','-1');
   art.innerHTML='<div class="weave-read-focus-eyebrow"><span class="weave-read-thread-mark" style="background:'+esc(color(t))+'"></span>'+esc(t.name)+'</div>'+
    '<div class="weave-read-focus-main">'+thumb(x)+'<div class="weave-read-focus-copy"><h4>'+esc(x.title)+'</h4>'+
    (x.maker?'<p class="weave-read-maker">'+esc(x.maker)+'</p>':'')+
    '<p class="weave-read-meta">'+esc([x.year,landCaption(x)].filter(Boolean).join(' · '))+'</p></div></div>'+
    (terms(x).length?'<p class="weave-read-tags"><strong>Themes</strong> '+esc(terms(x).join(' · '))+'</p>':'')+
    (t.description?'<p class="weave-prose">'+esc(t.description)+'</p>':'')+
    (t.notes[x.id]?'<p class="weave-prose">'+esc(t.notes[x.id])+'</p>':'')+
    (connections.length?'<div class="weave-read-connections"><h5>Connections</h5>'+connections.map(l=>'<p>'+connectionHTML(l,x.id)+'</p>').join('')+'</div>':'')+
    (x.href?'<p><a href="'+esc(x.href)+'" target="_blank" rel="noopener noreferrer">View film in the atlas</a></p>':'');
   readNav.nextElementSibling?.after(art);
   const trail=document.createElement('details');trail.className='weave-read-trail';
   const summary=document.createElement('summary');summary.textContent='Full constellation · '+steps.length+' film'+(steps.length===1?'':'s');
   trail.appendChild(summary);trail.open=trailWasOpen;
   readPanel.querySelectorAll('.weave-read-thread').forEach(section=>trail.appendChild(section));
   art.after(trail);
  }else if(readNav){
   const empty=document.createElement('div');empty.className='weave-read-empty';
   empty.innerHTML='<h4>No films in this constellation yet</h4><p>Add a film to a visible thread, then return to Read to follow the constellation.</p><button type="button" id="weave-read-edit-empty">Add films</button>';
   readNav.nextElementSibling?.after(empty);
   empty.querySelector('button').onclick=()=>$('#constellate-edit').click();
  }
   $('#weave-read-print').onclick=()=>{const trail=readPanel.querySelector('.weave-read-trail');if(trail)trail.open=true;window.print();};
}
 function setRead(value){if(value&&document.body.classList.contains('is-theme-web-open')){$('#weave-theme-web-toggle')?.click();}if(value){drawThread=false;drawLast=null;pointer=null;$('#weave-draw-thread').setAttribute('aria-pressed','false');$('#weave-draw-thread').textContent='Draw thread';$('#weave-draw-help').hidden=true;}reading=value;openDock();$('#weave-editor').hidden=reading;$('#weave-read-panel').hidden=!reading;$('#weave-share-panel').hidden=true;modeButtons(reading?'read':'edit');if(reading){renderRead();renderGraph();}updateAddress();}
 function render(){if(!enabled)return;const c=S.current();if(drawThread&&drawLast&&!S.activeThread().items.includes(drawLast))drawLast=S.activeThread().items.at(-1)||null;const drawButton=$('#weave-draw-thread');drawButton.setAttribute('aria-pressed',String(drawThread));drawButton.textContent=drawThread?'Done drawing':'Draw thread';$('#weave-draw-help').hidden=!drawThread;$('#weave-draw-name').textContent=S.activeThread().name;const options=S.state.collections.map(x=>`<option value="${esc(x.id)}"${x.id===c.id?' selected':''}>${esc(x.name)}</option>`).join('');if($('#constellate-collection').innerHTML!==options)$('#constellate-collection').innerHTML=options;$('#constellate-mode span').textContent=connecting?(first?'Choose another card':'Choose first card'):shiftFirst?'Shift-click another card':c.name;$('#constellate-connect').setAttribute('aria-pressed',String(connecting));$('#constellate-fit').disabled=!c.items.length;const x=selectedItem();$('#constellate-add-current').hidden=!x;$('#constellate-add-current').textContent=x?.type==='maker'?'Add selected filmmaker':'Add selected film';if(document.activeElement!==$('#weave-title'))$('#weave-title').value=c.name;if(document.activeElement!==$('#weave-author'))$('#weave-author').value=c.author||'';if(document.activeElement!==$('#weave-note'))$('#weave-note').value=c.note||'';tabLabel();renderLegend();renderResults();renderOrder();renderGraph();updateHistory();updateStepper();renderCompare();renderTimeline();if(reading)renderRead();}
 function download(value,type,name){const url=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const jsonExport=()=>({format:'Indigenous Cinema Atlas weave',version:2,active:S.current().id,collections:[copy(S.current())]});
 function shareURL(mode=$('#weave-share-mode')?.value||'read'){const payload=btoa(unescape(encodeURIComponent(JSON.stringify({version:2,weave:copy(S.current())})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');if(payload.length>64000)return null;const u=new URL('./',location.href);u.searchParams.set('constellate','1');u.searchParams.set('weave',S.current().id);if(mode==='play')u.searchParams.set('play','1');else u.searchParams.set('read','1');u.hash='weave='+payload;return u.href;}
 async function packWeave(){const json=JSON.stringify({version:2,weave:copy(S.current())});if(!window.CompressionStream)return null;const buf=new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode(...buf.subarray(i,i+8192));return 'z'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 async function shareURLAsync(mode=$('#weave-share-mode')?.value||'read'){const packed=await packWeave().catch(()=>null),plain=shareURL(mode);if(!packed)return plain;const u=new URL('./',location.href);u.searchParams.set('constellate','1');u.searchParams.set('weave',S.current().id);if(mode==='play')u.searchParams.set('play','1');else u.searchParams.set('read','1');u.hash='weave='+packed;return u.href;}
 function localDate(value){
  const d=new Date(value||Date.now());
  if(!Number.isFinite(d.getTime()))return '';
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 }
 function citation(url=$('#weave-url')?.value||shareURL()){
  const c=S.current(),author=c.author?.trim();
  return (author?author+'. ':'')+'“'+c.name+'.” Indigenous Cinema Atlas: Abya Yala and Turtle Island, user-authored constellation, '+localDate(c.editedAt||c.createdAt)+'. '+(url||'JSON export');
 }
 function promptCitationAuthor(){
  const c=S.current();
  if(c.author?.trim())return;
  const value=window.prompt('Who should be credited as author? Leave blank to cite without an author.','');
  if(value?.trim())transaction('Set citation author',()=>{c.author=value.trim().slice(0,180);return S.save();});
 }
 function exportFilename(ext){
  const name=(S.current().name||'constellation').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).toLowerCase()||'constellation';
  return name+'-'+localDate(new Date())+'.'+ext;
 }
 async function copyText(value,fallback){try{await navigator.clipboard.writeText(value);status('Copied.');}catch{if(fallback){fallback.value=value;fallback.focus();fallback.select();}status('Select and copy the text.');}}
 async function showShare(){if(drawThread)setDrawThread(false);openDock();modeButtons('share');$('#weave-share-panel').hidden=false;$('#weave-editor').hidden=true;$('#weave-read-panel').hidden=true;const url=await shareURLAsync();$('#weave-url').value=url||'';$('#weave-copy-url').disabled=!url;$('#weave-citation').textContent=citation(url);if(!url)status('This constellation is too large for a reliable share URL. Export its JSON instead.');}
 function csvExport(){const c=S.current(),field=v=>{const x=String(v??'');return '"'+(/^[=+\-@\t\r]/.test(x)?"'"+x:x).replace(/"/g,'""')+'"';},rows=[['weave_id','weave','author','thread','order','type','title','filmmaker','year','land_reference','themes','note','connection_notes','sources']];for(const t of c.threads)for(const[id,i]of t.items.map((id,i)=>[id,i])){const x=c.items.find(x=>x.id===id);if(!x)continue;const links=c.links.filter(l=>l.source===id||l.target===id);rows.push([c.id,c.name,c.author,t.name,i+1,x.type,x.title,x.maker,x.year,reference(x)?.name||'',tags(x).map(t=>t.term).join('; '),t.notes[id]||'',links.map(l=>connectionText(l,id)+(l.note?': '+l.note:'')+(l.sourceURL?' '+l.sourceURL:'')).join('; '),links.map(l=>l.sourceURL).filter(Boolean).join('; ')]);}return '\uFEFF'+rows.map(r=>r.map(field).join(',')).join('\r\n');}
 function showPicker(x,button){$('.weave-add-menu')?.remove();const menu=document.createElement('div');menu.className='weave-add-menu';menu.setAttribute('role','group');menu.setAttribute('aria-label','Add to thread');const all=S.state.collections.flatMap(c=>c.threads.map(t=>({c,t})));menu.innerHTML=all.map(({c,t})=>`<button data-picker-weave="${esc(c.id)}" data-picker-thread="${esc(t.id)}">${esc(t.name)}<small>${esc(c.name)}</small></button>`).join('')+'<button data-picker-new>+ New thread</button>';button.after(menu);pendingPicker=x;menu.querySelectorAll('[data-picker-thread]').forEach(b=>b.onclick=()=>{const target=b.dataset.pickerWeave,threadId=b.dataset.pickerThread;if(S.current().id!==target){busy=true;S.activate(target);busy=false;}add(x,threadId);menu.remove();pendingPicker=null;status('Added to thread. Open Constellate to follow it.');});menu.querySelector('[data-picker-new]').onclick=()=>{open();reading=false;setRead(false);$('#weave-thread-form').hidden=false;$('#weave-thread-name').focus({preventScroll:true});menu.remove();};}
 trigger.setAttribute('aria-controls','constellate-popup');trigger.setAttribute('aria-expanded','false');trigger.addEventListener('click',e=>{e.preventDefault();open();setRead(false);});$('#constellate-edit').onclick=()=>{open();setRead(false);setTab('thread');};$('#constellate-close').onclick=close;$('#constellate-exit').onclick=()=>exit();$('#constellate-read').onclick=()=>{open();setRead(true);};$('#constellate-undo').onclick=undo;$('#constellate-redo').onclick=redo;$('#constellate-fit').onclick=fit;$('#constellate-share').onclick=showShare;
 $('#constellate-search').oninput=()=>{resetBrowsePage();renderResults({resetScroll:true});};
  for(const id of ['weave-discovery-order','weave-discovery-unadded','weave-discovery-art',...facetKinds.map(k=>'weave-discovery-'+k)])$('#'+id).addEventListener('change',()=>{resetBrowsePage();renderResults({resetScroll:true});});
  $('#weave-discovery-clear').onclick=()=>{$('#constellate-search').value='';$('#weave-discovery-order').value='relevance';$('#weave-discovery-unadded').checked=false;$('#weave-discovery-art').checked=false;facetKinds.forEach(k=>facetSelect(k).value='');resetBrowsePage();renderResults({resetScroll:true});$('#constellate-search').focus({preventScroll:true});};
  $('#weave-focus-thread').onclick=()=>{focusThread=!focusThread;renderLegend();renderGraph();status(focusThread?'Showing '+S.activeThread().name+' only. Show all threads restores the full constellation.':'Showing every visible thread again.');};
 $('#weave-find-films').onclick=()=>{open();setTab('add');$('#constellate-search').focus({preventScroll:true});};$('#weave-browse-films').onclick=$('#weave-find-films').onclick;$('#weave-draw-thread').onclick=()=>setDrawThread(!drawThread);$('#weave-draw-done').onclick=()=>setDrawThread(false);
 const peek=$('#weave-peek');function showPeek(id,e,note=''){const x=S.current().items.find(x=>x.id===id);if(!x||drag||player){peek.hidden=true;return;}const ts=memberships(id);peek.innerHTML=`<div><strong>${esc(x.title)}</strong>${x.type!=='concept'?`<small>${esc([x.maker,x.year].filter(Boolean).join(' · '))}</small>`:''}<small class="weave-peek-land">${esc(landCaption(x))}</small>${note?`<p class="weave-peek-note">${esc(note)}</p>`:''}${ts.length?`<span class="weave-peek-threads">${ts.map(t=>`<i style="background:${color(t)}"></i>${esc(t.name)}`).join('<b>·</b>')}</span>`:''}</div>`;peek.hidden=false;const m=map.getBoundingClientRect(),w=peek.offsetWidth,h=peek.offsetHeight;let lx=e.clientX-m.left+16,ly=e.clientY-m.top+16;if(lx+w>m.width-8)lx=e.clientX-m.left-w-16;if(ly+h>m.height-8)ly=e.clientY-m.top-h-16;peek.style.left=Math.max(8,lx)+'px';peek.style.top=Math.max(8,ly)+'px';}
 graph.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const t=e.target.closest('[data-weave-knot]');if(t)showPeek(t.dataset.weaveKnot,e,t.dataset.note||'');else peek.hidden=true;});graph.addEventListener('pointerleave',()=>{peek.hidden=true;});graph.addEventListener('pointerdown',()=>{peek.hidden=true;},true);
 $('#weave-legend').addEventListener('pointerover',e=>{const b=e.target.closest('[data-thread-active]');graph.classList.toggle('weave-focus',!!b);$$('#constellate-graph .weave-thread').forEach(g=>g.classList.toggle('is-focus',!!b&&g.dataset.thread===b?.dataset.threadActive));});$('#weave-legend').addEventListener('pointerleave',()=>{graph.classList.remove('weave-focus');});
 panel.addEventListener('dragstart',e=>{const r=e.target.closest('[data-drag-film]');if(!r)return;e.dataTransfer.setData('application/x-atlas-weave',r.dataset.dragFilm);e.dataTransfer.setData('text/plain',r.querySelector('strong')?.textContent||'');e.dataTransfer.effectAllowed='copy';document.body.classList.add('weave-dropping');});document.addEventListener('dragend',()=>document.body.classList.remove('weave-dropping'));
 map.addEventListener('dragover',e=>{if(enabled&&[...e.dataTransfer.types].includes('application/x-atlas-weave')){e.preventDefault();e.dataTransfer.dropEffect='copy';const at=insertIndex(local(e)),t=S.activeThread();map.dataset.dropLabel=at!=null?'Insert between '+chipText(itemTitle(t.items[at-1]),22)+' and '+chipText(itemTitle(t.items[at]),22):'Drop to add to '+chipText(t.name,30);map.classList.toggle('weave-drop-insert',at!=null);}});map.addEventListener('drop',e=>{const id=e.dataTransfer.getData('application/x-atlas-weave');if(!enabled||!id)return;e.preventDefault();document.body.classList.remove('weave-dropping');const x=catalogById.get(id);if(!x)return;const own=existingWork(x);if(own&&S.activeThread().items.includes(own.id)){status(x.title+' is already on '+S.activeThread().name+'.');return;}const at=insertIndex(local(e));map.classList.remove('weave-drop-insert');if(at!=null)insertAt(x,at);else add(x);});document.querySelectorAll('[data-az-tab]').forEach(b=>b.onclick=()=>{azTab=b.dataset.azTab;resetBrowsePage();renderResults({resetScroll:true});});$('#weave-az-letters').onclick=e=>{const b=e.target.closest('[data-az-letter]');if(!b||b.disabled)return;const L=b.dataset.azLetter==='num'?'#':b.dataset.azLetter,idx=lastFound.findIndex(x=>letterOf(x)===L);if(idx<0)return;browsePageStart=idx;browsePageLimit=48;azKey='';renderResults({resetScroll:true});};$('#weave-target').onchange=e=>{const c=S.current();busy=true;c.activeThread=e.target.value;S.save();busy=false;known.set(c.id,copy(c));render();};document.querySelector('.weave-more').addEventListener('click',e=>{if(e.target.closest('.weave-more-menu button'))setTimeout(()=>{document.querySelector('.weave-more').open=false;},0);});document.addEventListener('pointerdown',e=>{const m=document.querySelector('.weave-more');if(m?.open&&!m.contains(e.target))m.open=false;});$('#weave-atlas-toggle').onclick=e=>{const on=document.body.classList.toggle('weave-show-atlas');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'Quiet atlas markers':'Show atlas markers';};$('#constellate-add-current').onclick=()=>{const x=selectedItem();if(x)add(x);};$('#constellate-connect').onclick=()=>connecting?(cancelConnect(),render()):startLink();$('#constellate-clear').onclick=()=>{const c=S.current();if(!c.items.length&&c.threads.length<=1){status('This constellation is already empty.');return;}if(!window.confirm('Clear this constellation, including every card, path and connection? Undo will restore it.'))return;drawThread=false;drawLast=null;active=null;cancelConnect();context.hidden=inline.hidden=true;if(transaction('Clear constellation',()=>S.clear()))status('Constellation cleared. ↶ Undo restores your previous work.');};$('#weave-discard').onclick=()=>{const c=S.current();if(!window.confirm('Delete “'+c.name+'”? This cannot be undone.'))return;busy=true;S.discard();busy=false;active=null;cancelConnect();context.hidden=inline.hidden=true;known.set(S.current().id,copy(S.current()));render();updateAddress();status('Constellation deleted.');};$('#constellate-new').onclick=()=>{$('#constellate-new-form').hidden=false;$('#constellate-name').focus({preventScroll:true});};$('#constellate-new-form').onsubmit=e=>{e.preventDefault();busy=true;S.create($('#constellate-name').value);{const wk=Math.max(0,Math.min(16,parseInt($('#constellate-weeks').value)||0)),c=S.current();if(wk>1){c.threads[0].name='Week 1';for(let i=2;i<=wk;i++)S.createThread('Week '+i,'',DYES[(i-1)%DYES.length][0]);c.activeThread=c.threads[0].id;S.save();}$('#constellate-weeks').value='';}busy=false;active=null;cancelConnect();$('#constellate-new-form').hidden=true;$('#constellate-name').value='';known.set(S.current().id,copy(S.current()));render();updateAddress();};$('#constellate-collection').onchange=e=>{$('#weave-compare').hidden=true;focusThread=false;busy=true;S.activate(e.target.value);busy=false;active=null;cancelConnect();context.hidden=inline.hidden=true;known.set(S.current().id,copy(S.current()));render();updateAddress();};
 $('#weave-settings-form').onsubmit=e=>{e.preventDefault();transaction('Edit constellation',()=>{S.current().name=$('#weave-title').value.trim();S.current().author=$('#weave-author').value.trim();S.current().note=$('#weave-note').value;return S.save();});$('#weave-settings').open=false;};$('#weave-new-thread').onclick=()=>{$('#weave-thread-form').hidden=false;$('#weave-thread-name').focus({preventScroll:true});};$('#weave-thread-form').onsubmit=e=>{e.preventDefault();const id=transaction('Create thread',()=>S.createThread($('#weave-thread-name').value,$('#weave-thread-description').value,document.querySelector('input[name=weave-dye]:checked')?.value));if(!id)return;$('#weave-thread-form').hidden=true;$('#weave-thread-name').value=$('#weave-thread-description').value='';if(pendingPicker){const x=pendingPicker;pendingPicker=null;add(x,id);}render();};
 $('#constellate-idea').onclick=()=>{$('#constellate-detail').innerHTML='<form id="constellate-idea-form"><label for="constellate-idea-title">Idea</label><input id="constellate-idea-title" maxlength="300" required><label for="constellate-idea-note">Note (optional)</label><textarea id="constellate-idea-note" rows="2"></textarea><div class="constellate-actions"><button>Add idea</button><button type="button" id="constellate-idea-cancel">Cancel</button></div></form>';$('#constellate-idea-cancel').onclick=()=>$('#constellate-detail').replaceChildren();$('#constellate-idea-form').onsubmit=e=>{e.preventDefault();const x=S.item({type:'concept',title:$('#constellate-idea-title').value,note:$('#constellate-idea-note').value});if(add(x))$('#constellate-detail').replaceChildren();};$('#constellate-idea-form').scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'});$('#constellate-idea-title').focus({preventScroll:true});};
 panel.addEventListener('click',e=>{const follow=e.target.closest('[data-weave-follow]');if(follow){const target=catalogById.get(follow.dataset.weaveFollow);if(target)followFilm(target);return;}if(e.target.closest('[data-add-matching]')){addMany(lastFound.slice(0,6).sort((a,b)=>(yearNum(a)||9999)-(yearNum(b)||9999)),'up to six matching films');return;}if(e.target.closest('[data-results-more]')){browsePageLimit+=48;azKey='';renderResults();return;}if(e.target.closest('[data-results-home]')){browsePageStart=0;browsePageLimit=48;azKey='';renderResults({resetScroll:true});return;}if(e.target.closest('[data-discovery-reset]')){$('#weave-discovery-clear').click();return;}const pick=e.target.closest('[data-compare-pick]');if(pick){const x=S.current().items.find(y=>y.id===pick.dataset.comparePick),ref=x&&reference(x);if(ref)A.focusLandOnMap(ref.id);if(x)choose(x.id);return;}if(e.target.closest('[data-compare-close]')){$('#weave-compare').hidden=true;return;}const af=e.target.closest('[data-add-films]');if(af){const r=A.recordById(af.dataset.addFilms);if(r){const works=r.films.map(f=>catalogById.get('film:'+r.id+':'+f.id)||catalog.find(x=>x.type==='film'&&x.credits?.some(c=>c.record===r.id&&c.film===f.id))).filter(Boolean),seen=new Set(),list=works.filter(x=>!seen.has(key(x))&&seen.add(key(x))).sort((a,b)=>(parseInt(a.year)||9999)-(parseInt(b.year)||9999));const fresh=list.filter(x=>{const own=existingWork(x);return !own||!S.activeThread().items.includes(own.id);});if(fresh.length)addMany(fresh.slice(0,6),'films by '+r.name);else status(r.name+' has no remaining films to add to this thread.');if(fresh.length>6)status('Added the first six films by '+r.name+'. Search this filmmaker again to add more.');}return;}const b=e.target.closest('[data-constellate-add]');if(b){const x=catalog.find(x=>x.id===b.dataset.constellateAdd);if(x){const own=existingWork(x);if(own&&S.activeThread().items.includes(own.id)){const r=reference(own);if(r)A.focusLandOnMap(r.id);choose(own.id);}else add(x);}}if(e.target.closest('[data-cancel-form]'))$('#constellate-new-form').hidden=true;if(e.target.closest('[data-cancel-thread]')){$('#weave-thread-form').hidden=true;pendingPicker=null;}});
 $('#weave-order-list').addEventListener('dragstart',e=>{const li=e.target.closest('[data-thread-position]');if(li){orderDrag=+li.dataset.threadPosition;e.dataTransfer?.setData('text/plain',String(orderDrag));}});$('#weave-order-list').addEventListener('dragover',e=>{if(e.target.closest('[data-thread-position]'))e.preventDefault();});$('#weave-order-list').addEventListener('drop',e=>{const li=e.target.closest('[data-thread-position]');if(li&&orderDrag!==null){e.preventDefault();transaction('Reorder thread',()=>S.reorderThread(S.current().activeThread,orderDrag,+li.dataset.threadPosition));orderDrag=null;}});
 function local(e){const b=$('#atlas').getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
 function targetAt(p,source){return [...positions].reverse().find(([id,q])=>id!==source&&Math.abs(p.x-q.x)<=NW()/2+6&&Math.abs(p.y-q.y)<=NH/2+6)?.[0];}
 graph.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-connect-handle]'),n=e.target.closest('[data-constellate-node]');if(e.button||!n)return;e.preventDefault();e.stopPropagation();const id=n.dataset.constellateNode,p=positions.get(id);if(handle){dragLink={source:id};pointer=local(e);connecting=false;first=shiftFirst=null;renderPreview();}else if(drawThread){e.preventDefault();return;}else if(unmapped&&S.current().items.find(y=>y.id===id)?.type!=='concept'){suppress=null;}else{const x=S.current().items.find(x=>x.id===id),i=S.current().items.indexOf(x);drag={id,start:local(e),base:p,offset:{...offsetFor(x,i)},originalOffset:{...offsetFor(x,i)},point:{x:p.x/size.width,y:p.y/size.height},concept:x.type==='concept',moved:false,shift:e.shiftKey};}graph.setPointerCapture?.(e.pointerId);});
 graph.addEventListener('pointermove',e=>{const p=local(e);if(dragLink){pointer=p;renderPreview();return;}if(!drag)return;const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(Math.abs(dx)+Math.abs(dy)<=5&&!drag.moved)return;drag.moved=true;drag.offset={dx:drag.originalOffset.dx+dx,dy:drag.originalOffset.dy+dy};drag.point={x:(drag.base.x+dx)/size.width,y:(drag.base.y+dy)/size.height};renderGraph();});
 graph.addEventListener('pointerup',e=>{if(dragLink){const source=dragLink.source,target=targetAt(local(e),source);dragLink=null;pointer=null;suppress={id:source,until:Date.now()+400};if(target){if(drawThread){drawStep(source);drawStep(target);}else connectionForm({source,target,label:'',kind:'interpretation'});}else{renderPreview();status('Drag the handle onto another card.');}return;}if(!drag)return;const d=drag;drag=null;suppress={id:d.id,until:Date.now()+400};if(d.moved){transaction(d.concept?'Move idea':'Move label',()=>d.concept?S.position(d.id,d.point):S.offset(d.id,d.offset));status('Placement saved.');}else choose(d.id,{shift:d.shift||e.shiftKey});});graph.addEventListener('pointercancel',()=>{drag=dragLink=null;pointer=null;renderGraph();});
 graph.addEventListener('click',e=>{const handle=e.target.closest('[data-connect-handle]'),node=e.target.closest('[data-constellate-node]'),knot=e.target.closest('[data-weave-knot]'),edge=e.target.closest('[data-constellate-edge]'),id=knot?.dataset.weaveKnot||node?.dataset.constellateNode;if(id&&suppress?.id===id&&Date.now()<suppress.until&&e.detail>0)return;if(handle){drawThread?drawStep(handle.dataset.connectHandle):startLink(handle.dataset.connectHandle);return;}if(id)choose(id,{shift:e.shiftKey});if(edge){const l=S.current().links.find(l=>l.id===edge.dataset.constellateEdge);if(l)connectionForm(l);}});
 graph.addEventListener('keydown',e=>{const handle=e.target.closest('[data-connect-handle]'),node=e.target.closest('[data-constellate-node]'),edge=e.target.closest('[data-constellate-edge]');if(['Enter',' '].includes(e.key)){if(handle||node||edge){e.preventDefault();e.stopPropagation();if(handle)drawThread?drawStep(handle.dataset.connectHandle):startLink(handle.dataset.connectHandle);else if(node)choose(node.dataset.constellateNode,{shift:e.shiftKey});else connectionForm(S.current().links.find(l=>l.id===edge.dataset.constellateEdge));}}else if(node&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();const id=node.dataset.constellateNode,x=S.current().items.find(x=>x.id===id),p=positions.get(id),d=e.shiftKey?20:8,dx=e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0,dy=e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0,o=offsetFor(x,S.current().items.indexOf(x));transaction(x.type==='concept'?'Move idea':'Move label',()=>x.type==='concept'?S.position(id,{x:(p.x+dx)/size.width,y:(p.y+dy)/size.height}):S.offset(id,{dx:o.dx+dx,dy:o.dy+dy}));$$('[data-constellate-node]').find(n=>n.dataset.constellateNode===id)?.focus({preventScroll:true});}});
 map.addEventListener('pointermove',e=>{if((connecting&&first)||shiftFirst||(drawThread&&drawLast)){pointer=local(e);renderPreview();}});
 document.addEventListener('keydown',e=>{if(!enabled)return;if(e.key==='Escape'&&e.target?.id==='constellate-search'){e.preventDefault();e.stopImmediatePropagation();if(e.target.value||$('#weave-discovery-unadded').checked||$('#weave-discovery-art').checked)$('#weave-discovery-clear').click();else e.target.blur();return;}if(e.key==='Escape'&&$('#constellate-how')?.open){e.preventDefault();e.stopImmediatePropagation();$('#constellate-how').open=false;$('#constellate-how>summary')?.focus({preventScroll:true});return;}if(player&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stopPlay();return;}if(player&&['ArrowLeft','ArrowRight'].includes(e.key)&&!e.target.closest?.('input,textarea')){e.preventDefault();playStep(playIndex+(e.key==='ArrowLeft'?-1:1));return;}if(reading&&!player&&['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.closest?.('#weave-read-panel')&&!e.target.closest?.('input,textarea,select')){const btn=$('#weave-read-'+(e.key==='ArrowLeft'?'prev':'next'));if(btn&&!btn.disabled){e.preventDefault();btn.click();}return;}const editing=e.target.closest?.('input,textarea,select,[contenteditable=true]');if(!editing&&!player&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.key==='['||e.key===']'){e.preventDefault();e.stopImmediatePropagation();stepBy(e.key===']'?1:-1);return;}if(e.key==='/'&&!panel.hidden){e.preventDefault();e.stopImmediatePropagation();setTab('add');$('#constellate-search').focus();return;}}if(!editing&&(e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();e.key.toLowerCase()==='y'||e.shiftKey?redo():undo();return;}if(e.key!=='Escape')return;if(drawThread){setDrawThread(false);e.preventDefault();e.stopImmediatePropagation();return;}if(connecting||shiftFirst||dragLink){cancelConnect();render();}else if(!inline.hidden){inline.hidden=true;draft=draftKey=null;}else if(!context.hidden){backToList();}else if(!panel.hidden)close();else exit();e.preventDefault();e.stopImmediatePropagation();},true);
 document.addEventListener('click',e=>{for(const d of $$('details[open]')){if(d.closest('#constellate-popup'))continue;const related=d.id==='index-tools'?$('#toggle-filters'):d.id==='exploration-trail'?e.target.closest('#toggle-recent,#toggle-saved'):null;if(!d.contains(e.target)&&!related?.contains(e.target))d.open=false;}const menu=$('.weave-add-menu');if(menu&&!menu.contains(e.target)&&!e.target.closest('[data-collect-current]')){menu.remove();pendingPicker=null;}},true);
 $('#reset-workspace').addEventListener('click',e=>{if(enabled){e.stopImmediatePropagation();exit({restore:false});A.resetWorkspace();}},true);
 // During an animated map zoom, keep the existing SVG nodes and their focus.
// Rebuilding the entire graph at every camera frame made the cords stutter and
// re-ran card collision layout dozens of times for one zoom-button press.
function updateCameraGraph(){
 if(!enabled||unmapped||!graph.querySelector('#constellate-world'))return;
 dimensions();
 const warpLayer=graph.querySelector('.loom-warp');
 if(warpLayer&&cameraBaseWarp){
  const a=A.screenPoint([-120,30]),b=A.screenPoint([-80,30]);
  const dx=cameraBaseWarp.b[0]-cameraBaseWarp.a[0];
  const scale=(b?.[0]-a?.[0])/dx;
  if(Number.isFinite(scale)&&scale>0&&Math.abs(dx)>1){
   const tx=a[0]-cameraBaseWarp.a[0]*scale,ty=a[1]-cameraBaseWarp.a[1]*scale;
   warpLayer.setAttribute('transform',`translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})`);
  }
 }
 const nextAnchors=new Map();
 for(const x of S.current().items){const a=anchor(x);if(a)nextAnchors.set(x.id,a);}
 const nextPositions=new Map();
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 for(const [id,base] of cameraBasePositions){
  const prior=cameraBaseAnchors.get(id),a=nextAnchors.get(id);
  const x=prior&&a?base.x+a.x-prior.x:base.x;
  const y=prior&&a?base.y+a.y-prior.y:base.y;
  nextPositions.set(id,{...base,x:clamp(x,NW()/2+10,size.width-NW()/2-10),y:clamp(y,top()+NH/2,size.height-65-NH/2)});
 }
 anchors=nextAnchors;positions=nextPositions;tpCache=new Map();
 const visibleThreads=S.current().threads.filter(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));
 const threadNodes=new Map([...graph.querySelectorAll('.weave-thread[data-thread]')].map(n=>[n.dataset.thread,n]));
 visibleThreads.forEach((t,ti)=>{
  const g=threadNodes.get(t.id);if(!g)return;
  const path=braided(t,-1);
  g.querySelectorAll('.weave-thread-shadow,.weave-thread-halo,.weave-thread-glow').forEach(p=>p.setAttribute('d',path));
  g.querySelectorAll('.weave-cord').forEach((p,i)=>p.setAttribute('d',braided(t,i)));
  const start=threadPoints(t)[0]?.[0],name=g.querySelector('.weave-thread-name');
  const mid=threadMid(t)||start;if(mid&&name){name.setAttribute('x',mid.x.toFixed(1));name.setAttribute('y',(mid.y-11).toFixed(1));}
  g.querySelectorAll('.weave-stop[data-weave-knot]').forEach(n=>{const p=positions.get(n.dataset.weaveKnot);if(p)n.setAttribute('transform',`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);});
  const runs=threadPoints(t),first=runs[0],last=runs.at(-1);
  const angle=(from,to)=>Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
  if(first?.length){const a=first[0],next=first[Math.min(4,first.length-1)],loop=g.querySelector('.weave-cord-loop');if(loop)loop.setAttribute('transform',`translate(${a.x.toFixed(1)},${a.y.toFixed(1)}) rotate(${angle(next,a).toFixed(1)})`);}
  if(last?.length){const a=last.at(-1),prev=last[Math.max(0,last.length-5)],tail=g.querySelector('.weave-tassel');if(tail)tail.setAttribute('transform',`translate(${a.x.toFixed(1)},${a.y.toFixed(1)}) rotate(${angle(prev,a).toFixed(1)})`);}
  g.querySelectorAll('.weave-note-mark[data-weave-knot]').forEach(mark=>{const id=mark.dataset.weaveKnot,i=t.items.indexOf(id),a=positions.get(t.items[i-1]),b=positions.get(id);if(!a||!b)return;const pts=curve([{x:a.x,y:a.y},{x:b.x,y:b.y}]),m=pts[Math.floor(pts.length/2)];mark.setAttribute('transform',`translate(${m.x.toFixed(1)},${m.y.toFixed(1)})`);});
 });
 graph.querySelectorAll('.weave-star-label').forEach(n=>{const p=positions.get(n.dataset.weaveKnot);if(p){n.setAttribute('x',(p.x+ +n.dataset.starDx).toFixed(1));n.setAttribute('y',(p.y+ +n.dataset.starDy).toFixed(1));}});
 const nodeGroups=new Map([...graph.querySelectorAll('.weave-item[data-weave-item]')].map(n=>[n.dataset.weaveItem,n]));
 for(const [id,p] of nextPositions){
  const g=nodeGroups.get(id);if(!g)continue;
  const card=g.querySelector('.constellate-card');
  if(card)card.setAttribute('transform',`translate(${(p.x-NW()/2).toFixed(1)},${(p.y-NH/2).toFixed(1)})`);
  const leader=g.querySelector('.weave-leader'),a=nextAnchors.get(id);
  if(leader&&a){leader.setAttribute('x1',a.x);leader.setAttribute('y1',a.y);leader.setAttribute('x2',p.x);leader.setAttribute('y2',p.y);}
  const pin=g.querySelector('.weave-land-pin');
  if(pin&&a){pin.setAttribute('cx',a.x);pin.setAttribute('cy',a.y);}
  const arrow=g.querySelector('.weave-edge-arrow');
  if(arrow)arrow.setAttribute('d',`M${p.x-6},${p.y-31} l6,-8 l6,8 z`);
 }
 const edgeNodes=new Map([...graph.querySelectorAll('[data-constellate-edge]')].map(n=>[n.dataset.constellateEdge,n]));
 for(const l of S.current().links){
  const g=edgeNodes.get(l.id),a=positions.get(l.source),b=positions.get(l.target);
  if(!g||!a||!b)continue;
  const d=`M${a.x},${a.y}Q${(a.x+b.x)/2},${(a.y+b.y)/2-38} ${b.x},${b.y}`;
  g.querySelectorAll('path').forEach(p=>p.setAttribute('d',d));
  const label=g.querySelector('text');
  if(label){label.setAttribute('x',(a.x+b.x)/2);label.setAttribute('y',(a.y+b.y)/2-24);}
 }
 renderPreview();
}
function scheduleGraph(){if(!enabled||frame)return;frame=requestAnimationFrame(()=>{frame=0;updateCameraGraph();});}
function finishCameraGraph(){if(frame){cancelAnimationFrame(frame);frame=0;}if(enabled)renderGraph();}
window.addEventListener('atlas-camera-frame',scheduleGraph);
window.addEventListener('atlas-camera-change',finishCameraGraph);
window.addEventListener('resize',finishCameraGraph);new MutationObserver(()=>{if(enabled){renderLegend();renderGraph();}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-reading-theme']});
 function applyNight(){ $('#atlas .weave-night-veil')?.remove(); }
 let playInterval=6000,playToolbar=null,playToolbarPlaceholder=null;/* The toolbar stays in the document during Play (the atlas reads its checkboxes when the camera moves); it is only hidden. */function hidePlayToolbar(){if(playToolbar)return;playToolbar=[...document.querySelectorAll('.map-panel .map-toolbar,.map-panel .zoom')];for(const el of playToolbar){el.dataset.playDisplay=el.style.getPropertyValue('display');el.style.setProperty('display','none','important');}}function restorePlayToolbar(){for(const el of playToolbar||[]){if(el.dataset.playDisplay)el.style.setProperty('display',el.dataset.playDisplay);else el.style.removeProperty('display');delete el.dataset.playDisplay;}playToolbar=null;playToolbarPlaceholder=null;}
 function closePlayCard(){if(!player)return;const c=S.current();fit('quiet');$('#weave-play-thread').textContent='CONSTELLATION COMPLETE';$('#weave-play-title').textContent=c.name;$('#weave-play-maker').textContent=c.author||'';$('#weave-play-themes').textContent='';$('#weave-play-subtitle').textContent=citation();$('#weave-play-progress').textContent='Constellation complete';$('#weave-play-image').hidden=true;$('#weave-play-fallback').hidden=true;$('#weave-play-pause').textContent='Replay';$('#weave-play-prev').disabled=false;$('#weave-play-next').disabled=true;}function pausePlay(value=true){playPaused=value;clearTimeout(playTimer);playTimer=null;const steps=readSteps();$('#weave-play-pause').textContent=playPaused?(steps.length>1&&playIndex===steps.length-1?'Replay':'Play'):'Pause';$('#weave-play-pause').setAttribute('aria-pressed',String(!playPaused));if(player&&!playPaused&&steps.length){playTimer=setTimeout(()=>{playTimer=null;if(!player||playPaused)return;if(playIndex<readSteps().length-1)playStep(playIndex+1);else{pausePlay(true);closePlayCard();}},playInterval);}}
 function playStep(index){const steps=readSteps();if(index<0||index>=steps.length)return;playIndex=index;const{thread,item}=steps[index];active=item.id;playThread=thread.id;$('#weave-play-themes').textContent=terms(item).join(' · ');const ref=reference(item);if(ref)A.focusLandOnMap(ref.id);const image=sourceImage(item),img=$('#weave-play-image'),tile=$('#weave-play-fallback');tile.textContent=initials(item);tile.setAttribute('aria-label','No sourced image for '+item.title);tile.hidden=false;img.hidden=true;img.onload=()=>{img.hidden=false;tile.hidden=true;};img.onerror=()=>{img.hidden=true;tile.hidden=false;};if(image){img.alt='Film image for '+item.title;img.src=image;}else img.removeAttribute('src');$('#weave-play-thread').textContent=thread.name+(S.current().author?' · created by '+S.current().author:'');$('#weave-play-title').textContent=item.title;$('#weave-play-maker').textContent=[item.maker,item.year,landCaption(item)].filter(Boolean).join(' · ');$('#weave-play-subtitle').textContent=thread.notes[item.id]||item.note||'';const within=thread.items.indexOf(item.id)+1;$('#weave-play-progress').textContent=thread.name+' · '+within+' of '+thread.items.length;$('#weave-play-thread').textContent=thread.name.toUpperCase()+' · '+within+' OF '+thread.items.length;$('#weave-play-prev').disabled=index===0;$('#weave-play-next').disabled=index===steps.length-1;renderGraph();pausePlay(playPaused);}
 function playWeave(startAt=0){if(!enabled)open();if(!readSteps().length){status('Add a card to a visible thread before playing.');return false;}if(!player){playEntry={state:copy(A.captureState()),dock:!panel.hidden,reading,browsing:document.body.classList.contains('weave-browsing')};player=$('#weave-player');document.body.classList.add('weave-playing');hidePlayToolbar();window.AtlasFitCap=6;panel.hidden=true;document.body.classList.remove('weave-dock-open');player.hidden=false;restoreAtlas(playEntry.state);}modeButtons('play');playPaused=motion.matches;playStep(Math.max(0,Math.min(readSteps().length-1,startAt)));$('#weave-play-pause').focus({preventScroll:true});return true;}
 /* Play at night: the map goes to dusk and a pool of light follows the film on screen, so its land keeps its colour. */
function playLight(){if(!player)return;const k=graph.querySelector('.weave-stop.current'),g=graph.getBoundingClientRect(),r=k&&k.getBoundingClientRect();graph.style.setProperty('--play-x',r?(r.left+r.width/2-g.left).toFixed(1)+'px':'-999px');graph.style.setProperty('--play-y',r?(r.top+r.height/2-g.top).toFixed(1)+'px':'-999px');}
function stopPlay(){if(!player)return;playThread=null;pausePlay(true);player.hidden=true;player=null;document.body.classList.remove('weave-playing');restorePlayToolbar();window.AtlasFitCap=8;const prior=playEntry;playEntry=null;panel.hidden=!prior?.dock;document.body.classList.toggle('weave-dock-open',!panel.hidden);if(prior)restoreAtlas(prior.state);if(prior?.reading)readIndex=playIndex;setRead(!!prior?.reading);if(prior?.browsing)browse();render();if(active&&!reading&&!context.hidden)showContext();$('#weave-play').focus({preventScroll:true});}
 $('#weave-play').onclick=()=>playWeave();$('#weave-play-close').onclick=stopPlay;$('#weave-play-pause').onclick=()=>{if(playPaused&&playIndex===readSteps().length-1&&readSteps().length>1){playPaused=false;playStep(0);}else pausePlay(!playPaused);};$('#weave-play-prev').onclick=()=>playStep(playIndex-1);$('#weave-play-next').onclick=()=>playStep(playIndex+1);$('#weave-play-speed').onchange=e=>{const speed=Number(e.target.value);playInterval=[4000,6000,10000].includes(speed)?speed:6000;if(player&&!playPaused)pausePlay(false);};$('#weave-share-mode').onchange=showShare;motion.addEventListener?.('change',e=>{if(e.matches&&player)pausePlay(true);});
 $('#weave-copy-url').onclick=()=>{const url=$('#weave-url').value;if(url)copyText(url,$('#weave-url'));};$('#weave-copy-citation').onclick=()=>{promptCitationAuthor();copyText(citation(),$('#weave-url'));$('#weave-citation').textContent=citation();};$('#weave-export-json').onclick=()=>download(JSON.stringify(jsonExport(),null,2) ,'application/json',exportFilename('json'));$('#weave-export-csv').onclick=()=>download(csvExport() ,'text/csv;charset=utf-8',exportFilename('csv'));$('#weave-import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>5e6)throw Error('Choose a JSON file under 5 MB.');const raw=JSON.parse(await file.text());busy=true;if(raw.weave)S.importWeave(raw.weave);else S.importFile(raw);const orig=raw.weave||(raw.collections||[]).find(c=>c.id===raw.active)||(raw.collections||[])[0];if(orig){restorePersistedAnnotations({...orig,id:S.current().id});S.save();}busy=false;active=null;known.set(S.current().id,copy(S.current()));render();updateAddress();status('Imported as a constellation. Existing work is retained.');}catch(err){busy=false;status(err.message);}e.target.value='';};
 S.subscribe(()=>{if(busy)return;const c=S.current(),prior=known.get(c.id);if(prior)record(prior,copy(c),'Update constellation');known.set(c.id,copy(c));render();});
 // ---- Beta 1103: stepping, theme threads, suggestions, insert on the cord, timeline, compare, reading path ----
 function stepInfo(id){const c=S.current(),pref=[c.threads.find(t=>t.id===stepThread),S.activeThread(),...memberships(id)].filter(Boolean),t=pref.find(t=>t.items.includes(id));if(!t)return null;return{t,i:t.items.indexOf(id),n:t.items.length};}
 function stepNav(x){const s=stepInfo(x.id);return `<nav class="weave-step-nav" aria-label="Move along the thread"><button type="button" data-weave-back title="Back to the film list">← All films</button>${s?`<button type="button" data-weave-step="-1"${s.i<=0?' disabled':''} aria-label="Previous on ${esc(s.t.name)}" title="Previous ( [ )">‹</button><span><em><b>${s.i+1}</b> of ${s.n}</em><small>${esc(chipText(s.t.name,26))}</small></span><button type="button" data-weave-step="1"${s.i>=s.n-1?' disabled':''} aria-label="Next on ${esc(s.t.name)}" title="Next ( ] )">›</button>`:''}</nav>`;}
 function stepBy(d){if(!active)return;const s=stepInfo(active);if(!s)return;const id=s.t.items[s.i+d];if(!id)return;stepThread=s.t.id;const x=S.current().items.find(y=>y.id===id),ref=x&&reference(x);if(ref)A.focusLandOnMap(ref.id);choose(id);}
 // Follow a sourced theme relation in one action: add to thread, move the map,
// and open the destination card. Previously Add left the reader at the old film.
 function followFilm(x){
  if(!x||x.type!=='film')return false;
  if(drawThread)setDrawThread(false);
  if(reading)setRead(false);
  // Following another film is navigation, not a pending connector action.
  connecting=false;first=shiftFirst=dragLink=pointer=null;draft=draftKey=null;
  const old=existingWork(x);
  const membership=old&&S.current().threads.find(t=>t.items.includes(old.id));
  // A film already in any thread is a navigation target, not a duplicate addition.
  if(!membership){if(!add(x))return false;}
  const target=existingWork(x)||S.current().items.find(i=>i.id===x.id);
  if(!target)return false;
  stepThread=membership?.id||S.activeThread().id;
  const ref=reference(target);
  if(ref)A.focusLandOnMap(ref.id);
  choose(target.id);
  status('Following '+target.title+(terms(target).length?' · '+terms(target).join(' · '):'')+'.');
  return true;
 }
 function backToList(fromHistory=false){if(selPushed&&!fromHistory){selPushed=false;skipPop=true;window.history.back();}selPushed=false;setTab('add');active=null;stepThread=null;context.hidden=inline.hidden=true;fit();renderOrder();updateStepper();status('');if(!phone.matches){const box=$('#constellate-search');box.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'});box.focus({preventScroll:true});}}
 function updateStepper(){const s=enabled&&active&&!player&&!reading?stepInfo(active):null;$('#weave-stepper').hidden=!s;if(s){$('#weave-step-pos').textContent=(s.i+1)+' / '+s.n;$('#weave-step-prev').disabled=s.i<=0;$('#weave-step-next').disabled=s.i>=s.n-1;}renderTimeline();}
 $('#weave-step-prev').onclick=()=>stepBy(-1);$('#weave-step-next').onclick=()=>stepBy(1);
 $('#constellate-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const b=$('#constellate-results [data-constellate-add]:not(.on)');if(b){b.click();status('Added '+(b.closest('.constellate-result')?.querySelector('strong')?.textContent||'film')+'. Keep typing to add another.');}}});
 function addMany(list,label){const t=S.activeThread();let n=0;transaction('Add '+label,()=>{for(const x of list){const own=existingWork(x);if(own){if(!t.items.includes(own.id)&&S.addToThread(own.id,t.id))n++;}else if(S.add(x,{threadId:t.id}))n++;}return true;});if(n)fit();status(n?`Added ${n} film${n>1?'s':''} to ${t.name}.`:'Those films are already on this thread.');}
 // theme threads
 const DYE_FOR={'Land and Environment':'star-bluewhite','Sovereignty and Politics':'star-red','Knowledge and Continuity':'star-blue','Lives and Relations':'star-yellow','Expression and Representation':'star-orange'};
 function themeFilms(term){return azAll('film').filter(x=>terms(x).includes(term)).sort((a,b)=>(yearNum(a)||9999)-(yearNum(b)||9999));}

 function sampleThemeFilms(items,n){
  if(items.length<=n)return items.slice();
  if(n===1)return [items[Math.floor(items.length/2)]];
  return Array.from({length:n},(_,i)=>items[Math.round(i*(items.length-1)/(n-1))]);
 }
 function themeTermFor(t){
  return Object.keys(FAM).find(term=>t.description?.startsWith('Films tagged '+term+' from their published synopses'))||null;
 }
 function remainingThemeFilms(t,term){
  return themeFilms(term).filter(x=>{const own=existingWork(x);return !own||!t.items.includes(own.id);});
 }
 function renderThemeMore(){
  const box=$('#weave-theme-more'),t=S.activeThread(),term=themeTermFor(t);
  if(!box)return;
  if(!term){box.hidden=true;box.innerHTML='';return;}
  const total=themeFilms(term).length,missing=remainingThemeFilms(t,term),shown=total-missing.length,next=Math.min(6,missing.length);
  box.hidden=false;
  box.innerHTML='<p><b>'+esc(term)+'</b> · '+shown+' of '+total+' films in this thread</p>'+
   '<p class="weave-theme-context">Start with a small selection across the years. Unfold more when ready; reorder, compare and annotate freely. All films remain in the catalog.</p>'+
   '<div class="weave-theme-more-actions">'+
   (next?'<button type="button" id="weave-theme-unfold">+ Unfold '+next+' more</button>':'<span class="weave-theme-complete">All theme films included</span>')+
   '<button type="button" id="weave-theme-browse">Browse all '+total+'</button></div>';
  const addButton=$('#weave-theme-unfold');
  if(addButton)addButton.onclick=()=>{
   const batch=sampleThemeFilms(remainingThemeFilms(t,term),6);
   if(!batch.length)return;
   const ok=transaction('Unfold theme films',()=>{
    for(const x of batch){const own=existingWork(x);if(own)S.addToThread(own.id,t.id);else S.add(x,{threadId:t.id});}
    return true;
   });
   if(ok){status('Unfolded '+batch.length+' more films in “'+term+'.” Map position preserved; follow the thread or unfold another group.');}
  };
  $('#weave-theme-browse').onclick=()=>{
   setTab('add');
   $('#constellate-search').value=term;
   renderResults();
   $('#constellate-search').focus({preventScroll:true});
  };
 }
 function themeThread(term){
  $('#weave-thread-form').hidden=true;setTab('thread');
  const all=themeFilms(term),films=sampleThemeFilms(all,6);
  if(!films.length)return;
  if(!enabled)open();
  setRead(false);
  const desc='Films tagged '+term+' from their published synopses.';
  const id=transaction('Start theme thread',()=>{
   const c=S.current(),blank=c.threads.length===1&&!c.threads[0].items.length;
   let tid;
   if(blank){const t0=c.threads[0];t0.name=term;t0.description=desc;t0.color=DYE_FOR[FAM[term]]||t0.color;tid=t0.id;}
   else tid=S.createThread(term,desc,DYE_FOR[FAM[term]]);
   if(!tid)return false;
   for(const x of films){const own=existingWork(x);if(own)S.addToThread(own.id,tid);else S.add(x,{threadId:tid});}
   c.activeThread=tid;c.selectedItem=null;S.save();return tid;
  });
  if(!id){status('This constellation has the most threads it can hold.');return;}
  active=null;fit('quiet');render();
  status(all.length>films.length?'Opened '+films.length+' of '+all.length+' films in “'+term+'.” Use Unfold more to continue.':'Opened '+films.length+' films in “'+term+'.”');
 }
 function renderThemeStart(){const m=new Map();for(const x of azAll('film'))for(const t of terms(x))m.set(t,(m.get(t)||0)+1);$('#weave-theme-start').innerHTML='<option value="">Choose a theme…</option>'+Object.entries(TH.families).map(([fam,ts])=>`<optgroup label="${esc(fam)}">${ts.filter(t=>m.get(t)).map(t=>`<option value="${esc(t)}">${esc(t)} (${m.get(t)})</option>`).join('')}</optgroup>`).join('');const top=[...m].sort((a,b)=>b[1]-a[1]).slice(0,4);$('#weave-hint-themes').innerHTML=top.length?top.map(([t,n])=>`<button type="button" data-theme-thread="${esc(t)}">${esc(t)} <small>${n}</small></button>`).join(''):'';}

 // The first-look example uses only film themes already present in the atlas.
 // No links or imagined relationships are inserted; viewers author those themselves.
 const EXAMPLE_TERMS=['Memory and Oral History','Linguistic Preservation','Land Defense'];
 function exampleSeed(){
  const names=[...new Set([...EXAMPLE_TERMS,...Object.values(TH.families).flat()])];
  const groups=names.map(term=>({term,films:themeFilms(term)}));
  const chosen=groups.find(g=>new Set(g.films.map(x=>x.record)).size>=3)
   ||groups.sort((a,b)=>b.films.length-a.films.length)[0];
  const items=chosen?.films||[];
  const pool=[...items.filter(sourceImage),...items.filter(x=>!sourceImage(x))];
  const sampled=pool.length>3?[pool[0],pool[Math.floor(pool.length/2)],pool.at(-1)]:pool;
  const seen=new Set(),films=[];
  for(const x of [...sampled,...pool]){
   if(!x||seen.has(x.record)||films.some(y=>y.id===x.id))continue;
   seen.add(x.record);films.push(x);
   if(films.length===3)break;
  }
  return {theme:chosen?.term||'Memory and Oral History',films};
 }
 const example=exampleSeed();
 function renderExamplePreview(){
  const area=$('#weave-intro-films'),cta=$('#weave-example');
  area.innerHTML=example.films.map(x=>`<div class="weave-intro-film" role="listitem">${thumb(x)}<strong>${esc(chipText(x.title,32))}</strong><small>${esc(chipText(x.maker,25))}</small></div>`).join('');
  $('#weave-intro-label').textContent=example.films.length
   ?'An example · '+example.theme+' · '+example.films.length+' films':'Choose a theme below to begin.';
  cta.disabled=example.films.length<3;
 }
 function createExample(){
  if(example.films.length<3){status('Choose a theme or browse the films to start.');return;}
  if(S.state.collections.length>=50){status('This browser has 50 constellations. Export or remove one before opening an example.');return;}
  if(!S.create('Example · '+example.theme)){status('Could not save an example in this browser.');return;}
  const c=S.current(),t=S.activeThread();
  c.note='A starting constellation of films tagged '+example.theme+' in published film synopses. This common theme is documented; any further relation you draw is yours to interpret.';
  t.name=example.theme;
  t.description='Films tagged '+example.theme+' from their published synopses.';
  t.color=DYE_FOR[FAM[example.theme]]||'star-bluewhite';
  for(const x of example.films)S.add(x,{threadId:t.id});
  c.selectedItem=null;S.save();known.set(c.id,copy(c));
  active=null;context.hidden=inline.hidden=true;
  setTab('thread');setRead(false);render();fit();
  status('Opened '+example.films.length+' films in a new example constellation, saved in this browser. You can edit or share it.');
 }
 renderExamplePreview();
 $('#weave-example').onclick=createExample;
 $('#weave-intro-browse').onclick=()=>{setTab('add');$('#constellate-search').focus({preventScroll:true});};
 renderThemeStart();$('#weave-theme-start').onchange=e=>{const v=e.target.value;e.target.value='';if(v)themeThread(v);};$('#weave-empty-hint').addEventListener('click',e=>{const b=e.target.closest('[data-theme-thread]');if(b)themeThread(b.dataset.themeThread);});

 // Recommendations use published metadata only: synopsis themes, mapped land
 // reference IDs, explicitly recorded people, director IDs, credited languages,
 // and year. No geographic or identity inference from titles, surnames or plots.
 const suggestCache=new Map(),genericPeople=/^(indigenous|first nations?|native american|aboriginal|intertribal|collective|unknown|not recorded)$/i;
 function suggestEvidence(x){
  if(!x||!x.record)return null;
  if(!suggestCache.has(x.id)){
   const r=A.recordById(x.record),film=filmOf(x),land=new Map(),people=new Map(),languages=new Map();
   for(const ref of A.recordLandReferences(x.record).filter(ref=>ref.mapped&&ref.id))
    land.set(ref.id,ref.name||'Mapped land');
   for(const name of publishedValues(r?.community)){
    if(!genericPeople.test(name.trim()))people.set(norm(name),name);
   }
   for(const name of publishedValues(film?.languages||film?.language))languages.set(norm(name),name);
   suggestCache.set(x.id,{land,people,languages,makerId:x.record,year:yearNum(x),themes:new Set(terms(x))});
  }
  return suggestCache.get(x.id);
 }
 function suggestionBases(seed,x){
  const a=suggestEvidence(seed),b=suggestEvidence(x);if(!a||!b)return {bases:[],themeCount:0,land:false,people:false,maker:false,language:false,decade:false};
  const themes=[...b.themes].filter(term=>a.themes.has(term));
  const land=[...a.land].find(([id])=>b.land.has(id));
  const people=[...a.people].find(([name])=>b.people.has(name));
  const language=[...a.languages].find(([name])=>b.languages.has(name));
  const maker=!!(a.makerId&&a.makerId===b.makerId);
  const decade=!!(a.year&&b.year&&Math.floor(a.year/10)===Math.floor(b.year/10));
  const bases=[];
  if(land)bases.push('Same mapped land: '+land[1]);
  if(people)bases.push('Same people: '+people[1]);
  if(maker)bases.push('Same filmmaker: '+seed.maker);
  if(language)bases.push('Same published language: '+language[1]);
  if(themes.length)bases.push('Shared synopsis theme: '+themes.slice(0,2).join(' · '));
  if(decade)bases.push('Same decade: '+Math.floor(a.year/10)*10+'s');
  return {bases,themeCount:themes.length,land:!!land,people:!!people,maker,language:!!language,decade};
 }
 function renderSuggest(){
  const box=$('#weave-suggest'),c=S.current(),t=S.activeThread();
  const current=c.items.find(x=>x.id===active&&x.type==='film');
  const last=[...t.items].reverse().map(id=>c.items.find(x=>x.id===id)).find(x=>x&&x.type==='film');
  const seed=current||last;
  if(!seed){box.hidden=true;box.innerHTML='';return;}
  const ly=yearNum(seed);
  const picks=azAll('film').filter(x=>key(x)!==key(seed)).map(x=>{
   const basis=suggestionBases(seed,x),y=yearNum(x),saved=existingWork(x);
   const sameThread=!!(saved&&t.items.includes(saved.id)),inWeave=!!saved;
   // Keep existing on-thread/in-constellation preference; its ranking belongs to Claude.
   const score=basis.themeCount*10+(basis.land?12:0)+(basis.people?9:0)+
    (basis.maker?10:0)+(basis.language?7:0)+(basis.decade?3:0)+
    (sameThread?22:inWeave?10:0)-(ly&&y?Math.min(5,Math.abs(y-ly)/8):3);
   return {x,...basis,sameThread,inWeave,score};
  }).filter(p=>p.bases.length).sort((a,b)=>b.score-a.score||
   Number(!!sourceImage(b.x))-Number(!!sourceImage(a.x))||azSort.compare(a.x.title,b.x.title)).slice(0,6);
  box.hidden=false;
  box.innerHTML='<div class="weave-suggest-head"><h3>Follow another film</h3><small>'+esc(chipText(seed.title,45))+'</small></div>'+
   (picks.length?'<p class="weave-suggest-intro">Possible next films, with their matching published atlas metadata. These are starting points for interpretation, not claims that the films share a story.</p>'+
    picks.map(({x,bases})=>'<div class="constellate-result weave-follow-result" draggable="true" data-drag-film="'+esc(x.id)+'">'+thumb(x)+'<span><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small><small class="weave-theme-tags" title="'+esc(bases.join(' · '))+'">'+esc(bases.slice(0,2).join(' · '))+'</small></span><button type="button" data-weave-follow="'+esc(x.id)+'" aria-label="Follow to '+esc(x.title)+'">Follow →</button></div>').join('')
   :'<p class="weave-suggest-intro">No next film matches the published land, people, director, language, year or synopsis themes recorded for this title. Use Find films to continue.</p>');
 }
 // drop on the cord inserts between knots
 function insertIndex(p){const t=S.activeThread(),pt=id=>{const x=S.current().items.find(y=>y.id===id);return x?.type==='concept'?positions.get(id):anchors.get(id);};let best=null,bd=26;for(let i=0;i<t.items.length-1;i++){const a=pt(t.items[i]),b=pt(t.items[i+1]);if(!a||!b)continue;for(const q of curve([{x:a.x,y:a.y},{x:b.x,y:b.y}])){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=i+1;}}}return best;}
 function insertAt(x,index){const t=S.activeThread(),existing=existingWork(x);let id=existing?.id;const ok=transaction('Insert film',()=>{let saved=existing?S.addToThread(existing.id,t.id):S.add(x,{threadId:t.id});if(!existing)id=S.current().selectedItem;const tt=S.activeThread(),from=tt.items.indexOf(id);if(from>=0&&from!==index)saved=S.reorderThread(tt.id,from,Math.min(index,tt.items.length-1))&&saved;return saved;});if(ok){active=id;render();status('Inserted '+x.title+' at '+(index+1)+' on '+t.name+'.');}}
 // edit, duplicate and delete a thread
 $('#weave-thread-dup').onclick=()=>{const t=S.activeThread();const ok=transaction('Duplicate thread',()=>{const id=S.createThread(t.name.slice(0,92)+' (copy)',t.description,t.color);if(!id)return false;const n=S.current().threads.find(x=>x.id===id);n.items=[...t.items];n.notes={...t.notes};return S.save();});$('#weave-thread-edit-form').hidden=true;status(ok?'Duplicated '+t.name+'. You are now editing the copy.':'This constellation has the most threads it can hold.');};
 $('#weave-thread-edit').onclick=()=>{const f=$('#weave-thread-edit-form'),t=S.activeThread();f.hidden=!f.hidden;if(!f.hidden){$('#weave-edit-name').value=t.name;$('#weave-edit-description').value=t.description||'';f.querySelectorAll('input[name=weave-edit-dye]').forEach(r=>r.checked=r.value===t.color);$('#weave-edit-name').focus({preventScroll:true});}};
 $('#weave-thread-edit-form').onsubmit=e=>{e.preventDefault();const t=S.activeThread();transaction('Edit thread',()=>{t.name=$('#weave-edit-name').value.trim().slice(0,100)||t.name;t.description=$('#weave-edit-description').value.slice(0,1200);const c=e.target.querySelector('input[name=weave-edit-dye]:checked')?.value;if(c)t.color=c;return S.save();});e.target.hidden=true;};
 $('#weave-edit-cancel').onclick=()=>{$('#weave-thread-edit-form').hidden=true;};
 $('#weave-edit-delete').onclick=()=>{const c=S.current(),t=S.activeThread();if(c.threads.length<=1){status('A constellation keeps at least one thread. Use Clear constellation in the toolbar instead.');return;}transaction('Delete thread',()=>{const orphan=t.items.filter(id=>!c.threads.some(o=>o.id!==t.id&&o.items.includes(id)));c.threads=c.threads.filter(x=>x.id!==t.id);c.activeThread=c.threads[0].id;for(const id of orphan)S.remove(id);return S.save();});$('#weave-thread-edit-form').hidden=true;active=null;context.hidden=true;status('Thread deleted. Undo (↶) brings it back.');};
 // timeline
 function renderTimeline(){const box=$('#weave-timeline');$('#weave-timeline-toggle').setAttribute('aria-pressed',String(timelineOn));$('#weave-timeline-toggle').textContent=timelineOn?'Hide timeline':'Show timeline';box.hidden=!timelineOn||!enabled||!!player;if(box.hidden)return;const c=S.current(),night=document.documentElement.dataset.readingTheme==='night'||!!player,rows=c.threads.filter(t=>t.visible&&t.items.length).map(t=>({t,pts:t.items.map((id,i)=>({id,i,x:c.items.find(y=>y.id===id)})).filter(p=>p.x&&p.x.type!=='concept')}));const ys=rows.flatMap(r=>r.pts.map(p=>yearNum(p.x))).filter(Boolean);if(!ys.length){box.innerHTML='<p>Add dated films to a visible thread to see it in time.</p>';return;}let y0=Math.min(...ys),y1=Math.max(...ys);if(y1-y0<4){y0-=2;y1+=2;}const W=Math.max(320,(box.clientWidth||map.clientWidth-40)-16),L=16,R=22,lane=34,H=26+rows.length*lane,X=y=>L+(y-y0)/(y1-y0)*(W-L-R),step=[1,2,5,10,20,25,50].find(s=>(y1-y0)/s<=9)||100,ticks=[];for(let y=Math.ceil(y0/step)*step;y<=y1;y+=step)ticks.push(y);
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Visible threads by year">${ticks.map(y=>`<g class="wt-tick"><line x1="${X(y).toFixed(1)}" x2="${X(y).toFixed(1)}" y1="4" y2="${H-16}"/><text x="${X(y).toFixed(1)}" y="${H-3}" text-anchor="middle">${y}</text></g>`).join('')}`;
  rows.forEach(({t,pts},k)=>{const yy=24+k*lane,dye=palette[t.color]||palette.indigo,col=night?dye[1]:dye[0],dated=pts.filter(p=>yearNum(p.x)),undated=pts.length-dated.length;let arcs='';for(let j=1;j<dated.length;j++){const a=X(yearNum(dated[j-1].x)),b=X(yearNum(dated[j].x)),h=Math.min(14,4+Math.abs(b-a)*.12);arcs+=`M${a.toFixed(1)},${yy}Q${((a+b)/2).toFixed(1)},${(yy-h).toFixed(1)} ${b.toFixed(1)},${yy}`;}const seen={};svg+=`<text class="wt-name" x="${L}" y="${yy-13}" fill="${col}">${esc(chipText(t.name,40))}${undated?` · ${undated} undated`:''}</text><path class="wt-arc" d="${arcs}" stroke="${col}"/>`+dated.map((p,_i,_a,yr=yearNum(p.x),n=(seen[yr]=(seen[yr]||0)+1)-1)=>`<g class="wt-dot${p.id===active?' on':''}" data-wt="${esc(p.id)}" role="button" tabindex="0" transform="translate(${X(yr).toFixed(1)},${yy+(n?(n%2?-1:1)*Math.ceil(n/2)*6:0)})"><circle r="${filmOf(p.x)?.weaveLength==='F'?8.5:7}" fill="${shade(col,night?-.45:-.35)}" stroke="${famColor(p.x)||shade(col,.45)}"/><text y="3.2" text-anchor="middle">${p.i+1}</text><title>${esc(p.x.title)} · ${yearNum(p.x)}</title></g>`).join('');});box.innerHTML=svg+'</svg>';}
 $('#weave-timeline-toggle').onclick=()=>{timelineOn=!timelineOn;renderTimeline();status(timelineOn?'Timeline shows the visible threads by year. The map keeps their places.':'');};
 $('#weave-timeline').addEventListener('click',e=>{const d=e.target.closest('[data-wt]');if(!d)return;const x=S.current().items.find(y=>y.id===d.dataset.wt),ref=x&&reference(x);if(ref)A.focusLandOnMap(ref.id);if(x)choose(x.id);});$('#weave-timeline').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.closest('[data-wt]')){e.preventDefault();e.target.closest('[data-wt]').dispatchEvent(new MouseEvent('click',{bubbles:true}));}});window.addEventListener('resize',()=>{if(timelineOn)renderTimeline();});
 // compare two threads
 function renderCompare(){const box=$('#weave-compare'),c=S.current();if(box.hidden)return;if(c.threads.length<2){box.innerHTML='<div class="weave-compare-head"><h3>Compare threads</h3><button type="button" data-compare-close aria-label="Close comparison">×</button></div><p>Make a second thread to compare.</p>';return;}const a=c.threads.find(t=>t.id===box.dataset.a)||c.threads[0],b=c.threads.find(t=>t.id===box.dataset.b&&t.id!==a.id)||c.threads.find(t=>t.id!==a.id),it=id=>c.items.find(x=>x.id===id),opt=sel=>c.threads.map(t=>`<option value="${esc(t.id)}"${t.id===sel.id?' selected':''}>${esc(t.name)}</option>`).join(''),inB=new Set(b.items),inA=new Set(a.items),both=a.items.filter(id=>inB.has(id)),onlyA=a.items.filter(id=>!inB.has(id)),onlyB=b.items.filter(id=>!inA.has(id)),places=t=>new Set(t.items.map(id=>it(id)&&reference(it(id))?.name).filter(Boolean)),pa=places(a),pb=places(b),sp=[...pa].filter(p=>pb.has(p)),th=t=>new Set(t.items.flatMap(id=>it(id)?terms(it(id)):[])),ta=th(a),tb=th(b),st=[...ta].filter(x=>tb.has(x)),list=ids=>ids.length?`<ul>${ids.map(id=>`<li><button type="button" data-compare-pick="${esc(id)}">${esc(it(id)?.title||'')}</button></li>`).join('')}</ul>`:'<p class="weave-muted">None</p>',line=v=>v.length?`<p>${v.map(esc).join(' · ')}</p>`:'<p class="weave-muted">None</p>';
  box.innerHTML=`<div class="weave-compare-head"><h3>Compare threads</h3><button type="button" data-compare-close aria-label="Close comparison">×</button></div><div class="weave-compare-pick"><label class="sr-only" for="weave-compare-a">First thread</label><select id="weave-compare-a" data-compare="a">${opt(a)}</select><span>and</span><label class="sr-only" for="weave-compare-b">Second thread</label><select id="weave-compare-b" data-compare="b">${opt(b)}</select></div><h4>On both · ${both.length}</h4>${list(both)}<h4>Shared places · ${sp.length}</h4>${line(sp)}<h4>Shared themes · ${st.length}</h4>${line(st)}<h4>Only on ${esc(a.name)} · ${onlyA.length}</h4>${list(onlyA)}<h4>Only on ${esc(b.name)} · ${onlyB.length}</h4>${list(onlyB)}`;}
 $('#weave-compare').addEventListener('change',e=>{const s=e.target.closest('[data-compare]');if(!s)return;$('#weave-compare').dataset[s.dataset.compare]=s.value;renderCompare();});
 $('#weave-compare-open').onclick=()=>{setRead(false);setTab('thread');const b=$('#weave-compare');b.hidden=false;renderCompare();requestAnimationFrame(()=>b.scrollIntoView({block:'start',behavior:motion.matches?'auto':'smooth'}));};
 // reading path as a standalone page; citations per thread
 function threadCitation(t){const c=S.current(),author=c.author?.trim();return (author?author+'. ':'')+'“'+t.name+'.” In “'+c.name+'”, Indigenous Cinema Atlas: Abya Yala and Turtle Island, user-authored thread, '+localDate(c.editedAt||c.createdAt)+'. '+(shareURL('read')||new URL('./',location.href).href);}
 function readingHTML(){const c=S.current(),base=new URL('./',location.href).href,ts=c.threads.filter(t=>t.visible&&t.items.length),row=(t,id)=>{const x=c.items.find(y=>y.id===id);if(!x)return '';const f=filmOf(x),links=c.links.filter(l=>l.source===id||l.target===id),th=terms(x);return `<li><h3>${esc(x.title)}</h3><p class="m">${esc([x.maker,x.year,landCaption(x)].filter(Boolean).join(' · '))}</p>${th.length?`<p class="m">Themes: ${esc(th.join(', '))}${f?.themeSource?` · <a href="${esc(f.themeSource)}">synopsis source</a>`:''}</p>`:''}${t.notes[id]?`<p>${esc(t.notes[id])}</p>`:''}${links.map(l=>`<p class="m">${connectionHTML(l,id)}</p>`).join('')}${x.href?`<p class="m"><a href="${esc(new URL(x.href,base).href)}">Open in the atlas</a></p>`:''}</li>`;};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.name)}</title><style>body{font:17px/1.55 Georgia,serif;max-width:720px;margin:40px auto;padding:0 18px;color:#1d1d1b;background:#fbfaf6}h1{font-weight:400;font-size:2em;margin:0 0 .2em}h2{font-weight:400;border-top:1px solid #ccc;padding-top:.8em;margin-top:2em}h3{margin:0;font-size:1.05em}li{margin:0 0 1.1em}.m{font:14px/1.45 system-ui,sans-serif;color:#555;margin:.2em 0}a{color:#175fac}footer{font:13px/1.5 system-ui,sans-serif;color:#555;border-top:1px solid #ccc;margin-top:2.5em;padding-top:1em}</style></head><body><h1>${esc(c.name)}</h1>${c.author?`<p class="m">Created by ${esc(c.author)}</p>`:''}${c.note?`<p>${esc(c.note)}</p>`:''}${ts.map(t=>`<h2>${esc(t.name)}</h2>${t.description?`<p>${esc(t.description)}</p>`:''}${summary(t)?`<p class="m">${esc(summary(t))}</p>`:''}<ol>${t.items.map(id=>row(t,id)).join('')}</ol>`).join('')||'<p>No visible threads.</p>'}<footer>${esc(citation(shareURL('read')||base))}<br>Themes are tagged from each film’s published synopsis. Filmmakers, peoples and lands follow the atlas’s own sourcing.</footer></body></html>`;}


 let starMode=false,starBoxes=[];
 function starLabel(x,p){const text=chipText(x.title,24),w=text.length*6.1+8;let spot=null;for(const [dx,dy,anchor] of [[14,4,'start'],[-14,4,'end'],[14,-12,'start'],[14,20,'start'],[-14,-12,'end'],[-14,20,'end']]){const x0=anchor==='start'?p.x+dx:p.x+dx-w,box=[x0,p.y+dy-11,x0+w,p.y+dy+4];if(!starBoxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])){spot=[dx,dy,anchor,box];break;}}if(!spot)spot=[14,4,'start',[p.x+14,p.y-7,p.x+14+w,p.y+8]];starBoxes.push(spot[3]);return `<text class="weave-star-label" data-weave-knot="${esc(x.id)}" data-star-dx="${spot[0]}" data-star-dy="${spot[1]}" text-anchor="${spot[2]}" x="${(p.x+spot[0]).toFixed(1)}" y="${(p.y+spot[1]).toFixed(1)}">${esc(text)}</text>`;}
 function cardSet(){
  const c=S.current(),vis=c.items.filter(x=>visibleItem(x.id));
  starMode=false;
  if(drawThread||cardsAll)return null;
  // 2026-11-11 (Claude): when film cards would pile on one another (a hemisphere-wide view, a phone),
  // films are drawn as named stars and only the selected film and its neighbours open into cards.
  const spots=vis.filter(x=>x.type!=='concept').map(x=>anchors.get(x.id)).filter(Boolean);
  let crowded=false;for(let i=0;i<spots.length&&!crowded;i++)for(let j=i+1;j<spots.length;j++)if(Math.abs(spots[i].x-spots[j].x)<178&&Math.abs(spots[i].y-spots[j].y)<52){crowded=true;break;}
  if(crowded){starMode=true;const set=new Set(vis.filter(x=>x.type==='concept').map(x=>x.id)),ok=new Set(vis.map(x=>x.id)),keep=id=>{if(id&&ok.has(id))set.add(id);};
   for(const id of [active,first,shiftFirst,drag?.id,dragLink?.source,drawLast])keep(id);
   return set;}
  if(vis.length<=8)return null;
  // A dense constellation still has every film position and a continuous ribbon.
  // Only its thumbnail cards are sampled; the remaining film stops stay clickable.
  const cap=size.width<700?7:11,valid=new Set(vis.map(x=>x.id)),set=new Set(vis.filter(x=>x.type==='concept').map(x=>x.id));
  const keep=id=>{if(id&&valid.has(id))set.add(id);};
  for(const l of c.links){keep(l.source);keep(l.target);}
  for(const id of [active,first,shiftFirst,drag?.id,dragLink?.source,drawLast])keep(id);
  if(active){const s=stepInfo(active);if(s){if(s.i>0)keep(s.t.items[s.i-1]);if(s.i<s.n-1)keep(s.t.items[s.i+1]);}}
  const ordered=[S.activeThread(),...c.threads].filter((t,i,a)=>t.visible&&t.items.length&&a.indexOf(t)===i);
  for(const t of ordered){const ids=t.items.filter(id=>valid.has(id));if(!ids.length)continue;keep(ids[0]);keep(ids.at(-1));if(set.size>=cap)break;}
  for(const fraction of [.5,.25,.75,.125,.875,.375,.625,.0625,.9375]){
   if(set.size>=cap)break;
   for(const t of ordered){if(set.size>=cap)break;const ids=t.items.filter(id=>valid.has(id));if(ids.length>2)keep(ids[Math.round((ids.length-1)*fraction)]);}
  }
  return set;
 }
 function syncCardsToggle(){const b=$('#weave-cards-toggle');b.setAttribute('aria-pressed',String(cardsAll));b.textContent=cardsAll?'Show fewer cards':'Show every card';}
 $('#weave-cards-toggle').onclick=()=>{cardsAll=!cardsAll;try{localStorage.setItem('weave-cards-all',cardsAll?'1':'0');}catch{}syncCardsToggle();renderGraph();status(cardsAll?'Every card is on the map.':'Showing knots, with cards for the selected film and its neighbours.');};syncCardsToggle();
 $('#weave-editor').insertBefore(context,$('#weave-editor').firstChild);

 // Beta 1103d: the dock has two tabs, so the A–Z list is never pushed down by the thread
 $('#weave-editor').insertAdjacentHTML('afterbegin','<div class="weave-tabs" role="tablist" aria-label="Constellation editor"><button type="button" role="tab" id="weave-tab-thread" data-weave-tab="thread" aria-selected="true"></button><button type="button" role="tab" id="weave-tab-add" data-weave-tab="add" aria-selected="false">Browse films</button></div>');
 // Keep the next-film choices immediately after the selected film card.
 $('#constellate-context').after($('#weave-suggest'));
 function setTab(tab){const ed=$('#weave-editor');if(ed.dataset.tab===tab)return;ed.dataset.tab=tab;$$('[data-weave-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.weaveTab===tab)));panel.scrollTop=0;}
 function tabLabel(){const t=S.activeThread();$('#weave-tab-thread').innerHTML=`${esc(chipText(t.name,22))} <small>${t.items.length}</small>`;}
 $$('[data-weave-tab]').forEach(b=>b.onclick=()=>{setTab(b.dataset.weaveTab);if(b.dataset.weaveTab==='add')$('#constellate-search').focus({preventScroll:true});});
 setTab(S.current().items.length?'thread':'add');

 function modeButtons(m){clearNotice();[['constellate-edit','edit'],['constellate-read','read'],['constellate-share','share'],['weave-play','play']].forEach(([id,k])=>$('#'+id).setAttribute('aria-pressed',String(m===k)));}
 $('#constellate-edit').addEventListener('click',()=>modeButtons('edit'));
 // C. sort a thread by year, or as a route (nearest place next)
 function sortThread(by){const t=S.activeThread(),c=S.current(),it=id=>c.items.find(x=>x.id===id);let order;if(by==='year'){order=t.items.map((id,i)=>({id,i,y:yearNum(it(id))})).sort((a,b)=>(a.y||9999)-(b.y||9999)||a.i-b.i).map(o=>o.id);}else{const pts=t.items.map(id=>({id,p:it(id)?.type==='concept'?null:anchors.get(id)})),placed=pts.filter(o=>o.p),rest=pts.filter(o=>!o.p);if(placed.length<3){status('Add films with places to order this thread as a route.');return;}const start=placed.reduce((a,b)=>(b.p.y<a.p.y?b:a));order=[start];const left=new Set(placed.filter(o=>o!==start));while(left.size){const cur=order.at(-1);let best=null,bd=Infinity;for(const o of left){const d=Math.hypot(o.p.x-cur.p.x,o.p.y-cur.p.y);if(d<bd){bd=d;best=o;}}order.push(best);left.delete(best);}order=[...order,...rest].map(o=>o.id);}
  if(order.join()===t.items.join()){status('Already in that order.');return;}transaction(by==='year'?'Order by year':'Order by place',()=>{t.items=order;return S.save();});status(by==='year'?'Ordered by year. ↶ Undo restores your order.':'Ordered as a route from north to south, nearest place next. ↶ Undo restores your order.');}
 $('#weave-sort-year').onclick=()=>sortThread('year');$('#weave-sort-place').onclick=()=>sortThread('place');
 // F. hovering a film in the list shows where it would land
 function ghost(x){graph.querySelector('#weave-ghost')?.remove();if(!x||!enabled||unmapped)return;const a=anchor(x);if(!a||a.x<0||a.y<0||a.x>size.width||a.y>size.height)return;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='weave-ghost';g.setAttribute('transform',`translate(${a.x.toFixed(1)},${a.y.toFixed(1)})`);g.innerHTML=`<circle r="13"/><circle r="4" class="dot"/><text x="17" y="4">${esc(chipText(x.title,34))}</text>`;graph.querySelector('#constellate-world')?.append(g);}
 for(const sel of ['#constellate-results','#weave-suggest']){$(sel).addEventListener('pointerover',e=>{const r=e.target.closest('[data-drag-film]');if(r&&e.pointerType!=='touch')ghost(catalogById.get(r.dataset.dragFilm));});$(sel).addEventListener('pointerleave',()=>ghost(null));}
 document.addEventListener('pointerdown',e=>{const h=$('#constellate-how');if(h?.open&&!h.contains(e.target))h.open=false;});
 window.addEventListener('popstate',e=>{if(skipPop){skipPop=false;e.stopImmediatePropagation();return;}if(enabled&&selPushed){e.stopImmediatePropagation();backToList(true);}},true);
 {const h=$('#constellate-popup .constellate-heading');if(h)h.insertBefore($('#constellate-how'),$('#constellate-close'));}
 $('.constellate-collection').append($('#weave-settings'));

 // Beta 1103h: Disappear the map. The weave is laid out by relation: left to right by thread order (or year),
 // threads as horizontal paths, closeness by shared themes; a seeded random start keeps it a stochastic, not a coordinate, picture.
 function relationLayout(){const c=S.current(),ts=c.threads.filter(t=>t.visible&&t.items.length),W=size.width,H=size.height,top0=top()+34,bot=H-170,L=80,Rm=70,key=JSON.stringify([ts.map(t=>[t.id,t.items]),Math.round(W),Math.round(H),relX]);if(relCache.key===key)return relCache.map;
  const nodes=new Map();ts.forEach((t,ti)=>t.items.forEach((id,i)=>{const x=c.items.find(y=>y.id===id);if(!x||x.type==='concept')return;let n=nodes.get(id);if(!n){n={id,f:[],lanes:[],item:x,th:terms(x)};nodes.set(id,n);}n.f.push(t.items.length>1?i/(t.items.length-1):.5);n.lanes.push(ti);}));
  const list=[...nodes.values()],out=new Map();if(!list.length||!window.d3?.forceSimulation){relCache={key,map:out};return out;}
  const ys=list.map(n=>yearNum(n.item)).filter(Boolean),y0=Math.min(...ys),y1=Math.max(...ys),laneY=k=>ts.length<=1?(top0+bot)/2:top0+(k+.5)*(bot-top0)/ts.length;
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const cx=W/2,cy=(top0+bot)/2,R0=Math.max(60,Math.min(W*.42,(bot-top0)*.5)),ring=k=>ts.length<=1?R0*.8:R0*(.42+.58*(k+.5)/ts.length);for(const n of list){const yr=yearNum(n.item);if(relX==='circle'){const f=n.f.reduce((a,b)=>a+b,0)/n.f.length,k=n.lanes.reduce((a,b)=>a+b,0)/n.lanes.length,ang=f*Math.PI*2*(ts.some(t=>t.items.length>1)?(1-1/Math.max(2,...ts.map(t=>t.items.length))):1)-Math.PI/2,r=ring(k);n.tx=cx+Math.cos(ang)*r;n.ty=cy+Math.sin(ang)*r;n.x=n.tx;n.y=n.ty;continue;}n.tx=relX==='year'&&yr&&y1>y0?L+(yr-y0)/(y1-y0)*(W-L-Rm):L+(n.f.reduce((a,b)=>a+b,0)/n.f.length)*(W-L-Rm);n.ty=n.lanes.reduce((a,k)=>a+laneY(k),0)/n.lanes.length;n.x=n.tx+(rnd()-.5)*20;n.y=n.ty+(rnd()-.5)*60;}
  const links=[];ts.forEach(t=>{for(let i=1;i<t.items.length;i++)if(nodes.has(t.items[i-1])&&nodes.has(t.items[i]))links.push({source:t.items[i-1],target:t.items[i],s:.25});});
  for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length&&links.length<1600;b++){const sh=list[a].th.filter(k=>list[b].th.includes(k)).length;if(sh>=2)links.push({source:list[a].id,target:list[b].id,s:.035*sh});}
  const circ=relX==='circle',sim=d3.forceSimulation(list).randomSource(rnd).force('x',d3.forceX(n=>n.tx).strength(circ?.6:.85)).force('y',d3.forceY(n=>n.ty).strength(circ?.6:.1)).force('link',d3.forceLink(links).id(n=>n.id).strength(l=>l.s).distance(46)).force('collide',d3.forceCollide(17)).stop();for(let i=0;i<260;i++)sim.tick();
  for(const n of list){const ref=reference(n.item);out.set(n.id,{x:Math.max(L-40,Math.min(W-40,n.x)),y:Math.max(top0,Math.min(bot,n.y)),id:'',name:ref?.name||landCaption(n.item),status:'relation'});}
  relCache={key,map:out};return out;}
 function relAxis(){if(relX==='circle')return '<g class="weave-rel-axis" aria-hidden="true"><text x="80" y="'+(size.height-132)+'">Each thread runs clockwise from the top and comes back round to where it began.</text></g>';const W=size.width,H=size.height,L=80,Rm=70,y=H-132,c=S.current(),xs=c.threads.filter(t=>t.visible).flatMap(t=>t.items).map(id=>yearNum(c.items.find(x=>x.id===id))).filter(Boolean);let ticks='';if(relX==='year'&&xs.length){const y0=Math.min(...xs),y1=Math.max(...xs);if(y1>y0){const st=[1,2,5,10,20,25,50].find(s=>(y1-y0)/s<=8)||100;for(let v=Math.ceil(y0/st)*st;v<=y1;v+=st){const x=L+(v-y0)/(y1-y0)*(W-L-Rm);ticks+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y-5}" y2="${y+5}"/><text x="${x.toFixed(1)}" y="${y+20}" text-anchor="middle">${v}</text>`;}}}else ticks=`<text x="${L}" y="${y+20}">first</text><text x="${W-Rm}" y="${y+20}" text-anchor="end">last</text>`;return `<g class="weave-rel-axis" aria-hidden="true"><line x1="${L}" x2="${W-Rm}" y1="${y}" y2="${y}"/><path d="M${W-Rm},${y} l-8,-4 v8z"/>${ticks}</g>`;}
 function setUnmapped(on){unmapped=on;document.body.classList.toggle('weave-unmapped',on);const b=$('#weave-unmap');b.setAttribute('aria-pressed',String(on));b.textContent=on?'Return map':'Disappear map';$('#weave-relbar').hidden=!on;relCache.key='';renderGraph();if(on)status('The map is gone. Films sit by thread order and shared themes; their people and lands stay on each card.');}
 $('#weave-unmap').onclick=()=>setUnmapped(!unmapped);
 $('#weave-relbar').addEventListener('click',e=>{const b=e.target.closest('[data-relx]');if(!b)return;relX=b.dataset.relx;$('#weave-relbar>span').textContent=relX==='circle'?'No map. Arranged in':'No map. Left to right:';$$('#weave-relbar [data-relx]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));relCache.key='';renderGraph();});

 // The map toggle is part of the initial Layers HTML, never inserted later
 // into the zoom bar. Reuse it so the first and final controls are identical.
 {const z=document.querySelector('.map-panel .zoom');let b=$('#atlas-unmap');if(!b&&z){z.insertAdjacentHTML('beforeend','<button id="atlas-unmap" aria-pressed="false" title="Disappear the cartography: keep names, lose coastlines, borders and shading">Disappear map</button>');b=$('#atlas-unmap');}
  if(b&&!b.dataset.atlasBound){b.dataset.atlasBound='1';const set=on=>{document.body.classList.toggle('atlas-unmapped',on);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Return map':'Disappear map';try{localStorage.setItem('atlas-unmapped',on?'1':'0');}catch{}};b.onclick=()=>set(!document.body.classList.contains('atlas-unmapped'));try{if(localStorage.getItem('atlas-unmapped')==='1')set(true);}catch{}}}
 map.dataset.dropLabel='Drop to add to the thread';
 window.AtlasConstellate={open,browse,close,exit,undo,redo,fit,add,followFilm,showPicker,setRead,shareURL,citation,csvExport,jsonExport,choose,startLink,reference,tags,play:playWeave,stopPlay,pausePlay,playStep,get playing(){return !!player},get enabled(){return enabled},get positions(){return new Map(positions)},get anchors(){return new Map(anchors)},get catalog(){return catalog},themeFilms,themeThread,terms,sourceImage,get view(){return{k:1,x:0,y:0}}};
 // Share snapshots are additive: never replace a newer local weave with an old link.
 try{const u=new URL(inbound),payload=new URLSearchParams(u.hash.slice(1)).get('weave');if(payload){if(payload.length>100000)throw Error('Share link is too large. Import JSON instead.');const b64=s=>s.replace(/-/g,'+').replace(/_/g,'/');let raw;if(payload[0]==='z'){const bin=atob(b64(payload.slice(1))),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));raw=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());}else raw=JSON.parse(decodeURIComponent(escape(atob(b64(payload)))));if(raw.version!==2||!raw.weave)throw Error('Unsupported constellation link.');const fingerprint=String([...payload].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619),2166136261)>>>0);busy=true;S.importWeave(raw.weave,fingerprint);restorePersistedAnnotations({...raw.weave,id:S.current().id});S.save();busy=false;known.set(S.current().id,copy(S.current()));open();setRead(u.searchParams.get('read')==='1');fit();if(u.searchParams.get('play')==='1')playWeave();}else if(u.searchParams.get('constellate')==='1'){const id=u.searchParams.get('weave');if(id&&S.state.collections.some(c=>c.id===id)){busy=true;S.activate(id);busy=false;}open();setRead(u.searchParams.get('read')==='1');if(u.searchParams.get('play')==='1')playWeave();}}catch(err){busy=false;open();status('Could not open share link: '+err.message);}
})().catch(e=>console.error('Theme-weaving could not open',e));
;

/* ================================================================
   Published constellations (?c=slug)
   (was constellations.js)
   ================================================================ */
try{
/* Published constellations (Claude, 2026-11-11).
   A constellation saved in beta/constellations/<slug>.json opens at ?c=<slug> (add &play=1 for Play).
   Files hold film IDs only; titles, filmmakers and years are read from the atlas at open time, so
   corrections to records reach published constellations. Opening one gives the reader a copy in
   their own browser, as a share link does; the published file is never changed from the page. */
(function(){
 'use strict';
 var SLUG=/^[a-z0-9][a-z0-9-]{0,79}$/,index=null,docs={},opened={};
 var base=function(){return new URL('./',location.href);};
 function urlFor(slug,mode){var u=base();u.searchParams.set('c',slug);if(mode==='play')u.searchParams.set('play','1');return u.href;}
 function getJSON(path){return fetch(path,{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('Not found');return r.json();});}
 function loadIndex(){return index?Promise.resolve(index):getJSON('constellations/index.json').then(function(j){index=j;api.example=j.example||'';api.list=j.constellations||[];return j;});}
 function load(slug){if(!SLUG.test(slug))return Promise.reject(Error('Unknown constellation.'));return docs[slug]?Promise.resolve(docs[slug]):getJSON('constellations/'+slug+'.json').then(function(j){docs[slug]=j;return j;});}
 function ready(){return new Promise(function(done,fail){var n=0;(function wait(){if(window.AtlasConstellate&&window.AtlasCollections&&window.Atlas)return done();if(++n>200)return fail(Error('Constellate did not start.'));setTimeout(wait,150);})();});}
 function hydrate(doc){
  var A=window.Atlas,w=doc.weave||{},missing=[],items=[];
  (w.items||[]).forEach(function(x){
   var id=x.type+':'+x.record+(x.film?':'+x.film:''),r=A.recordById(x.record),f=r&&x.type==='film'?r.films.find(function(v){return v.id===x.film;}):null;
   if(!r||(x.type==='film'&&!f)){missing.push(id);return;}
   items.push({type:x.type,record:x.record,film:x.film||null,title:x.type==='film'?f.title:r.name,maker:r.name,year:f?f.year:''});
  });
  return {weave:{id:'pub-'+doc.slug,name:w.name,author:w.author,note:w.note,items:items,threads:w.threads||[],links:w.links||[]},missing:missing};
 }
 function content(c){return JSON.stringify([c.name,c.author,c.note,(c.threads||[]).map(function(t){return [t.name,t.description,t.items,t.notes];}),(c.links||[]).map(function(l){return [l.source,l.target,l.label,l.note,l.kind,l.sourceURL];})]);}
 function open(slug,mode){
  return ready().then(function(){return window.Atlas.ready;}).then(function(){return load(slug);}).then(function(doc){
   var S=window.AtlasCollections,C=window.AtlasConstellate,h=hydrate(doc);
   if(!h.weave.items.length)throw Error('This constellation has no films the atlas can find.');
   var fp='pub:'+slug+':'+(doc.updated||''),ids={};h.weave.items.forEach(function(x){ids[x.type+':'+x.record+(x.film?':'+x.film:'')]=1;});
   var sig=content({name:h.weave.name,author:h.weave.author,note:h.weave.note,
     threads:h.weave.threads.map(function(t){var notes={};Object.keys(t.notes||{}).forEach(function(k){if(ids[k])notes[k]=t.notes[k];});return {name:t.name,description:t.description,items:(t.items||[]).filter(function(k){return ids[k];}),notes:notes};}),
     links:h.weave.links.filter(function(l){return ids[l.source]&&ids[l.target];})});
   /* A reader who changed their copy keeps it under its own name; the short address always opens the published version. */
   S.state.collections.forEach(function(c){if((c.shareFingerprint===fp||c.id===h.weave.id)&&content(c)!==sig){c.shareFingerprint='';c.id='copy-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);if(!/\(my copy\)$/.test(c.name))c.name=(c.name+' (my copy)').slice(0,120);}});
   S.importWeave(h.weave,fp);
   opened[S.current().id]={slug:slug,doc:doc,sig:sig};
   C.open();C.setRead(mode!=='play'&&mode!=='build');C.fit('quiet');
   if(mode==='play')C.play();
   if(h.missing.length){var st=document.querySelector('#constellate-status');if(st)st.textContent=h.missing.length+' film'+(h.missing.length>1?'s':'')+' in this constellation '+(h.missing.length>1?'are':'is')+' no longer on the atlas and '+(h.missing.length>1?'were':'was')+' left out.';}
   cite();return doc;
  });
 }
 /* The published copy, unedited, is cited by its short address. An edited copy is the reader's own work and keeps the ordinary share link. */
 function published(){var S=window.AtlasCollections;if(!S)return null;var c=S.current(),o=opened[c.id];return o&&o.sig===content(c)?o:null;}
 function citation(o){var w=o.doc.weave;return (w.author?w.author+'. ':'')+'“'+w.name+'.” Indigenous Cinema Atlas: Abya Yala and Turtle Island, published constellation, '+(o.doc.updated||'')+'. '+urlFor(o.slug);}
 function cite(){
  var o=published();if(!o)return;
  var url=document.querySelector('#weave-url'),panel=document.querySelector('#weave-share-panel'),mode=document.querySelector('#weave-share-mode');
  if(url&&panel&&!panel.hidden){var want=urlFor(o.slug,mode&&mode.value==='play'?'play':'read');if(url.value!==want)url.value=want;var p=document.querySelector('#weave-citation');if(p&&p.textContent!==citation(o))p.textContent=citation(o);}
  var end=document.querySelector('#weave-play-thread'),sub=document.querySelector('#weave-play-subtitle');
  if(end&&sub&&/^constellation complete$/i.test(end.textContent.trim())&&sub.textContent!==citation(o))sub.textContent=citation(o);
 }
 var api=window.AtlasPublished={open:open,urlFor:urlFor,example:'',list:[],index:loadIndex,current:published};
 document.addEventListener('click',function(e){
  if(e.target.closest&&e.target.closest('#constellate-share,#weave-share-mode,#weave-play,#weave-play-next,#weave-play-pause'))[150,600,1400].forEach(function(t){setTimeout(cite,t);});
  var copy=e.target.closest&&e.target.closest('#weave-copy-citation');
  if(copy&&published()){e.preventDefault();e.stopImmediatePropagation();var text=citation(published());(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(function(){var st=document.querySelector('#constellate-status');if(st)st.textContent='Copied.';},function(){});}
 },true);
 document.addEventListener('change',function(e){if(e.target&&e.target.id==='weave-share-mode')[150,600].forEach(function(t){setTimeout(cite,t);});},true);
 function watchEnd(){var end=document.querySelector('#weave-play-thread');if(!end)return setTimeout(watchEnd,500);new MutationObserver(function(){setTimeout(cite,0);}).observe(end,{childList:true,characterData:true,subtree:true});}
 watchEnd();
 loadIndex().catch(function(){});
 var q=new URLSearchParams(location.search),slug=q.get('c');
 if(slug&&!location.hash.startsWith('#weave='))open(slug,q.get('play')==='1'?'play':'read').catch(function(err){ready().then(function(){window.AtlasConstellate.open();var st=document.querySelector('#constellate-status');if(st)st.textContent='Could not open that constellation: '+err.message;});});
})();
}catch(error){console.error('Constellate section failed: Published constellations (?c=slug)',error);}

/* ================================================================
   Featured constellation on the front page
   (was featured82.js)
   ================================================================ */
// Beta 82: a featured theme-weaving on the front page, opened through the atlas's own share-link format.
(async()=>{
 const A=window.Atlas;if(!A||!A.ready)return;await A.ready;
 const WEAVE={id:"1c983ffe-c000-43ba-9a9b-1cb6f9ac3ef9",payload:"zrZjbjts2GsdfheACxS4gOjpalopc5NCk00yaIEk37S5y8Yn8ZLGWSIOixvUGA-zNPsTetQ9Q7EOkT7JPsqBkj4_jcbJzMR5bPP5_H_kd9JFeoWmlVjQPPbpAuEKaf6RS0JwGPJtEZYmM-77P4qgAlkFWsIAX4zIDHmGZUY8qaJDm9IlWrcW6Biu1aokuyYUScopKdy15IhU24Dpr6zq_qwwimYOtFrBsia2M7qYVsRUSsDW0I_IN8IrUUiHhYIzElgBpK20sMQitViPy1mqzZA3MpJoSUIIYbLApDCiOpNR1rRf9hPgLNPMaWyJV_3tu9M_ILVFgDFh5hV-T2g0XWKJqkUi31EKbfl5hoLSk1IYYvJK4GFGPQmcrbWhOv9OVIi9QKRRL8lwLvaQe5QbBonhkaU5DPxyzIGB-8M6P8mSS--EoC6K_UY92c3FHt4nrJi02Lc3_vjJJKesmf3rxhvmRn-avLy5fvWNxxGTrFLAFymllW-pRu5zjqjv1qEGujRu-Hkm9oSmnJ6aQth5MheSibyTvbxobmKEj8Ha2JN_quVQzZ9wlghnkBG7rDUzdBNC2aNsHbkHWP2sfzGWt7eGqo5_nU-rRymBJczp68CdH_KEb2H7Vr_hwLeAr9_DhbZu_9k7jKkEqK9WUtXOs6y_jdWSOFbBnqxbydt1yB61gciatvTW_GNf-3u_iNZPcXQbGa92JL8N1OMWK1ouhob-ZT9aN93W8dlf9Yl57mz-CK4y3cDXQu7pTkML4GKT1wBWal9B8-m2Lxo-dIm_R6B0U4Zko3NxnAgjjfQD9xo7I9pMsf3Zx-XIt6JRkP8k2kncGrU8CKKxasDDDnISpT35CMH0geYOtbK3z61s0HtWgZEteFbppYSHVhkqQZdFpKv13t_yZRPwkG4hs9n2ERuBHKxp-mt1BI_CjfRqrQSsaP0llodrS-x0qJUs05L3kswqajd7TWrmua-SWxTEbZPtpdqbswI-2ZbsNHpOdrmUHQXSX7PRA9mrQSvbrTkHd3_aNblAKrUXyGmRdf_pNHVV-jpx0R45beFfO20ePQ-aCceAHMQsTPyjCmAfjDE80sfev3rxgfnC78tvHblicN_8K0qOnL199__yb7z3yVymAvIR5x12io8h7qOsG5t0Wv-dowAhNHqMxmkO9E3nS02cHjHWJUJywJE7TWPhBJArfP-P83K5nMMEZeq8_eHSuW9nnkzT_eO1RXZZuj8OPuVw_tpVBEFtp0vCAldK0dpOhbieM1KMCW27k3PbJL33mNk9sBZY4BeuE0n1tre4TUF0SbeRUKpcEcl33OWAD8h_OjleylYWzjjUdbvK2szO2M1OVD0MK7YSfOXVOnxpYtEQrAuRbzZ5UnZqRPkuVWvXilqPzN5DTiwamUvUJebO0FQGjOyXIj3_8a_HHf9oZjOj1zbWacI5RyjkDLjIWJ7xkE5EKFibjybiISh5DuDHQm00Cf2CfC2XRTFGh6fcNNbnSkg92KqGR9ZIICbWedrhtHulqEP359jnIV07F-jOMsjffrXpGdyzl0ss9sRvacZJEaRxkjCeILA5gzCYcSxaUY15kIgGB4w3ty62i55br0IBAUhrdEKlaKdxVMN106oopq10hZV0h1dcG7m8BFs02fa55JRX2TuduA-xnE7dH1tuDzz348ePW3N2cs18PxKWtQZb5ZJ29fPo1nyExNxnL6ISQnL5H-99__rvtFv1_VDuVqEfcQBSDBRbSVoPruU39TfTMCdbkUW01efzpd83cB_lzkGXJXzxXBLt4ITo17ZQ3WNhN3StZRxKum6ZTkg8uYmp0NyeXXd3V5CUspKhgdD-oXY47rFjLcrjLFo2Rzie5na7DmTvkHzwK3JXr73rnfv5xr6WabcUGIXxEIThL48JncZaOWZHwMRuPgxLHIuVQuuvQ6s5w_JySG8wU7ecUnTUUWNOctrtx6eYVCZI-gLl3EHf4769767XItRJE3umfPTqTSvTe0aKZG7T9XDeqf3hzOWRUw5uOtpJzmtMfWjQElNKr3jdup0h8n6fxmJViErI48yOWYZmyhIc8DaNokvDJGUQPS8RDosfqrDVGsxM9VhSfuauzKiHdTSOH9SaxegFGkHV51Xfray_v5sWU_Lzoc694wygcB2EALIzCiMXFOGAAqWAZ8DQpIgjSIjiO96A8OwS671nXMOvd4LA-kwvd-6STkUFfoSGd4ihQ9P6sx4hIBHIQ7lzOwdh7x4TlJIuimLPM52MWo5iwbCIEy7DAMh1jGKfhcUwHddsRTHth5g5MNz5s5cCL5fDmEfW8RrKoNKnlFborLe8fxHgSBiIoJmwCgWAxh5hlyDOWiCwKx6WIyqS4BcR-JbcD4v-tjm7cXQUG2_5kbJA91rZaHS0wuBWW9kKSlcOL3E1kuCd6HzzaoiuUUVxYbO5LdC_2mVRTtzWpHEx6ff0_"};
 /* 2026-11-11: the featured constellation opens from its published file (constellations/), by a short address. */
 const href=mode=>'./?c=constellations-of-indigenous-cinema'+(mode==='play'?'&play=1':'');
 const panel=document.querySelector('.map-panel');if(!panel||document.querySelector('#featured-weave'))return;
 const initiallyCollapsed=(()=>{try{return localStorage.getItem('atlas-ui-featured-collapsed')!=='false'}catch{return true}})();
 panel.insertAdjacentHTML('beforeend',`<aside id="featured-weave" class="${initiallyCollapsed?'is-collapsed':''}" aria-label="Featured theme-weaving">
  <button type="button" class="fw-pill" aria-expanded="${String(!initiallyCollapsed)}"><span aria-hidden="true">✦</span> Constellations</button>
  <p class="fw-eyebrow">Theme-weaving</p>
  <h2>Constellations of Indigenous Cinema</h2>
  <ul><li><i style="--dye:#ffd35c"></i>Story-making</li><li><i style="--dye:#8fb4ff"></i>Remembrance</li><li><i style="--dye:#ff6f5a"></i>Land defense</li></ul>
  <p class="fw-actions"><a class="fw-play" href="${href('play')}">Play the weave <span aria-hidden="true">▸</span></a><a href="${href('read')}">Read it</a><a href="about.html">About</a></p>
  <button class="fw-close" aria-label="Hide">×</button></aside>`);
 const card=document.querySelector('#featured-weave');
 let dismissed=false;try{dismissed=localStorage.getItem('fw-hidden')==='1';}catch{}
 card.querySelector('.fw-close').onclick=()=>{dismissed=true;try{localStorage.setItem('fw-hidden','1');}catch{};update();};
 function update(){const busy=/(maker|film|land|community|country)=/.test(location.hash)||document.body.classList.contains('is-theme-weaving')||document.body.classList.contains('weave-playing')||document.body.classList.contains('selection-held');card.hidden=dismissed||busy;}
 addEventListener('hashchange',update);new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});update();
})();
;

/* ================================================================
   Toolbar: Options menu on narrow maps
   (was assets/constellate-bar.js)
   ================================================================ */
try{
/* Constellate navigation: drawing and clearing stay primary. Tools move into
   Options when the map is narrow; Clear never enters the dropdown. */
(function(){
 'use strict';
 var compact=window.matchMedia('(max-width:1150px)');
 var phone=window.matchMedia('(max-width:760px)');
 function place(){
  var bar=document.getElementById('constellate-mode');if(!bar)return false;
  var more=bar.querySelector('.weave-more'),menu=more&&more.querySelector('.weave-more-menu');
  var draw=document.getElementById('weave-draw-thread'),clear=document.getElementById('constellate-clear');
  var unmap=document.getElementById('weave-unmap'),edit=document.getElementById('constellate-edit');
  var play=document.getElementById('weave-play'),share=document.getElementById('constellate-share');
  var undo=document.getElementById('constellate-undo'),redo=document.getElementById('constellate-redo'),group=bar.querySelector('.weave-tool-group');
  if(!menu||!more||!draw||!clear||!edit||!play||!share||!undo||!redo||!group)return false;
  /* Build and Follow are the visible modes; Present opens from Follow.
     Move only secondary sharing/history actions on compact screens. */
  if(edit.parentNode!==bar)bar.insertBefore(edit,draw);
  if(play.parentNode!==bar)bar.insertBefore(play,clear);
  var manage=menu.querySelector('.weave-menu-manage');
  if(!manage){
   manage=document.createElement('small');
   manage.className='weave-menu-heading weave-menu-manage';
   manage.textContent='Share and history';
   menu.append(manage);
  }
  manage.hidden=!compact.matches;
  if(compact.matches){
   for(var button of [share,undo,redo]){
    if(button.parentNode!==menu)menu.append(button);
   }
   undo.textContent='Undo';redo.textContent='Redo';
  }else{
   if(undo.parentNode!==group||redo.parentNode!==group)group.append(undo,redo);
   undo.textContent='↶';redo.textContent='↷';
   if(share.parentNode!==bar)bar.insertBefore(share,clear);
  }
  bar.setAttribute('aria-label','Constellation modes and actions');
  edit.title='Build: add films and draw connections';
  var read=document.getElementById('constellate-read');
  if(read)read.title='Follow: explore films, notes and sources one at a time';
  play.title='Play: move through the constellation film by film';
  var summary=more.querySelector('summary');
  if(summary)summary.title='Display, analysis, sharing and history tools';
  if(unmap&&unmap.parentNode!==menu){
   var fit=document.getElementById('constellate-fit');menu.insertBefore(unmap,fit||menu.firstChild);
  }
  if(clear.parentNode!==bar||clear.nextElementSibling!==more)bar.insertBefore(clear,more);
  /* Position is relative to .weave-more; its CSS owns top in all viewports. */
  menu.style.removeProperty('top');
  return true;
 }
 function start(){
  if(!place()){
   var observer=new MutationObserver(function(){if(place())observer.disconnect();});
   observer.observe(document.body,{childList:true,subtree:true});
   setTimeout(function(){observer.disconnect();},20000);
  }
  for(var q of [compact,phone]){
   if(q.addEventListener)q.addEventListener('change',place);else q.addListener(place);
  }
  document.addEventListener('toggle',function(e){
   if(e.target?.classList?.contains('weave-more')&&e.target.open)place();
  },true);
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var d=document.querySelector('#constellate-mode .weave-more');if(d&&d.open){d.open=false;var summary=d.querySelector('summary');if(summary)summary.focus();}});
  document.addEventListener('click',function(e){
   var b=e.target.closest&&e.target.closest('#constellate-mode .weave-more-menu button');
   if(b){var d=b.closest('details');if(d)setTimeout(function(){d.open=false;},0);}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
}catch(error){console.error('Constellate section failed: Toolbar: Options menu on narrow maps',error);}

/* ================================================================
   Theme web
   (was assets/constellate-theme-web.js)
   ================================================================ */
try{
/* Constellate: sourced, exploratory theme-to-film network.
 * Relationships here mean that the same film has both tags in the published atlas.
 * They are NOT claims of affinity between peoples, territories or filmmakers.
 * No coordinates are assigned to concepts; original map stays present beneath this lens.
 */
(function(){
 'use strict';
 var COLORS={
  'Land and Environment':'#33786e',
  'Sovereignty and Politics':'#b7624f',
  'Knowledge and Continuity':'#7770a3',
  'Lives and Relations':'#c08d40',
  'Expression and Representation':'#477eaa',
  'Other themes':'#75838c'
 };
 var FAMILY_MAP={
  'Land and Environment':['Land Defense','Water','Environmental Change','More-than-Human Relations','Food Sovereignty','Extractivism','Land and Territory','Environmental Justice','Territory and Place'],
  'Sovereignty and Politics':['Sovereignty and Self-Determination','Justice, Truth and Reconciliation','Resistance Movements','Governance','Borders and Colonialism','Decolonization'],
  'Knowledge and Continuity':['Linguistic Preservation','Memory and Oral History','Elders and Knowledge','Cosmology and Origin Stories','Ceremony and Spirituality','Archives, Museums and Repatriation','Intergenerational Transmission'],
  'Lives and Relations':['Kinship','Youth','Women and Gender','Health and Healing','Displacement and Migration','Urban Indigeneity'],
  'Expression and Representation':['Art, Craft and Making','Music and Performance','Self-Representation and Countering Stereotypes','Collective and Community Media','Indigenous Futurisms','Humor and Satire']
 };
 var nodeByName=new Map(),films=[],graphLinks=[],families=[],selected='',selectedPair='',activeFamily='All themes',search='',isOpen=false,view=null;
 var filmsShown=8,lastFilmView='',showAllBridges=false;
 var NS='http://www.w3.org/2000/svg';
 var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var canon=function(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();};
 var short=function(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s;};
 var controls,root,svg,aside,list,searchBox,chipRow,notice,toggle;
 function atlas(){return window.AtlasConstellate;}
 function store(){return window.AtlasCollections;}
 function family(term){
  var vocabulary=window.ATLAS_THEMES_1103&&window.ATLAS_THEMES_1103.families;
  if(vocabulary)for(var key of Object.keys(vocabulary))if(vocabulary[key].includes(term))return key;
  for(var f of Object.keys(FAMILY_MAP))if(FAMILY_MAP[f].includes(term))return f;
  return 'Other themes';
 }
 function collect(){
  var api=atlas();if(!api)return false;
  var grouped=new Map();
  for(var x of api.catalog){
   if(x.type!=='film')continue;
   var tags=[...new Set(api.tags(x).filter(t=>t&&typeof t.term==='string').map(t=>t.term.trim()).filter(Boolean))];
   if(!tags.length)continue;
   var entry={x:x,tags:tags};
   films.push(entry);
   for(var t of tags){
    if(!grouped.has(t))grouped.set(t,{name:t,films:[],family:family(t),count:0});
    grouped.get(t).films.push(entry);
   }
  }
  var nodes=[...grouped.values()].filter(n=>n.films.length>0).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
  // The site vocabulary contains 30 themes; display all attested themes, never invent a node.
  nodeByName=new Map(nodes.map(n=>[n.name,n]));
  families=[...new Set(nodes.map(n=>n.family))].sort(function(a,b){return Object.keys(COLORS).indexOf(a)-Object.keys(COLORS).indexOf(b);});
  var ties=new Map();
  for(var f of films){
   var names=f.tags.filter(t=>nodeByName.has(t)).slice(0,18);
   for(var a=0;a<names.length;a++)for(var b=a+1;b<names.length;b++){
    var pair=[names[a],names[b]].sort(),key=pair.join('\u001f');
    if(!ties.has(key))ties.set(key,{source:pair[0],target:pair[1],count:0,films:[]});
    var l=ties.get(key);l.count++;l.films.push(f);
   }
  }
  graphLinks=[...ties.values()].sort((a,b)=>b.count-a.count);
  return nodes.length>0;
 }
 function markup(){
  var map=document.querySelector('.map-panel'),bar=document.getElementById('constellate-mode');
  if(!map||!bar)return false;
  toggle=document.createElement('button');
  toggle.type='button';toggle.id='weave-theme-web-toggle';toggle.textContent='Theme web';
  toggle.title='Browse the documented theme network, select bridges, and start a thread';
  toggle.setAttribute('aria-controls','atlas-theme-web');
  toggle.setAttribute('aria-expanded','false');
  var before=document.getElementById('constellate-read')||document.getElementById('weave-play');
  bar.insertBefore(toggle,before);
  map.insertAdjacentHTML('beforeend',
   '<section id="atlas-theme-web" class="theme-web" hidden aria-label="Theme network within the atlas">'+
    '<div class="tw-heading"><div><p class="tw-kicker">CONSTELLATE / RELATIONAL INDEX</p><h2>Follow the themes</h2><p>Each line joins two themes documented together in a film synopsis. Select a theme or a bridge to follow the films.</p></div>'+
    '<button id="tw-close" type="button" aria-label="Close theme network">×</button></div>'+
    '<div class="tw-top"><label for="tw-search">Find a theme</label><input id="tw-search" type="search" placeholder="Search themes or families…" autocomplete="off">'+
    '<button id="tw-seed" type="button">Begin with 3 themed threads</button></div>'+
    '<div id="tw-families" class="tw-families" role="group" aria-label="Theme families"></div>'+
    '<div class="tw-main"><div class="tw-graph-wrap"><div id="tw-mobile-list" class="tw-mobile-list" aria-label="Browse themes by name"></div><svg id="tw-graph" viewBox="0 0 720 550" role="group" aria-label="Interactive network of sourced themes and co-tagged films"></svg>'+
      '<p class="tw-graph-foot"><span id="tw-stat"></span> · Overview favors frequent co-tags, not cultural affinity or importance. <button type="button" id="tw-all-links" aria-pressed="false">All bridges</button> <button type="button" id="tw-reset">Reset view</button></p></div>'+ 
    '<aside id="tw-detail" class="tw-detail" aria-live="polite" aria-label="Selected theme and films"></aside></div>'+
    '<p id="tw-live" class="sr-only" role="status" aria-live="polite"></p>'+
   '</section>');
  root=document.getElementById('atlas-theme-web');svg=document.getElementById('tw-graph');aside=document.getElementById('tw-detail');
  searchBox=document.getElementById('tw-search');chipRow=document.getElementById('tw-families');notice=document.getElementById('tw-live');
  toggle.onclick=function(){show(!isOpen);};
  document.getElementById('tw-close').onclick=function(){show(false);toggle.focus();};
  document.getElementById('tw-reset').onclick=function(){activeFamily='All themes';selected='';selectedPair='';search='';searchBox.value='';draw();};
   document.getElementById('tw-all-links').onclick=function(){showAllBridges=!showAllBridges;draw();};
  document.getElementById('tw-seed').onclick=example;
  searchBox.addEventListener('input',function(){search=searchBox.value.trim();selectedPair='';draw();});
  chipRow.addEventListener('click',function(e){var b=e.target.closest('[data-family]');if(!b)return;activeFamily=b.dataset.family;selected='';selectedPair='';draw();});
  svg.addEventListener('click',function(e){
   var edge=e.target.closest('[data-bridge]'),node=e.target.closest('[data-term]');
   if(edge){selectedPair=edge.dataset.bridge;selected='';draw();return;}
   if(node){selected=node.dataset.term;selectedPair='';draw();return;}
  });
  svg.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var el=e.target.closest('[data-term],[data-bridge]');if(el){e.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  document.getElementById('tw-mobile-list').addEventListener('click',function(e){
   var b=e.target.closest('[data-mobile-term],[data-mobile-network]');if(!b)return;
   if(b.hasAttribute('data-mobile-network')){
    root.classList.toggle('tw-show-network');
    b.textContent=root.classList.contains('tw-show-network')?'List of themes':'See the network diagram';
    drawGraph();return;
   }
   selected=b.dataset.mobileTerm;selectedPair='';draw();
   if(window.matchMedia('(max-width:700px)').matches)aside.scrollIntoView({block:'start',behavior:'instant'});
  });
  aside.addEventListener('click',function(e){
   var b=e.target.closest('[data-open-term],[data-film-id],[data-start-term],[data-more-films],[data-tw-reset]');if(!b)return;if(b.hasAttribute('data-tw-reset')){document.getElementById('tw-reset').click();searchBox.focus({preventScroll:true});return;}
    if(b.hasAttribute('data-more-films')){filmsShown+=8;detail();return;}
   if(b.dataset.openTerm){selected=b.dataset.openTerm;selectedPair='';search='';searchBox.value='';activeFamily='All themes';draw();return;}
   if(b.dataset.startTerm){
    show(false);atlas().themeThread(b.dataset.startTerm);
    notice.textContent='Started a theme thread from published film tags.';
    return;
   }
   if(b.dataset.filmId){
    var entry=films.find(f=>f.x.id===b.dataset.filmId);
    if(!entry)return;
    show(false);atlas().open();atlas().followFilm(entry.x);
   }
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen){show(false);toggle.focus();}});
  document.addEventListener('click',function(e){if(e.target.closest('#constellate-exit')&&isOpen)show(false);});
  return true;
 }
 function visibleNodes(){
  var needle=canon(search),list=[...nodeByName.values()];
  return list.filter(n=>(activeFamily==='All themes'||n.family===activeFamily)&&(!needle||canon(n.name).includes(needle)||canon(n.family).includes(needle)));
 }
 function draw(){
  if(!isOpen)return;
  var nodes=visibleNodes(),names=new Set(nodes.map(n=>n.name)),edges=graphLinks.filter(l=>names.has(l.source)&&names.has(l.target));
  var caption=nodes.length+' matching themes · '+films.length+' tagged films · '+graphLinks.length+' sourced co-tag bridges';
   var linksButton=document.getElementById('tw-all-links');
   var applicable=selectedPair?1:selected?edges.filter(l=>l.source===selected||l.target===selected).length:edges.length;linksButton.hidden=selectedPair||applicable<=(selected?55:(activeFamily==='All themes'&&!search?28:55));
   linksButton.textContent=showAllBridges?'Show strongest bridges':'Show all '+applicable+' bridges';
   linksButton.setAttribute('aria-pressed',String(showAllBridges));
  document.getElementById('tw-stat').textContent=caption;
  chipRow.innerHTML=['All themes'].concat(families).map(f=>'<button type="button" data-family="'+esc(f)+'" aria-pressed="'+(f===activeFamily)+'"><i style="background:'+esc(COLORS[f]||'#667e8b')+'"></i>'+esc(f)+(f==='All themes'?'':' <small>'+[...nodeByName.values()].filter(x=>x.family===f).length+'</small>')+'</button>').join('');
  var mobile=document.getElementById('tw-mobile-list');
  mobile.innerHTML='<div class="tw-mobile-guide"><strong>Explore '+nodes.length+' themes</strong><button type="button" data-mobile-network>'+(root.classList.contains('tw-show-network')?'List of themes':'See the network diagram')+'</button></div>'+
   '<div class="tw-mobile-grid">'+nodes.map(function(n){return '<button type="button" data-mobile-term="'+esc(n.name)+'" aria-pressed="'+(selected===n.name)+'"><i style="background:'+esc(COLORS[n.family]||'#75838c')+'"></i><span>'+esc(n.name)+'</span><small>'+n.films.length+' films</small></button>';}).join('')+'</div>';
  drawGraph(nodes,edges);detail();if(!nodes.length){aside.innerHTML='<p class="tw-kicker">NO MATCHES</p><h3>No themes found</h3><p>Try a theme family (such as Knowledge), a shorter term, or reset the view.</p><button type="button" data-tw-reset>Clear theme search</button>';}
 }
 function drawGraph(provided,providedEdges){
  if(!isOpen)return;
  var nodes=provided||visibleNodes(),names=new Set(nodes.map(n=>n.name)),edges=providedEdges||graphLinks.filter(l=>names.has(l.source)&&names.has(l.target));
  var bounds=svg.getBoundingClientRect(),w=Math.max(620,Math.round(bounds.width||720)),h=Math.max(440,Math.round(bounds.height||550));
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  // Stable thematic-family lanes preserve legible labels at all 30 nodes.
  // The network is a diagram of co-tags, not a geographic or semantic distance map.
  var orders=Object.keys(COLORS).filter(f=>nodes.some(n=>n.family===f));
   var tallestFamily=Math.max(0,...orders.map(f=>nodes.filter(n=>n.family===f).length));
   if(activeFamily==='All themes'&&!search&&orders.length>1){h=Math.max(h,120+tallestFamily*74);svg.setAttribute('viewBox','0 0 '+w+' '+h);}
   // Keep spacing in screen pixels; scaling a taller viewBox into a fixed-height
   // SVG would shrink the labels and restore their overlap.
   var expanded=h>Math.max(440,Math.round(bounds.height||550))&&window.matchMedia('(min-width:701px)').matches;
   svg.style.flex=expanded?'0 0 auto':'';
   svg.style.height=expanded?h+'px':'';
   svg.parentElement.style.overflowY=expanded?'auto':'';
  var laneMode=orders.length>1&&activeFamily==='All themes'&&!search;
  var placed=[],familyHeaders='';
  if(laneMode){
   var gap=w/orders.length;
   orders.forEach(function(f,col){
    var group=nodes.filter(n=>n.family===f).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
    var step=Math.max(74,(h-100)/Math.max(1,group.length));
    familyHeaders+='<text class="tw-family-head" x="'+(gap*(col+.5)).toFixed(1)+'" y="24" text-anchor="middle">'+esc(({'Land and Environment':'LAND','Sovereignty and Politics':'SOVEREIGNTY','Knowledge and Continuity':'KNOWLEDGE','Lives and Relations':'RELATIONS','Expression and Representation':'EXPRESSION'})[f]||short(f,15))+'</text>';
    group.forEach(function(n,row){placed.push({id:n.name,node:n,r:Math.min(22,6+Math.sqrt(n.films.length)*1.4),x:gap*(col+.5),y:65+step*(row+.5)});});
   });
  }else{
   var cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(nodes.length*1.5))));var rows=Math.max(1,Math.ceil(nodes.length/cols));
   nodes.forEach(function(n,i){placed.push({id:n.name,node:n,r:Math.min(23,7+Math.sqrt(n.films.length)*1.5),x:w*(i%cols+.5)/cols,y:65+(h-135)*(Math.floor(i/cols)+.5)/rows});});
  }
  var byId=new Map(placed.map(x=>[x.id,x]));
  var related=new Set();
  if(selected){for(var e of edges)if(e.source===selected)related.add(e.target);else if(e.target===selected)related.add(e.source);}
  var dimTheme=function(n){return selected&&n!==selected&&!related.has(n);};
  var scoped=selectedPair?edges.filter(function(l){return l.source+String.fromCharCode(31)+l.target===selectedPair;}):selected?edges.filter(function(l){return l.source===selected||l.target===selected;}):edges;
   var ranked=scoped.slice().sort(function(a,b){var pa=selected&&(a.source===selected||a.target===selected)?1000:0,pb=selected&&(b.source===selected||b.target===selected)?1000:0;return pb-pa||b.count-a.count;});
   // The overview is intentionally legible: 28 strongest co-tag bridges, not a hairball.
   // Theme/family selection expands the relevant connections; All bridges is opt-in.
   var limit=showAllBridges?scoped.length:(selected?Math.min(55,scoped.length):(activeFamily==='All themes'&&!search?28:55));
   var shown=ranked.slice(0,limit);
   if(selectedPair){
    var chosenBridge=edges.find(function(l){return l.source+'\u001f'+l.target===selectedPair;});
    if(chosenBridge&&!shown.includes(chosenBridge)){if(shown.length)shown.pop();shown.unshift(chosenBridge);}
   }
   var edgeLines=shown.map(function(l){
   var a=byId.get(l.source),b=byId.get(l.target);
   if(!a||!b)return '';
   var highlighted=selectedPair===(l.source+'\u001f'+l.target)||!!selected&&(l.source===selected||l.target===selected);
   var faded=(!!selected&&!highlighted)||(!!selectedPair&&!highlighted);
   return '<g class="tw-bridge" role="button" tabindex="0" aria-label="'+esc(l.source+' and '+l.target+', '+l.count+' films with both themes')+'" data-bridge="'+esc(l.source+'\u001f'+l.target)+'">'+
    '<line class="tw-edge'+(highlighted?' is-related':'')+(faded?' is-faded':'')+'" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke-width="'+Math.min(6,0.7+Math.sqrt(l.count)*.65).toFixed(1)+'"/>'+
    '<line class="tw-edge-hit" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="transparent" stroke-width="16"/>'+
    '<title>'+esc(l.source+' + '+l.target+' · '+l.count+' film'+(l.count===1?'':'s'))+'</title></g>';
  }).join('');
  var dots=placed.map(function(n){
   var active=n.id===selected,fade=dimTheme(n.id),c=COLORS[n.node.family]||COLORS['Other themes'];
   return '<g class="tw-node'+(active?' is-chosen':'')+(fade?' is-faded':'')+'" data-term="'+esc(n.id)+'" role="button" tabindex="0" aria-label="'+esc(n.id+', '+n.node.films.length+' tagged films')+'" transform="translate('+n.x.toFixed(1)+','+n.y.toFixed(1)+')">'+
     '<circle class="tw-ring" r="'+(n.r+6)+'"/><circle class="tw-dot" r="'+n.r+'" fill="'+c+'"/><text class="tw-count" dy="4" text-anchor="middle">'+n.node.films.length+'</text>'+
     '<text class="tw-node-label" y="'+(n.r+17)+'" text-anchor="middle">'+esc(short(n.id,20))+'</text>'+
     '<title>'+esc(n.id+' · '+n.node.films.length+' films')+'</title></g>';
  }).join('');
  svg.innerHTML='<g class="tw-family-headings">'+familyHeaders+'</g><g>'+edgeLines+dots+'</g>';
 }
 function detail(){
  var viewKey=selectedPair?'bridge:'+selectedPair:selected?'theme:'+selected:'home';
  if(viewKey!==lastFilmView){lastFilmView=viewKey;filmsShown=8;}
  var entry=nodeByName.get(selected),edge=selectedPair&&graphLinks.find(l=>l.source+'\u001f'+l.target===selectedPair);
  if(edge){
   var both=edge.films;
   aside.innerHTML='<p class="tw-kicker">DOCUMENTED BRIDGE</p><h3>'+esc(edge.source)+' <span class="tw-and">×</span> '+esc(edge.target)+'</h3>'+
    '<p class="tw-claim">Both tags occur on the same '+both.length+' film'+(both.length===1?'':'s')+'. This is a cataloguing bridge, not an assertion that the communities or makers are culturally identical.</p>'+
    '<div class="tw-actions"><button type="button" data-open-term="'+esc(edge.source)+'">Explore first theme</button><button type="button" data-open-term="'+esc(edge.target)+'">Explore second</button></div>'+renderFilms(both);
  }else if(entry){
   var rel=graphLinks.filter(l=>l.source===entry.name||l.target===entry.name).sort((a,b)=>b.count-a.count).slice(0,12);
   aside.innerHTML='<p class="tw-kicker">'+esc(entry.family)+'</p><h3>'+esc(entry.name)+'</h3><p class="tw-claim">'+entry.films.length+' film'+(entry.films.length===1?'':'s')+' have this theme in the atlas. The tags originate in film descriptions; see each film’s synopsis source for the evidence.</p>'+
    '<div class="tw-actions"><button class="tw-primary" type="button" data-start-term="'+esc(entry.name)+'">Start with 6 films</button></div>'+
    (rel.length?'<h4>Bridges to other themes</h4><div class="tw-neighbors">'+rel.map(l=>{var term=l.source===entry.name?l.target:l.source;return '<button type="button" data-open-term="'+esc(term)+'">'+esc(term)+' <small>'+l.count+' shared film'+(l.count===1?'':'s')+'</small></button>';}).join('')+'</div>':'')+
    '<h4>Films tagged '+esc(entry.name)+'</h4>'+renderFilms(entry.films);
  }else{
   aside.innerHTML='<p class="tw-kicker">HOW TO READ THIS WEB</p><h3>Films connect the themes.</h3>'+
    '<p class="tw-claim">Choose any circle to discover films, or choose a line to see films carrying both themes. Colors group themes for navigation; the network is not a ranking of peoples, places or cultures.</p>'+
    '<h4>Start with a question</h4><div class="tw-neighbors">'+
    [...nodeByName.values()].sort((a,b)=>b.films.length-a.films.length).slice(0,8).map(n=>'<button data-open-term="'+esc(n.name)+'">'+esc(n.name)+' <small>'+n.films.length+' films</small></button>').join('')+'</div>'+
    '<p class="tw-source-note">The underlying map retains sourced land references. Theme nodes have no invented geographical coordinates. Readers can build, annotate, export, and share their own film constellations.</p>';
  }
 }
 function renderFilms(arr){
  var api=atlas(),seen=new Set(),unique=[];
  for(var item of arr){if(seen.has(item.x.id))continue;seen.add(item.x.id);unique.push(item);if(unique.length===filmsShown)break;}
  var total=new Set(arr.map(e=>e.x.id)).size;
  return '<div class="tw-films">'+unique.map(function(item){
   var x=item.x,image=api.sourceImage(x),f=window.Atlas&&window.Atlas.recordById&&window.Atlas.recordById(x.record)?.films.find(g=>g.id===x.film);
    var initials=String(x.title||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>Array.from(w)[0]||'').join('').toUpperCase()||'·';
   var source=f&&f.themeSource;
   return '<article class="tw-film"><div class="tw-film-art">'+(image?'<img loading="lazy" src="'+esc(image)+'" alt="" onerror="this.hidden=true;this.parentElement.classList.add(\'no-art\')">':'')+'<span aria-hidden="true">'+esc(initials)+'</span></div>'+ 
    '<div class="tw-film-copy"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small>'+
    (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Synopsis source ↗</a>':'<span class="tw-no-source">Atlas theme tag</span>')+'</div>'+
    '<button type="button" data-film-id="'+esc(x.id)+'" aria-label="Follow '+esc(x.title)+' in your constellation">Follow →</button></article>';
  }).join('')+'</div>'+(total>unique.length?'<div class="tw-more-actions"><span class="tw-more-count">Showing '+unique.length+' of '+total+' films</span><button type="button" data-more-films>Show next '+Math.min(8,total-unique.length)+' films</button></div>':'');
 }
 function example(){
  var api=atlas(),s=store();if(!api||!s)return;
  if(s.state.collections.length>=50){notice.textContent='Export or remove an old constellation before creating a new one.';return;}
  var all=[...nodeByName.values()];
  var candidates=[
   'Land Defense','Justice, Truth and Reconciliation','Linguistic Preservation',
   'Kinship','Art, Craft and Making','More-than-Human Relations',
   'Memory and Oral History','Health and Healing','Women and Gender','Music and Performance'
  ];
  var chosen=[];
  for(var name of candidates){var node=nodeByName.get(name);if(node&&node.films.length>=4)chosen.push(node);if(chosen.length>=3)break;}
  if(chosen.length<3){
   for(var node of all.sort((a,b)=>b.films.length-a.films.length))if(!chosen.some(x=>x.name===node.name)&&node.films.length>=4)chosen.push(node);
  }
  chosen=chosen.slice(0,3);
  if(chosen.length<2){notice.textContent='More documented theme tags are needed before a sample can be built.';return;}
  if(!s.create('Across themes · a sourced film constellation')){notice.textContent='Could not create a new constellation.';return;}
  var c=s.current();c.note='An example for visual research. Each colored thread follows a theme assigned from a published film synopsis. Shared films cross between threads. Co-tagging is evidence of a catalog relationship, not evidence of cultural similarity, collaboration or a filmmaker endorsement. Read the film sources, then revise and annotate these paths. This starting selection is intentionally small; add new films and threads as your question develops.';
  var usedIds=new Set(),seenMakers=new Set(),colors=['star-bluewhite','star-blue','star-yellow','star-red','star-orange','star-white'];
  chosen.forEach(function(node,i){
   var t=i?s.createThread(node.name,'Sourced from the published film synopsis; interpret each transition rather than assuming affinity.',colors[i%colors.length]):c.threads[0].id;
   var thread=c.threads.find(x=>x.id===t);
   thread.name=node.name;thread.description='Films tagged '+node.name+'. Co-membership in a theme is a documented catalog relation, not a claim about culture or kinship.';thread.color=colors[i%colors.length];
   var ranked=node.films.slice().sort(function(a,b){
    var aa=(api.sourceImage(a.x)?1:0)+Math.min(4,a.tags.length)*.35;
    var bb=(api.sourceImage(b.x)?1:0)+Math.min(4,b.tags.length)*.35;
    return bb-aa||(a.x.year||9999)-(b.x.year||9999);
   });
   var picks=[],local=new Set();
   for(var f of ranked){if(local.has(f.x.record)||f.x.type!=='film')continue;local.add(f.x.record);picks.push(f);if(picks.length===4)break;}
   for(var f of picks){var clean=s.item(f.x);if(!clean)continue;if(!c.items.some(x=>x.id===clean.id))c.items.push(clean);if(!thread.items.includes(clean.id))thread.items.push(clean.id);usedIds.add(clean.id);seenMakers.add(clean.record);}
  });
  c.activeThread=c.threads[0].id;c.selectedItem=null;s.save();
  show(false);api.open();api.fit();
  notice.textContent='Created '+chosen.length+' sourced theme threads with '+usedIds.size+' films across '+seenMakers.size+' filmmaker records.';
 }
 function show(on){
  if(on&&!atlas()?.enabled)atlas()?.open();
  isOpen=!!on;
  root.hidden=!isOpen;
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-pressed',String(isOpen));
  document.body.classList.toggle('is-theme-web-open',isOpen);
  if(isOpen){draw();searchBox.focus({preventScroll:true});}
 }
 var resizeFrame=0;window.addEventListener('resize',function(){if(!isOpen||resizeFrame)return;resizeFrame=requestAnimationFrame(function(){resizeFrame=0;if(isOpen)drawGraph();});},{passive:true});
 function init(){
  var tries=0;
  var timer=setInterval(function(){
   tries++;
   if(atlas()?.catalog&&store()&&document.getElementById('constellate-mode')){
    clearInterval(timer);
    if(collect()&&markup()){var query=new URLSearchParams(location.search);var firstVisit=query.get('constellate')==='1'&&query.get('read')!=='1'&&query.get('play')!=='1'&&!store().current().items.length&&!query.has('weave')&&!location.hash.includes('weave=');if(query.get('theme-web')==='1'||firstVisit){atlas().open();show(true);}}
   }else if(tries>70)clearInterval(timer);
  },200);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
}catch(error){console.error('Constellate section failed: Theme web',error);}

/* ================================================================
   Stages, start card, guide box, suggestions, legend
   (was assets/weave-20261109.js)
   ================================================================ */
try{
/* Constellate: a clearer way into weaving, 2026-11-09 (Claude).
   Three stages, set on <html data-weave-stage>:
   - start: the weave is empty. One card on the map offers three ways in (a theme, a film, the example), plus the
     theme web and any saved weaves. The side panel and the building tools wait until something is on the map.
   - build: a guide at the top of the panel says where you are (add films, link them, read and share), in plain words,
     with the next useful action. The toolbar shows building tools only while building.
   - read / play: building tools step aside.
   Uses the existing Constellate API (window.AtlasConstellate, window.AtlasCollections) and its buttons; no engine code
   is replaced. Clear weave stays in the toolbar, behind the existing confirmation and Undo. */
(function(){'use strict';
var root=document.documentElement,$=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s));};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var norm=function(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();};
var C=function(){return window.AtlasConstellate;},S=function(){return window.AtlasCollections;};
var showWelcome=false;
document.addEventListener('click',function(e){if(e.target.closest('.constellate-link'))showWelcome=true;},true);

function on(){var c=C();return !!(c&&c.enabled&&document.body.classList.contains('is-constellating'));}
function current(){try{return S().current();}catch(e){return null;}}
function thread(){try{return S().activeThread();}catch(e){return null;}}
function reading(){var b=$('#constellate-read');return !!(b&&b.getAttribute('aria-pressed')==='true');}
function stage(){
 if(!on()){showWelcome=false;return '';}
 var c=current();if(!c)return '';
 if(C().playing)return 'play';
 if(reading())return 'read';
 return showWelcome||!c.items.length?'start':'build';
}

/* ---------- the start card ---------- */
function themes(){
 return $$('#weave-theme-start option').map(function(o){var m=/^(.*) \((\d+)\)$/.exec(o.textContent.trim());return m?{name:m[1],n:+m[2]}:null;}).filter(Boolean).sort(function(a,b){return b.n-a.n;});
}
function films(){
 var seen={},out=[];(C().catalog||[]).forEach(function(x){if(x.type!=='film'||seen[x.film+'|'+x.title])return;seen[x.film+'|'+x.title]=1;out.push(x);});return out;
}
var FILMS=null;
function search(q){
 q=norm(q).trim();if(q.length<2)return [];
 FILMS=FILMS||films();
 var hits=[];for(var i=0;i<FILMS.length&&hits.length<40;i++){var x=FILMS[i],t=norm(x.title),m=norm(x.maker);if(t.indexOf(q)>=0||m.indexOf(q)>=0)hits.push([t.indexOf(q)===0?0:t.indexOf(q)>=0?1:2,x]);}
 return hits.sort(function(a,b){return a[0]-b[0];}).slice(0,6).map(function(h){return h[1];});
}
function weavesSaved(){try{return (S().state.collections||[]).filter(function(w){return w.items&&w.items.length;});}catch(e){return [];}}
function buildStart(){
 var host=$('#atlas')&&$('#atlas').parentElement;if(!host||$('#weave-start'))return;
 var top=themes().slice(0,6),all=themes().sort(function(a,b){return a.name.localeCompare(b.name);});
 var sec=document.createElement('section');sec.id='weave-start';sec.setAttribute('aria-labelledby','weave-start-title');
 sec.innerHTML=
  '<p class="ws-kicker">Constellate</p>'+
  '<h2 id="weave-start-title">How can films encounter each other?</h2>'+
  '<p class="ws-lede">Connect films into threads through what they share: a theme, a land, a question. Each thread runs across the map from film to film, to read, play and share.</p>'+
  '<ol class="ws-how" aria-label="How constellation building works"><li><b>1</b> Add films</li><li><b>2</b> Link them, and say why</li><li><b>3</b> Read, play or share</li></ol>'+
  '<div class="ws-paths">'+
   '<section class="ws-path"><h3>Start from a theme</h3><p>Every film on the thread shares the theme, taken from its published synopsis.</p>'+
    '<label class="ws-sr" for="ws-theme-q">Search themes</label><input id="ws-theme-q" type="search" autocomplete="off" placeholder="Search themes…">'+
    '<ul class="ws-results" id="ws-theme-results" aria-live="polite"></ul>'+
    '<p class="ws-popular-label">Popular themes</p>'+
    '<div class="ws-chips">'+top.map(function(t){return '<button type="button" data-ws-theme="'+esc(t.name)+'">'+esc(t.name)+' <small>'+t.n+'</small></button>';}).join('')+'</div>'+ 
    '<label class="ws-sr" for="ws-theme-all">All themes</label><select id="ws-theme-all"><option value="">All 30 themes…</option>'+all.map(function(t){return '<option value="'+esc(t.name)+'">'+esc(t.name)+' ('+t.n+')</option>';}).join('')+'</select></section>'+
   '<section class="ws-path"><h3>Start from a film</h3><p>Choose one film. Films that share a documented theme with it are suggested next.</p>'+
    '<label class="ws-sr" for="ws-film-q">Search a film or filmmaker</label><input id="ws-film-q" type="search" autocomplete="off" placeholder="Search a film or filmmaker…">'+
    '<ul id="ws-film-results" class="ws-results" aria-live="polite"></ul></section>'+
   '<section class="ws-path"><h3>See an example</h3><p>Three films that share a theme, already connected, to read and change.</p><div class="ws-example-films"></div><p class="ws-example-label"></p>'+
    '<button type="button" class="ws-primary" data-ws-example>Open the example</button>'+
    '<button type="button" class="ws-link" data-ws-web>Or explore the theme web →</button></section>'+
  '</div>'+
  '<div class="ws-current" hidden><button type="button" data-ws-continue>Continue this constellation</button><small class="ws-current-name"></small></div>'+ 
  '<div class="ws-saved" hidden><label for="ws-saved-select">Open a saved constellation</label><select id="ws-saved-select"></select></div>';
 host.appendChild(sec);
 var src=$('#weave-intro-films'),lab=$('#weave-intro-label');if(src){$('.ws-example-films',sec).innerHTML=src.innerHTML;}if(lab)$('.ws-example-label',sec).textContent=lab.textContent;
 sec.addEventListener('click',function(e){
  var t=e.target.closest('[data-ws-theme]');if(t){showWelcome=false;C().themeThread(t.dataset.wsTheme);settle();return;}
  if(e.target.closest('[data-ws-example]')){showWelcome=false;var P=window.AtlasPublished,old=function(){var b=$('#weave-example');if(b)b.click();settle();};if(P&&P.example){P.open(P.example,'build').then(settle,old);}else old();return;}
  if(e.target.closest('[data-ws-continue]')){showWelcome=false;settle();return;}
  if(e.target.closest('[data-ws-web]')){var w=$('#weave-theme-web-toggle');if(w)w.click();return;}
  var f=e.target.closest('[data-ws-film]');if(f){var x=(FILMS||films()).find(function(v){return v.id===f.dataset.wsFilm;});if(x){showWelcome=false;C().add(x);var tab=$('#weave-tab-thread');if(tab)tab.click();settle();}}
 });
 $('#ws-theme-all',sec).addEventListener('change',function(e){var v=e.target.value;e.target.value='';if(v){showWelcome=false;C().themeThread(v);settle();}});
 var q=$('#ws-film-q',sec),list=$('#ws-film-results',sec);
 q.addEventListener('input',function(){var hits=search(q.value);
  list.innerHTML=hits.map(function(x){return '<li><button type="button" data-ws-film="'+esc(x.id)+'"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small></button></li>';}).join('')||(q.value.trim().length>1?'<li class="ws-none">No film or filmmaker matches.</li>':'');});
 q.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=list.querySelector('[data-ws-film]');if(b){e.preventDefault();b.click();}}});
 var tq=$('#ws-theme-q',sec),tr=$('#ws-theme-results',sec);
 tq.addEventListener('input',function(){
  var needle=norm(tq.value).trim(),found=needle?all.filter(function(t){return norm(t.name).includes(needle);}).slice(0,12):[];
  tr.innerHTML=found.map(function(t){return '<li><button type="button" data-ws-theme="'+esc(t.name)+'"><strong>'+esc(t.name)+'</strong><small>'+t.n+' films</small></button></li>';}).join('')||(needle?'<li class="ws-none">No matching themes.</li>':'');
 });
 tq.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=tr.querySelector('[data-ws-theme]');if(b){e.preventDefault();b.click();}}});
 $('#ws-saved-select',sec).addEventListener('change',function(e){var v=e.target.value;if(!v)return;showWelcome=false;var sel=$('#constellate-collection');if(sel){sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));}settle();});
}
function savedList(){
 var box=$('#weave-start .ws-saved');if(!box)return;var c=current(),ws=weavesSaved().filter(function(w){return !c||w.id!==c.id;});
 var old=$('#weave-start .ws-current');if(old){old.hidden=!(c&&c.items.length);var label=$('.ws-current-name',old);if(label&&c)label.textContent=c.name;}
 box.hidden=!ws.length;if(!ws.length)return;
 var sel=$('#ws-saved-select',box);if(!sel)return;
  var html='<option value="">Choose a constellation…</option>'+ws.map(function(w){return '<option value="'+esc(w.id)+'">'+esc(w.name)+' · '+w.items.length+' film'+(w.items.length===1?'':'s')+'</option>';}).join('');
  if(sel.innerHTML!==html){var previous=sel.value;sel.innerHTML=html;if(previous&&[].some.call(sel.options,function(o){return o.value===previous;}))sel.value=previous;}
}

/* ---------- the guide at the top of the panel ---------- */
function buildGuide(){
 var pop=$('#constellate-popup'),head=pop&&$('.constellate-heading',pop);if(!head||$('#weave-guide'))return;
 var g=document.createElement('section');g.id='weave-guide';g.setAttribute('aria-live','polite');
 g.innerHTML='<ol class="wg-steps" aria-label="Constellation steps"><li data-step="add">Add films</li><li data-step="link">Link them</li><li data-step="share">Read and share</li></ol><p class="wg-text"></p><div class="wg-actions"></div>';
 head.after(g);
 g.addEventListener('click',function(e){var a=e.target.closest('[data-wg]');if(!a)return;var k=a.dataset.wg;
  if(k==='add'){var t=$('#weave-tab-add');if(t)t.click();var s=$('#constellate-search');if(s)setTimeout(function(){s.focus();},60);}
  else if(k==='suggest'){var tt=$('#weave-tab-thread');if(tt)tt.click();var sg=$('#weave-suggest');if(sg)sg.scrollIntoView({block:'nearest'});}
  else if(k==='draw'){var d=$('#weave-draw-thread');if(d)d.click();}
  else if(k==='read'){var r=$('#constellate-read');if(r)r.click();}
  else if(k==='play'){var p=$('#weave-play');if(p)p.click();}
  else if(k==='connect'){try{C().startLink();}catch(err){}}
  else if(k==='build'){var b=$('#constellate-edit');if(b)b.click();}
  else if(k==='share'){var sh=$('#constellate-share');if(sh)sh.click();}
  settle();});
}
function q(s){return '“'+s+'”';}
function guide(st){
 var g=$('#weave-guide');if(!g)return;var c=current(),t=thread();if(!c||!t)return;
 var n=t.items.length,total=c.items.length,threads=c.threads.filter(function(x){return x.items.length;}).length,links=(c.links||[]).length;
 var step='add',text='',acts=[];
 var drawing=$('#weave-draw-thread')&&$('#weave-draw-thread').getAttribute('aria-pressed')==='true';
 if(st==='read'){step='share';text='Reading “'+c.name+'”: '+threads+' thread'+(threads===1?'':'s')+', '+total+' film'+(total===1?'':'s')+'.';acts=[['play','Play on the map'],['share','Share'],['build','Back to building']];}
 else if(drawing){step='link';text='Click films on the map in the order the thread should run. Choose Done drawing to finish.';acts=[['draw','Done drawing']];}
 else if(n===0){step='add';text=total?('Add films to “'+t.name+'”: search, or use Draw thread to click films already on the map.'):'Add the first film: search, or click a film on the map.';acts=[['add','Add films'],total?['draw','Draw thread']:null];}
 else if(n===1){step='add';text='Add a second film. Films that share a documented theme with this one are listed below.';acts=[['suggest','See films that could come next'],['add','Search films']];}
 else{step='link';text='“'+t.name+'” · '+n+' films. Select two film cards to explain their connection.';acts=[['connect','Connect two films'],['read','Follow'],['add','Add films']];}
 $$('.wg-steps li',g).forEach(function(li){var order=['add','link','share'];var k=li.dataset.step===step?'is-now':(order.indexOf(li.dataset.step)<order.indexOf(step)?'is-done':'');if(li.className!==k)li.className=k;});
 var tx=$('.wg-text',g);if(tx.textContent!==text)tx.textContent=text;
 var html=acts.filter(Boolean).map(function(a,i){return '<button type="button" data-wg="'+a[0]+'" class="'+(i===0?'wg-primary':'')+'">'+a[1]+'</button>';}).join('');
 var ab=$('.wg-actions',g);if(ab.dataset.html!==html){ab.dataset.html=html;ab.innerHTML=html;}
}

/* ---------- labels ---------- */
/* ---------- 2026-11-11: suggestions never offer a film that is already on the thread ---------- */
var chip=function(v,n){v=String(v||'');return v.length>n?v.slice(0,n-1).replace(/\s+$/,'')+'…':v;};
var tkey=function(x){return norm(x.title).replace(/[^a-z0-9]+/g,' ').trim()+'|'+(x.year||'');};
var yr=function(x){var n=parseInt(x&&x.year,10);return n>1800&&n<2100?n:null;};
function thumbHTML(x){var img='';try{img=C().sourceImage(x)||'';}catch(e){}
 var ini=String(x.title||'').trim().split(/\s+/).slice(0,2).map(function(w){return Array.from(w)[0]||'';}).join('').toUpperCase()||'·';
 return '<span class="weave-media-thumb'+(img?' has-source':'')+'" role="img" aria-label="'+(img?'Atlas film image':'No sourced image — title placeholder')+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" decoding="async">':'')+'<span class="weave-media-placeholder" aria-hidden="true"><b>'+esc(ini)+'</b><small>Film</small></span></span>';}
function suggest(){
 var box=$('#weave-suggest');if(!box||box.hidden)return;
 var c=current(),t=thread();if(!c||!t)return;
 var head=$('.weave-suggest-head small',box);if(!head)return;
 var onThread={},inWeave={};
 c.items.forEach(function(x){if(x.type!=='film')return;inWeave[tkey(x)]=1;if(t.items.indexOf(x.id)>=0)onThread[tkey(x)]=1;});
 var shown=head.textContent.trim();
 var pool=c.items.filter(function(x){return x.type==='film'&&chip(x.title,45)===shown;});
 var seed=pool.filter(function(x){return t.items.indexOf(x.id)>=0;})[0]||pool[0];
 if(!seed)return;
 var sig=[seed.id,t.id,t.items.join(',')].join('|');
 if(box.dataset.wsSig===sig&&$('[data-ws-suggest]',box))return;
 var want;try{want=C().terms(seed);}catch(e){return;}
 var ly=yr(seed),seen={};
 var picks=(C().catalog||[]).filter(function(x){return x.type==='film';}).map(function(x){
   var k=tkey(x);if(k===tkey(seed)||onThread[k]||seen[k])return null;seen[k]=1;
   var sh=C().terms(x).filter(function(m){return want.indexOf(m)>=0;});if(!sh.length)return null;
   var y=yr(x);return {x:x,sh:sh,sc:sh.length*10+(inWeave[k]?4:0)-(ly&&y?Math.min(5,Math.abs(y-ly)/8):3)};
 }).filter(Boolean).sort(function(a,b){return b.sc-a.sc||String(a.x.title).localeCompare(String(b.x.title));}).slice(0,6);
 box.dataset.wsSig=sig;
 box.innerHTML='<div class="weave-suggest-head" data-ws-suggest><h3>Films that could come next</h3><small>'+esc(shown)+'</small></div>'+
  (picks.length?'<p class="weave-suggest-intro">Each shares a theme with this film in its published synopsis. Add next puts it on the thread.</p>'+picks.map(function(p){var x=p.x;
    return '<div class="constellate-result weave-follow-result" draggable="true" data-drag-film="'+esc(x.id)+'">'+thumbHTML(x)+'<span><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small><small class="weave-theme-tags">Shares '+esc(p.sh.join(' · '))+'</small></span><button type="button" data-weave-follow="'+esc(x.id)+'" aria-label="Add '+esc(x.title)+' next on '+esc(t.name)+'">Add next</button></div>';}).join('')
  :'<p class="weave-suggest-intro">Every film that shares a documented theme with this one is already on the thread. Use Add films to continue.</p>');
}
/* ---------- 2026-11-11: a new thread never repeats a colour already in use ---------- */
var STAR_ORDER=['star-blue','star-yellow','star-red','star-bluewhite','star-orange','star-white'],lastThreadCount={};
function distinctColours(){
 var c=current();if(!c)return;var n=c.threads.length,was=lastThreadCount[c.id];lastThreadCount[c.id]=n;
 if(was===undefined||n<=was)return;
 var fresh=c.threads[n-1],used={};c.threads.slice(0,n-1).forEach(function(t){used[t.color]=1;});
 if(!used[fresh.color])return;
 var free=STAR_ORDER.filter(function(k){return !used[k];})[0];
 if(free){fresh.color=free;try{S().save();}catch(e){}}
}
/* ---------- 2026-11-11: legend for the two kinds of line; phone cue for the selected film ---------- */
function legendNote(){
 var host=$('#weave-legend');if(!host||$('#weave-line-key'))return;
 var p=document.createElement('p');p.id='weave-line-key';
 p.innerHTML='<span class="wk wk-solid" aria-hidden="true"></span>Solid thread = sourced connection. <span class="wk wk-dream" aria-hidden="true"></span>Dream thread = interpretive connection. <span class="wk-about">The weaving here is abstract (lines, knots); it uses no community’s textile designs.</span>';
 host.after(p);
}
function phoneCue(){
 var ctx=$('#constellate-context'),small=window.matchMedia('(max-width:700px)').matches,cue=$('#weave-phone-cue');
 var show=small&&root.dataset.weaveStage==='build'&&ctx&&!ctx.hidden;
 if(!show){if(cue)cue.hidden=true;return;}
 if(!cue){cue=document.createElement('button');cue.type='button';cue.id='weave-phone-cue';document.body.appendChild(cue);
  cue.addEventListener('click',function(){var k=$('#constellate-context');if(k)k.scrollIntoView({block:'start',behavior:'smooth'});});}
 var h=$('#constellate-context h3'),r=ctx.getBoundingClientRect();
 cue.textContent=(h?chip(h.textContent,30):'Selected film')+' · details ↓';
 cue.hidden=r.top<window.innerHeight-80&&r.bottom>0;
}
/* 2026-11-11: the example is the published, hand-written constellation, not an automatic pick */
function examplePreview(){
 var P=window.AtlasPublished,sec=$('#weave-start');if(!P||!P.example||!sec||sec.dataset.wsPublished)return;
 var e=(P.list||[]).filter(function(x){return x.slug===P.example;})[0];if(!e)return;
 sec.dataset.wsPublished='1';
 var path=$('[data-ws-example]',sec).closest('.ws-path'),p=$('p',path);
 if(p)p.textContent=e.films+' films on '+e.threads.length+' threads, each line with its reason, to read and change.';
 $('.ws-example-films',sec).innerHTML='<ul class="ws-example-threads">'+e.threads.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';
 $('.ws-example-label',sec).textContent=e.name+(e.author?' · '+e.author:'');
}
function labels(){
 try{suggest();}catch(e){}
 var b=$('#weave-browse-films');if(b&&b.textContent.trim()==='Find films'){b.textContent='Add films';b.title='Search the atlas and add films to the active thread';}
 var tab=$('#weave-tab-add');if(tab&&tab.textContent.trim()==='Browse films')tab.textContent='Add films';
 var cl=$('#constellate-clear');if(cl&&cl.textContent.trim()==='Clear weave'){cl.textContent='Clear';}
 $$('#weave-suggest [data-weave-follow]').forEach(function(b){if(/^Follow/.test(b.textContent.trim()))b.textContent='Add next';});
 var sh=$('#weave-suggest h3, #weave-suggest strong');if(sh&&/^Follow another film$/.test(sh.textContent.trim()))sh.textContent='Films that could come next';
 $$('#weave-suggest p').forEach(function(pp){if(pp.textContent.trim()==='Documented connections through shared synopsis themes. Choose a film to move there.')pp.textContent='Each shares a theme with this film in its published synopsis. Add next puts it on the thread.';});
 var h=$('#weave-empty-hint h2');if(h&&h.textContent!=='How can films encounter each other?')h.textContent='How can films encounter each other?';
}

/* ---------- run ---------- */
var last='',lastLen=-1;
function settle(){setTimeout(tick,80);setTimeout(tick,500);}
function tick(){
 var st=stage();
 if(st)root.dataset.weaveStage=st;else delete root.dataset.weaveStage;
 var web=$('#atlas-theme-web');if(web&&!web.hidden)root.dataset.weaveWeb='1';else delete root.dataset.weaveWeb;
 if(!st)return;
 buildStart();buildGuide();labels();try{examplePreview();}catch(e){}try{distinctColours();legendNote();phoneCue();}catch(e){}
 if(st==='start'){savedList();}
 guide(st);
 if(st==='build'){var th=thread(),len=th?th.items.length:0;if(len>=2&&lastLen<2){setTimeout(function(){if(root.dataset.weaveStage==='build'){try{C().fit();}catch(e){}}},350);}lastLen=len;}else lastLen=-1;
 if(st==='start'&&last!=='start'){var qn=$('#ws-film-q');if(qn&&window.innerWidth>760)setTimeout(function(){try{var current=document.activeElement;if(!current||current===document.body||current===document.documentElement||current===qn)qn.focus({preventScroll:true});}catch(e){}},300);}
 last=st;
}
window.addEventListener('scroll',function(){try{phoneCue();}catch(e){}},{passive:true});
function start(){
 if(!window.AtlasConstellate||!window.AtlasCollections){if((start.attempts=(start.attempts||0)+1)<=100)setTimeout(start,300);return;}
 tick();
 try{S().subscribe(function(){settle();});}catch(e){}
 var sg=$('#weave-suggest');if(sg)new MutationObserver(function(){labels();}).observe(sg,{childList:true,subtree:true});
 new MutationObserver(function(){if(!tick.raf)tick.raf=requestAnimationFrame(function(){tick.raf=0;tick();});}).observe(document.body,{attributes:true,attributeFilter:['class','aria-pressed','hidden'],subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
}catch(error){console.error('Constellate section failed: Stages, start card, guide box, suggestions, legend',error);}
