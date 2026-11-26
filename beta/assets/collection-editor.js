'use strict';
/* ================================================================
   Engine: state, map drawing, panel, Follow, Play, share
   (was atlas-constellate62.js)
   ================================================================ */
window.AtlasCollectionEditorReady=(async()=>{
 const globeEntry=!!window.AtlasRoute?.globe;
 const A=globeEntry?window.AtlasCatalogue:window.Atlas,S=window.AtlasCollections;if(!A||!S||new URLSearchParams(location.search).has('constellation-embed'))return;const inbound=location.href;await A.ready;
 // Beta 1103: themes from published synopses (themes-1103-data.js); older seed terms are mapped to the 30-tag vocabulary.
 const TH=window.ATLAS_THEMES_1103||{families:{},films:{}},FAM={},FAMC={'Land and Environment':['#2f7d46','#7fd39a'],'Sovereignty and Politics':['#a8392b','#ff8f7a'],'Knowledge and Continuity':['#6447a8','#b9a2ff'],'Lives and Relations':['#a86a0e','#ffc163'],'Expression and Representation':['#1f6f99','#7cc8f0']};for(const[f,ts]of Object.entries(TH.families))for(const t of ts)FAM[t]=f;
 {const old={'land defense':'Land Defense','sovereignty':'Sovereignty and Self-Determination','language return':'Linguistic Preservation','memory':'Memory and Oral History','kinship':'Kinship','gender':'Women and Gender','youth':'Youth','water':'Water','environmental change':'Environmental Change','migration':'Displacement and Migration','healing':'Health and Healing','archives':'Archives, Museums and Repatriation','urban life':'Urban Indigeneity'};for(const r of A.allRecords())for(const f of r.films){const d=TH.films[f.id];if(d){f.themes=d[0].map(term=>({term,source:'curator',family:FAM[term]}));f.primaryTheme=d[1];f.weaveForm=d[2];f.weaveLength=d[3];f.themeSource=d[4];}else if(Array.isArray(f.themes))f.themes=f.themes.filter(t=>t.source!=='curator'||old[t.term]||FAM[t.term]).map(t=>t.source==='curator'&&old[t.term]?{...t,term:old[t.term],family:FAM[old[t.term]]}:t);/* tags already in the current vocabulary (flat beta) are kept as they are */}}
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],map=globeEntry?$('#collection-editor'):$('.map-panel'),main=globeEntry?map:$('main'),trigger=$('.constellate-link');if(!map)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),copy=v=>JSON.parse(JSON.stringify(v)),norm=v=>String(v||'').replace(/[’‘ʼꞌ`']/gu,"'").normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const palette={blue:['#175fac','#7db6e8'],orange:['#a64c00','#f0ab68'],teal:['#00735b','#70c9b0'],purple:['#7141a3','#c5a2e6'],rose:['#a23361','#efa0be'],olive:['#657114','#c2cc7b'],cyan:['#006c83','#74cee1'],red:['#ad3030','#ed9292']};
 Object.assign(palette,{indigo:['#175fac','#7f95f5'],achiote:['#a64c00','#ec8a3d'],jade:['#00735b','#4fbf98'],cochineal:['#a23361','#d8475e'],maize:['#80661c','#ebc867'],cotton:['#767d84','#efe6d2']});// Beta 105: thread colors follow the colors of stars, blue to red; older weaves keep their order of colors.
 const STAR={"star-blue": ["#3a5bbf", "#8fb4ff"], "star-bluewhite": ["#5a72a8", "#cbd9ff"], "star-white": ["#6f7480", "#f2f4fb"], "star-yellow": ["#99700f", "#ffd35c"], "star-orange": ["#a8521a", "#ffa95a"], "star-red": ["#a8302c", "#ff6f5a"]};Object.assign(palette,STAR,{indigo:STAR['star-blue'],jade:STAR['star-bluewhite'],cotton:STAR['star-white'],maize:STAR['star-yellow'],achiote:STAR['star-orange'],cochineal:STAR['star-red'],midnight:STAR['star-blue'],ocean:STAR['star-bluewhite'],sky:STAR['star-bluewhite'],glacier:STAR['star-white']});const DYES=[['star-blue','Blue'],['star-bluewhite','Blue-white'],['star-white','White'],['star-yellow','Yellow'],['star-orange','Orange'],['star-red','Red']];
 const color=t=>(palette[t.color]||palette.indigo)[1],motion=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width:700px)');
 const drawStarts=new Map();let unmapped=false,relX='order',relCache={key:'',map:null},selPushed=false,skipPop=false,suggestOpen=false,cardsAll=(()=>{try{return localStorage.getItem('weave-cards-all')==='1';}catch{return false;}})(),playThread=null,timelineOn=false,lastFound=[],player=null,playTimer=null,playIndex=0,playPaused=true,playFinished=false,playEntry=null;
 const raw=A.allRecords().flatMap(r=>[...r.films.map(f=>({...S.item({type:'film',record:r.id,film:f.id,title:f.title,maker:r.name,year:f.year,image:A.mediaForFilm(f)?.image}),community:r.community})),{...S.item({type:'maker',record:r.id,title:r.name,maker:r.name}),community:r.community}]);
 const key=x=>x.type==='film'?'t:'+norm(x.title).replace(/[^a-z0-9]+/g,' ').trim()+'|'+(x.year||''):x.id,grouped=new Map();const byFilm=new Map();for(const x of raw){let k=key(x);if(x.type==='film'&&x.film){if(byFilm.has(x.film))k=byFilm.get(x.film);else byFilm.set(x.film,k);}if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(x);}const catalog=[...grouped.values()].map(g=>({...g[0],image:g.find(x=>x.image)?.image||'',credits:g,maker:[...new Set(g.map(x=>x.maker))].join(' · ')}));const catalogById=new Map(catalog.map(x=>[x.id,x]));
 const globeCredits=new Map(raw.filter(x=>x.type==='film').map(x=>[x.id,{...x,credits:[x]}]));
 let globeRelations=null,globePublication=null,globeFacetRows=new Map(),globeMetadataCache=new Map(),globeMakerRows=new Map();
 const globeMode=()=>!!window.AtlasGlobe?.active;
 const csvList=v=>[...new Set(String(v||'').split(/\s*;\s*/).filter(Boolean))];
 const baseFilm=x=>A.recordById(x?.record)?.films.find(f=>f.id===x.film)||null;
 function installGlobePublication(rows,facets){
  globePublication=rows;globeFacetRows=new Map();globeMetadataCache.clear();globeRelations=null;globeMakerRows=new Map();
  // The maker columns are repeated on every exact credit, including the row
  // with no film. Do not choose one arbitrarily if those recorded fields differ.
  const fields=['filmmaker_id','name','aliases','entity','nation','community','affiliation_basis','source_1_url','source_1_quote','source_1_detail','source_2_url','source_2_quote','source_2_detail','source_3_url','source_3_quote','source_3_detail','more_sources'];
  for(const list of rows.values())for(const row of list){const id=row.filmmaker_id;if(!id)continue;const maker=Object.fromEntries(fields.map(k=>[k,row[k]||''])),prior=globeMakerRows.get(id);if(!prior)globeMakerRows.set(id,{maker,conflict:false});else if(fields.some(k=>prior.maker[k]!==maker[k]))prior.conflict=true;}
  for(const row of facets){if(!row.film_id||!row.value)continue;let f=globeFacetRows.get(row.film_id);if(!f){f={l:[],t:[],f:'',n:'',p:'',sources:[],conflicts:[]};globeFacetRows.set(row.film_id,f);}
   const field={language:'l',theme:'t',form:'f',length:'n'}[row.field];if(!field)continue;
   if(Array.isArray(f[field])){if(!f[field].includes(row.value))f[field].push(row.value);}
   else if(!f[field])f[field]=row.value;else if(f[field]!==row.value)f.conflicts.push([row.field,f[field],row.value]);
   if(row.field==='theme'&&/primary theme/i.test(row.basis||''))f.p=row.value;
   f.sources.push(row);
  }
  if(globeMode())refreshDiscoveryMode();
 }
 function globeMakerMetadata(id){const v=globeMakerRows.get(id);return v&&!v.conflict?v.maker:null;}
 function globeFacetExport(id){return globeFacetRows.get(id)||null;}
 function globeMetadata(x){
  if(x?.type!=='film'||!globePublication)return null;
  const key=x.record+'|'+x.film;if(globeMetadataCache.has(key))return globeMetadataCache.get(key);
  const rows=globePublication.get(key)||[],row=rows.length===1?rows[0]:null;
  if(!row)return null;
  const raw=baseFilm(x),fac=globeFacetRows.get(x.film),compact=window.ATLAS_FACETS?.films?.[x.film]||{};
  const value=(column,field)=>row[column]||fac?.[field]||compact[field]||'';
  const list=(column,field)=>row[column]?csvList(row[column]):fac?.[field]?.length?fac[field]:compact[field]||[];
  const t=list('themes','t').filter(v=>FAM[v]),l=list('languages','l');
  const routes=[1,2].map(n=>({url:row['watch_'+n+'_url'],title:row['watch_'+n+'_label']||'Viewing page',context:row['watch_'+n+'_note']||'',source:'Published CSV'})).filter(v=>safeLink(v.url));
  const result={row,t,l,f:value('form','f'),n:value('length','n'),p:value('primary_theme','p'),routes,
    image:row.image_url||'',themeSource:row.theme_source||'',languageSource:row.language_source||'',creditSource:row.film_source||'',
    film:{...raw,credit:row.credit||raw?.credit,medium:row.medium||raw?.medium,runtimeMinutes:row.runtime_min||raw?.runtimeMinutes,
    languageLabels:l,weaveForm:value('form','f'),weaveLength:value('length','n'),primaryTheme:value('primary_theme','p'),themeSource:row.theme_source||raw?.themeSource,sourceURL:row.film_source||raw?.sourceURL}};
  globeMetadataCache.set(key,result);return result;
 }
 function globeViewingRoutes(x){const m=globeMetadata(x),f=baseFilm(x);return m?.routes.length?m.routes:(f?A.viewingRoutes(f):[]);}
 function exactGlobeMeta(x){return globeMode()&&(!x?.credits||x.credits.length===1)?globeMetadata(x):null;}

 const discoveryItem=id=>(globeMode()?globeCredits.get(id):null)||catalogById.get(id);let azTab='film',azKey='',browsePageStart=0,browsePageLimit=48,browseSignature='',focusThread=false;const azSort=new Intl.Collator(undefined,{sensitivity:'base',numeric:true}),sortKey=v=>String(v||'').replace(/^[\s"'“”‘’¡¿(\[«.…-]+/u,''),letterOf=x=>{const raw=String(x.title||'').trim();if(!/^\p{L}/u.test(raw))return '#';const ch=norm(raw).charAt(0).toUpperCase();return /^[A-Z]$/.test(ch)?ch:'#';},azCache={},azAll=type=>azCache[type]||(azCache[type]=catalog.filter(x=>x.type===type).sort((a,b)=>{const la=letterOf(a),lb=letterOf(b);return la==='#'&&lb!=='#'?1:lb==='#'&&la!=='#'?-1:azSort.compare(la==='#'?a.title:sortKey(a.title),lb==='#'?b.title:sortKey(b.title));}));
 function tags(x){const m=exactGlobeMeta(x);if(m)return m.t.map(term=>({term,source:'curator',family:FAM[term]}));const r=A.recordById(x.record),credits=x.type==='film'?(x.credits||grouped.get(byFilm.get(x.film))||[x]):[];const fs=x.type==='film'?credits.flatMap(c=>A.recordById(c.record)?.films.filter(f=>f.id===c.film)||[]):r?.films;return [...new Map((fs||[]).flatMap(f=>f.themes||[]).map(t=>[t.term+'|'+t.source,t])).values()];}
 function filmOf(x){if(x?.type!=='film')return null;return exactGlobeMeta(x)?.film||baseFilm(x);}
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
  return exactGlobeMeta(x)?.image||window.AtlasArtwork.imageForItem(x)||catalogById.get(x.id)?.image||x.image||'';
 }
 function viewingAction(x){
  const works=x?.type==='film'?(x.credits||grouped.get(byFilm.get(x.film))||[x]):[];
  const routes=works.flatMap(w=>{if(globeMode())return globeViewingRoutes(w);const f=filmOf(w);return f?A.viewingRoutes(f):[];}).filter(l=>{try{return new URL(l.url).protocol==='https:';}catch{return false;}});
  const kind=l=>/trailer|teaser|preview/i.test(l.title||'')?'Trailer':/watch|full film|stream|viewing|ver pel[ií]cula|ver filme/i.test(l.title||'')?'Watch':'Film page';
  return routes.map(l=>({url:l.url,label:kind(l)})).sort((a,b)=>['Watch','Trailer','Film page'].indexOf(a.label)-['Watch','Trailer','Film page'].indexOf(b.label))[0]||null;
 }
 function viewingLink(x){const a=viewingAction(x);return a?'<a class="weave-watch-link" href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.label)+' ↗</a>':'';}
 function initials(x){
  const words=String(x?.title||'').trim().split(/\s+/).filter(Boolean);
  return words.slice(0,2).map(w=>Array.from(w)[0]).join('').toUpperCase()||'·';
 }
 function thumb(x,clean=false){
  if(x?.type==='concept')return '<span class="weave-media-thumb weave-star-thumb" aria-hidden="true">◇</span>';
  const image=sourceImage(x),kind=x?.type==='film'?'Film':x?.type==='maker'?'Filmmaker':'Star';
  if(clean===true)return image?`<span class="weave-media-thumb has-source globe-clean-art"><img src="${esc(image)}" alt="" loading="eager" decoding="async"></span>`:'';
  return `<span class="weave-media-thumb${image?' has-source':''}" role="img" aria-label="${image?'Atlas film image':'No sourced image — title placeholder'}" title="${image?'Image recorded for this film':'No sourced image on the atlas yet'}">${image?`<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`:''}<span class="weave-media-placeholder" aria-hidden="true"><b>${esc(initials(x))}</b><small>${esc(kind)}</small></span></span>`;
 }
 // An unavailable external image falls back gracefully; it is never substituted
 // with a different film's artwork.
 document.addEventListener('load',e=>{if(e.target.matches?.('.globe-clean-art img')&&e.target.naturalWidth)e.target.closest('.globe-clean-art')?.classList.add('is-ready');},true);
 document.addEventListener('error',e=>{
  if(e.target.matches?.('.weave-media-thumb img'))e.target.closest('.weave-media-thumb')?.classList.add('is-broken');
   if(e.target.matches?.('image.weave-card-art'))e.target.style.display='none';
 },true);

 const terms=x=>[...new Set(tags(x).map(t=>t.term).filter(t=>FAM[t]))],yearNum=x=>{const n=parseInt(x?.year);return n>1800&&n<2100?n:null;},itemTitle=id=>S.current().items.find(x=>x.id===id)?.title||'';
 function famColor(x){const f=filmOf(x),p=f?.primaryTheme||(x?terms(x)[0]:null),fam=p&&FAM[p];return fam?FAMC[fam][document.documentElement.dataset.readingTheme==='night'?1:0]:null;}
 function summary(t){const xs=t.items.map(id=>S.current().items.find(x=>x.id===id)).filter(Boolean),count=new Map();for(const x of xs)for(const term of terms(x))count.set(term,(count.get(term)||0)+1);const top=[...count].sort((a,b)=>b[1]-a[1]).filter(([,n])=>n>1||xs.length<3).slice(0,2).map(([k])=>k),ys=xs.map(yearNum).filter(Boolean),lo=Math.min(...ys),hi=Math.max(...ys),span=ys.length?(lo===hi?String(lo):lo+'–'+hi):'';return [top.length?'Mostly '+top.join(' and '):'',span].filter(Boolean).join(' · ');}
 map.insertAdjacentHTML('beforeend',`<svg id="constellate-graph" hidden tabindex="0" role="group" aria-label="Threads, film cards and land references"></svg><div id="constellate-mode" hidden><a class="weave-skip-to-graph" href="#constellate-graph">Skip to the constellation</a><span></span><span id="weave-stepper" hidden><button id="weave-step-prev" aria-label="Previous card on this thread" title="Previous on thread ( [ )">‹</button><small id="weave-step-pos"></small><button id="weave-step-next" aria-label="Next card on this thread" title="Next on thread ( ] )">›</button></span><button id="constellate-edit" aria-pressed="true">Build</button><button id="weave-draw-thread" aria-pressed="false" title="Click two films and say why they connect">Link films</button><button id="weave-trace" aria-pressed="false" title="Draw a line across the map to gather the films of the lands it crosses">Draw</button><button id="weave-browse-films" title="Find films and add them to your thread">Find films</button><button id="constellate-read" aria-pressed="false">Read</button><button id="weave-play" aria-pressed="false" title="Play the films in this constellation in sequence">Play</button><button id="constellate-share">Share</button><button id="weave-unmap" aria-pressed="false" title="Disappear the cartography: lay the constellation out by relation instead of by map">Disappear map</button><span class="weave-tool-group"><button id="constellate-undo" class="weave-quick-history" aria-label="Undo" title="Undo" disabled>↶</button><button id="constellate-redo" class="weave-quick-history" aria-label="Redo" title="Redo" disabled>↷</button></span><button id="constellate-clear" title="Clear this constellation (confirmation required; Undo can restore it)">Clear</button><details class="weave-more"><summary aria-label="Options and layout" title="Options and layout"><span class="weave-options-label">Options</span><span class="weave-options-icon" aria-hidden="true">⋯</span></summary><div class="weave-more-menu"><small class="weave-menu-heading">Layout and display</small><button id="constellate-fit" title="Fit the map to the constellation">Fit map to threads</button><button id="weave-timeline-toggle" aria-pressed="false">Show timeline</button><button id="weave-atlas-toggle" aria-pressed="false">Show atlas markers</button><button id="weave-cards-toggle" aria-pressed="false">Show every card</button><small class="weave-menu-heading">Analysis</small><button id="weave-compare-open">Compare two threads</button></div></details><button id="constellate-exit">Exit</button></div><p id="weave-notice" aria-hidden="true" hidden></p><div id="weave-peek" hidden aria-hidden="true"></div><div id="weave-timeline" hidden aria-label="Timeline of the visible threads"></div><div id="weave-relbar" hidden><span>No map. Left to right:</span><button type="button" data-relx="order" aria-pressed="true">thread order</button><button type="button" data-relx="year" aria-pressed="false">year</button><button type="button" data-relx="circle" aria-pressed="false">a circle</button><small>Closeness follows shared themes. Each card keeps its people and land.</small></div><section id="weave-empty-hint" hidden aria-label="Get started with a constellation"><p class="weave-intro-kicker">CONSTELLATE · VISUAL RESEARCH</p><h2>How can films encounter each other?</h2><p class="weave-intro-lede">Follow a question across cinema, peoples and lands. Start with a sourced theme, or build your own relations.</p><div id="weave-intro-films" class="weave-intro-films" role="list" aria-label="Films in an example thread"></div><p id="weave-intro-label" class="weave-intro-label"></p><div class="weave-intro-actions"><button type="button" id="weave-example">Explore example constellation</button><button type="button" id="weave-intro-browse">Browse films</button></div><div class="weave-intro-themes"><span>Or begin with a theme</span><div id="weave-hint-themes"></div></div></section>`);
 main.insertAdjacentHTML('beforeend',`<aside id="constellate-popup" hidden aria-label="Constellation editor"><div class="constellate-heading"><h2 id="constellate-title">Constellate</h2><button type="button" id="weave-find-films" title="Find and add films (shortcut: /)">Find films</button><button id="constellate-close" aria-label="Close constellation editor">×</button></div><details id="constellate-how"><summary aria-label="How it works" title="How it works">Help</summary><ol><li><strong>Add</strong> brings films in: search, a theme, a line drawn across the map, or the theme web.</li><li><strong>The order is the path.</strong> Drag or use ↑ ↓ to reorder. Between two films, say why one follows the other.</li><li><strong>Read</strong> goes through it film by film; <strong>Play</strong> presents it full screen; <strong>Share</strong> gives a link, a citation and downloads.</li></ol></details><div class="constellate-collection"><label class="sr-only" for="constellate-collection">Constellation</label><select id="constellate-collection"></select><button id="constellate-new" title="Start a new constellation">+ New</button></div><form id="constellate-new-form" hidden><label for="constellate-name">Constellation name</label><input id="constellate-name" maxlength="120" required><label for="constellate-weeks">Weeks, for a course (optional)</label><input id="constellate-weeks" type="number" min="0" max="16" inputmode="numeric" placeholder="One thread per week"><button>Create constellation</button><button type="button" data-cancel-form>Cancel</button></form><details id="weave-settings"><summary>Details</summary><form id="weave-settings-form"><label for="weave-title">Title</label><input id="weave-title" maxlength="120" required><label for="weave-author">Author (optional)</label><input id="weave-author" maxlength="180" placeholder="Your name"><label for="weave-note">Introduction (optional)</label><textarea id="weave-note" rows="2" maxlength="10000" placeholder="Write your description here."></textarea><button>Save</button></form><label for="weave-import">Import a constellation (JSON)</label><input id="weave-import" type="file" accept="application/json,.json"><button type="button" id="weave-discard" class="weave-discard">Delete this constellation</button></details><div id="weave-editor"><div class="weave-thread-heading"><h3>Threads</h3><button id="weave-new-thread">+ Thread</button><button id="constellate-idea" title="Write a question or idea as a card">+ Idea</button></div><form id="weave-thread-form" hidden><label for="weave-thread-name">Thread name</label><input id="weave-thread-name" maxlength="100" required placeholder="Water defense"><fieldset class="weave-dyes"><legend>Star color</legend>${DYES.map(([k,n],i)=>`<label title="${n}"><input type="radio" name="weave-dye" value="${k}"${i===0?" checked":""}><i style="background:${palette[k][1]}"></i><span>${n}</span></label>`).join("")}</fieldset><label for="weave-thread-description">Description (optional)</label><textarea id="weave-thread-description" maxlength="1200" rows="2" placeholder="Write your description here."></textarea><button>Create thread</button><button type="button" data-cancel-thread>Cancel</button><div class="weave-theme-start"><label for="weave-theme-start">Or start from a theme</label><select id="weave-theme-start"></select></div></form><div id="weave-draw-help" role="status" hidden><span>Click two films, on the map or in the Order list below, or click a land to choose from its films. Then say why they connect.<b id="weave-draw-name" hidden></b></span><button type="button" id="weave-draw-done">Done linking</button></div><section id="weave-land" hidden aria-live="polite" aria-label="Films of the selected land"></section><div id="weave-legend" aria-label="Threads and visibility"></div><div class="constellate-actions"><button id="constellate-add-current" hidden>Add selected film</button><button id="constellate-connect" aria-pressed="false" hidden>Connect</button></div><div id="constellate-context" role="group" aria-label="Selected card" hidden></div><section id="constellate-inline" hidden aria-label="Connection note"></section><div id="constellate-detail"></div><section id="weave-order"><div class="weave-order-head"><h3 id="weave-order-title"></h3><span class="weave-order-tools"><button type="button" id="weave-read-start" title="Go through the constellation film by film">Read ▸</button><button type="button" id="weave-sort-year" title="Order this thread by year">By year</button><button type="button" id="weave-sort-place" title="Order this thread as a route between places">By place</button><button type="button" id="weave-thread-edit">Edit</button></span></div><p id="weave-order-summary"></p><form id="weave-thread-edit-form" hidden><label for="weave-edit-name">Thread name</label><input id="weave-edit-name" maxlength="100" required><fieldset class="weave-dyes"><legend>Star color</legend>${DYES.map(([k,n])=>`<label title="${n}"><input type="radio" name="weave-edit-dye" value="${k}"><i style="background:${palette[k][1]}"></i><span>${n}</span></label>`).join('')}</fieldset><label for="weave-edit-description">Description</label><textarea id="weave-edit-description" maxlength="1200" rows="3" placeholder="Write your description here."></textarea><div class="constellate-actions"><button>Save thread</button><button type="button" id="weave-edit-cancel">Cancel</button><button type="button" id="weave-thread-dup">Duplicate thread</button><button type="button" id="weave-edit-delete" class="weave-discard">Delete thread</button></div></form><ol id="weave-order-list" aria-label="Thread order"></ol></section><section id="weave-suggest" hidden aria-label="Suggested next films"></section><section id="weave-compare" hidden aria-label="Compare two threads"></section><div class="weave-browse"><div class="weave-browse-head"><button type="button" id="weave-browse-back">← Back to the list</button><span>Adding to <b id="weave-target-name"></b></span><select id="weave-target" hidden aria-hidden="true" tabindex="-1"></select></div><div class="weave-az-tabs"><button data-az-tab="film" aria-pressed="true">Films</button><button data-az-tab="maker" aria-pressed="false">Filmmakers</button><span id="weave-az-count"></span></div><label class="sr-only" for="constellate-search">Find films, filmmakers, nations or themes</label><input id="constellate-search" type="search" placeholder="Search titles, filmmakers, peoples or themes…" autocomplete="off" aria-keyshortcuts="/"><div id="constellate-results"></div></div></div><section id="weave-read-panel" hidden aria-label="Read this constellation"></section><section id="weave-share-panel" hidden><h3>Share this constellation</h3><label for="weave-share-mode">Open link in</label><select id="weave-share-mode"><option value="read">Read film by film</option><option value="play">Play this constellation</option></select><p>A share link contains a snapshot. Sharing does not save it to this browser.</p><div class="constellate-actions"><button type="button" id="weave-save-copy">Save constellation</button><small id="weave-save-state" role="status"></small></div><label class="sr-only" for="weave-url">Constellation URL</label><input id="weave-url" readonly><div class="constellate-actions"><button id="weave-copy-url">Copy link</button><button id="weave-copy-citation">Copy citation</button><button id="weave-export-json">JSON</button><button id="weave-export-csv">CSV</button></div><p id="weave-citation"></p></section><p id="constellate-status" role="status" aria-live="polite"></p></aside>`);
 map.insertAdjacentHTML('beforeend',`<section id="weave-player" aria-label="Play this constellation" hidden><div class="weave-player-controls"><button id="weave-play-prev" aria-label="Previous film">← Previous</button><button id="weave-play-pause">Play</button><span id="weave-play-progress" role="status" aria-live="polite"></span><label class="weave-play-speed" for="weave-play-speed">Pace <select id="weave-play-speed" aria-label="Time per film"><option value="4000">4s</option><option value="6000" selected>6s</option><option value="10000">10s</option></select></label><button id="weave-play-next" aria-label="Next film">Next →</button><button id="weave-play-close">Close ×</button></div><div class="weave-title-card"><span class="weave-play-art"><img id="weave-play-image" alt="" hidden><span id="weave-play-fallback" class="weave-play-fallback" role="img" aria-label="Title-based image placeholder">·</span></span><div><small id="weave-play-thread"></small><h2 id="weave-play-title"></h2><p id="weave-play-maker"></p><p id="weave-play-themes"></p><p id="weave-play-subtitle"></p></div></div></section>`);
 $('#constellate-graph').insertAdjacentHTML('afterend','<section id="weave-offmap-rail" hidden aria-label="Films awaiting a mapped land reference"><div class="weave-offmap-heading"><strong>Unplaced films</strong><small>Land link pending</small></div><div class="weave-offmap-items" role="list" aria-label="Off the map films in thread order"></div></section>');
 // Put the SVG after the toolbar in keyboard tab order; explicit z-index preserves map stacking.
 $('#constellate-mode').after($('#constellate-graph'));
 map.insertAdjacentHTML('beforeend','<div id="weave-theme-lens" hidden role="region" aria-label="Map themes"><div class="weave-map-theme-row"><label for="weave-map-theme">Theme</label><select id="weave-map-theme" aria-label="Filter map by theme"><option value="">All themes</option></select><button type="button" aria-label="Clear theme filter" title="Clear theme filter" hidden>×</button></div><select id="weave-map-theme-second" hidden aria-label="Intersect with a second theme"><option value="">Intersect with…</option></select><button class="weave-map-theme-results" type="button" hidden aria-live="polite"></button><p class="weave-map-key">Dots: lands with catalogued films. Rings: nearby lands grouped together. Draw or add films to make a constellation.</p></div>');
 $('#weave-theme-lens .weave-map-theme-row button').onclick=()=>clearThemeLens();
 $('#weave-theme-lens .weave-map-theme-results').onclick=()=>{if(!themeLens)return;closePreview();closeFilmPair();showLand('');context.hidden=inline.hidden=true;setTab('thread');renderLensResults();openDock();panel.scrollTop=0;};
 $('#weave-map-theme').onchange=e=>{const term=e.target.value;if(term)showThemeLens([term],{keepPreview:!!previewFilm});else clearThemeLens();};
 $('#weave-map-theme-second').onchange=e=>{const primary=$('#weave-map-theme').value;if(primary)showThemeLens([primary,e.target.value].filter(Boolean),{keepPreview:!!previewFilm});};
 $('#constellate-share').insertAdjacentHTML('beforebegin','<button type="button" id="constellate-save" aria-label="Save constellation" title="Save constellation"><svg class="cm-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5h8l2 2V13H3zM5 2.5v4h5v-4M5 13V9h6v4" fill="none" stroke="currentColor" stroke-linejoin="round"/></svg><span class="cm-label">Save</span></button>');
 const graph=$('#constellate-graph'),offMapRail=$('#weave-offmap-rail'),offMapItems=offMapRail.querySelector('.weave-offmap-items'),panel=$('#constellate-popup'),context=$('#constellate-context'),inline=$('#constellate-inline');
 $('#constellate-mode .weave-skip-to-graph').addEventListener('click',e=>{
  e.preventDefault();graph.focus({preventScroll:true});
 });
 $('#constellate-search').insertAdjacentHTML('afterend','<details id="weave-filters"><summary>Filters</summary><div id="weave-discovery-tools" class="weave-discovery-tools"><label>Order <select id="weave-discovery-order" aria-label="Sort discovered films"><option value="relevance">Relevance / A–Z</option><option value="title">Title A–Z</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label><label><input id="weave-discovery-unadded" type="checkbox"> Not on thread</label><label><input id="weave-discovery-art" type="checkbox"> With sourced image</label><label class="weave-discovery-facet">Country <select id="weave-discovery-country" aria-label="Filter by recorded country"><option value="">All countries</option></select></label><label class="weave-discovery-facet">Decade <select id="weave-discovery-decade" aria-label="Filter by decade"><option value="">All decades</option></select></label><label class="weave-discovery-facet">Form <select id="weave-discovery-form" aria-label="Filter by published film form"><option value="">All forms</option></select></label><label class="weave-discovery-facet">Length <select id="weave-discovery-length" aria-label="Filter by published film length"><option value="">All lengths</option></select></label><button type="button" id="weave-discovery-clear" aria-label="Clear film search and filters">Clear</button></div></details><p id="weave-discovery-count" role="status" aria-live="polite" class="weave-discovery-count"></p>');
 $('#weave-legend').insertAdjacentHTML('beforebegin','<div class="weave-focus-actions"><button id="weave-focus-thread" type="button" aria-pressed="false" title="Temporarily display only the selected thread; no saved content changes">Focus selected thread</button></div>');
  $('#weave-suggest').insertAdjacentHTML('beforebegin','<section id="weave-film-preview" hidden aria-label="Film preview"></section><section id="weave-lens-results" hidden aria-label="Matching films"></section><section id="weave-film-pair" hidden aria-label="Compare films"></section>');
 $('#weave-order').insertAdjacentHTML('beforeend','<section id="weave-theme-more" class="weave-theme-more" aria-label="Explore more films in this theme" hidden></section>');
 let enabled=false,reading=false,drawThread=false,drawLast=null,active=null,connecting=false,first=null,shiftFirst=null,pointer=null,drag=null,suppress=null,busy=false,entry=null,draft=null,draftKey=null,frame=0,cameraNeedsFull=false,readIndex=0,orderDrag=null,pendingPicker=null,size={width:900,height:650},positions=new Map(),anchors=new Map(),offMapIds=new Set(),offMapSignature='',offMapActive='',offMapScrollSignature='',cameraBasePositions=new Map(),cameraBaseAnchors=new Map();const histories=new Map(),known=new Map(S.state.collections.map(c=>[c.id,copy(c)]));
 const dimensions=()=>{const b=$('#atlas').getBoundingClientRect();size={width:b.width||900,height:b.height||650};$('#atlas').style.setProperty('--weave-map-height',size.height+'px');return size;},NW=()=>size.width<500?132:158,NH=42,top=()=>size.width<681?128:112;
 const snapshot=c=>{const x=copy(c);delete x.updatedAt;return x;};
 const clearNotice=()=>{clearTimeout(status.t);$('#weave-notice').hidden=true;$('#weave-notice').textContent='';};const status=message=>{$('#constellate-status').textContent=message;clearNotice();if(!/could not|cannot|can't|too large|use an https|add an https|do not confirm|failed|no film|no next/i.test(message||''))return;$('#weave-notice').textContent=message;$('#weave-notice').hidden=!message;if(message)status.t=setTimeout(clearNotice,4000);};
 function history(){if(!histories.has(S.current().id))histories.set(S.current().id,{undo:[],redo:[]});return histories.get(S.current().id);}
 function record(before,after,label){if(JSON.stringify(snapshot(before))===JSON.stringify(snapshot(after)))return;const h=history();h.undo.push({before,after,label});if(h.undo.length>40)h.undo.shift();h.redo=[];}
 function transaction(label,fn,redraw=true){const before=copy(S.current());busy=true;let result;try{result=fn();}finally{busy=false;}const after=copy(S.current());
 const changed=JSON.stringify(snapshot(before))!==JSON.stringify(snapshot(after));
 if(changed&&result!==false){
  S.current().editedAt=new Date().toISOString();after.editedAt=S.current().editedAt;
  {const cur=S.current();if(String(cur.shareFingerprint||'').indexOf('pub:')===0){cur.shareFingerprint='';if(!/\(my copy\)$/.test(cur.name))cur.name=(cur.name+' (my copy)').slice(0,120);after.name=cur.name;status('This is now your copy. The example stays as it was under Examples.');}}
  busy=true;try{S.save();}finally{busy=false;}
 }
 for(const t of after.threads)if(t.items.length>(before.threads.find(x=>x.id===t.id)?.items.length||0))drawStarts.set(t.id,Date.now());
 record(before,after,label);known.set(after.id,after);if(redraw)render();else updateHistory();if(result===false){status('Could not update this constellation.');return false;}return result===undefined?true:result;}
 function restoreSnapshot(value){busy=true;Object.assign(S.current(),copy(value));const ok=S.save();busy=false;known.set(S.current().id,copy(S.current()));if(!S.current().items.some(x=>x.id===active))active=null;cancelConnect();context.hidden=inline.hidden=true;render();if(!ok)status('Could not save. Export JSON before leaving.');}
 function undo(){const h=history(),x=h.undo.pop();if(x){h.redo.push(x);restoreSnapshot(x.before);status('Undid '+x.label.toLowerCase()+'.');}}
 function redo(){const h=history(),x=h.redo.pop();if(x){h.undo.push(x);restoreSnapshot(x.after);status('Redid '+x.label.toLowerCase()+'.');}}
 function updateHistory(){const h=history();$('#constellate-undo').disabled=!h.undo.length;$('#constellate-redo').disabled=!h.redo.length;$('#constellate-undo').title=h.undo.length?'Undo '+h.undo.at(-1).label.toLowerCase():'Nothing to undo';$('#constellate-redo').title=h.redo.length?'Redo '+h.redo.at(-1).label.toLowerCase():'Nothing to redo';}
 function restoreAtlas(value){if(!value)return;const go=()=>{A.restoreStop(copy(value));const{center,scale,zoom,...st}=copy(value);Object.assign(A.state,st);A.refresh();};if(A.holdMapMarkers)A.holdMapMarkers(go);else go();}
 function relayout(force=false){if(!enabled)return;if(document.documentElement.dataset.globeEntry){document.body.classList.remove('weave-dock-open');window.AtlasGlobe?.sync();return;}const dock=!panel.hidden||document.body.classList.contains('weave-browsing');document.body.classList.toggle('weave-dock-open',dock);if(A.resizeMap)A.resizeMap({refresh:force});else restoreAtlas(A.captureState());renderGraph();}
 let themeBefore=null;
 function open({dock=null}={}){if(globeEntry){panel.hidden=!dock;return;}const opening=!enabled;document.body.classList.remove('weave-browsing');if(!enabled){if(trace)stopTrace();/* 24 Nov 2026: Constellate turns the map into a night sky */try{const T=window.AtlasReadingTheme,now=document.documentElement.dataset.readingTheme;if(T&&now!=='night'){themeBefore=now||'paper';T.apply('night');}}catch{}entry={state:copy(A.captureState()),scroll:$('#index').scrollTop,url:location.href,x:window.scrollX||0,y:window.scrollY||0};enabled=true;syncStage();window.AtlasFitCap=8;document.body.classList.add('is-constellating','is-theme-weaving');graph.hidden=false;graph.removeAttribute('hidden');$('#constellate-mode').hidden=false;}
  syncThemeControl();panel.hidden=dock===null?(opening&&!S.current().items.length):!dock;trigger?.setAttribute('aria-expanded',String(!panel.hidden));A.closeWorkspacePanels();relayout(opening);render();updateAddress();if(opening&&!document.documentElement.dataset.globeEntry&&S.current().items.some(x=>x.type!=='concept'))requestAnimationFrame(()=>requestAnimationFrame(()=>{if(enabled&&!unmapped&&!player)fit('quiet');}));}
 function browse(){if(!enabled||document.body.classList.contains('weave-browsing'))return;panel.hidden=true;document.body.classList.add('weave-browsing');trigger?.setAttribute('aria-expanded','false');relayout();}
 function close(){closePreview();showLand('');closeFilmPair();document.body.classList.remove('weave-browsing');panel.hidden=true;trigger?.setAttribute('aria-expanded','false');document.body.classList.remove('weave-dock-open');relayout();}
 function exit({restore=true,fromHistory=false}={}){
  if(window.AtlasRoute?.globe&&document.documentElement.dataset.globeEntry){close();return;}
  if(!enabled){if(trace)stopTrace();return;}
  window.AtlasGlobe?.close();
  const prior=entry,browsing=document.body.classList.contains('weave-browsing'),browseState=browsing?copy(A.captureState()):null;
  // Turn off every transient interaction before handing the same map back.
  if(trace)stopTrace();
  window.AtlasThemeWeb?.close();
  if(player){pausePlay(true);player.hidden=true;player=null;playThread=null;playEntry=null;restorePlayToolbar();}
  if(frame){cancelAnimationFrame(frame);frame=0;}cameraNeedsFull=false;
  cancelConnect();enabled=false;window.AtlasFitCap=null;entry=null;
  drawThread=false;drawLast=null;focusThread=false;selPushed=false;skipPop=false;reading=false;active=null;drag=null;suppress=null;
  timelineOn=false;unmapped=false;relCache.key='';closePreview();clearThemeLens(false);closeFilmPair();previousLand=lastLand='';
  showLand('');context.hidden=inline.hidden=true;$('#weave-editor').hidden=false;$('#weave-read-panel').hidden=true;$('#weave-compare').hidden=true;$('#weave-thread-form').hidden=true;$('#constellate-new-form').hidden=true;$('#constellate-detail').replaceChildren();ghost(null);closeShare();
  $('#weave-relbar').hidden=true;$('#weave-unmap').setAttribute('aria-pressed','false');$('#weave-unmap').textContent='Disappear map';
  $('#weave-draw-thread').setAttribute('aria-pressed','false');$('#weave-draw-help').hidden=true;modeButtons('edit');setTab('thread');
  graph.hidden=true;graph.setAttribute('hidden','');offMapRail.hidden=true;panel.hidden=true;
  for(const id of ['constellate-mode','weave-notice','weave-timeline','weave-stepper','weave-peek'])$('#'+id).hidden=true;
  $$('#constellate-mode details[open]').forEach(d=>d.open=false);
  document.body.classList.remove('weave-empty','is-constellating','is-theme-weaving','weave-dock-open','weave-browsing','weave-playing','weave-unmapped','weave-tracing','trace-themed','is-theme-web-open','weave-show-atlas','weave-dropping');
  // Direct ?constellate=1 entry uses first-paint rules that otherwise hide the restored map.
  const root=document.documentElement;root.dataset.atlasEntry='map';root.dataset.mapReveal='done';delete root.dataset.weaveStage;delete root.dataset.weaveReveal;delete root.dataset.weaveWeb;
  try{if(themeBefore&&window.AtlasReadingTheme)window.AtlasReadingTheme.apply(themeBefore);}catch{}themeBefore=null;
  trigger?.setAttribute('aria-expanded','false');
  const u=new URL(fromHistory?location.href:prior?.url||location.href);['constellate','weave','read','play','trace','theme-web','c'].forEach(k=>u.searchParams.delete(k));if(u.hash.startsWith('#weave='))u.hash='';
  if(!fromHistory)try{const st={...(window.history.state||{})};delete st.weaveSelection;u.searchParams.set('globe','0');for(const k of ['at','pitch','territories','themes','period','lands','language','form','length','land','film','edges'])if(prior?.url&&new URL(prior.url).searchParams.get('globe')==='1')u.searchParams.delete(k);window.history.replaceState(st,'',u.href);}catch{}
  if(browsing&&browseState)restoreAtlas(browseState);else if(restore&&prior)restoreAtlas(prior.state);else A.refresh();A.resizeMap?.({refresh:true});
  if(!fromHistory)window.AtlasNavigation?.commit('replace');
  if(restore&&prior&&!browsing){$('#index').scrollTop=prior.scroll;requestAnimationFrame(()=>{if(enabled)return;$('#index').scrollTop=prior.scroll;window.scrollTo?.({left:prior.x,top:prior.y,behavior:'instant'});});}
  document.querySelector('header .map-link')?.focus({preventScroll:true});
 }
 function historyReplace(url){if(window.AtlasRoute?.globe)return;try{window.history.replaceState(window.history.state,'',url);}catch{}}
 function updateAddress(){if(!enabled||window.AtlasRoute?.globe)return;const u=new URL(location.href);u.searchParams.set('constellate','1');u.searchParams.set('weave',S.current().id);if(reading)u.searchParams.set('read','1');else u.searchParams.delete('read');if(u.hash.startsWith('#weave='))u.hash='';historyReplace(u.href);}
 function landCaption(x){if(!x)return '';if(x.type==='concept')return 'Star';const r=reference(x);if(r?.name)return r.name;const a=anchors.get(x.id)||anchor(x);return a?.name||'Land not indexed';}
 function memberships(id){return S.current().threads.filter(t=>t.items.includes(id));}
 function visibleItem(id){return memberships(id).some(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));}
 function references(x){return x.record?A.recordLandReferences(x.record).filter(r=>r.mapped):[];}
 function reference(x){const refs=references(x);return refs.find(r=>r.id===S.current().pins[x.id])||refs[0]||null;}
 // A country centre cannot stand in for a people's land. Unmapped films use
 // the separate Off the map rail; no country coordinate is ever a surrogate pin.
 function anchor(x){if(x.type==='concept')return null;const ref=reference(x);if(!ref)return null;const p=A.landMarkerReference(ref.id);return p?{...p,status:ref.status}:null;}
 function syncOffMapRail(){
  if(globeEntry){offMapRail.hidden=true;return;}
  const visible=S.current().threads.filter(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));
  const seen=new Set(),items=[];
  if(!unmapped)for(const t of visible)for(const id of t.items){
   if(seen.has(id))continue;const x=S.current().items.find(x=>x.id===id);
   if(x?.type!=='film'||anchor(x))continue;
   seen.add(id);items.push(x);
  }
  offMapIds=new Set(items.map(x=>x.id));
  // The globe owns its own complete reading and collection surface. The flat
  // workspace rail must not intercept pointer or keyboard events while it is active.
  offMapRail.hidden=globeMode()||unmapped||!items.length;
  const signature=items.map(x=>x.id).join('|');
  if(signature!==offMapSignature){
   offMapSignature=signature;
   offMapItems.innerHTML=items.map(x=>{
    const r=x.record&&A.recordById(x.record);
    // An affiliation already recorded for a director is not a mapped location.
    const people=String(r?.nation||'').split(';')[0].trim();
    const named=people&&!/unknown|not recorded|not verified|pending|requires corroboration|not established|uncertain|context/i.test(people)?people:'';
    const detail=named?named+' · '+(x.maker||'Film'):(x.maker||'Film')+' · Land link pending';
    return `<button type="button" role="listitem" data-offmap-item="${esc(x.id)}" title="${esc(x.title)} · ${esc(x.maker||'Film')} · Land link pending">${thumb(x)}<span class="weave-offmap-copy"><b>${esc(x.title)}</b><small>${esc(detail)}</small></span></button>`;
   }).join('');
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
 function compactSky(){return !player&&!cardsAll&&!unmapped;}
 function offsetFor(x,i){if(unmapped)return{dx:(i%2?1:-1)*84,dy:-36};const saved=S.current().offsets[x.id];if(saved)return saved;if(compactSky()){const angle=-Math.PI/3+i*2.399963;return{dx:24*Math.cos(angle),dy:24*Math.sin(angle)};}return{dx:90+(i%2)*30,dy:-60+(i%3)*88};}
 function point(x,i){if(x.type==='concept'){const p=drag?.id===x.id&&drag.moved?drag.point:S.current().positions[x.id]||{x:.42,y:.44};return{x:Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,p.x*size.width)),y:Math.max(top()+NH/2,Math.min(size.height-65-NH/2,p.y*size.height))};}
  if(!unmapped&&offMapIds.has(x.id))return offMapPoint(x.id);const a=anchors.get(x.id);if(!a)return{x:Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,NW()/2+24+(i%3)*(NW()+16))),y:size.height-65-NH/2,edge:true};const offscreen=a.x<0||a.x>size.width||a.y<65||a.y>size.height-50;const o=drag?.id===x.id&&drag.moved?drag.offset:offsetFor(x,i);return{x:Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,a.x+o.dx)),y:Math.max(top()+NH/2,Math.min(size.height-65-NH/2,a.y+o.dy)),edge:offscreen};}
 function selectedItem(){const r=A.recordById(A.state.record);return r?raw.find(x=>x.record===r.id&&x.type===(A.state.film?'film':'maker')&&(!A.state.film||x.film===A.state.film)):null;}
 function existingWork(x){return S.current().items.find(i=>i.id===x.id||(x.type==='film'&&i.type==='film'&&key(i)===key(x)));}
 function add(x,threadId=S.current().activeThread,{landId=null,keepView=false}={}){const existing=existingWork(x);let id=existing?.id;
  const ok=transaction(existing?'Add card to thread':x.type==='concept'?'Add idea':'Add film',()=>{const saved=existing?S.addToThread(existing.id,threadId):S.add(x,{threadId});if(!existing)id=S.current().selectedItem;if(saved&&x.type==='concept'&&!existing){const n=S.current().items.filter(v=>v.type==='concept').length-1;S.position(id,{x:.42+(n%3)*.11,y:.40+(Math.floor(n/3)%3)*.12});}if(saved&&landId&&!S.current().pins[id]){const item=S.current().items.find(v=>v.id===id);if(item&&references(item).some(r=>r.id===landId)){S.current().pins[id]=landId;S.save();}}return saved;});if(!ok)return false;active=id;if(drawThread&&threadId===S.current().activeThread)drawLast=id;const item=S.current().items.find(x=>x.id===id),ref=item&&reference(item);if(ref&&!keepView&&!unmapped){const a=anchor(item);if(a&&!anchorInView(a))fit('quiet');}render();status('Added to '+(S.current().threads.find(t=>t.id===threadId)?.name||'thread')+'.');return true;}
 function globeCollect(x,landId){
 if(!x||x.type!=='film'||!globeCredits.has(x.id)||!references(x).some(r=>r.id===landId))return false;
 const current=S.current(),thread=S.activeThread(),existing=current.items.find(i=>i.id===x.id);
 if(existing&&thread.items.includes(x.id))return true;
 if(!existing&&current.items.length>=1000)return false;
 return transaction('Collect film on globe',()=>{
  const ok=existing?S.addToThread(x.id,thread.id):S.add(x,{threadId:thread.id});
  if(ok&&!current.pins[x.id]){current.pins[x.id]=landId;S.save();}return ok;
 });
 }
 function globeConnect(source,target,label,note='',kind='interpretation'){
  label=String(label||'').trim();if(!label||source===target||!['interpretation','question'].includes(kind))return false;
  const cur=S.current();if(![source,target].every(id=>cur.items.some(x=>x.id===id&&x.type==='film')))return false;
  if(cur.links.some(l=>l.source===source&&l.target===target&&l.label===label&&l.kind===kind))return true;
  return transaction('Draw globe connection',()=>S.link({source,target,label,note,kind}));
 }
 function anchorInView(a){return !!a&&a.x>=18&&a.x<=size.width-18&&a.y>=top()+18&&a.y<=size.height-50;}
 function revealFilm(x){if(!x||unmapped)return;const ref=reference(x),a=anchor(x);if(ref&&!anchorInView(a))A.focusLandOnMap(ref.id);}
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
 function shade(hex,amt){const n=parseInt(String(hex).slice(1),16);if(isNaN(n))return hex;const f=c=>Math.round(amt>0?c+(255-c)*amt:c*(1+amt));return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(f).map(v=>v.toString(16).padStart(2,'0')).join('');}
 function threadKnots(t){const runs=threadPoints(t);if(!runs.length||!runs[0].length)return '';const night=document.documentElement.dataset.readingTheme==='night'||!!player,dye=palette[t.color]||palette.indigo,c=night?dye[1]:dye[0],dk=shade(c,night?-.45:-.4),lt=shade(c,night?.45:.5),r0=runs[0],rz=runs.at(-1),a=r0[0],a2=r0[Math.min(r0.length-1,4)],z=rz.at(-1),z2=rz[Math.max(0,rz.length-5)],ang=(p,q)=>(Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI).toFixed(1),f=v=>v.toFixed(1);
  const loop=`<g class="weave-cord-loop" transform="translate(${f(a.x)},${f(a.y)}) rotate(${ang(a2,a)})"><ellipse cx="13" rx="6" ry="3.8" stroke="${dk}"/><ellipse cx="13" rx="6" ry="3.8" stroke="${c}" class="ply"/></g>`;
  const tassel=rz.length>1?`<g class="weave-tassel" transform="translate(${f(z.x)},${f(z.y)}) rotate(${ang(z2,z)})">${[-24,-9,7,22].map((d,i)=>`<path d="M7,0 L${f(7+15*Math.cos(d*Math.PI/180))},${f(15*Math.sin(d*Math.PI/180))}" stroke="${i%2?lt:c}"/>`).join('')}</g>`:'';
  const groups=new Map();t.items.forEach((id,i)=>{const item=S.current().items.find(x=>x.id===id),p=item&&item.type!=='concept'?positions.get(id):null;if(!p)return;const k=Math.round(p.x)+','+Math.round(p.y);if(!groups.has(k))groups.set(k,{p,ids:[],nums:[],others:new Set()});const g=groups.get(k);g.ids.push(id);g.nums.push(i+1);S.current().threads.filter(o=>o.visible&&o.id!==t.id&&o.items.includes(id)).forEach(o=>g.others.add(o));});
  const label=n=>{if(n.length===1)return String(n[0]);const run=n.every((v,k)=>!k||v===n[k-1]+1);return run?n[0]+'–'+n.at(-1):n.length<=2?n.join('·'):n[0]+' +'+(n.length-1);};
  const stops=[...groups.values()].map(g=>{const txt=label(g.nums),feat=g.ids.some(x=>filmOf(S.current().items.find(y=>y.id===x))?.weaveLength==='F'),r=Math.max(8.5,4.5+txt.length*3.1)+(feat?2.2:0),fc=famColor(S.current().items.find(y=>y.id===g.ids[0])),others=[...g.others],id=g.ids[0],selected=t.id===S.activeThread().id&&g.ids.includes(active),cur=player&&selected;const titles=g.ids.map(x=>S.current().items.find(y=>y.id===x)?.title||'').join(', ');return `<g class="weave-stop${cur?' current':''}${!player&&selected?' selected':''}${others.length?' crossing':''}" data-weave-knot="${esc(id)}" role="button" tabindex="-1" aria-label="${esc(txt)}. ${esc(titles)}${others.length?' · crosses '+esc(others.map(o=>o.name).join(', ')):''}" transform="translate(${f(g.p.x)},${f(g.p.y)})"><circle r="${r.toFixed(1)}" fill="${dk}" stroke="${lt}"/><text y="3.4" text-anchor="middle">${txt}</text></g>`;}).join('');
  const marks=t.items.map((id,i)=>{if(!i||!t.notes[id])return '';const a=positions.get(t.items[i-1]),b=positions.get(id);if(!a||!b)return '';const seg=curve([{x:a.x,y:a.y},{x:b.x,y:b.y}]),m=seg[Math.floor(seg.length/2)];return `<g class="weave-note-mark" data-weave-knot="${esc(id)}" data-note="${esc(t.notes[id].slice(0,280))}" transform="translate(${f(m.x)},${f(m.y)})"><rect x="-5" y="-5" width="10" height="10" rx="1.5" transform="rotate(45)" fill="${lt}" stroke="${dk}"/></g>`;}).join('');
  return stops;}
 function threadMid(t){const run=threadPoints(t).slice().sort((a,b)=>b.length-a.length)[0];return run&&run.length?run[Math.floor(run.length/2)]:null;}
 function threadLabelPath(t){const run=threadPoints(t).slice().sort((a,b)=>b.length-a.length)[0];if(!run||run.length<24)return '';const pts=run[0].x>run.at(-1).x?run.slice().reverse():run;return 'M'+pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join('L');}
 function braided(thread,strand=0){return threadPoints(thread).map(points=>{let distance=0;return points.map((p,i)=>{const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;if(i)distance+=Math.hypot(p.x-prev.x,p.y-prev.y);const total=points.length-1||1,taper=Math.min(1,i/8,(total-i)/8),wave=strand<0?0:Math.sin(distance/22*Math.PI*2+strand*Math.PI*2/3)*2.6*Math.max(0,taper);return(i?'L':'M')+(p.x-dy/len*wave).toFixed(2)+','+(p.y+dx/len*wave).toFixed(2);}).join('');}).join('');}
 // Beta 86: cards that land on top of each other are eased apart on screen; saved positions are untouched.
 const chipText=(v,n)=>{v=String(v||'');return v.length>n?v.slice(0,n-1).trimEnd()+'…':v;};
 // Spatial buckets keep dense layouts bounded. Rebuild buckets each pass so a moved point
 // can encounter new neighbours on the next pass; preserve deterministic order and drag pins.
 function relax(shown){
  const ids=[...positions.keys()].filter(id=>(!shown||shown.has(id))&&!(drag?.id===id&&drag.moved)&&(unmapped||!offMapIds.has(id)));
  const w=compactSky()?44:NW()+10,h=compactSky()?40:NH+8,passes=ids.length>200?8:ids.length>80?20:60;
  for(let it=0;it<passes;it++){
   let moved=false;const cells=new Map(),coords=ids.map(id=>{const p=positions.get(id);return [Math.floor(p.x/w),Math.floor(p.y/h)];});
   coords.forEach(([x,y],i)=>{const k=x+','+y;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i);});
   for(let a=0;a<ids.length;a++){
    const [gx,gy]=coords[a],near=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const b of cells.get((gx+dx)+','+(gy+dy))||[])if(b>a)near.push(b);
    near.sort((a,b)=>a-b);
    for(const b of near){
     const p=positions.get(ids[a]),q=positions.get(ids[b]),dx=q.x-p.x,dy=q.y-p.y;
     if(Math.abs(dx)>=w||Math.abs(dy)>=h)continue;
     const oy=(h-Math.abs(dy))/2+.5,ox=(w-Math.abs(dx))/2+.5;
     if(oy<=ox){const d=dy>0||(dy===0&&a%2)?1:-1;p.y-=d*oy;q.y+=d*oy;}else{const d=dx>=0?1:-1;p.x-=d*ox;q.x+=d*ox;}moved=true;
    }
   }
   for(const id of ids){const p=positions.get(id);p.x=Math.max(NW()/2+10,Math.min(size.width-NW()/2-10,p.x));p.y=Math.max(top()+NH/2,Math.min(size.height-65-NH/2,p.y));}
   if(!moved)break;
  }
 }
 function renderGraph(){if(!enabled||document.documentElement.dataset.globeEntry)return;if(frame){cancelAnimationFrame(frame);frame=0;}cameraNeedsFull=false;graph.classList.toggle('weave-drawing-mode',drawThread);graph.classList.toggle('weave-play-focus',!!player);graph.classList.toggle('weave-star-build',compactSky());if(player)requestAnimationFrame(playLight);tpCache=new Map();applyNight();dimensions();syncOffMapRail();anchors=unmapped?relationLayout():new Map();if(!unmapped)for(const x of S.current().items){const p=anchor(x);if(p)anchors.set(x.id,p);}positions=new Map();const shown=cardSet();S.current().items.forEach((x,i)=>{if(visibleItem(x.id)){const p=point(x,i);if(p)positions.set(x.id,p);}});if(starMode&&shown)for(const [id,p] of positions){const a=anchors.get(id);if(a&&!shown.has(id)){p.x=Math.max(14,Math.min(size.width-14,a.x));p.y=Math.max(top()+10,Math.min(size.height-60,a.y));}}relax(shown);updatePreviewStars();graph.dataset.density=S.current().items.filter(x=>visibleItem(x.id)).length>12?'dense':'normal';graph.setAttribute('viewBox',`0 0 ${size.width} ${size.height}`);
  const visibleThreads=S.current().threads.filter(t=>t.visible&&(!focusThread||t.id===S.activeThread().id));
  const threads=visibleThreads.map((t,ti)=>{
   const elapsed=Date.now()-(drawStarts.get(t.id)||0),drawing=elapsed<1400&&!motion.matches;
   const anim=drawing?' weave-drawing':'',delay=`style="--draw-delay:-${elapsed}ms"`;
   const night=document.documentElement.dataset.readingTheme==='night'||!!player,dye=palette[t.color]||palette.indigo;
   const base=braided(t,-1),ink=dye[1]/* the light tone over a dark casing reads on both pale land and dark sea */,highlight=shade(ink,night?.35:.55),start=t.name?threadPoints(t)[0]?.[0]:null;
   const selected=S.activeThread().id===t.id;
   /* 24 Nov 2026: one line per thread, in its colour, over a thin halo that keeps it readable on any land colour. */return `<g class="weave-thread${selected?' is-active':''}${!selected&&visibleThreads.length>1?' is-quiet':''}${player&&playThread===t.id?' is-focus':''}" data-thread="${esc(t.id)}"><path class="weave-thread-halo" d="${base}"/><path class="weave-cord weave-strand${anim}" pathLength="1" ${delay} stroke="${ink}" d="${base}"/>${threadKnots(t)}${start?(m=>`<text class="weave-thread-name weave-thread-name-path" data-read-thread="${esc(t.id)}" role="button" tabindex="0" text-anchor="middle" x="${m.x.toFixed(1)}" y="${(m.y-11).toFixed(1)}" fill="${ink}">${esc(t.name.slice(0,40))}</text>`)(threadMid(t)||start):''}<title>${esc(t.name)}</title></g>`;
  }).join('');
  const adjacent=(l)=>visibleThreads.some(t=>{const i=t.items.indexOf(l.source),j=t.items.indexOf(l.target);return i>=0&&j>=0&&Math.abs(i-j)===1;});const edges=S.current().links.map(l=>{const a=positions.get(l.source),b=positions.get(l.target);if(!a||!b||adjacent(l))return '';return `<g data-constellate-edge="${esc(l.id)}" role="button" tabindex="0" aria-label="${(l.sourceURL||l.kind==='atlas-record')?'Source linked':'Interpretation'}: ${esc(l.label)}"><path class="constellate-edge-hit" d="M${a.x},${a.y}Q${(a.x+b.x)/2},${(a.y+b.y)/2-38} ${b.x},${b.y}"/><path class="constellate-edge ${(l.sourceURL||l.kind==='atlas-record')?'sourced-thread':'dream-thread'}" d="M${a.x},${a.y}Q${(a.x+b.x)/2},${(a.y+b.y)/2-38} ${b.x},${b.y}"/><title>${esc(l.label)}</title></g>`;}).join('');
  /* star names keep clear of thread names, and a film whose land is off-screen shows no name at the map edge (its thread still runs to the edge) */starBoxes=starMode?visibleThreads.map(t=>{const m=threadMid(t),w=Math.min(40,t.name.length)*7.4+10;return m?[m.x-w/2,m.y-26,m.x+w/2,m.y-4]:null;}).filter(Boolean):[];const onScreen=a=>a&&a.x>=0&&a.x<=size.width&&a.y>=top()&&a.y<=size.height;const nodes=S.current().items.map((x,i)=>{const p=positions.get(x.id),a=anchors.get(x.id);if(!p||(!unmapped&&offMapIds.has(x.id)))return '';if(x.type==='concept'){const t=stepInfo(x.id)?.t||S.activeThread(),cx=NW()/2,cy=NH/2,selected=active===x.id||first===x.id||shiftFirst===x.id;return `<g class="weave-item" data-weave-item="${esc(x.id)}"><g class="constellate-card concept${selected?' selected':''}" data-constellate-node="${esc(x.id)}" transform="translate(${p.x-cx},${p.y-cy})" style="--weave-focus-color:${color(t)}" tabindex="0" role="button" aria-label="${esc(x.title)} · Star"><rect class="weave-star-hit" x="${cx-18}" y="${cy-18}" width="36" height="36" rx="18"/><path class="weave-idea-star" d="M0 -6 L6 0 L0 6 L-6 0 Z" transform="translate(${cx},${cy})" fill="${color(t)}"/><text class="weave-star-title" text-anchor="middle" x="${cx}" y="${cy+24}">${esc(chipText(x.title,24))}</text><title>${esc(x.title)}</title></g></g>`;}if(compactSky()){
 const t=stepInfo(x.id)?.t||S.activeThread(),n=t.items.indexOf(x.id)+1,cx=NW()/2,cy=NH/2,selected=active===x.id||first===x.id||shiftFirst===x.id,fresh=selected&&Date.now()-(drawStarts.get(t.id)||0)<1200;
 return `<g class="weave-item" data-weave-item="${esc(x.id)}">${a?`<line class="weave-leader" x1="${a.x}" y1="${a.y}" x2="${p.x}" y2="${p.y}"/>`:''}<g class="constellate-card weave-film-node${selected?' selected':''}${fresh?' weave-just-added':''}" data-constellate-node="${esc(x.id)}" data-land="${esc(a?.id||'')}" transform="translate(${p.x-cx},${p.y-cy})" tabindex="0" role="button" aria-label="${esc(x.title)} · ${esc(landCaption(x))}"><rect class="weave-film-hit" x="${cx-17}" y="${cy-17}" width="34" height="34" rx="17"/><circle class="weave-film-ring" cx="${cx}" cy="${cy}" r="8"/><circle class="weave-film-light" cx="${cx}" cy="${cy}" r="4.5" fill="${color(t)}"/><text class="weave-film-number" x="${cx+13}" y="${cy+4}">${n||''}</text><text class="weave-film-title" text-anchor="middle" x="${cx}" y="${cy+27}">${esc(chipText(x.title,28))}</text><title>${esc(x.title)} · ${esc(landCaption(x))}</title></g></g>`;
 }if(shown&&!shown.has(x.id))return starMode&&x.type!=='concept'&&visibleItem(x.id)&&(unmapped||onScreen(a))?starLabel(x,p):'';const image=sourceImage(x),pict=x.type!=='concept',member=memberships(x.id),t=stepInfo(x.id)?.t,land=a?.name||'Idea';return `<g class="weave-item" data-weave-item="${esc(x.id)}">${p.edge?`<path class="weave-edge-arrow" d="M${p.x-6},${p.y-31} l6,-8 l6,8 z" fill="${color(t||S.activeThread())}" aria-hidden="true"><title>Thread continues beyond visible map</title></path>`:''}${a?`<line class="weave-leader" x1="${a.x}" y1="${a.y}" x2="${p.x}" y2="${p.y}"/>${t?'':`<circle class="weave-land-pin" cx="${a.x}" cy="${a.y}" r="5" fill="${color(t||S.activeThread())}" data-land-pin="${esc(a.id)}"><title>${esc(a.name)}</title></circle>`}`:''}<g class="constellate-card${x.type==='concept'?' concept':' pinned'}${active===x.id||first===x.id||shiftFirst===x.id?' selected':''}" data-constellate-node="${esc(x.id)}" data-land="${esc(a?.id||'')}" transform="translate(${p.x-NW()/2},${p.y-NH/2})" style="--weave-focus-color:${color(t||S.activeThread())}" tabindex="0" role="button" aria-label="${esc(x.title)}. ${esc(land)}. ${a?'Drag or use arrow keys to offset this label; its land pin stays fixed.':'Idea: drag freely.'}"><rect width="${NW()}" height="${NH}" rx="5"/>${pict?`<rect x="5" y="5" width="32" height="32" rx="5" style="fill:${color(t||S.activeThread())};fill-opacity:.19;stroke:none"/><text x="21" y="25" text-anchor="middle" font-size="11" font-weight="600" fill="var(--reading-ink)">${esc(initials(x).slice(0,2))}</text>${image?`<clipPath id="weave-chip-${i}"><rect x="5" y="5" width="32" height="32" rx="5"/></clipPath><image class="weave-card-art" href="${esc(image)}" onerror="this.style.display='none'" x="5" y="5" width="32" height="32" preserveAspectRatio="xMidYMid slice" clip-path="url(#weave-chip-${i})"/>`:''}<rect class="weave-chip-ring" x="5" y="5" width="32" height="32" rx="5" stroke="${color(t||S.activeThread())}"/>`:''}<text class="weave-chip-title" x="${pict?43:11}" y="19">${esc(chipText(x.title,pict?16:21))}</text><text class="weave-land-caption" x="${player?NW()/2+(lw=>Math.max(8+lw-p.x,Math.min(size.width-8-lw-p.x,0)))(Math.min(64,land.length)*(size.width<700?4:5.2)):pict?43:11}" y="${player?NH/2+37:32}">${esc(chipText(land,player?64:pict?20:25))}</text><title>${esc(x.title)} · ${esc(land)} · ${esc(member.map(t=>t.name).join(' / '))}</title></g></g>`;}).join('');
  $('#weave-empty-hint').hidden=!!S.current().items.length||!!player;panel.classList.toggle('cm-has-edges',!!edges);graph.innerHTML=`<g id="constellate-world">${unmapped?relAxis():''}${threads}${edges}<path id="constellate-preview" class="constellate-preview"/>${nodes}</g>`;syncKnotVisibility();if(drawThread){const lk=graph.querySelector('#constellate-world>g.weave-thread.is-active');if(lk){lk.classList.add('is-linking');lk.parentNode.appendChild(lk);}}cameraBasePositions=new Map([...positions].map(([id,p])=>[id,{...p}]));cameraBaseAnchors=new Map([...anchors].map(([id,p])=>[id,{...p}]));renderPreview();}
 function renderPreview(){
   const line=$('#constellate-preview'),source=(drawThread?drawLast:null)||first||shiftFirst,a=source&&positions.get(source);
   if(!line)return;
   if(!a||(!drawThread&&!connecting&&!shiftFirst)){line.setAttribute('d','');return;}
   const b=pointer||{x:a.x+45,y:a.y-25};
   line.setAttribute('d','M'+a.x+','+a.y+'Q'+((a.x+b.x)/2)+','+((a.y+b.y)/2-35)+' '+b.x+','+b.y);
  }
  function cancelConnect(){if(inline.querySelector('[data-cancel-pair]'))inline.hidden=true;connecting=false;first=shiftFirst=pointer=null;draftKey=null;draft=null;}
 function setDrawThread(on){
  if(!on&&!inline.hidden&&inline.querySelector('[data-cancel-pair],#constellate-link-form')&&!draft?.id)inline.hidden=true;
  drawThread=!!on;drawLast=null;
  pointer=null;cancelConnect();
  if(drawThread){open();setRead(false);setTab('thread');connecting=true;inline.hidden=context.hidden=true;}
  if(enabled)render();
  status(drawThread?(S.current().items.length<2?'Click a land on the map to choose a film.':'Click two films, or a land, then say why they connect.'):'Done linking.');showLand(landShown,true);
 }
 function drawStep(id){
  const x=S.current().items.find(v=>v.id===id);
  if(!x||x.type==='concept'){status('Link films through film or filmmaker cards.');return;}
  const t=S.activeThread(),already=t.items.includes(id);
  if(drawLast&&drawLast!==id){
   const order=t.items.filter(item=>item!==id);
   order.splice(order.indexOf(drawLast)+1,0,id);
   if(order.some((item,i)=>item!==t.items[i])){
    transaction('Link '+x.title,()=>{t.items=order;return S.save();});
   }
  }else if(!already&&!transaction('Link '+x.title,()=>S.addToThread(id,t.id)))return;
  active=id;drawLast=id;pointer=null;context.hidden=inline.hidden=true;
  render();status((already?'Selected ':'Connected to ')+x.title+' · '+S.activeThread().items.length+' cards on '+t.name+'. Select the next card.');
 }
 function pickConnectionTarget(id){
   const items=S.current().items,source=items.find(x=>x.id===id);
   if(!source)return;
   const thread=memberships(id).find(t=>t.id===S.activeThread().id)||S.activeThread();
   const others=items.filter(x=>x.id!==id);
   const here=others.filter(x=>thread.items.includes(x.id));
   const elsewhere=others.filter(x=>!thread.items.includes(x.id));
   const option=x=>'<option value="'+esc(x.id)+'">'+esc([x.title,x.maker].filter(Boolean).join(' · '))+'</option>';
   const groups=(here.length?'<optgroup label="On this thread · '+esc(thread.name)+'">'+here.map(option).join('')+'</optgroup>':'')+
    (elsewhere.length?'<optgroup label="Elsewhere in this constellation">'+elsewhere.map(option).join('')+'</optgroup>':'');
   panel.querySelector('.constellate-heading').after(inline);
   inline.hidden=false;
   inline.innerHTML='<h3>Now the second film</h3><div class="weave-pair-origin">'+thumb(source)+
    '<div class="weave-pair-origin-copy"><small>From · '+esc(thread.name)+'</small><strong>'+esc(source.title)+'</strong>'+
    '<span>'+esc([source.maker,source.year].filter(Boolean).join(' · '))+'</span></div></div>'+
    (others.length?'<label for="weave-connect-target">Connect to</label><select id="weave-connect-target"><option value="">Choose a different card…</option>'+groups+'</select>':
     '<p>Add another card to make a connection.</p>')+
    '<p class="weave-pair-hint">Or click the second film on the map.</p>'+
    '<button type="button" data-cancel-pair>Cancel</button>';
   const picker=inline.querySelector('select');
   if(picker)picker.onchange=()=>{if(picker.value)choose(picker.value);};
   const cancel=inline.querySelector('[data-cancel-pair]');
   cancel.onclick=()=>{cancelConnect();if(drawThread){inline.hidden=true;connecting=true;render();return;}choose(id);$('#constellate-start-link')?.focus();};
   (picker||cancel).focus();
  }
  function startLink(id=null){drawThread=false;drawLast=null;reading=false;connecting=true;first=id;shiftFirst=null;pointer=null;inline.hidden=context.hidden=true;open();setTab('thread');render();if(id)pickConnectionTarget(id);status(id?'Now click the second film.':'Click the first film.');}
 function choose(id,{shift=false,threadId}={}){const previousThread=S.activeThread().id;
  if(!shift&&!connecting){
   const t=memberships(id).find(t=>t.id===threadId)||stepInfo(id)?.t;
   if(reading||player){
    const at=readSteps().findIndex(s=>s.item.id===id&&s.thread.id===t?.id);
    if(at>=0){if(player)playStep(at);else readAt(at);}
    return;
   }
   activateThread(t?.id);
  }
  active=id;if(shift){if(!shiftFirst){shiftFirst=id;first=null;connecting=false;renderGraph();status('Shift-click another card.');return;}if(shiftFirst===id)return;const source=shiftFirst;shiftFirst=null;connectionForm({source,target:id,label:'',kind:'interpretation'});return;}
  if(connecting){if(!first){first=id;renderGraph();pickConnectionTarget(id);$('#constellate-mode span').textContent='Choose another card';status('Now click the second film.');return;}if(first===id){status('Choose a different card.');return;}const source=first;connecting=false;first=pointer=null;connectionForm({source,target:id,label:'',kind:'interpretation'});status('Pick a reason, or write your own.');return;}if(previousThread!==S.activeThread().id)render();else renderGraph();showContext();}
 function showContext(){closePreview();if(reading)setRead(false);showLand('');setTab('thread');const x=S.current().items.find(x=>x.id===active);if(!x)return;openDock();if(!selPushed&&enabled&&!window.AtlasRoute?.globe){try{window.history.pushState({...(window.history.state||{}),weaveSelection:true},'',location.href);selPushed=true;}catch{}}requestAnimationFrame(()=>context.hidden||context.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'}));inline.hidden=true;const member=memberships(x.id),noteThread=stepInfo(x.id)?.t||S.activeThread(),refs=references(x),r=reference(x),links=S.current().links.filter(l=>l.source===x.id||l.target===x.id);context.hidden=false;context.innerHTML=`${stepNav(x)}${crossings(x.id)}<div class="weave-context-preview">${thumb(x)}<h3>${esc(x.title)}</h3></div>${terms(x).length?`<p class="weave-context-themes">${themeButtons(x)}${filmOf(x)?.themeSource?` · <a href="${esc(filmOf(x).themeSource)}" target="_blank" rel="noopener noreferrer">synopsis ↗</a>`:''}</p>`:''}${x.maker?`<p>${esc(x.maker)}</p>`:''}${x.type==='concept'&&x.note?`<p class="weave-star-note">${esc(x.note)}</p>`:''}<p class="weave-placement">${x.type==='concept'?'Freely placed star':r?esc(r.name)+(r.status==='sourced'?'':' · catalog link'):'Land not indexed · kept off the map'}</p>${(()=>{const s=stepInfo(x.id);return s&&s.i>0&&whyHTML(s.t,s.i)?`<div class="weave-context-why"><small>After ${esc(chipText(itemTitle(s.t.items[s.i-1]),40))}</small>${whyHTML(s.t,s.i)}</div>`:'';})()}<div class="constellate-actions">${viewingLink(x)}${x.record?'<button id="constellate-view">View '+(x.film?'film':'filmmaker')+'</button>':''}${(()=>{const s=stepInfo(x.id);return s&&s.i>0&&!whyHTML(s.t,s.i)?`<button type="button" class="weave-why-add" data-why="${esc(x.id)}">Why here?</button>`:'';})()}</div><details class="weave-card-more"><summary>More</summary>${x.type==='concept'?'<button type="button" id="weave-edit-star">Edit star</button>':''}<button id="constellate-remove" type="button">Remove from the constellation</button>${S.current().threads.length>1?`<h4>${member.length>1?'On more than one thread':'Threads'}</h4><div class="weave-memberships">${S.current().threads.map(t=>`<label><input type="checkbox" data-member-thread="${esc(t.id)}" ${t.items.includes(x.id)?'checked':''}><i style="background:${color(t)}"></i>${esc(t.name)}</label>`).join('')}</div>`:''}${refs.length>1?`<label for="weave-pin-reference">Land marker</label><select id="weave-pin-reference">${refs.map(ref=>`<option value="${esc(ref.id)}"${ref.id===r?.id?' selected':''}>${esc(ref.name)}</option>`).join('')}</select>`:''}${noteThread.items.indexOf(x.id)===0?`<label for="weave-card-note">Opening note <small>shown before the first film</small></label><textarea id="weave-card-note" rows="3" maxlength="10000">${esc(noteThread.notes[x.id]||'')}</textarea>`:''}${links.length?'<h4>Connections</h4>'+links.map(l=>`<button class="weave-note-link" data-edit-connection="${esc(l.id)}">${esc(l.label)} → ${esc(itemTitle(l.source===x.id?l.target:l.source))}</button>${l.note?`<p>${esc(l.note)}</p>`:''}`).join(''):''}</details>`;context.querySelectorAll('[data-why]').forEach(b=>b.onclick=()=>{const s=stepInfo(x.id);if(s)openWhy(s.t,x.id);});
  context.querySelectorAll('[data-weave-step]').forEach(b=>b.onclick=()=>stepBy(+b.dataset.weaveStep));context.querySelector('[data-weave-back]').onclick=backToList;$('#weave-edit-star')?.addEventListener('click',()=>{context.innerHTML='<form id="weave-edit-star-form"><label for="weave-star-name">Star name</label><input id="weave-star-name" maxlength="300" required value="'+esc(x.title)+'"><label for="weave-star-note">Note (optional)</label><textarea id="weave-star-note" rows="3">'+esc(x.note||'')+'</textarea><div class="constellate-actions"><button>Save</button><button type="button" id="weave-edit-star-cancel">Cancel</button></div></form>';$('#weave-edit-star-cancel').onclick=showContext;$('#weave-edit-star-form').onsubmit=e=>{e.preventDefault();const title=$('#weave-star-name').value.trim(),note=$('#weave-star-note').value;if(title&&transaction('Edit star',()=>S.updateConcept(x.id,{title,note})))showContext();};$('#weave-star-name').focus({preventScroll:true});});updateStepper();renderOrder();$('#constellate-view')?.addEventListener('click',()=>{exit({restore:false});x.film?A.openProfileFilm(x.record,x.film):A.selectRecord(x.record);});$('#constellate-remove').onclick=()=>{transaction('Remove card',()=>S.remove(x.id));active=null;context.hidden=true;};context.querySelectorAll('[data-member-thread]').forEach(input=>input.onchange=()=>{transaction('Edit thread membership',()=>input.checked?S.addToThread(x.id,input.dataset.memberThread):S.removeFromThread(x.id,input.dataset.memberThread));showContext();});$('#weave-pin-reference')?.addEventListener('change',e=>{transaction('Choose land reference',()=>{S.current().pins[x.id]=e.target.value;return S.save();});A.focusLandOnMap(e.target.value);showContext();});$('#weave-card-note')?.addEventListener('change',e=>transaction('Edit thread note',()=>S.threadNote(noteThread.id,x.id,e.target.value)));context.querySelectorAll('[data-edit-connection]').forEach(b=>b.onclick=()=>connectionForm(S.current().links.find(l=>l.id===b.dataset.editConnection)));}
 function openDock(){document.body.classList.remove('weave-browsing');if(panel.hidden){panel.hidden=false;trigger?.setAttribute('aria-expanded','true');relayout();}}
 function connectionForm(link){openDock();setTab('thread');$('#constellate-mode span').textContent=link.id?'Edit connection':'Say why';reading=false;$('#weave-editor').hidden=false;$('#weave-read-panel').hidden=true;$('#weave-share-panel').hidden=true;context.hidden=true;connecting=false;first=shiftFirst=pointer=null;draft=copy(link);draftKey=link.id||link.source+'|'+link.target;inline.hidden=false;const title=id=>S.current().items.find(x=>x.id===id)?.title||'';inline.innerHTML=`<form id="constellate-link-form"><h3>Why does it follow?</h3><p>${esc(title(link.source))} → ${esc(title(link.target))}</p><div class="weave-quick-labels">${['answers','echoes','shares land','shares language','same collective','counterpoint'].map(label=>`<button type="button" data-quick-label="${label}">${label}</button>`).join('')}</div><label for="constellate-link-label">Or in your own words</label><input id="constellate-link-label" required maxlength="180" value="${esc(link.label||'')}" placeholder="A reason, in a few words"><details><summary>Note &amp; source</summary><label for="constellate-link-kind">Type</label><select id="constellate-link-kind"><option value="interpretation">Interpretation</option><option value="question">Question</option><option value="sourced-note">Sourced note</option><option value="atlas-record">Confirmed by atlas record</option></select><label for="constellate-link-note">Note (optional)</label><textarea id="constellate-link-note" rows="2">${esc(link.note||'')}</textarea><label for="constellate-link-source">https source (optional)</label><input id="constellate-link-source" type="url" value="${esc(link.sourceURL||'')}"></details><div class="constellate-actions"><button>Save</button>${link.id?'<button type="button" id="constellate-remove-link">Remove</button>':''}<button type="button" id="constellate-cancel-link">Cancel</button></div></form>`;$('#constellate-link-kind').value=link.kind||'interpretation';$('#constellate-link-form').onsubmit=e=>{e.preventDefault();const value={...link,label:$('#constellate-link-label').value.trim(),kind:$('#constellate-link-kind').value,note:$('#constellate-link-note').value,sourceURL:$('#constellate-link-source').value.trim()};if(!value.label)return;if(value.sourceURL&&!/^https:\/\//i.test(value.sourceURL)){status('Use an https source.');return;}if(value.kind==='sourced-note'&&!value.sourceURL){status('Add an https source for a sourced note.');return;}
 if(value.kind==='atlas-record'&&!atlasConfirms(value)){status('The published atlas records do not confirm this claim. Add a note or source as an interpretation.');return;}
 const carry=value.carryNote,fromList=value.fromList;delete value.carryNote;delete value.fromList;
 if(transaction(link.id?'Edit connection':'Add connection',()=>{
  const saved=S.link(value);if(saved&&carry)S.threadNote(carry,value.target,'');if(saved&&value.kind==='atlas-record'){
   const c=S.current(),l=link.id?c.links.find(l=>l.id===link.id):c.links.at(-1);
   if(l){l.kind='atlas-record';S.save();}
  }
  return saved;
 })){inline.hidden=true;draft=draftKey=null;if(drawThread){connecting=true;first=null;render();status('Saved. Click two more films, or Done linking.');}else if(fromList&&context.hidden){renderOrder();status('Saved.');}else{active=link.target;showContext();status('Saved.');}}};inline.querySelectorAll('[data-quick-label]').forEach(b=>b.onclick=()=>{
  const label=b.dataset.quickLabel;
  $('#constellate-link-label').value=label;
  const needsEvidence=['shares land','shares language','same collective'].includes(label);
  const confirmed=needsEvidence&&atlasConfirms({...link,label});
  $('#constellate-link-kind').value=confirmed?'atlas-record':'interpretation';
  if(needsEvidence&&!confirmed){inline.querySelector('details').open=true;$('#constellate-link-label').focus({preventScroll:true});return;}
  $('#constellate-link-form').requestSubmit();
 });$('#constellate-cancel-link').onclick=()=>{inline.hidden=true;draft=draftKey=null;if(drawThread){connecting=true;first=null;render();return;}if(!link.id&&!link.fromList&&context.hidden){choose(link.source);}renderGraph();};$('#constellate-remove-link')?.addEventListener('click',()=>{transaction('Remove connection',()=>S.removeLink(link.id));inline.hidden=true;draft=draftKey=null;});renderGraph();const head=$('#constellate-popup .constellate-heading');if(head&&head.nextElementSibling!==inline)head.after(inline);inline.scrollIntoView({block:'nearest'});$('#constellate-popup').scrollTop=0;$('#constellate-link-label').focus({preventScroll:true});}

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
 let facetCacheKey='';
 function renderResults({resetScroll=false}={}){
  const input=$('#constellate-search'),q=norm(input.value).trim(),order=$('#weave-discovery-order').value;
  const onlyNew=$('#weave-discovery-unadded').checked,withArt=$('#weave-discovery-art').checked;
  const box=$('#constellate-results'),thread=S.activeThread(),noun=azTab==='film'?'films':'filmmakers';
  const all=azAll(azTab),membership=onlyNew?thread.items.join('|'):'';
   const facetKey=JSON.stringify([azTab,q,onlyNew,withArt,membership,selectedFacets()]);if(facetKey!==facetCacheKey){refreshFacetOptions(all,q,onlyNew,withArt,thread);facetCacheKey=JSON.stringify([azTab,q,onlyNew,withArt,membership,selectedFacets()]);}const facets=selectedFacets();
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
    html+='<div class="constellate-result" draggable="true" data-drag-film="'+esc(x.id)+'">'+(x.type==='film'?'<button class="weave-search-art" type="button" data-preview-film="'+esc(x.id)+'" data-preview-from="search" aria-label="Explore '+esc(x.title)+'">'+thumb(x)+'</button>':thumb(x))+
      '<span><strong>'+(x.type==='film'?'<button class="weave-search-title" type="button" data-preview-film="'+esc(x.id)+'" data-preview-from="search">'+esc(x.title)+'</button>':esc(x.title))+'</strong>'+(sub?'<small>'+esc(sub)+'</small>':'')+
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

 function renderLegend(){const c=S.current();panel.classList.toggle('cm-one-thread',c.threads.length<2);const f=$('#weave-focus-thread');f.hidden=!focusThread&&c.threads.filter(t=>t.visible).length<2;f.setAttribute('aria-pressed',String(focusThread));f.textContent=focusThread?'Show all threads':'Focus selected thread';$('#weave-legend').innerHTML=c.threads.map((t,i)=>`<div class="weave-legend-row${t.id===c.activeThread?' active':''}"><label title="Show ${esc(t.name)}"><input type="checkbox" data-thread-visible="${esc(t.id)}"${t.visible?' checked':''}><span class="sr-only">Show thread</span></label><button data-thread-active="${esc(t.id)}" aria-pressed="${t.id===c.activeThread}"><i style="background:${color(t)}"></i><span>${i+1}. ${esc(t.name)}</span><small>${t.items.length}</small></button></div>`).join('');$('#weave-legend').querySelectorAll('[data-thread-visible]').forEach(el=>el.onchange=()=>transaction('Toggle thread',()=>{c.threads.find(t=>t.id===el.dataset.threadVisible).visible=el.checked;return S.save();}));$('#weave-legend').querySelectorAll('[data-thread-active]').forEach(b=>b.onclick=()=>{activateThread(b.dataset.threadActive);const t=S.activeThread();
   if(active&&!context.hidden&&!t.items.includes(active)){active=t.items[0]||null;context.hidden=!active;}
   render();if(active&&!context.hidden)showContext();});}
 /* 24 Nov 2026: the order of a thread is its links. Between two films, one line says why the second follows the first
    (a connection with its kind and source); there is no separate Link mode. An older thread note on that gap is shown
    until a reason is written, and is carried into the reason when it is. */
 function pairLink(a,b){return S.current().links.find(l=>(l.source===a&&l.target===b)||(l.source===b&&l.target===a))||null;}
 function whyHTML(t,i){const id=t.items[i];if(!i)return t.notes[id]?`<p class="weave-why weave-why-open">${esc(chipText(t.notes[id],140))}</p>`:'';const prev=t.items[i-1],l=pairLink(prev,id),note=t.notes[id];const title='Why here?';
  if(l)return `<button type="button" class="weave-why has-reason" data-why="${esc(id)}" title="${esc(title)}"><span><b>${esc(l.label)}</b>${l.note?' · '+esc(chipText(l.note,110)):''}</span><small>${esc(connectionKind(l))}</small></button>`;
  if(note)return `<button type="button" class="weave-why has-reason" data-why="${esc(id)}" title="${esc(title)}"><span>${esc(chipText(note,130))}</span></button>`;
  const a=S.current().items.find(x=>x.id===prev),b=S.current().items.find(x=>x.id===id),shared=a?.type==='film'&&b?.type==='film'?terms(a).filter(v=>terms(b).includes(v)):[];
  if(shared.length)return `<button type="button" class="weave-why weave-why-catalog" data-why="${esc(id)}" title="Add your interpretation"><span>Shared theme: ${esc(shared.join(' · '))}</span><small>Catalogued themes · add your interpretation</small></button>`;
  return '';}
 function openWhy(t,id){const i=t.items.indexOf(id);if(i<1)return;const prev=t.items[i-1],l=pairLink(prev,id);connectionForm(l?{...l,fromList:true}:{source:prev,target:id,label:'',kind:'interpretation',note:t.notes[id]||'',carryNote:t.notes[id]?t.id:'',fromList:true});}
 function renderOrder(){const t=S.activeThread();$('#weave-order-title').textContent=t.name;$('#weave-order-list').innerHTML=t.items.map((id,i)=>{const x=S.current().items.find(x=>x.id===id),a=x&&reference(x);return x?`<li draggable="true" data-thread-position="${i}"${id===active?' class="is-active" aria-current="true"':''}>${whyHTML(t,i)}<button data-order-select="${esc(id)}"><b>${i+1}</b>${thumb(x)}<span>${esc(x.title)}<small>${esc(landCaption(x))}</small></span></button><div class="weave-order-move">${i&&!whyHTML(t,i)?`<button type="button" class="weave-why-add" data-why="${esc(id)}" title="Why here?">Why here?</button>`:''}<button data-order-remove="${esc(id)}" aria-label="Remove ${esc(x.title)} from this thread" title="Remove from thread">×</button><button data-order-move="${i}" data-direction="-1" aria-label="Move ${esc(x.title)} earlier"${i===0?' disabled':''}>↑</button><button data-order-move="${i}" data-direction="1" aria-label="Move ${esc(x.title)} later"${i===t.items.length-1?' disabled':''}>↓</button></div></li>`:'';}).join('')||'<li class="weave-empty">No films yet. Click a land to see its films.</li>';$('#weave-order-list').querySelectorAll('[data-why]').forEach(b=>b.onclick=()=>openWhy(t,b.dataset.why));$('#weave-order-list').querySelectorAll('[data-order-select]').forEach(b=>b.onclick=()=>{const x=S.current().items.find(x=>x.id===b.dataset.orderSelect);if(x){revealFilm(x);choose(x.id);}});$('#weave-order-list').querySelectorAll('[data-order-remove]').forEach(b=>b.onclick=()=>{const id=b.dataset.orderRemove,other=S.current().threads.some(o=>o.id!==t.id&&o.items.includes(id));transaction('Remove from thread',()=>other?S.removeFromThread(id,t.id):S.remove(id));});$('#weave-order-list').querySelectorAll('[data-order-move]').forEach(b=>b.onclick=()=>transaction('Reorder thread',()=>S.reorderThread(t.id,+b.dataset.orderMove,+b.dataset.orderMove+Number(b.dataset.direction))));$('#weave-order-list').querySelectorAll('[data-note-edit]').forEach(b=>b.onclick=()=>{const id=b.dataset.noteEdit,row=b.closest('li'),i=t.items.indexOf(id);row.innerHTML=`<label class="sr-only" for="weave-seg-note">${i?'Why this follows':'Opening note'}</label><textarea id="weave-seg-note" rows="3" maxlength="10000" placeholder="${i?'Why does this film follow '+esc(itemTitle(t.items[i-1]))+'?':'How does this thread open?'}">${esc(t.notes[id]||'')}</textarea><div class="constellate-actions"><button type="button" data-note-save>Save note</button><button type="button" data-note-cancel>Cancel</button></div>`;const ta=row.querySelector('textarea');ta.focus({preventScroll:true});row.querySelector('[data-note-save]').onclick=()=>transaction('Edit thread note',()=>S.threadNote(t.id,id,ta.value));row.querySelector('[data-note-cancel]').onclick=()=>renderOrder();});{const d=t.description?`<span>${esc(t.description)}</span>`:`<button type="button" class="cm-desc-empty" onclick="document.getElementById('weave-thread-edit')?.click()">Write your description here.</button>`,m=summary(t);$('#weave-order-summary').innerHTML=d+(m?`<small>${esc(m)}</small>`:'');$('#weave-order-summary').hidden=!d&&!m;}renderSuggest();renderThemeMore();}
 function incomingReason(t,id){const i=t.items.indexOf(id);return i>0?pairLink(t.items[i-1],id):null;}
 function readingConnections(t,id){const i=t.items.indexOf(id),next=t.items[i+1];return S.current().links.filter(l=>(l.source===id||l.target===id)&&!(next&&(l.source===next||l.target===next)));}
 function readSteps(){return S.current().threads.filter(t=>t.visible).flatMap(t=>t.items.map(id=>({thread:t,item:S.current().items.find(x=>x.id===id)})).filter(x=>x.item));}
 let readCollectionId='';
 function crossings(id){
  return memberships(id).filter(t=>t.visible&&t.id!==S.activeThread().id).map(t=>
   `<button type="button" data-switch-thread="${esc(t.id)}">${esc(({es:"Cambiar a",fr:"Passer à",pt:"Mudar para"})[document.documentElement.lang]||"Switch to")} ${esc(t.name)}</button>`
  ).join('');
 }
 function readAt(at){
  const step=readSteps()[at];
  if(!step)return;
  activateThread(step.thread.id);
  readIndex=at;active=step.item.id;readCollectionId=S.current().id;
  const ref=reference(step.item);
  if(ref&&!unmapped)A.focusLandOnMap(ref.id);
  renderRead();renderGraph();panel.scrollTop=0;
 }
 function readThread(id){
  const t=S.current().threads.find(t=>t.id===id&&t.visible);
  if(!t||!t.items.length)return;
  const item=t.items.includes(active)?active:t.items[0];
  const at=readSteps().findIndex(s=>s.item.id===item&&s.thread.id===id);
  if(at<0)return;
  if(player){playStep(at);return;}
  if(!reading)setRead(true);
  readAt(at);
  $('#weave-read-panel .weave-read-focus')?.focus({preventScroll:true});
 }
 panel.addEventListener('click',e=>{
  const b=e.target.closest('[data-switch-thread]');
  if(!b)return;
  if(reading)readThread(b.dataset.switchThread);
  else choose(active,{threadId:b.dataset.switchThread});
 });
 function renderRead(){const c=S.current(),steps=readSteps(),trailWasOpen=!!$('#weave-read-panel .weave-read-trail')?.open;if(readCollectionId!==c.id){readIndex=0;readCollectionId=c.id;}readIndex=Math.max(0,Math.min(steps.length-1,readIndex));if(steps.length){active=steps[readIndex].item.id;activateThread(steps[readIndex].thread.id);}$('#weave-read-panel').innerHTML=`<button type="button" class="weave-read-back" id="weave-read-back">← Back to the list</button><nav class="weave-read-nav"><button id="weave-read-prev"${readIndex<=0?' disabled':''}>← Previous</button><span>${steps.length?readIndex+1:0} / ${steps.length}</span><button id="weave-read-next"${readIndex>=steps.length-1?' disabled':''}>Next →</button></nav>${c.threads.filter(t=>t.visible).map(t=>`<section class="weave-read-thread"><h4><i style="background:${color(t)}"></i>${esc(t.name)}<button type="button" class="weave-cite-thread" data-cite-thread="${esc(t.id)}">Cite</button></h4>${t.description?`<p class="weave-prose">${esc(t.description)}</p>`:''}${summary(t)?`<p class="weave-read-summary">${esc(summary(t))}</p>`:''}<ol>${t.items.map((id,i)=>{const x=c.items.find(x=>x.id===id);if(!x)return '';const at=steps.findIndex(s=>s.thread.id===t.id&&s.item.id===id),links=readingConnections(t,id);return `<li class="has-art"${at===readIndex?' aria-current="step"':''}>${thumb(x)}<button data-read-step="${at}">${esc(x.title)}</button>${x.maker?`<small>${esc(x.maker)}${x.year?' · '+esc(x.year):''}</small>`:''}<small class="weave-read-land">${esc(landCaption(x))}</small>${terms(x).length?`<small class="weave-read-themes">${esc(terms(x).join(' · '))}</small>`:''}${x.type==='concept'&&x.note?`<p class="weave-prose">${esc(x.note)}</p>`:''}${t.notes[id]?`<p class="weave-prose">${esc(t.notes[id])}</p>`:''}${links.map(l=>`<p class="weave-read-note">${connectionHTML(l,id)}</p>`).join('')}${x.href?`<a href="${esc(x.href)}" target="_blank" rel="noopener noreferrer">Open in the atlas ↗</a>`:''}</li>`;}).join('')}</ol></section>`).join('')||''}<div class="constellate-actions"><button id="weave-read-print">Print reading path</button><button id="weave-read-download">Download reading path</button></div>`;$('#weave-read-download').onclick=()=>download(readingHTML(),'text/html;charset=utf-8',(S.current().name||'constellation').replace(/[^\p{L}\p{N}]+/gu,'-').toLowerCase()+'-reading-path.html');$('#weave-read-panel').querySelectorAll('[data-cite-thread]').forEach(b=>b.onclick=()=>{
  const tid=b.dataset.citeThread;promptCitationAuthor();
  const t=S.current().threads.find(t=>t.id===tid);if(t)copyText(threadCitation(t));
 });const step=at=>{const stepsNow=readSteps();if(!Number.isInteger(at)||at<0||at>=stepsNow.length)return;const origin=document.activeElement?.id;readAt(at);if(origin==='weave-read-prev'||origin==='weave-read-next'){const next=$('#'+origin);if(next&&!next.disabled)next.focus({preventScroll:true});else $('#weave-read-panel .weave-read-focus')?.focus({preventScroll:true});}};$('#weave-read-back').onclick=()=>{setRead(false);setTab('thread');renderOrder();};$('#weave-read-prev').onclick=()=>step(readIndex-1);$('#weave-read-next').onclick=()=>step(readIndex+1);$('#weave-read-panel').querySelectorAll('[data-read-step]').forEach(b=>b.onclick=()=>step(+b.dataset.readStep));
  // Read presents one step at a time; the complete sourced path remains expandable.
  const readPanel=$('#weave-read-panel'),readNav=readPanel.querySelector('.weave-read-nav');
  if(readNav){
   readNav.setAttribute('aria-label','Read the constellation in order');
   const count=readNav.querySelector('span');
   const here=steps[readIndex];
   if(count)count.textContent=here?(here.thread.items.indexOf(here.item.id)+1)+' / '+here.thread.items.length+' · '+here.thread.name:'No films yet';
   if(here){
    for(const [delta,id] of [[-1,'prev'],[1,'next']]){
     const adjacent=steps[readIndex+delta];
     if(adjacent&&adjacent.thread.id!==here.thread.id)$('#weave-read-'+id).textContent=(delta<0?'← ':'')+adjacent.thread.name+(delta>0?' →':'');
    }
   }
  }
  if(readNav){const progress=document.createElement('progress');progress.className='weave-read-progress';progress.max=Math.max(1,steps.length);progress.value=steps.length?readIndex+1:0;progress.setAttribute('aria-label','Progress through the constellation');readNav.after(progress);}
  if(steps.length&&readNav){
   const currentStep=steps[readIndex],x=currentStep.item,t=currentStep.thread;
   const reason=incomingReason(t,x.id),connections=readingConnections(t,x.id).filter(l=>l!==reason);
   const art=document.createElement('article');art.className='weave-read-focus';
   art.setAttribute('aria-label','Current film in the constellation');art.setAttribute('tabindex','-1');
   art.innerHTML='<div class="weave-read-focus-eyebrow"><span class="weave-read-thread-mark" style="background:'+esc(color(t))+'"></span>'+esc(t.name)+'</div>'+
    (reason?'<p class="weave-read-note">'+connectionHTML(reason,x.id)+'</p>':'')+
    '<div class="weave-read-focus-main">'+thumb(x)+'<div class="weave-read-focus-copy"><h4>'+esc(x.title)+'</h4>'+
    (x.maker?'<p class="weave-read-maker">'+esc(x.maker)+'</p>':'')+
    '<p class="weave-read-meta">'+esc([x.year,landCaption(x)].filter(Boolean).join(' · '))+'</p></div></div>'+
    (terms(x).length?'<p class="weave-read-tags"><strong>Themes</strong> '+esc(terms(x).join(' · '))+'</p>':'')+
    (t.description&&t.items[0]===x.id?'<p class="weave-prose">'+esc(t.description)+'</p>':'')+
    (x.type==='concept'&&x.note?'<p class="weave-prose">'+esc(x.note)+'</p>':'')+
    (t.notes[x.id]?'<p class="weave-prose">'+esc(t.notes[x.id])+'</p>':'')+
    (connections.length?'<div class="weave-read-connections"><h5>Connections</h5>'+connections.map(l=>'<p>'+connectionHTML(l,x.id)+'</p>').join('')+'</div>':'')+
    (x.href?'<p><a href="'+esc(x.href)+'" target="_blank" rel="noopener noreferrer">View film in the atlas</a></p>':'');
   art.insertAdjacentHTML('beforeend',crossings(x.id));
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
 function readFromStart(){const first=readSteps()[0];if(first){active=first.item.id;activateThread(first.thread.id);}setRead(true);if(first)readAt(0);}
 function setRead(value,{dock=true}={}){if(value){closePreview();showLand('');closeFilmPair();}if(value&&document.body.classList.contains('is-theme-web-open')){$('#weave-theme-web-toggle')?.click();}if(value){drawThread=false;drawLast=null;pointer=null;$('#weave-draw-thread').setAttribute('aria-pressed','false');$('#weave-draw-help').hidden=true;}if(value&&!reading){
   const steps=readSteps(), tid=S.activeThread().id;
   const at=steps.findIndex(s=>s.thread.id===tid&&s.item.id===active);
   readIndex=at>=0?at:Math.max(0,steps.findIndex(s=>s.thread.id===tid));
   readCollectionId=S.current().id;
  }
  reading=value;$('#weave-editor').hidden=reading;$('#weave-read-panel').hidden=!reading;$('#weave-share-panel').hidden=true;modeButtons(reading?'read':'edit');if(reading||dock)openDock();if(reading){renderRead();relayout();}updateAddress();}
 function render(){if(!enabled)return;const c=S.current();updateSaveControl();document.body.classList.toggle('weave-empty',!c.items.length);if(drawThread&&drawLast&&!S.activeThread().items.includes(drawLast))drawLast=S.activeThread().items.at(-1)||null;const drawButton=$('#weave-draw-thread');drawButton.setAttribute('aria-pressed',String(drawThread));drawButton.setAttribute('aria-label',drawThread?'Done linking':'Link films');{const lab=drawButton.querySelector('.cm-label');if(lab)lab.innerHTML=drawThread?'<span class="cm-a">Done</span><span class="cm-b"> linking</span>':'<span class="cm-a">Link</span><span class="cm-b"> films</span>';else drawButton.textContent=drawThread?'Done linking':'Link films';}$('#weave-draw-help').hidden=!drawThread;$('#weave-draw-name').textContent=S.activeThread().name;const pubs=(window.AtlasPublished?.list||[]),pubCopy=slug=>S.state.collections.find(x=>String(x.shareFingerprint||'').indexOf('pub:'+slug+':')===0),isPub=x=>pubs.length&&String(x.shareFingerprint||'').indexOf('pub:')===0,options=S.state.collections.filter(x=>!isPub(x)).map(x=>`<option value="${esc(x.id)}"${x.id===c.id?' selected':''}>${esc(x.name)}${S.saved(x.id)?'':' · Draft'}</option>`).join('')+(pubs.length?'<optgroup label="Examples">'+pubs.map(x=>{const own=pubCopy(x.slug);return `<option value="${own?esc(own.id):'pub:'+esc(x.slug)}"${own&&own.id===c.id?' selected':''}>${esc(x.name)}</option>`;}).join('')+'</optgroup>':'');if($('#constellate-collection').innerHTML!==options)$('#constellate-collection').innerHTML=options;$('#constellate-mode span').textContent=connecting?(first?'Choose another card':'Choose first card'):shiftFirst?'Shift-click another card':c.name;$('#constellate-connect').setAttribute('aria-pressed',String(connecting));$('#constellate-fit').disabled=!c.items.length;const x=selectedItem();$('#constellate-add-current').hidden=!x;$('#constellate-add-current').textContent=x?.type==='maker'?'Add selected filmmaker':'Add selected film';if(document.activeElement!==$('#weave-title'))$('#weave-title').value=c.name;if(document.activeElement!==$('#weave-author'))$('#weave-author').value=c.author||'';if(document.activeElement!==$('#weave-note'))$('#weave-note').value=c.note||'';renderLegend();if($('#weave-editor').dataset.tab==='add')renderResults();renderOrder();renderGraph();updateHistory();updateStepper();renderCompare();renderTimeline();if(reading)renderRead();}
 function download(value,type,name){const url=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const jsonExport=()=>({format:'Indigenous Cinema Atlas weave',version:2,active:S.current().id,collections:[copy(S.current())]});
 function shareURL(mode=$('#weave-share-mode')?.value||'read'){const payload=btoa(unescape(encodeURIComponent(JSON.stringify({version:2,weave:copy(S.current())})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');if(payload.length>64000)return null;const u=new URL(mode==='globe'?'./':'flat.html',location.href);if(mode!=='globe'){u.searchParams.set('constellate','1');u.searchParams.set('weave',S.current().id);u.searchParams.set(mode==='play'?'play':'read','1');}u.hash='weave='+payload;return u.href;}
 async function packWeave(){const json=JSON.stringify({version:2,weave:copy(S.current())});if(!window.CompressionStream)return null;const buf=new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode(...buf.subarray(i,i+8192));return 'z'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 async function shareURLAsync(mode=$('#weave-share-mode')?.value||'read'){const packed=await packWeave().catch(()=>null),plain=shareURL(mode);if(!packed)return plain;const u=new URL(mode==='globe'?'./':'flat.html',location.href);if(mode!=='globe'){u.searchParams.set('constellate','1');u.searchParams.set('weave',S.current().id);}if(mode==='play')u.searchParams.set('play','1');else if(mode!=='globe')u.searchParams.set('read','1');u.hash='weave='+packed;return u.href;}
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
 function placeShare(){const sp=$('#weave-share-panel');if(!sp||sp.hidden)return;const btn=$('#constellate-share'),more=$('#constellate-mode .weave-more>summary');const a=(btn&&btn.offsetParent&&btn.closest('.cm-end'))?btn:more;
 if(innerWidth<700||!a){Object.assign(sp.style,{left:'8px',right:'8px',top:'auto',bottom:'8px'});return;}const r=a.getBoundingClientRect();Object.assign(sp.style,{left:'auto',bottom:'auto',top:Math.round(r.bottom+8)+'px',right:Math.max(8,Math.round(innerWidth-r.right))+'px'});}
function closeShare(){const sp=$('#weave-share-panel');if(!sp||sp.hidden)return;sp.hidden=true;$('#constellate-share')?.setAttribute('aria-pressed','false');}
addEventListener('resize',placeShare);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#weave-share-panel')?.hidden){e.preventDefault();closeShare();}});
document.addEventListener('pointerdown',e=>{const sp=$('#weave-share-panel');if(!sp||sp.hidden)return;if(sp.contains(e.target)||e.target.closest('#constellate-share'))return;closeShare();},true);
function updateSaveControl(){const c=S.current(),saved=S.saved(c.id),dirty=S.dirty(),btn=$('#constellate-save');btn.disabled=!c.items.length||!dirty;btn.dataset.saved=String(saved&&!dirty);btn.setAttribute('aria-label',saved&&!dirty?'Saved in this browser':'Save constellation');btn.title=saved&&!dirty?'Saved in this browser':'Save constellation';$('#weave-save-copy').disabled=btn.disabled;const state=$('#weave-save-state');state.textContent=saved&&!dirty?'Saved in this browser':'Not saved · temporary in this tab';}
 function persistConstellation(){const c=S.current();if(!c.items.length)return;if(S.persist()){updateSaveControl();status('Constellation saved in this browser.');}else{status('Could not save. Export JSON before leaving.');$('#weave-save-state').textContent='Could not save. Export JSON instead.';}}
 $('#constellate-save').onclick=persistConstellation;$('#weave-save-copy').onclick=persistConstellation;
 async function showShare(){const sp=$('#weave-share-panel');if(sp.classList.contains('cm-pop')&&!sp.hidden){closeShare();return;}if(drawThread)setDrawThread(false);
 sp.classList.add('cm-pop');if(!sp.querySelector('.cm-pop-close')){const x=document.createElement('button');x.type='button';x.className='cm-pop-close';x.setAttribute('aria-label','Close sharing');x.textContent='×';x.onclick=closeShare;sp.prepend(x);}
 sp.hidden=false;updateSaveControl();$('#constellate-share').setAttribute('aria-pressed','true');placeShare();const url=await shareURLAsync();$('#weave-url').value=url||'';$('#weave-copy-url').disabled=!url;$('#weave-citation').textContent=citation(url);if(!url)status('This constellation is too large for a reliable share URL. Export its JSON instead.');}
 function csvExport(){const c=S.current(),field=v=>{const x=String(v??'');return '"'+(/^[=+\-@\t\r]/.test(x)?"'"+x:x).replace(/"/g,'""')+'"';},rows=[['weave_id','weave','author','thread','order','type','title','filmmaker','year','land_reference','themes','note','connection_notes','sources']];for(const t of c.threads)for(const[id,i]of t.items.map((id,i)=>[id,i])){const x=c.items.find(x=>x.id===id);if(!x)continue;const links=c.links.filter(l=>l.source===id||l.target===id);rows.push([c.id,c.name,c.author,t.name,i+1,x.type,x.title,x.maker,x.year,reference(x)?.name||'',tags(x).map(t=>t.term).join('; '),t.notes[id]||'',links.map(l=>connectionText(l,id)+(l.note?': '+l.note:'')+(l.sourceURL?' '+l.sourceURL:'')).join('; '),links.map(l=>l.sourceURL).filter(Boolean).join('; ')]);}return '\uFEFF'+rows.map(r=>r.map(field).join(',')).join('\r\n');}
 function showPicker(x,button){$('.weave-add-menu')?.remove();const menu=document.createElement('div');menu.className='weave-add-menu';menu.setAttribute('role','group');menu.setAttribute('aria-label','Add to thread');const all=S.state.collections.flatMap(c=>c.threads.map(t=>({c,t})));menu.innerHTML=all.map(({c,t})=>`<button data-picker-weave="${esc(c.id)}" data-picker-thread="${esc(t.id)}">${esc(t.name)}<small>${esc(c.name)}</small></button>`).join('')+'<button data-picker-new>+ New thread</button>';button.after(menu);pendingPicker=x;menu.querySelectorAll('[data-picker-thread]').forEach(b=>b.onclick=()=>{const target=b.dataset.pickerWeave,threadId=b.dataset.pickerThread;if(S.current().id!==target){busy=true;S.activate(target);busy=false;}add(x,threadId);menu.remove();pendingPicker=null;status('Added to thread. Open Constellate to follow it.');});menu.querySelector('[data-picker-new]').onclick=()=>{open();reading=false;setRead(false);$('#weave-thread-form').hidden=false;$('#weave-thread-name').focus({preventScroll:true});menu.remove();};}
 document.querySelector('header .map-link')?.addEventListener('click',e=>{if(!enabled||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||document.documentElement.dataset.globeEntry)return;e.preventDefault();exit();});
 trigger?.setAttribute('aria-controls','constellate-popup');trigger?.setAttribute('aria-expanded','false');trigger?.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;if(document.documentElement.dataset.globeEntry){if(window.AtlasGlobe?.openMenu('collection'))e.preventDefault();return;}e.preventDefault();const has=!!S.current().items.length;if(reading)setRead(false,{dock:has});if(!has){closePreview();showLand('');closeFilmPair();}open({dock:has});});$('#constellate-edit').onclick=()=>{const fromRead=reading;open();setRead(false);setTab('thread');if(fromRead&&active)choose(active);};$('#constellate-close').onclick=close;$('#constellate-exit').onclick=()=>exit();$('#constellate-read').onclick=()=>{open();setRead(true);};$('#constellate-undo').onclick=undo;$('#constellate-redo').onclick=redo;$('#constellate-fit').onclick=fit;$('#constellate-share').onclick=showShare;
 $('#constellate-search').oninput=()=>{resetBrowsePage();renderResults({resetScroll:true});};
  for(const id of ['weave-discovery-order','weave-discovery-unadded','weave-discovery-art',...facetKinds.map(k=>'weave-discovery-'+k)])$('#'+id).addEventListener('change',()=>{resetBrowsePage();renderResults({resetScroll:true});});
  $('#weave-discovery-clear').onclick=()=>{$('#constellate-search').value='';$('#weave-discovery-order').value='relevance';$('#weave-discovery-unadded').checked=false;$('#weave-discovery-art').checked=false;facetKinds.forEach(k=>facetSelect(k).value='');resetBrowsePage();renderResults({resetScroll:true});$('#constellate-search').focus({preventScroll:true});};
  $('#weave-focus-thread').onclick=()=>{focusThread=!focusThread;renderLegend();renderGraph();status(focusThread?'Showing '+S.activeThread().name+' only. Show all threads restores the full constellation.':'Showing every visible thread again.');};
 $('#weave-browse-back').onclick=()=>{setTab('thread');renderOrder();};$('#weave-read-start').onclick=()=>{open();setRead(true);};$('#weave-find-films').onclick=()=>{open();setTab('add');$('#constellate-search').focus({preventScroll:true});};$('#weave-browse-films').onclick=()=>{if(enabled&&!reading&&$('#weave-editor').dataset.tab==='add'&&!document.querySelector('#constellate-popup').hidden){setTab('thread');return;}open();if(reading)setRead(false);setTab('add');const q=$('#constellate-search');q.focus({preventScroll:true});q.scrollIntoView({block:window.matchMedia('(max-width:700px)').matches?'center':'nearest',behavior:'smooth'});q.classList.remove('cm-flash');void q.offsetWidth;q.classList.add('cm-flash');};$('#weave-draw-thread').onclick=()=>setDrawThread(!drawThread);$('#weave-land').addEventListener('click',e=>{if(e.target.closest('[data-land-clear-theme]')){const id=landShown;clearThemeLens(false);showLand(id);return;}const l=e.target.closest('[data-wl-land]');if(l){openLand(l.dataset.wlLand);return;}const f=e.target.closest('[data-wl]');if(f){landPick(f.dataset.wl);return;}if(e.target.closest('.wl-more')){const firstNew=landLimit;landLimit+=12;showLand(landShown,true);const next=$$('#weave-land [data-wl]')[firstNew];next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'});return;}if(e.target.closest('.wl-all')){const id=landShown;showLand('');landThread(id);return;}if(e.target.closest('.wl-close')){if(globeMode()){close();window.AtlasGlobe?.returnFromPreview?.();}else showLand('');}});
 /* a film drawn as a full card sits on its own thread point: hide that point's number so it does not cover the title */
 function syncKnotVisibility(){const on=new Set([...graph.querySelectorAll('[data-constellate-node]')].map(n=>n.dataset.constellateNode));graph.querySelectorAll('[data-weave-knot]').forEach(k=>k.classList.toggle('under-card',on.has(k.dataset.weaveKnot)));}
 /* a land name, its poster or its shaded area, clicked while building: show that land's films */
 map.addEventListener('click',e=>{const t=e.target.closest?.('g.land-word,g.land-thumb,g.land-reference-bubble,.nation-wash');if(!t||!map.querySelector('#atlas')?.contains(t))return;const id=t.dataset.land||t.dataset.connection||t.dataset.landBubble||t.__data__?.id;if(openLand(id)){e.preventDefault();e.stopImmediatePropagation();}},true);$('#weave-draw-done').onclick=()=>setDrawThread(false);$('#weave-trace').onclick=()=>trace?stopTrace():startTrace();
 const peek=$('#weave-peek');function showPeek(id,e,note=''){const x=S.current().items.find(x=>x.id===id);if(!x||drag||player){peek.hidden=true;return;}const ts=memberships(id);peek.innerHTML=`<div><strong>${esc(x.title)}</strong>${x.type!=='concept'?`<small>${esc([x.maker,x.year].filter(Boolean).join(' · '))}</small>`:''}<small class="weave-peek-land">${esc(landCaption(x))}</small>${note?`<p class="weave-peek-note">${esc(note)}</p>`:''}${ts.length?`<span class="weave-peek-threads">${ts.map(t=>`<i style="background:${color(t)}"></i>${esc(t.name)}`).join('<b>·</b>')}</span>`:''}</div>`;peek.hidden=false;const m=map.getBoundingClientRect(),w=peek.offsetWidth,h=peek.offsetHeight;let lx=e.clientX-m.left+16,ly=e.clientY-m.top+16;if(lx+w>m.width-8)lx=e.clientX-m.left-w-16;if(ly+h>m.height-8)ly=e.clientY-m.top-h-16;peek.style.left=Math.max(8,lx)+'px';peek.style.top=Math.max(8,ly)+'px';}
 graph.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const t=e.target.closest('[data-weave-knot]');if(t)showPeek(t.dataset.weaveKnot,e,t.dataset.note||'');else peek.hidden=true;});graph.addEventListener('pointerleave',()=>{peek.hidden=true;});graph.addEventListener('pointerdown',()=>{peek.hidden=true;},true);
 $('#weave-legend').addEventListener('pointerover',e=>{const b=e.target.closest('[data-thread-active]');graph.classList.toggle('weave-focus',!!b);$$('#constellate-graph .weave-thread').forEach(g=>g.classList.toggle('is-focus',!!b&&g.dataset.thread===b?.dataset.threadActive));});$('#weave-legend').addEventListener('pointerleave',()=>{graph.classList.remove('weave-focus');});
 panel.addEventListener('dragstart',e=>{const r=e.target.closest('[data-drag-film]');if(!r)return;e.dataTransfer.setData('application/x-atlas-weave',r.dataset.dragFilm);e.dataTransfer.setData('text/plain',r.querySelector('strong')?.textContent||'');e.dataTransfer.effectAllowed='copy';document.body.classList.add('weave-dropping');});document.addEventListener('dragend',()=>document.body.classList.remove('weave-dropping'));
 map.addEventListener('dragover',e=>{if(enabled&&[...e.dataTransfer.types].includes('application/x-atlas-weave')){e.preventDefault();e.dataTransfer.dropEffect='copy';const at=insertIndex(local(e)),t=S.activeThread();map.dataset.dropLabel=at!=null?'Insert between '+chipText(itemTitle(t.items[at-1]),22)+' and '+chipText(itemTitle(t.items[at]),22):'Drop to add to '+chipText(t.name,30);map.classList.toggle('weave-drop-insert',at!=null);}});map.addEventListener('drop',e=>{const id=e.dataTransfer.getData('application/x-atlas-weave');if(!enabled||!id)return;e.preventDefault();document.body.classList.remove('weave-dropping');const x=catalogById.get(id);if(!x)return;const own=existingWork(x);if(own&&S.activeThread().items.includes(own.id)){status(x.title+' is already on '+S.activeThread().name+'.');return;}const at=insertIndex(local(e));map.classList.remove('weave-drop-insert');if(at!=null)insertAt(x,at);else add(x);});document.querySelectorAll('[data-az-tab]').forEach(b=>b.onclick=()=>{azTab=b.dataset.azTab;resetBrowsePage();renderResults({resetScroll:true});});$('#weave-target').onchange=e=>{const c=S.current();busy=true;c.activeThread=e.target.value;S.save();busy=false;known.set(c.id,copy(c));render();};document.querySelector('.weave-more').addEventListener('click',e=>{if(e.target.closest('.weave-more-menu button'))setTimeout(()=>{document.querySelector('.weave-more').open=false;},0);});document.addEventListener('pointerdown',e=>{const m=document.querySelector('.weave-more');if(m?.open&&!m.contains(e.target))m.open=false;});$('#weave-atlas-toggle').onclick=e=>{const on=document.body.classList.toggle('weave-show-atlas');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'Quiet atlas markers':'Show atlas markers';};$('#constellate-add-current').onclick=()=>{const x=selectedItem();if(x)add(x);};$('#constellate-connect').onclick=()=>connecting?(cancelConnect(),render()):startLink();$('#constellate-clear').onclick=()=>{const c=S.current();if(!c.items.length&&c.threads.length<=1){status('This constellation is already empty.');return;}if(reading)setRead(false);drawThread=false;drawLast=null;active=null;cancelConnect();context.hidden=inline.hidden=true;if(transaction('Clear constellation',()=>S.clear())){status('Cleared. Undo, beside Clear, restores it.');const u=$('#constellate-undo');if(u){u.classList.remove('cm-flash');void u.offsetWidth;u.classList.add('cm-flash');}}};$('#weave-discard').onclick=()=>{const c=S.current();if(!window.confirm('Delete “'+c.name+'”? This cannot be undone.'))return;busy=true;const removed=S.discard();busy=false;if(!removed){status('Could not delete the saved constellation.');return;}active=null;cancelConnect();context.hidden=inline.hidden=true;known.set(S.current().id,copy(S.current()));render();updateAddress();status('Constellation deleted.');};$('#constellate-new').onclick=()=>{closePreview();openDock();setTab('thread');$('#constellate-new-form').hidden=false;$('#constellate-name').focus({preventScroll:true});};$('#constellate-new-form').onsubmit=e=>{e.preventDefault();busy=true;S.create($('#constellate-name').value);{const wk=Math.max(0,Math.min(16,parseInt($('#constellate-weeks').value)||0)),c=S.current();if(wk>1){c.threads[0].name='Week 1';for(let i=2;i<=wk;i++)S.createThread('Week '+i,'',DYES[(i-1)%DYES.length][0]);c.activeThread=c.threads[0].id;S.save();}$('#constellate-weeks').value='';}busy=false;active=null;cancelConnect();$('#constellate-new-form').hidden=true;$('#constellate-name').value='';known.set(S.current().id,copy(S.current()));render();updateAddress();};$('#constellate-collection').onchange=e=>{if(e.target.value.startsWith('pub:')){const slug=e.target.value.slice(4);e.target.value=S.current().id;window.AtlasPublished?.open(slug,'read');return;}$('#weave-compare').hidden=true;focusThread=false;busy=true;S.activate(e.target.value);busy=false;active=null;cancelConnect();context.hidden=inline.hidden=true;known.set(S.current().id,copy(S.current()));render();updateAddress();};
 $('#weave-settings-form').onsubmit=e=>{e.preventDefault();transaction('Edit constellation',()=>{S.current().name=$('#weave-title').value.trim();S.current().author=$('#weave-author').value.trim();S.current().note=$('#weave-note').value;return S.save();});$('#weave-settings').open=false;};$('#weave-new-thread').onclick=()=>{showLand('');context.hidden=inline.hidden=true;$('#constellate-detail').replaceChildren();$('#weave-thread-form').hidden=false;$('#weave-thread-form').scrollIntoView({block:'nearest',behavior:'auto'});$('#weave-thread-name').focus({preventScroll:true});};$('#weave-thread-form').onsubmit=e=>{e.preventDefault();const id=transaction('Create thread',()=>S.createThread($('#weave-thread-name').value,$('#weave-thread-description').value,document.querySelector('input[name=weave-dye]:checked')?.value));if(!id)return;activateThread(id);active=null;$('#weave-thread-form').hidden=true;$('#weave-thread-name').value=$('#weave-thread-description').value='';if(pendingPicker){const x=pendingPicker;pendingPicker=null;add(x,id);}render();};
 $('#constellate-idea').onclick=()=>{closePreview();closeFilmPair();showLand('');context.hidden=inline.hidden=true;$('#weave-thread-form').hidden=true;$('#constellate-detail').innerHTML='<form id="constellate-idea-form"><label for="constellate-idea-title">Star name</label><input id="constellate-idea-title" maxlength="300" required><details><summary>Note (optional)</summary><label class="sr-only" for="constellate-idea-note">Note (optional)</label><textarea id="constellate-idea-note" rows="2"></textarea></details><div class="constellate-actions"><button>Create star</button><button type="button" id="constellate-idea-cancel">Cancel</button></div></form>';$('#constellate-idea-cancel').onclick=()=>$('#constellate-detail').replaceChildren();$('#constellate-idea-form').onsubmit=e=>{e.preventDefault();const x=S.item({type:'concept',title:$('#constellate-idea-title').value.trim(),note:$('#constellate-idea-note').value});if(x&&add(x)){ $('#constellate-detail').replaceChildren();setTab('thread');panel.scrollTop=0;}};$('#constellate-idea-form').scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'});$('#constellate-idea-title').focus({preventScroll:true});};
 panel.addEventListener('click',e=>{const pv=e.target.closest('[data-preview-film]');if(pv){const x=discoveryItem(pv.dataset.previewFilm);if(x){if(pv.dataset.previewFrom)showPreview(x,{from:pv.dataset.previewFrom});else showPreview(x,previewOrigin||{},{follow:!!previewFilm});}return;}if(e.target.closest('[data-preview-back]')){previewBack();return;}const addPreview=e.target.closest('[data-preview-add]');if(addPreview){const x=catalogById.get(addPreview.dataset.previewAdd),landId=previewOrigin?.land||null;if(x&&add(x,S.activeThread().id,{landId,keepView:true})){closePreview();render();}return;}const tc=e.target.closest('[data-explore-theme]');if(tc){const term=tc.dataset.exploreTheme,ts=themeLens?.terms||[],next=ts.includes(term)?ts.filter(t=>t!==term):ts.length>=2?[ts[1],term]:[...ts,term];if(next.length)showThemeLens(next,{keepPreview:!!previewFilm});else clearThemeLens();return;}if(e.target.closest('[data-clear-lens]')){clearThemeLens();return;}if(e.target.closest('[data-lens-more]')){lensLimit+=12;renderLensResults();return;}const pair=e.target.closest('[data-film-pair]');if(pair){const a=S.current().items.find(x=>x.id===pair.dataset.pairSeed)||discoveryItem(pair.dataset.pairSeed),b=discoveryItem(pair.dataset.filmPair);showFilmPair(a,b);return;}if(e.target.closest('[data-pair-close]')){closeFilmPair();return;}const follow=e.target.closest('[data-weave-follow]');if(follow){const target=catalogById.get(follow.dataset.weaveFollow);if(target){const own=existingWork(target),tid=S.activeThread().id;if(!own||!S.activeThread().items.includes(own.id)){if(!add(target,tid))return;}active=existingWork(target)?.id||null;showLand('');context.hidden=inline.hidden=true;setTab('thread');render();panel.scrollTop=0;}return;}if(e.target.closest('[data-add-matching]')){addMany(lastFound.slice(0,6).sort((a,b)=>(yearNum(a)||9999)-(yearNum(b)||9999)),'up to six matching films');return;}if(e.target.closest('[data-results-more]')){browsePageLimit+=48;azKey='';renderResults();return;}if(e.target.closest('[data-results-home]')){browsePageStart=0;browsePageLimit=48;azKey='';renderResults({resetScroll:true});return;}if(e.target.closest('[data-discovery-reset]')){$('#weave-discovery-clear').click();return;}const pick=e.target.closest('[data-compare-pick]');if(pick){const x=S.current().items.find(y=>y.id===pick.dataset.comparePick),ref=x&&reference(x);if(ref)A.focusLandOnMap(ref.id);if(x)choose(x.id);return;}if(e.target.closest('[data-compare-close]')){$('#weave-compare').hidden=true;return;}const af=e.target.closest('[data-add-films]');if(af){const r=A.recordById(af.dataset.addFilms);if(r){const works=r.films.map(f=>catalogById.get('film:'+r.id+':'+f.id)||catalog.find(x=>x.type==='film'&&x.credits?.some(c=>c.record===r.id&&c.film===f.id))).filter(Boolean),seen=new Set(),list=works.filter(x=>!seen.has(key(x))&&seen.add(key(x))).sort((a,b)=>(parseInt(a.year)||9999)-(parseInt(b.year)||9999));const fresh=list.filter(x=>{const own=existingWork(x);return !own||!S.activeThread().items.includes(own.id);});if(fresh.length)addMany(fresh.slice(0,6),'films by '+r.name);else status(r.name+' has no remaining films to add to this thread.');if(fresh.length>6)status('Added the first six films by '+r.name+'. Search this filmmaker again to add more.');}return;}const b=e.target.closest('[data-constellate-add]');if(b){const x=catalog.find(x=>x.id===b.dataset.constellateAdd);if(x){const own=existingWork(x);if(own&&S.activeThread().items.includes(own.id)){const r=reference(own);if(r)A.focusLandOnMap(r.id);choose(own.id);}else add(x);}}if(e.target.closest('[data-cancel-form]'))$('#constellate-new-form').hidden=true;if(e.target.closest('[data-cancel-thread]')){$('#weave-thread-form').hidden=true;pendingPicker=null;}});
 $('#weave-order-list').addEventListener('dragstart',e=>{const li=e.target.closest('[data-thread-position]');if(li){orderDrag=+li.dataset.threadPosition;e.dataTransfer?.setData('text/plain',String(orderDrag));}});$('#weave-order-list').addEventListener('dragover',e=>{if(e.target.closest('[data-thread-position]'))e.preventDefault();});$('#weave-order-list').addEventListener('drop',e=>{const li=e.target.closest('[data-thread-position]');if(li&&orderDrag!==null){e.preventDefault();transaction('Reorder thread',()=>S.reorderThread(S.current().activeThread,orderDrag,+li.dataset.threadPosition));orderDrag=null;}});
 function local(e){const b=$('#atlas').getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
 graph.addEventListener('pointerdown',e=>{const n=e.target.closest('[data-constellate-node]');if(e.button||!n)return;e.preventDefault();e.stopPropagation();const id=n.dataset.constellateNode,p=positions.get(id);if(drawThread){e.preventDefault();return;}else if(unmapped&&S.current().items.find(y=>y.id===id)?.type!=='concept'){suppress=null;}else{const x=S.current().items.find(x=>x.id===id),i=S.current().items.indexOf(x);drag={id,start:local(e),base:p,offset:{...offsetFor(x,i)},originalOffset:{...offsetFor(x,i)},point:{x:p.x/size.width,y:p.y/size.height},concept:x.type==='concept',moved:false,shift:e.shiftKey};}graph.setPointerCapture?.(e.pointerId);});
 graph.addEventListener('pointermove',e=>{const p=local(e);if(!drag)return;const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(Math.abs(dx)+Math.abs(dy)<=5&&!drag.moved)return;drag.moved=true;drag.offset={dx:drag.originalOffset.dx+dx,dy:drag.originalOffset.dy+dy};drag.point={x:(drag.base.x+dx)/size.width,y:(drag.base.y+dy)/size.height};renderGraph();});
 graph.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;suppress={id:d.id,until:Date.now()+400};if(d.moved){transaction(d.concept?'Move idea':'Move label',()=>d.concept?S.position(d.id,d.point):S.offset(d.id,d.offset));status('Placement saved.');}else choose(d.id,{shift:d.shift||e.shiftKey});});graph.addEventListener('pointercancel',()=>{drag=null;pointer=null;renderGraph();});
 graph.addEventListener('click',e=>{
  const name=e.target.closest('[data-read-thread]');
  if(name){readThread(name.dataset.readThread);return;}
  const node=e.target.closest('[data-constellate-node]'),knot=e.target.closest('[data-weave-knot]'),edge=e.target.closest('[data-constellate-edge]'),id=knot?.dataset.weaveKnot||node?.dataset.constellateNode;if(id&&suppress?.id===id&&Date.now()<suppress.until&&e.detail>0)return;if(id)choose(id,{shift:e.shiftKey,threadId:knot?.closest('[data-thread]')?.dataset.thread});if(edge){const l=S.current().links.find(l=>l.id===edge.dataset.constellateEdge);if(l)connectionForm(l);}});
 graph.addEventListener('keydown',e=>{
  const name=e.target.closest('[data-read-thread]');
  if(name&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();readThread(name.dataset.readThread);return;}
  const node=e.target.closest('[data-constellate-node]'),edge=e.target.closest('[data-constellate-edge]');if(['Enter',' '].includes(e.key)){if(node||edge){e.preventDefault();e.stopPropagation();if(node)choose(node.dataset.constellateNode,{shift:e.shiftKey});else connectionForm(S.current().links.find(l=>l.id===edge.dataset.constellateEdge));}}else if(node&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();const id=node.dataset.constellateNode,x=S.current().items.find(x=>x.id===id),p=positions.get(id),d=e.shiftKey?20:8,dx=e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0,dy=e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0,o=offsetFor(x,S.current().items.indexOf(x));transaction(x.type==='concept'?'Move idea':'Move label',()=>x.type==='concept'?S.position(id,{x:(p.x+dx)/size.width,y:(p.y+dy)/size.height}):S.offset(id,{dx:o.dx+dx,dy:o.dy+dy}));$$('[data-constellate-node]').find(n=>n.dataset.constellateNode===id)?.focus({preventScroll:true});}});
 map.addEventListener('pointermove',e=>{if(!enabled)return;if((connecting&&first)||shiftFirst||(drawThread&&drawLast)){pointer=local(e);renderPreview();}});
 document.addEventListener('keydown',e=>{if(!enabled)return;if(e.key==='Escape'&&e.target?.id==='constellate-search'){e.preventDefault();e.stopImmediatePropagation();if(e.target.value||$('#weave-discovery-unadded').checked||$('#weave-discovery-art').checked)$('#weave-discovery-clear').click();else e.target.blur();return;}if(e.key==='Escape'&&$('#constellate-how')?.open){e.preventDefault();e.stopImmediatePropagation();$('#constellate-how').open=false;$('#constellate-how>summary')?.focus({preventScroll:true});return;}if(player&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stopPlay();return;}if(player&&['ArrowLeft','ArrowRight'].includes(e.key)&&!e.target.closest?.('input,textarea')){e.preventDefault();playStep(playIndex+(e.key==='ArrowLeft'?-1:1));return;}if(reading&&!player&&['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.closest?.('#weave-read-panel')&&!e.target.closest?.('input,textarea,select')){const btn=$('#weave-read-'+(e.key==='ArrowLeft'?'prev':'next'));if(btn&&!btn.disabled){e.preventDefault();btn.click();}return;}const editing=e.target.closest?.('input,textarea,select,[contenteditable=true]');if(!editing&&!player&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.key==='['||e.key===']'){e.preventDefault();e.stopImmediatePropagation();stepBy(e.key===']'?1:-1);return;}if(e.key==='/'&&!panel.hidden){e.preventDefault();e.stopImmediatePropagation();setTab('add');$('#constellate-search').focus();return;}}if(!editing&&(e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();e.key.toLowerCase()==='y'||e.shiftKey?redo():undo();return;}if(e.key!=='Escape')return;if(globeMode()&&previewFilm&&previewOrigin?.from==='globe'){e.preventDefault();e.stopImmediatePropagation();previewBack();return;}if(trace){stopTrace();e.preventDefault();e.stopImmediatePropagation();return;}if(document.body.classList.contains('is-theme-web-open')){window.AtlasThemeWeb?.close();e.preventDefault();e.stopImmediatePropagation();return;}if(drawThread){setDrawThread(false);e.preventDefault();e.stopImmediatePropagation();return;}if(connecting||shiftFirst){cancelConnect();render();}else if(!inline.hidden){inline.hidden=true;draft=draftKey=null;}else if(!context.hidden){backToList();}else if(!panel.hidden)close();else exit();e.preventDefault();e.stopImmediatePropagation();},true);
 document.addEventListener('click',e=>{for(const d of $$('details[open]')){if(d.closest('#constellate-popup,#atlas-rotational-globe'))continue;const related=d.id==='index-tools'?$('#toggle-filters'):d.id==='exploration-trail'?e.target.closest('#toggle-recent,#toggle-saved'):null;if(!d.contains(e.target)&&!related?.contains(e.target))d.open=false;}const menu=$('.weave-add-menu');if(menu&&!menu.contains(e.target)&&!e.target.closest('[data-collect-current]')){menu.remove();pendingPicker=null;}},true);
 $('#reset-workspace')?.addEventListener('click',e=>{if(enabled){e.stopImmediatePropagation();exit({restore:false});A.resetWorkspace();}},true);
 // During an animated map zoom, keep the existing SVG nodes and their focus.
// Rebuilding the entire graph at every camera frame made the cords stutter and
// re-ran card collision layout dozens of times for one zoom-button press.
function updateCameraGraph(){
 if(!enabled||unmapped||!graph.querySelector('#constellate-world'))return;
 dimensions();
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
  g.querySelectorAll('.weave-thread-halo,.weave-cord').forEach(p=>p.setAttribute('d',path));
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
function queueGraph(full=false){if(!enabled)return;cameraNeedsFull=cameraNeedsFull||full;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const redraw=cameraNeedsFull;cameraNeedsFull=false;if(!enabled)return;if(redraw)renderGraph();else updateCameraGraph();});}
function scheduleGraph(){queueGraph(false);}
function finishCameraGraph(){queueGraph(true);}
window.addEventListener('atlas-camera-frame',scheduleGraph);
window.addEventListener('atlas-camera-change',finishCameraGraph);
window.addEventListener('resize',finishCameraGraph);new MutationObserver(()=>{if(enabled){renderLegend();renderGraph();}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-reading-theme']});
 function applyNight(){ $('#atlas .weave-night-veil')?.remove(); }
 let playInterval=6000,playToolbar=null,playToolbarPlaceholder=null;/* The toolbar stays in the document during Play (the atlas reads its checkboxes when the camera moves); it is only hidden. */function hidePlayToolbar(){if(playToolbar)return;playToolbar=[...document.querySelectorAll('.map-panel .map-toolbar,.map-panel .zoom')];for(const el of playToolbar){el.dataset.playDisplay=el.style.getPropertyValue('display');el.style.setProperty('display','none','important');}}function restorePlayToolbar(){for(const el of playToolbar||[]){if(el.dataset.playDisplay)el.style.setProperty('display',el.dataset.playDisplay);else el.style.removeProperty('display');delete el.dataset.playDisplay;}playToolbar=null;playToolbarPlaceholder=null;}
 function closePlayCard(){if(!player)return;playFinished=true;const c=S.current();fit('quiet');$('#weave-play-thread').textContent='CONSTELLATION COMPLETE';$('#weave-play-title').textContent=c.name;$('#weave-play-maker').textContent=c.author||'';$('#weave-play-themes').textContent='';$('#weave-play-subtitle').textContent=citation();$('#weave-play-progress').textContent='Constellation complete';$('#weave-play-image').hidden=true;$('#weave-play-fallback').hidden=true;$('#weave-play-pause').textContent='Replay';$('#weave-play-prev').disabled=false;$('#weave-play-next').disabled=true;}function pausePlay(value=true){playPaused=value;clearTimeout(playTimer);playTimer=null;const steps=readSteps();$('#weave-play-pause').textContent=playPaused?(playFinished?'Replay':'Play'):'Pause';$('#weave-play-pause').setAttribute('aria-pressed',String(!playPaused));if(player&&!playPaused&&steps.length){playTimer=setTimeout(()=>{playTimer=null;if(!player||playPaused)return;if(playIndex<readSteps().length-1)playStep(playIndex+1);else{pausePlay(true);closePlayCard();}},playInterval);}}
 function playStep(index){const steps=readSteps();if(index<0||index>=steps.length)return;const previous=playThread&&steps[playIndex]?.item,priorLand=previous&&reference(previous)?.id;playFinished=false;playIndex=index;const{thread,item}=steps[index];active=item.id;playThread=thread.id;activateThread(thread.id);$('#weave-play-themes').textContent=terms(item).join(' · ');const ref=reference(item);if(ref&&ref.id!==priorLand)A.focusLandOnMap(ref.id);const image=sourceImage(item),img=$('#weave-play-image'),tile=$('#weave-play-fallback');tile.textContent=item.type==='concept'?'✦':initials(item);tile.setAttribute('aria-label',item.type==='concept'?'Star':'No sourced image for '+item.title);tile.hidden=false;img.hidden=true;img.onload=()=>{img.hidden=false;tile.hidden=true;};img.onerror=()=>{img.hidden=true;tile.hidden=false;};if(image){img.alt='Film image for '+item.title;img.src=image;}else img.removeAttribute('src');$('#weave-play-thread').textContent=thread.name+(S.current().author?' · created by '+S.current().author:'');$('#weave-play-title').textContent=item.title;$('#weave-play-maker').textContent=[item.maker,item.year,landCaption(item)].filter(Boolean).join(' · ');const reason=incomingReason(thread,item.id);$('#weave-play-subtitle').textContent=[...new Set([reason?.label,reason?.note,thread.notes[item.id],item.note].filter(Boolean))].join(' · ');const within=thread.items.indexOf(item.id)+1;$('#weave-play-progress').textContent=thread.name+' · '+within+' of '+thread.items.length;$('#weave-play-thread').textContent=thread.name.toUpperCase()+' · '+within+' OF '+thread.items.length;$('#weave-play-prev').disabled=index===0;$('#weave-play-next').disabled=index===steps.length-1;renderGraph();pausePlay(playPaused);}
 function playWeave(startAt=0){if(!enabled)open();if(!readSteps().length){status('Add a card to a visible thread before playing.');return false;}if(!player){playEntry={state:copy(A.captureState()),dock:!panel.hidden,reading,browsing:document.body.classList.contains('weave-browsing')};player=$('#weave-player');document.body.classList.add('weave-playing');hidePlayToolbar();window.AtlasFitCap=6;panel.hidden=true;document.body.classList.remove('weave-dock-open');player.hidden=false;restoreAtlas(playEntry.state);}modeButtons('play');playPaused=motion.matches;playStep(Math.max(0,Math.min(readSteps().length-1,startAt)));$('#weave-play-pause').focus({preventScroll:true});return true;}
 /* Play at night: the map goes to dusk and a pool of light follows the film on screen, so its land keeps its colour. */
function playLight(){if(!player)return;const k=graph.querySelector('.weave-stop.current')||graph.querySelector('.constellate-card.concept.selected .weave-idea-star'),g=graph.getBoundingClientRect(),r=k&&k.getBoundingClientRect();graph.style.setProperty('--play-x',r?(r.left+r.width/2-g.left).toFixed(1)+'px':'-999px');graph.style.setProperty('--play-y',r?(r.top+r.height/2-g.top).toFixed(1)+'px':'-999px');}
function stopPlay(){if(!player)return;playThread=null;pausePlay(true);player.hidden=true;player=null;document.body.classList.remove('weave-playing');restorePlayToolbar();window.AtlasFitCap=8;const prior=playEntry;playEntry=null;panel.hidden=!prior?.dock;document.body.classList.toggle('weave-dock-open',!panel.hidden);if(prior)restoreAtlas(prior.state);if(prior?.reading)readIndex=playIndex;setRead(!!prior?.reading);if(prior?.browsing)browse();render();if(active&&!reading&&!context.hidden)showContext();$('#weave-play').focus({preventScroll:true});}
 $('#weave-play').onclick=()=>playWeave(Math.max(0,readSteps().findIndex(s=>s.thread.id===S.activeThread().id&&s.item.id===active)));$('#weave-play-close').onclick=stopPlay;$('#weave-play-pause').onclick=()=>{if(playPaused&&playFinished){playPaused=false;playStep(0);}else pausePlay(!playPaused);};$('#weave-play-prev').onclick=()=>playStep(playIndex-1);$('#weave-play-next').onclick=()=>playStep(playIndex+1);$('#weave-play-speed').onchange=e=>{const speed=Number(e.target.value);playInterval=[4000,6000,10000].includes(speed)?speed:6000;if(player&&!playPaused)pausePlay(false);};$('#weave-share-mode').onchange=showShare;motion.addEventListener?.('change',e=>{if(e.matches&&player)pausePlay(true);});
 $('#weave-copy-url').onclick=()=>{const url=$('#weave-url').value;if(url)copyText(url,$('#weave-url'));};$('#weave-copy-citation').onclick=()=>{promptCitationAuthor();copyText(citation(),$('#weave-url'));$('#weave-citation').textContent=citation();};$('#weave-export-json').onclick=()=>download(JSON.stringify(jsonExport(),null,2) ,'application/json',exportFilename('json'));$('#weave-export-csv').onclick=()=>download(csvExport() ,'text/csv;charset=utf-8',exportFilename('csv'));$('#weave-import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>5e6)throw Error('Choose a JSON file under 5 MB.');const raw=JSON.parse(await file.text());busy=true;if(raw.weave)S.importWeave(raw.weave);else S.importFile(raw);const orig=raw.weave||(raw.collections||[]).find(c=>c.id===raw.active)||(raw.collections||[])[0];if(orig){restorePersistedAnnotations({...orig,id:S.current().id});S.save();}busy=false;active=null;known.set(S.current().id,copy(S.current()));render();updateAddress();status('Imported as a constellation. Existing work is retained.');}catch(err){busy=false;status(err.message);}e.target.value='';};
 S.subscribe(()=>{if(busy)return;const c=S.current(),prior=known.get(c.id);if(prior)record(prior,copy(c),'Update constellation');known.set(c.id,copy(c));render();});
 // ---- Beta 1103: stepping, theme threads, suggestions, insert on the cord, timeline, compare, reading path ----
 function activateThread(id){
  const c=S.current();
  if(!id||c.activeThread===id)return;
  busy=true;
  try{c.activeThread=id;S.save();known.set(c.id,copy(c));}finally{busy=false;}
 }
 function stepInfo(id){const threads=memberships(id),t=threads.find(t=>t.id===S.activeThread().id)||threads.find(t=>t.visible)||threads[0];if(!t)return null;return{t,i:t.items.indexOf(id),n:t.items.length};}
 function stepNav(x){const s=stepInfo(x.id);return `<nav class="weave-step-nav" aria-label="Move along the thread"><button type="button" data-weave-back title="Back to the film list">← The list</button>${s?`<button type="button" data-weave-step="-1"${s.i<=0?' disabled':''} aria-label="Previous on ${esc(s.t.name)}" title="Previous ( [ )">‹</button><span><em><b>${s.i+1}</b> of ${s.n}</em><small>${esc(chipText(s.t.name,26))}</small></span><button type="button" data-weave-step="1"${s.i>=s.n-1?' disabled':''} aria-label="Next on ${esc(s.t.name)}" title="Next ( ] )">›</button>`:''}</nav>`;}
 function stepBy(d){if(!active)return;const s=stepInfo(active);if(!s)return;const id=s.t.items[s.i+d];if(!id)return;const x=S.current().items.find(y=>y.id===id),ref=x&&reference(x);if(ref)A.focusLandOnMap(ref.id);choose(id);}
 // Follow a sourced theme relation in one action: add to thread, move the map,
// and open the destination card. Previously Add left the reader at the old film.
 function followFilm(x){
  if(!x||x.type!=='film')return false;
  if(drawThread)setDrawThread(false);
  if(reading)setRead(false);
  // Following another film is navigation, not a pending connector action.
  connecting=false;first=shiftFirst=pointer=null;draft=draftKey=null;
  const old=existingWork(x);
  const membership=old&&S.current().threads.find(t=>t.items.includes(old.id));
  // A film already in any thread is a navigation target, not a duplicate addition.
  if(!membership){if(!add(x))return false;}
  const target=existingWork(x)||S.current().items.find(i=>i.id===x.id);
  if(!target)return false;
  revealFilm(target);
  choose(target.id);
  status('Following '+target.title+(terms(target).length?' · '+terms(target).join(' · '):'')+'.');
  return true;
 }
 function backToList(fromHistory=false){if(selPushed&&!fromHistory){selPushed=false;skipPop=true;window.history.back();}selPushed=false;setTab('thread');active=null;context.hidden=inline.hidden=true;renderGraph();renderOrder();updateStepper();status('');panel.scrollTop=0;}
 function updateStepper(){const s=enabled&&active&&!player&&!reading?stepInfo(active):null;$('#weave-stepper').hidden=!s;if(s){$('#weave-step-pos').textContent=(s.i+1)+' / '+s.n;$('#weave-step-prev').disabled=s.i<=0;$('#weave-step-next').disabled=s.i>=s.n-1;}renderTimeline();}
 $('#weave-step-prev').onclick=()=>stepBy(-1);$('#weave-step-next').onclick=()=>stepBy(1);
 $('#constellate-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const b=$('#constellate-results [data-preview-film]')||$('#constellate-results [data-constellate-add]');if(b)b.click();}});
 function addMany(list,label){const t=S.activeThread();let n=0;transaction('Add '+label,()=>{for(const x of list){const own=existingWork(x);if(own){if(!t.items.includes(own.id)&&S.addToThread(own.id,t.id))n++;}else if(S.add(x,{threadId:t.id}))n++;}return true;});if(n)fit();status(n?`Added ${n} film${n>1?'s':''} to ${t.name}.`:'Those films are already on this thread.');}
 // theme threads
 const DYE_FOR={'Land and Environment':'star-bluewhite','Sovereignty and Politics':'star-red','Knowledge and Continuity':'star-blue','Lives and Relations':'star-yellow','Expression and Representation':'star-orange'};
 function themeFilms(term){return (relationshipIndex().byTheme.get(term)||[]).slice().sort((a,b)=>(yearNum(a)||9999)-(yearNum(b)||9999)||azSort.compare(a.title,b.title));}

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
  setRead(false);showLand('');context.hidden=inline.hidden=true;
  const desc='Films tagged '+term+' from their published synopses.';
  const id=transaction('Start theme thread',()=>{
   const c=S.current(),blank=c.threads.length===1&&!c.threads[0].items.length;
   let tid;
   if(blank){const t0=c.threads[0];t0.name=term;t0.description=desc;t0.color=DYE_FOR[FAM[term]]||t0.color;tid=t0.id;}
   else {
    const preferred=DYE_FOR[FAM[term]];
    tid=S.createThread(term,desc,c.threads.some(t=>t.color===preferred)?undefined:preferred);
   }
   if(!tid)return false;
   for(const x of films){const own=existingWork(x);if(own)S.addToThread(own.id,tid);else S.add(x,{threadId:tid});}
   c.activeThread=tid;c.selectedItem=null;S.save();return tid;
  });
  if(!id){status('This constellation has the most threads it can hold.');return;}
  active=null;fit('quiet');render();
  status(all.length>films.length?'Opened '+films.length+' of '+all.length+' films in “'+term+'.” Use Unfold more to continue.':'Opened '+films.length+' films in “'+term+'.”');
 }

 /* ── Trace a line ──────────────────────────────────────────────────────────
    Drag a line across the map. Each land whose territory the line passes through (or whose
    marker it passes over), and that has films in the atlas, joins the line in the order it is
    crossed; the result can become a thread. Shapes are the atlas's own territory layer
    (.nation-wash); nothing is inferred beyond the land references already on each film. */
 let trace=null;
 const SVGNS='http://www.w3.org/2000/svg';
 function landFilms(){return discoveryIndex().byLand;}
 function traceUI(){let el=$('#weave-trace-layer');if(el)return el;el=document.createElement('div');el.id='weave-trace-layer';el.hidden=true;
  el.innerHTML='<svg aria-hidden="true"><path class="wt-casing"/><path class="wt-line"/><g class="wt-dots"></g></svg><p class="wt-hint" role="status"></p><div class="wt-mode" role="group" aria-label="Draw or move the map"><button type="button" data-wtm="draw" aria-pressed="true">Draw</button><button type="button" data-wtm="move" aria-pressed="false">Move</button><span class="wt-sep" aria-hidden="true"></span><label class="wt-switch"><input type="checkbox" class="wt-theme-on" role="switch"><span class="wt-knob" aria-hidden="true"></span>Theme</label><select class="wt-theme-pick" aria-label="Theme to gather" disabled></select></div><section class="wt-result" hidden aria-label="Lands crossed by your line"></section>';
  graph.parentElement.append(el);const svg=el.querySelector('svg');
  /* One finger (or the mouse) draws. A second finger turns the gesture into a map move/pinch: the stroke is dropped and
     the touches are handed to the map's own zoom as touch events. */
  const fingers=new Map();let pinch=false;const captured=new Set();
  el.resetGesture=()=>{if(pinch&&fingers.size)handOver('touchend',[...fingers.keys()]);fingers.clear();pinch=false;for(const id of captured){try{if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}catch{}}captured.clear();};
  const mapEl=()=>document.querySelector('#atlas');
  const touches=ids=>[...fingers.entries()].filter(([id])=>!ids||ids.includes(id)).map(([id,p])=>new Touch({identifier:id,target:mapEl(),clientX:p.x,clientY:p.y,pageX:p.x+scrollX,pageY:p.y+scrollY,screenX:p.x,screenY:p.y,radiusX:2,radiusY:2,force:.5}));
  const handOver=(type,changed)=>{try{const all=touches(),ch=touches(changed),rest=type==='touchend'?all.filter(t=>!changed.includes(t.identifier)):all;mapEl().dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:rest,targetTouches:rest,changedTouches:ch}));}catch(_){traceMoving(true);}};
  svg.addEventListener('pointerdown',e=>{if(e.button||!trace||el.classList.contains('has-result'))return;e.preventDefault();try{svg.setPointerCapture(e.pointerId);captured.add(e.pointerId);}catch(_){}
   if(e.pointerType==='touch'){fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(fingers.size>1){if(!pinch){pinch=true;if(trace.drawing){trace.drawing=false;traceReset();}handOver('touchstart',[...fingers.keys()]);}else handOver('touchstart',[e.pointerId]);return;}}
   traceBegin(e);});
  svg.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&fingers.has(e.pointerId)){fingers.get(e.pointerId).x=e.clientX;fingers.get(e.pointerId).y=e.clientY;if(pinch){handOver('touchmove',[e.pointerId]);return;}}if(trace?.drawing)traceMove(e);});
  const lift=e=>{if(e.pointerType==='touch'&&fingers.has(e.pointerId)){if(pinch){handOver('touchend',[e.pointerId]);fingers.delete(e.pointerId);if(!fingers.size){pinch=false;if(trace&&!el.classList.contains('has-result'))el.querySelector('.wt-hint').textContent='One finger draws · two move';}return true;}fingers.delete(e.pointerId);}return false;};
  /* the wheel (and trackpad pinch) still zooms the map underneath; a drawn line is cleared because it no longer matches the map */
  svg.addEventListener('wheel',e=>{if(!trace)return;e.preventDefault();traceUnline();el.style.pointerEvents='none';const under=document.elementFromPoint(e.clientX,e.clientY);el.style.pointerEvents='';if(under)under.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:e.clientX,clientY:e.clientY,screenX:e.screenX,screenY:e.screenY,deltaX:e.deltaX,deltaY:e.deltaY,deltaZ:e.deltaZ,deltaMode:e.deltaMode,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey}));},{passive:false});
  el.querySelector('.wt-theme-pick').addEventListener('change',()=>{if(trace)traceApplyTheme();});
  el.querySelector('.wt-theme-on').addEventListener('change',()=>{if(trace)traceApplyTheme();});
  el.querySelector('.wt-mode').addEventListener('click',e=>{const b=e.target.closest('[data-wtm]');if(b)traceMoving(b.dataset.wtm==='move');});
  const end=e=>{captured.delete(e.pointerId);if(lift(e))return;if(trace?.drawing){if(e.type==='pointercancel')traceReset();else traceEnd();}};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  el.querySelector('.wt-result').addEventListener('click',e=>{const o=e.target.closest('[data-wt-open]');if(o){e.preventDefault();const id=o.dataset.wtOpen;stopTrace();try{A.selectLand(id);}catch(_){}return;}const theme=e.target.closest('[data-wt-bridge]');if(theme&&trace){trace.routeTheme=trace.routeTheme===theme.dataset.wtBridge?'':theme.dataset.wtBridge;trace.routeChoices=new Map();traceCount();el.querySelector('[data-wt-bridge][aria-pressed="true"]')?.focus({preventScroll:true});return;}const b=e.target.closest('[data-wt]');if(!b)return;const k=b.dataset.wt;if(k==='one'||k==='all')lineThread(k==='all');else if(k==='again')traceReset();else stopTrace();});
  el.querySelector('.wt-result').addEventListener('change',e=>{if(e.target.classList.contains('wt-theme')&&trace){const v=e.target.value,sw=el.querySelector('.wt-theme-on'),pk=el.querySelector('.wt-theme-pick');sw.checked=!!v;if(v)pk.value=v;traceApplyTheme();return;}const choice=e.target.closest('[data-wt-choice]');if(choice&&trace){trace.routeChoices.set(choice.dataset.wtChoice,choice.value);traceCount();[...el.querySelectorAll('[data-wt-choice]')].find(v=>v.dataset.wtChoice===choice.dataset.wtChoice)?.focus({preventScroll:true});return;}const box=e.target.closest('[data-wt-land]');if(!box||!trace)return;const id=box.dataset.wtLand;if(box.checked)trace.skip.delete(id);else trace.skip.add(id);for(const c of trace.cand)if(c.land.id===id)c.path.classList.toggle('trace-lit',box.checked);traceCount();});
  return el;}
 function traceUnline(){const el=$('#weave-trace-layer');if(!el)return;el.querySelector('.wt-casing').setAttribute('d','');el.querySelector('.wt-line').setAttribute('d','');el.querySelector('.wt-dots').innerHTML='';}
 function traceMoving(on){const el=traceUI();if(on)traceUnline();el.classList.toggle('is-moving',!!on);el.querySelectorAll('[data-wtm]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.wtm==='move')===!!on)));if(!el.classList.contains('has-result'))el.querySelector('.wt-hint').textContent=on?'Drag to move · Draw when ready':'Draw across lands · scroll to zoom';}
 function traceClear(){document.querySelectorAll('#atlas .nation-wash.trace-lit').forEach(w=>w.classList.remove('trace-lit'));}
 function traceReset(){const el=traceUI();traceClear();trace={drawing:false,pts:[],lands:[],seen:new Set(),filmIds:new Set(),skip:new Set(),routeChoices:new Map(),routeTheme:'',browse:!!(trace&&trace.browse),theme:(trace&&trace.theme)||''};{const pk=el.querySelector('.wt-theme-pick'),sw=el.querySelector('.wt-theme-on');if(pk&&!pk.options.length)pk.innerHTML=themeOptions(catalog.filter(x=>x.type==='film'),'',true);if(trace.theme){pk.value=trace.theme;sw.checked=true;}else{sw.checked=false;pk.value='';}pk.disabled=!sw.checked;}el.querySelector('.wt-casing').setAttribute('d','');el.querySelector('.wt-line').setAttribute('d','');el.querySelector('.wt-dots').innerHTML='';el.querySelector('.wt-result').hidden=true;el.classList.remove('has-result');el.classList.remove('is-moving');el.querySelectorAll('[data-wtm]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wtm==='draw')));el.querySelector('.wt-hint').textContent=(matchMedia('(pointer:coarse)').matches?'One finger draws · two move':'Draw across lands · scroll to zoom');}
 function startTrace(opts){const browse=!!(opts&&opts.browse)&&!enabled;if(!browse){if(!enabled)open({dock:false});window.AtlasThemeWeb?.close();if(reading)setRead(false,{dock:false});if(drawThread)setDrawThread(false);closeShare();ghost(null);/* The dock stays in its current state beneath the drawing layer. */}if(browse&&innerWidth<700){scrollTo({top:0,behavior:'instant'});{const mp=document.querySelector('.map-panel');if(mp&&mp.getBoundingClientRect().top<0)mp.scrollIntoView({block:'start',behavior:'instant'});}if(browse&&document.documentElement.dataset.sheet&&document.documentElement.dataset.sheet!=='peek')document.documentElement.dataset.sheet='peek';}const el=traceUI();document.body.classList.add('weave-tracing');el.hidden=false;el.classList.toggle('is-browse',browse);{const tb=document.querySelector('.map-panel .map-toolbar');el.style.top=(browse?(tb&&tb.offsetParent?tb.offsetTop+tb.offsetHeight+6:0):($('#constellate-mode')?.offsetHeight||0))+'px';}{const ft=document.querySelector('.map-panel .map-footer');el.style.bottom=(ft&&ft.offsetParent?ft.offsetHeight:0)+'px';}$('#weave-trace')?.setAttribute('aria-pressed','true');$('#map-draw-line')?.setAttribute('aria-pressed','true');traceReset();trace.browse=browse;traceApplyTheme();if(!browse&&themeLens)el.querySelector('.wt-hint').textContent=themeLens.terms.join(' × ')+' · '+(matchMedia('(pointer:coarse)').matches?'One finger draws · two move':'Draw across lands · scroll to zoom');}
 function stopTrace(){if(!trace)return;const el=$('#weave-trace-layer');traceClear();trace=null;el?.resetGesture?.();traceThemeMap();if(el)el.hidden=true;document.body.classList.remove('weave-tracing');$('#weave-trace')?.setAttribute('aria-pressed','false');$('#map-draw-line')?.setAttribute('aria-pressed','false');}
 function traceBegin(e){traceReset();const el=traceUI(),box=el.getBoundingClientRect(),index=landFilms(),cand=[],marks=[];
  for(const w of document.querySelectorAll('#atlas .nation-wash[data-land]')){const land=index.get(w.dataset.land);if(land)cand.push({land,path:w});}
  const atlas=$('#atlas').getBoundingClientRect();for(const land of index.values()){const k=A.landMarkerReference(land.id);if(k&&Number.isFinite(k.x)&&Number.isFinite(k.y))marks.push({land,x:k.x+atlas.left,y:k.y+atlas.top});}
  const first=cand[0]?.path;let inv=null;try{inv=first?.getScreenCTM()?.inverse()||null;}catch(_){}
  Object.assign(trace,{drawing:true,box,cand,marks,inv,pt:first?first.ownerSVGElement.createSVGPoint():null,last:null});traceMove(e);}
 function traceHit(land,cx,cy){const t=trace;if(t.seen.has(land.id)||!lf(land).length)return;t.seen.add(land.id);t.lands.push(land);for(const f of land.films)t.filmIds.add(f.id);if(lf(land).length)for(const c of t.cand)if(c.land===land)c.path.classList.add('trace-lit');const dot=document.createElementNS(SVGNS,'circle');dot.setAttribute('cx',(cx-t.box.left).toFixed(1));dot.setAttribute('cy',(cy-t.box.top).toFixed(1));dot.setAttribute('r','3');traceUI().querySelector('.wt-dots').append(dot);}
 function traceSample(cx,cy){const t=trace;if(t.inv){t.pt.x=cx;t.pt.y=cy;const q=t.pt.matrixTransform(t.inv);for(const c of t.cand){if(t.seen.has(c.land.id))continue;let hit=false;try{hit=c.path.isPointInFill(q);}catch(_){}if(hit)traceHit(c.land,cx,cy);}}
  for(const m of t.marks)if(!t.seen.has(m.land.id)&&Math.hypot(m.x-cx,m.y-cy)<=14)traceHit(m.land,cx,cy);}
 function tracePath(p){if(!p.length)return '';let d='M'+p[0][0].toFixed(1)+','+p[0][1].toFixed(1);if(p.length<2)return d;for(let i=1;i<p.length-1;i++)d+='Q'+p[i][0].toFixed(1)+','+p[i][1].toFixed(1)+' '+((p[i][0]+p[i+1][0])/2).toFixed(1)+','+((p[i][1]+p[i+1][1])/2).toFixed(1);const z=p[p.length-1];return d+'L'+z[0].toFixed(1)+','+z[1].toFixed(1);}
 function traceMove(e){const t=trace,x=e.clientX,y=e.clientY,l=t.last;if(l){const d=Math.hypot(x-l[0],y-l[1]);if(d<3)return;const n=Math.ceil(d/6);for(let i=1;i<=n;i++)traceSample(l[0]+(x-l[0])*i/n,l[1]+(y-l[1])*i/n);}else traceSample(x,y);
  t.last=[x,y];t.pts.push([x-t.box.left,y-t.box.top]);const d=tracePath(t.pts),el=traceUI();el.querySelector('.wt-casing').setAttribute('d',d);el.querySelector('.wt-line').setAttribute('d',d);
  const kept=traceKept(),n=kept.length,ids=new Set();for(const l of kept)for(const x of lf(l))ids.add(x.id);const f=ids.size;const recent=kept.at(-1);el.querySelector('.wt-hint').textContent=n?(recent?recent.name+' · ':'')+n+(n===1?' land · ':' lands · ')+f+(f===1?' film':' films'):'Draw across a land with films';}
 /* A line can carry a theme: only films tagged with it count, and only lands that have them light up. */
 function lf(l){return l.films.filter(x=>(!themeLens||themeLens.ids.has(x.id))&&(!trace?.theme||terms(x).includes(trace.theme)));}
 function themeOptions(films,sel,noAll){const n=new Map();for(const x of films)for(const t of terms(x))n.set(t,(n.get(t)||0)+1);return (noAll?'':'<option value="">All themes</option>')+[...n].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([t,c])=>'<option value="'+esc(t)+'"'+(t===sel?' selected':'')+'>'+esc(t)+' ('+c+')</option>').join('');}
 function traceThemeMap(){const on=!!(trace&&trace.theme),keep=new Set();if(on)for(const l of landFilms().values())if(lf(l).length)keep.add(l.id);document.body.classList.toggle('trace-themed',on);
  document.querySelectorAll('#atlas .nation-wash[data-land]').forEach(w=>w.classList.toggle('trace-theme',on&&keep.has(w.dataset.land)));
  document.querySelectorAll('#atlas .land-word[data-connection]').forEach(w=>w.classList.toggle('trace-theme',on&&keep.has(w.dataset.connection)));}
 function traceApplyTheme(){const el=traceUI(),sw=el.querySelector('.wt-theme-on'),pk=el.querySelector('.wt-theme-pick');trace.theme=sw&&sw.checked?pk.value:'';if(pk)pk.disabled=!(sw&&sw.checked);el.querySelector('.wt-mode').classList.toggle('is-themed',!!trace.theme);
  const sel=el.querySelector('.wt-result .wt-theme');if(sel)sel.value=trace.theme;traceThemeMap();
  if(el.classList.contains('has-result'))traceCount();else{traceRelight();const n=traceKept().length;el.querySelector('.wt-hint').textContent=trace.lands.length?n+(n===1?' land':' lands'):(trace.theme?trace.theme+' · trace across its lands':(matchMedia('(pointer:coarse)').matches?'One finger draws · two move':'Draw across lands · scroll to zoom'));}}
 function traceRelight(){if(!trace)return;for(const c of trace.cand||[])c.path.classList.toggle('trace-lit',trace.seen.has(c.land.id)&&!trace.skip.has(c.land.id)&&lf(c.land).length>0);}
 function traceKept(){return trace.lands.filter(l=>!trace.skip.has(l.id)&&lf(l).length>0);}
 function traceCount(){const res=traceUI().querySelector('.wt-result'),lands=traceKept(),n=lands.length,ids=new Set();for(const l of lands)for(const x of lf(l))ids.add(x.id);const f=ids.size,one=res.querySelector('[data-wt=one]'),all=res.querySelector('[data-wt=all]');
  res.querySelector('h3').textContent=n+(n===1?' land · ':' lands · ')+f+(f===1?' film':' films');one.disabled=!n;one.textContent='Keep this thread';if(all){all.hidden=!(f>n&&f<=80);all.textContent='All '+f+' films';}
  res.querySelectorAll('li[data-wt-li]').forEach(li=>{const l=trace.lands.find(v=>v.id===li.dataset.wtLi),k=l?lf(l).length:0;li.classList.toggle('is-empty',!k);li.querySelector('small').textContent=k;});renderTracePreview(res);traceRelight();}
 function traceEnd(){const t=trace,el=traceUI(),res=el.querySelector('.wt-result'),hint=el.querySelector('.wt-hint');t.drawing=false;
  if(!traceKept().length){hint.textContent=t.theme?'No lands with '+t.theme+' films crossed. Draw again.':'No lands with films crossed. Draw again.';return;}
  const n=t.lands.length,f=t.filmIds.size;
  res.innerHTML='<h3></h3><p class="wt-route-intro">A route through cinema. Choose films and examine the connections before keeping your thread.</p><select class="wt-theme" aria-label="Theme">'+themeOptions([...new Map(t.lands.flatMap(l=>l.films).map(x=>[x.id,x])).values()],t.theme)+'</select><ol>'+t.lands.map(l=>'<li data-wt-li="'+esc(l.id)+'"><label><input type="checkbox" checked data-wt-land="'+esc(l.id)+'">'+(t.browse?'<button type="button" class="wt-open" data-wt-open="'+esc(l.id)+'" title="Open this land on the map">'+esc(l.name)+'</button>':'<span>'+esc(l.name)+'</span>')+'</label><small></small></li>').join('')+'</ol><div class="wt-film-preview" aria-label="Route film choices" hidden></div><div class="wt-actions"><button type="button" class="wt-primary" data-wt="one"></button><button type="button" data-wt="all"></button><button type="button" data-wt="again">Draw again</button><button type="button" data-wt="cancel">'+(t.browse?'Close':'Cancel')+'</button></div><p class="wt-credit">Territories: Native Land Digital</p>';
  traceCount();res.hidden=false;el.classList.add('has-result');hint.textContent='';res.querySelector('.wt-primary').focus({preventScroll:true});}
 // A drawn route is a draft comparative programme, not a recency-ranked list.
 // Work-level IDs are distinct; metadata connections are suggestions, never authored notes.
 function routeThemes(lands){
  const index=new Map();
  for(const l of lands)for(const x of lf(l))for(const term of terms(x)){
   if(!index.has(term))index.set(term,{term,lands:new Set(),films:new Set()});
   const v=index.get(term);v.lands.add(l.id);v.films.add(key(x));
  }
  return [...index.values()].filter(v=>v.lands.size>1&&v.films.size>1)
   .sort((a,b)=>b.lands.size-a.lands.size||a.films.size-b.films.size||azSort.compare(a.term,b.term));
 }
 function routeCandidates(l,used,prior,bridge,coverage,reserved){
  const prev=prior?new Set(terms(prior)):new Set();
  return lf(l).filter(x=>!used.has(key(x))&&!reserved.has(key(x))).map(x=>{
   const ts=terms(x),same=ts.filter(t=>prev.has(t)),cross=ts.reduce((n,t)=>n+Math.max(0,(coverage.get(t)||1)-1),0);
   const score=(bridge&&ts.includes(bridge)?1000:0)+same.length*12+cross*3+(prior&&prior.record!==x.record?2:0)+(x.year?1:0);
   return {x,score};
  }).sort((a,b)=>b.score-a.score||azSort.compare(a.x.title,b.x.title)).map(v=>v.x);
 }
 function routeDraft(){
  const lands=traceKept(),bridges=routeThemes(lands),bridge=bridges.some(v=>v.term===trace.routeTheme)?trace.routeTheme:'',coverage=new Map(bridges.map(v=>[v.term,v.lands.size])),used=new Set(),picks=[],stops=[];
  // Reserve explicit choices so an earlier automatic suggestion cannot consume them.
  const locked=new Map(),reserved=new Set();
  for(const l of lands){const id=trace.routeChoices.get(l.id),x=lf(l).find(x=>x.id===id);if(x&&!reserved.has(key(x))){locked.set(l.id,x);reserved.add(key(x));}}
  let prior=null;
  for(const l of lands){
   const lock=locked.get(l.id);if(lock)reserved.delete(key(lock));
   const options=routeCandidates(l,used,prior,bridge,coverage,reserved);
   const x=lock&&!used.has(key(lock))?lock:options[0];
   if(!x){stops.push({l,x:null,options:[]});continue;}
   const shared=prior?terms(x).filter(t=>terms(prior).includes(t)):[];
   stops.push({l,x,options,prior,shared});picks.push([x,l]);used.add(key(x));prior=x;
  }
  return {bridges,bridge,picks,stops};
 }
 function linePicks(all=false){
  if(!all)return routeDraft().picks;
  const used=new Set(),picks=[];
  for(const l of traceKept())for(const x of lf(l).slice().sort((a,b)=>azSort.compare(a.title,b.title)))if(!used.has(key(x))){used.add(key(x));picks.push([x,l]);}
  return picks;
 }
 function routeSource(x,shared){
  const sources=[...new Set(tags(x).filter(t=>shared.includes(t.term)).map(t=>safeLink(t.source)).filter(Boolean))];
  return sources.length?sources.map((u,i)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Synopsis source'+(sources.length>1?' '+(i+1):'')+' ↗</a>').join(' · '):'';
 }
 function renderTracePreview(res){
  const box=res.querySelector('.wt-film-preview');if(!box)return;
  const {bridges,bridge,picks,stops}=routeDraft();
  box.hidden=!stops.length;
  const chips=bridges.slice(0,6).map(v=>'<button type="button" data-wt-bridge="'+esc(v.term)+'" aria-pressed="'+String(bridge===v.term)+'">'+esc(v.term)+' <small>'+v.lands.size+' lands</small></button>').join('');
  const nodes=stops.map(({l,x,options,prior,shared},i)=>{
   if(!x)return '<article class="wt-route-stop"><small>'+esc(l.name)+'</small><p>No additional distinct film in the current selection.</p></article>';
   const film=filmOf(x),media=film&&A.mediaForFilm(film),opts=options.map(v=>'<option value="'+esc(v.id)+'"'+(v.id===x.id?' selected':'')+'>'+esc(v.title+(v.year?' ('+v.year+')':''))+'</option>').join('');
   const evidence=prior?(shared.length?'<div class="wt-route-relation"><strong>Shared theme: '+esc(shared.join(' · '))+'</strong><small>Catalogued themes, not evidence of influence.</small><span>'+(routeSource(prior,shared)?'Previous film: '+routeSource(prior,shared):'')+(routeSource(prior,shared)&&routeSource(x,shared)?' · ':'')+(routeSource(x,shared)?'Current film: '+routeSource(x,shared):'')+'</span></div>':'<div class="wt-route-relation"><small>No shared catalogued theme with the previous film. Compare the films to explore other connections.</small></div>'):'';
   return evidence+'<article class="wt-route-stop"><small class="wt-route-land">'+(i+1)+' · '+esc(l.name)+'</small><div class="wt-route-film">'+thumb(x)+'<div><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small><small>'+esc(terms(x).join(' · '))+'</small>'+viewingLink(x)+'</div></div>'+(options.length>1?'<label class="wt-route-choice">Choose another film<select data-wt-choice="'+esc(l.id)+'" aria-label="Choose film for '+esc(l.name)+'">'+opts+'</select></label>':'')+(media?.synopsis?'<details><summary>Synopsis</summary><p>'+esc(media.synopsis)+'</p></details>':'')+'</article>';
  }).join('');
  box.innerHTML=(chips?'<div class="wt-route-bridges"><strong>Possible threads across lands</strong><div>'+chips+'</div><small>Choose a theme to change the suggested films, not the map.</small></div>':'')+'<p class="wt-route-summary">'+picks.length+' distinct films · '+stops.length+' land references</p><div class="wt-route-sequence">'+nodes+'</div>';
 }
 function lineThread(all){const t=trace;if(!t?.lands.length)return;const picks=linePicks(all);if(!picks.length)return;if(t.browse){t.browse=false;open();setRead(false);}
  if(!picks.length)return;
  const short=n=>{const t=String(n).split(' (')[0].split(' / ')[0].trim();const latin=t.split(/\s+/).filter(w=>/[A-Za-zÀ-ÿĀ-ž]/.test(w)).join(' ');return (latin||t).slice(0,40);};
  const names=[...new Set(picks.map(v=>v[1]))].map(l=>l.name),route=names.length>1?short(names[0])+' → '+short(names[names.length-1]):short(names[0]),name=(((routeDraft().bridge||t.theme)?(routeDraft().bridge||t.theme)+' · ':'')+route).slice(0,90);
  const desc='';
  $('#weave-thread-form').hidden=true;setTab('thread');
  const id=transaction('Gather films',()=>{const c=S.current(),blank=c.threads.length===1&&!c.threads[0].items.length;let tid;
   if(blank){const t0=c.threads[0];t0.name=name;t0.description=desc;tid=t0.id;}else tid=S.createThread(name,desc);
   if(!tid)return false;
   for(const [x,l] of picks){const own=existingWork(x);if(own)S.addToThread(own.id,tid);else S.add(x,{threadId:tid});if(c.pins)c.pins[(own||x).id]=l.id;}
   c.activeThread=tid;c.selectedItem=null;S.save();return tid;});
  if(!id){status('This constellation has the most threads it can hold.');return;}
  stopTrace();openDock();setTab('thread');active=null;context.hidden=inline.hidden=true;render();const said='Threaded '+picks.length+(picks.length===1?' film':' films')+' from '+names.length+(names.length===1?' land':' lands')+', in the order of your line.';status(said);setTimeout(()=>status(said),900);}
 /* ── A thread from one land (Map page → Constellate) ─────────────────────
    The most recent film of each of the land's filmmakers, up to eight, pinned to that land. */
 /* 23 Nov: clicking a land in Constellate shows its films here: add them, link them, or make a thread of the land */
 let landShown='',landLimit=4,previewFilm=null,previewOrigin=null,previewTrail=[],lensLimit=6,selectedLandIds=[],previousLand='',lastLand='',landViewToken=0;
 function highlightLand(id){selectedLandIds=Array.isArray(id)?[...id]:id?[id]:[];syncLandStars();}
 function canOpenLand(){return enabled&&!reading&&!player&&!trace&&!document.body.classList.contains('is-theme-web-open');}
 function openLand(id){const land=id&&A.landById(id);if(!canOpenLand()||!land)return false;if(land.browseGroup&&land.members?.length&&!landFilms().get(land.id)?.films.length)return openLands(land.members);showLand(land.id);return true;}
 function beginLandView(){
  closePreview();closeFilmPair();ghost(null);context.hidden=inline.hidden=true;draft=draftKey=null;
  $('#weave-editor').hidden=false;$('#weave-compare').hidden=true;
  const detail=$('#constellate-detail');if(detail)detail.replaceChildren();
  $('#weave-thread-form').hidden=true;setTab('thread');panel.classList.add('has-land-view');
 }
 function presentLandView(box,ids,refresh=false){
  box.hidden=false;openDock();highlightLand(ids);
  if(refresh||window.AtlasGlobe?.active)return;
  const token=++landViewToken;panel.scrollTop=0;
  requestAnimationFrame(()=>{if(token!==landViewToken||box.hidden||panel.hidden||!enabled)return;panel.scrollTop=0;
    if(phone.matches){const b=box.getBoundingClientRect();if(b.top<0||b.top>innerHeight-100)box.scrollIntoView({block:'start',behavior:'instant'});}
  });
 }
 function openLands(ids){
  if(!canOpenLand())return false;
  const lands=[...new Map(ids.map(id=>A.landById(id)).filter(Boolean).map(l=>[l.id,l])).values()];
  if(!lands.length)return false;if(lands.length===1)return openLand(lands[0].id);
  beginLandView();const box=$('#weave-land');landShown='';
  const entries=lands.map(l=>{const films=landFilms().get(l.id)?.films||[],matches=themeLens?films.filter(x=>themeLens.ids.has(x.id)):films;return {l,films,matches};}).sort((a,b)=>Number(!!b.matches.length)-Number(!!a.matches.length)||azSort.compare(a.l.name,b.l.name));
  box.innerHTML='<div class="wl-head"><div><h3>Choose a land</h3><small>'+lands.length+' land references</small></div><button type="button" class="wl-close" aria-label="Close" title="Close">×</button></div><div class="wl-choices">'+entries.map(({l,films,matches})=>'<button type="button" data-wl-land="'+esc(l.id)+'"><strong>'+esc(A.landDisplayName?.(l)||l.name)+'</strong><small>'+matches.length+' '+(matches.length===1?'film':'films')+(themeLens?' · '+films.length+' total':'')+'</small></button>').join('')+'</div>';
  presentLandView(box,lands.map(l=>l.id));return true;
 }
 function landSharedTerms(a,b){
  if(!a||a===b)return [];
  const left=landFilms().get(a)?.themes||new Map(),right=landFilms().get(b)?.themes||new Map();
  return [...left].filter(([t,ids])=>right.has(t)&&new Set([...ids,...right.get(t)]).size>1).sort((x,y)=>Math.min(y[1].size,right.get(y[0]).size)-Math.min(x[1].size,right.get(x[0]).size)||azSort.compare(x[0],y[0])).slice(0,3).map(([t])=>t);
 }
 function showLand(id,refresh){const box=$('#weave-land');if(!box)return;if(!id){++landViewToken;box.hidden=true;landShown='';panel.classList.remove('has-land-view');highlightLand('');return;}if(refresh&&box.hidden)return;if(!refresh){beginLandView();landLimit=4;if(lastLand!==id){previousLand=lastLand;lastLand=id;}}
  const land=landFilms().get(id),name=land?.name||A.landById?.(id)?.name||'This land';landShown=id;
  const seen=new Set(),films=[];for(const x of land?.films||[]){if(themeLens&&!themeLens.ids.has(x.id))continue;const k=globeMode()?x.id:key(x);if(seen.has(k))continue;seen.add(k);films.push(x);}
  const yr=x=>{const m=/\d{4}/.exec(String(x.year||''));return m?+m[0]:0;};films.sort((a,b)=>(yr(b)||0)-(yr(a)||0)||azSort.compare(a.title,b.title));
  const linking=drawThread,shared=linking?[]:landSharedTerms(previousLand,id),prior=previousLand&&A.landById(previousLand),total=land?.films?.length||0;
  box.innerHTML='<div class="wl-head"><div><h3>'+esc(name)+'</h3><small>'+(films.length?films.length+(films.length===1?' film':' films'):themeLens&&total?'No matching films':'No films yet')+'</small></div><button type="button" class="wl-close" aria-label="Close" title="Close">×</button></div>'+
   (shared.length&&prior?'<div class="wl-bridge"><small>Catalog themes also found in films linked to '+esc(A.landDisplayName?.(prior)||prior.name)+'</small><div>'+shared.map(t=>'<button type="button" class="weave-theme-chip" data-explore-theme="'+esc(t)+'" aria-pressed="'+String(!!themeLens?.terms.includes(t))+'">'+esc(t)+'</button>').join(' ')+'</div></div>':'')+
   (!films.length?(themeLens&&total?'<p class="wl-note">This land has '+total+' '+(total===1?'film':'films')+' in the catalog, but none match the selected themes.</p><button type="button" class="wl-more" data-land-clear-theme>Show all films</button>':'<p class="wl-note">No film on the atlas is linked to this land yet.</p>'):
    (linking?'<p class="wl-note">'+(first?'Choose the second film.':'Choose a film to link.')+'</p>':'')+
    '<ul class="wl-films'+(linking?' is-linking':'')+'">'+films.slice(0,landLimit).map(x=>{const own=existingWork(x),chosen=linking&&own&&own.id===first,onThread=own&&S.activeThread().items.includes(own.id);return '<li><button type="button" data-wl="'+esc(x.id)+'"'+(chosen?' disabled':'')+'>'+thumb(x)+'<span class="wl-t"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,yr(x)||''].filter(Boolean).join(' · '))+'</small></span><em>'+(chosen?'Chosen':linking?'Link':onThread?'On thread':'Explore')+'</em></button></li>';}).join('')+'</ul>'+
    (films.length>landLimit?'<button type="button" class="wl-more">More films</button>':'')+
    (linking?'':'<button type="button" class="wl-all">Make a constellation from this land</button>'));
  presentLandView(box,[id],refresh);
 }
 function landPick(xid){const x=discoveryItem(xid);if(!x)return;if(!drawThread){showPreview(x,{land:landShown});return;}let own=existingWork(x);const tid=S.activeThread().id;
  if(!own||!S.activeThread().items.includes(own.id)){if(!add(x,tid,{landId:landShown,keepView:true}))return;own=existingWork(x);}if(!own)return;
  if(drawThread){showLand('');if(!connecting){connecting=true;first=null;}choose(own.id);return;}
  active=own.id;showLand('');context.hidden=inline.hidden=true;setTab('thread');render();panel.scrollTop=0;if(phone.matches)requestAnimationFrame(()=>$('#weave-order-list')?.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'}));}
 function landThread(landId){const land=landFilms().get(landId);if(!land||!land.films.length)return false;if(!enabled)open();setRead(false);if(drawThread)setDrawThread(false);if(trace)stopTrace();
  const yr=x=>{const m=/\d{4}/.exec(String(x.year||''));return m?+m[0]:0;},byMaker=new Map();
  for(const x of land.films.filter(x=>!themeLens||themeLens.ids.has(x.id)).sort((a,b)=>yr(b)-yr(a)||String(a.title).localeCompare(String(b.title)))){const k=x.record||x.maker||x.id;if(!byMaker.has(k))byMaker.set(k,[]);byMaker.get(k).push(x);}
  const picks=[],seen=new Set();for(let round=0;picks.length<8;round++){let more=false;for(const list of byMaker.values()){const x=list[round];if(x&&!seen.has(x.id)){seen.add(x.id);picks.push(x);more=true;if(picks.length>=8)break;}}if(!more)break;}
  if(!picks.length)return false;const all=new Set(land.films.filter(x=>!themeLens||themeLens.ids.has(x.id)).map(x=>x.id)).size,desc='';showLand('');context.hidden=inline.hidden=true;
  $('#weave-thread-form').hidden=true;setTab('thread');
  const id=transaction('Thread from '+land.name,()=>{const c=S.current(),blank=c.threads.length===1&&!c.threads[0].items.length;let tid;
   if(blank){const t0=c.threads[0];t0.name=land.name.slice(0,90);t0.description=desc;tid=t0.id;}else tid=S.createThread(land.name.slice(0,90),desc);
   if(!tid)return false;for(const x of picks){const own=existingWork(x);if(own)S.addToThread(own.id,tid);else S.add(x,{threadId:tid});if(c.pins)c.pins[(own||x).id]=land.id;}
   c.activeThread=tid;c.selectedItem=null;S.save();return tid;});
  if(!id){status('This constellation has the most threads it can hold.');return false;}
  active=null;fit('quiet');render();const said='A thread from '+land.name+': '+picks.length+(picks.length===1?' film.':' films.')+(picks.length<all?' Add films to bring in more.':'');status(said);setTimeout(()=>status(said),900);return true;}
 function landFilmCount(landId){return landFilms().get(landId)?.films.length||0;}
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&trace){e.preventDefault();e.stopImmediatePropagation();stopTrace();}},true);
 document.addEventListener('click',e=>{if(trace&&e.target.closest&&e.target.closest('#constellate-mode button,#constellate-mode summary')&&!e.target.closest('#weave-trace'))stopTrace();},true);
 function renderThemeStart(){const m=new Map([...discoveryIndex().byTheme].map(([term,films])=>[term,films.length]));const source=$('#weave-theme-start');source.innerHTML='<option value="">Choose a theme…</option>'+Object.entries(TH.families).map(([fam,ts])=>`<optgroup label="${esc(fam)}">${ts.map(t=>`<option value="${esc(t)}">${esc(t)} (${m.get(t)||0})</option>`).join('')}</optgroup>`).join('');source.dataset.cmOptions=source.innerHTML;const mapTheme=$('#weave-map-theme');mapTheme.innerHTML=source.innerHTML.replace('Choose a theme…','All themes');const top=[...m].sort((a,b)=>b[1]-a[1]).slice(0,4);$('#weave-hint-themes').innerHTML=top.length?top.map(([t,n])=>`<button type="button" data-theme-thread="${esc(t)}">${esc(t)} <small>${n}</small></button>`).join(''):'';}

 // The first-look example uses only film themes already present in the atlas.
 // No links or imagined relationships are inserted; viewers author those themselves.
 const suggestCache=new Map(),genericPeople=/^(indigenous|first nations?|native american|aboriginal|intertribal|collective|unknown|not recorded)$/i;
 let relations=null,themeLens=null;
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
  status('Opened '+example.films.length+' films in a new example constellation, temporary in this tab. Save it if you want to keep it.');
 }
 renderExamplePreview();
 $('#weave-example').onclick=createExample;
 $('#weave-intro-browse').onclick=()=>{setTab('add');$('#constellate-search').focus({preventScroll:true});};
 renderThemeStart();$('#weave-theme-start').onchange=e=>{const v=e.target.value;e.target.value='';if(v)showThemeLens([v]);};$('#weave-empty-hint').addEventListener('click',e=>{const b=e.target.closest('[data-theme-thread]');if(b)showThemeLens([b.dataset.themeThread]);});

 // Recommendations use published metadata only: synopsis themes, mapped land
 // reference IDs, explicitly recorded people, director IDs, credited languages,
 // and year. No geographic or identity inference from titles, surnames or plots.

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
 // The published catalog is immutable for this page session; build only once.

 function relationshipIndex(){
  if(relations)return relations;
  const byTheme=new Map(),byLand=new Map(),byPeople=new Map(),byLanguage=new Map(),byMaker=new Map(),byDecade=new Map(),byForm=new Map();
  const put=(m,k,x)=>{if(!k)return;if(!m.has(k))m.set(k,[]);m.get(k).push(x);};
  const films=azAll('film');
  for(const x of films){
   const e=suggestEvidence(x);if(!e)continue;
   for(const t of e.themes)put(byTheme,t,x);
   for(const [id,name] of e.land){if(!byLand.has(id))byLand.set(id,{id,name,films:[],themes:new Map()});const land=byLand.get(id);land.films.push(x);for(const term of e.themes){if(!land.themes.has(term))land.themes.set(term,new Set());land.themes.get(term).add(x.id);}}
   for(const k of e.people.keys())put(byPeople,k,x);
   for(const k of e.languages.keys())put(byLanguage,k,x);
   put(byMaker,e.makerId,x);if(e.year)put(byDecade,Math.floor(e.year/10)*10,x);
   put(byForm,filmOf(x)?.weaveForm,x);
  }
  return relations={films,byTheme,byLand,byPeople,byLanguage,byMaker,byDecade,byForm};
 }
 function relatedCandidates(seed){
  const e=suggestEvidence(seed),r=relationshipIndex(),found=new Map();if(!e)return [];
  const take=xs=>{for(const x of xs||[])found.set(x.id,x);};
  for(const t of e.themes)take(r.byTheme.get(t));
  for(const id of e.land.keys())take(r.byLand.get(id)?.films);
  for(const k of e.people.keys())take(r.byPeople.get(k));
  for(const k of e.languages.keys())take(r.byLanguage.get(k));
  take(r.byMaker.get(e.makerId));return [...found.values()];
 }
 // Exact record_id + film_id joins for geographic discovery.
 function globeIndex(){
  if(globeRelations)return globeRelations;
  const byLand=new Map(),byTheme=new Map(),refs=new Map(),films=[...globeCredits.values()];
  for(const x of films){
   const ts=terms(x),links=A.recordLandReferences(x.record).filter(r=>r.mapped&&r.id);
   refs.set(x.id,links);
   for(const t of ts){if(!byTheme.has(t))byTheme.set(t,[]);byTheme.get(t).push(x);}
   for(const r of links){if(!byLand.has(r.id))byLand.set(r.id,{id:r.id,name:r.name,films:[],themes:new Map()});const l=byLand.get(r.id);l.films.push(x);for(const t of ts){if(!l.themes.has(t))l.themes.set(t,new Set());l.themes.get(t).add(x.id);}}
  }
  return globeRelations={films,byLand,byTheme,refs};
 }
 function discoveryIndex(){return globeMode()?globeIndex():relationshipIndex();}
 function themeIntersection(selected){
  const ts=[...new Set(selected)],index=discoveryIndex();if(!ts.length||ts.some(t=>!index.byTheme.has(t)))return [];
  const smallest=ts.slice().sort((a,b)=>index.byTheme.get(a).length-index.byTheme.get(b).length)[0];
  return index.byTheme.get(smallest).filter(x=>ts.every(t=>terms(x).includes(t)));
 }
 function lensFor(ts){
  const films=themeIntersection(ts),ids=new Set(films.map(x=>x.id)),lands=new Set();
  for(const x of films){if(globeMode()){for(const r of globeIndex().refs.get(x.id)||[])lands.add(r.id);}else{for(const id of suggestEvidence(x)?.land.keys()||[])lands.add(id);}}
  return {terms:ts,films,ids,lands};
 }
 function refreshDiscoveryMode(){
  syncOffMapRail();
  if(themeLens)themeLens=lensFor(themeLens.terms);
  renderThemeStart();$('#weave-map-theme-second').dataset.primary='';
  syncThemeControl();if(themeLens)renderLensResults();if(landShown)showLand(landShown,true);syncLandStars();
 }
 function globeLandFilms(id){return (globeIndex().byLand.get(id)?.films||[]).filter(x=>!themeLens||themeLens.terms.every(t=>terms(x).includes(t)));}
 function geoRankRelated(seed){
  const idx=globeIndex(),links=new Set((idx.refs.get(seed.id)||[]).map(r=>r.id)),ts=new Set(terms(seed)),candidates=new Map();
  for(const t of ts)for(const x of idx.byTheme.get(t)||[])candidates.set(x.id,x);
  for(const id of links)for(const x of idx.byLand.get(id)?.films||[])candidates.set(x.id,x);
  return [...candidates.values()].filter(x=>x.id!==seed.id).map(x=>{const shared=terms(x).filter(t=>ts.has(t)),land=(idx.refs.get(x.id)||[]).find(r=>links.has(r.id)),bases=shared.map(t=>'Shared theme: '+t);if(land)bases.push('Same mapped land: '+land.name);return {x,bases,themeCount:shared.length,land:!!land,score:12*shared.length+(land?5:0)};}).sort((a,b)=>b.score-a.score||azSort.compare(a.x.title,b.x.title));
 }
 // Theme exploration owns view state only. It never edits a constellation or rebuilds geography.
 function syncThemeControl(){
  const box=$('#weave-theme-lens'),ts=themeLens?.terms||[],sel=$('#weave-map-theme'),second=$('#weave-map-theme-second'),count=box.querySelector('.weave-map-theme-results'),clear=box.querySelector('.weave-map-theme-row button');
  box.hidden=!enabled&&!globeEntry;sel.value=ts[0]||'';second.hidden=!ts.length;
  if(ts.length&&second.dataset.primary!==ts[0]){
   const counts=new Map();for(const x of discoveryIndex().byTheme.get(ts[0])||[])for(const t of terms(x))counts.set(t,(counts.get(t)||0)+1);
   second.innerHTML='<option value="">Intersect with…</option>'+Object.entries(TH.families).map(([fam,terms])=>'<optgroup label="'+esc(fam)+'">'+terms.filter(t=>t!==ts[0]).map(t=>'<option value="'+esc(t)+'">'+esc(t)+' ('+(counts.get(t)||0)+')</option>').join('')+'</optgroup>').join('');
   second.dataset.primary=ts[0];
  }
  second.value=ts[1]||'';count.hidden=!ts.length;count.textContent=themeLens?themeLens.films.length+' '+(globeMode()?'film credits':themeLens.films.length===1?'film':'films')+' · '+themeLens.lands.size+' mapped land references':'';
  clear.hidden=!ts.length;document.body.classList.toggle('weave-theme-lens',!!themeLens);
 }
 function showThemeLens(selected,{keepPreview=false}={}){
  const ts=[...new Set(selected)].filter(t=>Object.prototype.hasOwnProperty.call(FAM,t)).slice(0,2);
  if(!ts.length){clearThemeLens();return false;}
  if(!enabled&&!globeEntry)open();if(trace)stopTrace();if(reading)setRead(false);
  window.AtlasThemeWeb?.close();closeFilmPair();
  themeLens=lensFor(ts);lensLimit=6;syncThemeControl();
  if(window.AtlasGlobe?.active){if(previewFilm)renderFilmPreview();if(landShown)showLand(landShown,true);renderLensResults();syncLandStars();return true;}
  if(keepPreview&&previewFilm){renderFilmPreview();}
  else if(landShown){showLand(landShown,true);}
  else if(selectedLandIds.length){openLands(selectedLandIds);}
  else{closePreview();showLand('');context.hidden=inline.hidden=true;active=null;setTab('thread');openDock();}
  renderLensResults();syncLandStars();return true;
 }
 function clearThemeLens(refresh=true){
  themeLens=null;syncThemeControl();const lens=$('#weave-lens-results');if(lens)lens.hidden=true;
  if(refresh&&enabled){if(landShown)showLand(landShown,true);else if(selectedLandIds.length&&!window.AtlasGlobe?.active)openLands(selectedLandIds);else if(previewFilm)renderFilmPreview();}
  syncLandStars();
 }
 function landMatchesTheme(ids){return !themeLens||ids.some(id=>themeLens.lands.has(id));}
 function syncLandStars(){
  const selected=new Set(selectedLandIds),previews=new Set(previewFilm?references(previewFilm).map(r=>r.id):[]);
  for(const el of $$('#atlas .land-sky-star')){
   const ids=el.__data__?.ids||[],on=ids.some(id=>selected.has(id));
   el.classList.toggle('is-selected',on);el.classList.toggle('theme-match',landMatchesTheme(ids));el.classList.toggle('film-preview-land',ids.some(id=>previews.has(id)));
   if(el.getAttribute('aria-pressed')!==String(on))el.setAttribute('aria-pressed',String(on));
  }
  window.AtlasGlobe?.sync();
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
  if(themes.length)bases.push('Shared theme: '+themes.slice(0,2).join(' · '));
  if(decade)bases.push('Same decade: '+Math.floor(a.year/10)*10+'s');
  return {bases,themeCount:themes.length,land:!!land,people:!!people,maker,language:!!language,decade};
 }
 // A preview is view state only. It cannot enter the collection through rendering.
 function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u.href:'';}catch{return '';}}
 function themeButtons(x){return terms(x).map(t=>'<button type="button" class="weave-theme-chip" data-explore-theme="'+esc(t)+'" aria-pressed="'+String(!!themeLens?.terms.includes(t))+'">'+esc(t)+'</button>').join(' ');}
 const relatedRanks=new Map();
 function rankRelated(seed){
  if(globeMode())return geoRankRelated(seed);
  if(relatedRanks.has(seed.id))return relatedRanks.get(seed.id);
  const a=suggestEvidence(seed);if(!a)return [];
  const ranked=relatedCandidates(seed).filter(x=>key(x)!==key(seed)).map(x=>{
   const basis=suggestionBases(seed,x),b=suggestEvidence(x);
   const rare=[...b.themes].filter(t=>a.themes.has(t)).reduce((n,t)=>n+1/Math.sqrt(relationshipIndex().byTheme.get(t)?.length||1),0);
   return {x,...basis,score:basis.themeCount*12+rare*8+(basis.land?5:0)+(basis.people?5:0)+(basis.maker?4:0)+(basis.language?7:0)};
  }).filter(p=>p.themeCount||p.land||p.people||p.maker||p.language).sort((a,b)=>b.score-a.score||azSort.compare(a.x.title,b.x.title));
  if(relatedRanks.size>=48)relatedRanks.delete(relatedRanks.keys().next().value);relatedRanks.set(seed.id,ranked);return ranked;
 }
 function closePreview(){previewFilm=null;previewOrigin=null;previewTrail=[];const p=$('#weave-film-preview');if(p)p.hidden=true;panel.classList.remove('has-film-preview');updatePreviewStars();}
 function updatePreviewStars(){syncLandStars();}
 function showPreview(x,origin={},{follow=false,back=false}={}){
  if(!x||x.type!=='film')return false;if(!enabled)open({dock:true});if(reading)setRead(false);if(trace)stopTrace();
  if(follow&&previewFilm&&previewFilm.id!==x.id){previewTrail.push({film:previewFilm,origin:previewOrigin});if(previewTrail.length>30)previewTrail.shift();}else if(!back&&!follow)previewTrail=[];
  previewFilm=x;previewOrigin=origin;context.hidden=inline.hidden=true;closeFilmPair();showLand('');setTab('thread');openDock();renderFilmPreview();updatePreviewStars();panel.scrollTop=0;
  $('#weave-film-preview h3')?.focus({preventScroll:true});return true;
 }
 function renderFilmPreview(){
  const x=previewFilm;if(!x)return;const p=$('#weave-film-preview'),f=filmOf(x),r=A.recordById(x.record),media=f&&A.mediaForFilm(f),own=existingWork(x),has=!!(own&&S.activeThread().items.includes(own.id)),refs=references(x),src=safeLink(f?.themeSource);
  const facts=pairFact('Year',x.year)+pairFact('People',publishedValues(r?.community).join(' · '))+pairFact('Language',publishedValues(f?.languageLabels||f?.languages||f?.language).join(' · '))+pairFact('Form',f?.weaveForm||f?.medium)+pairFact('Length',f?.weaveLength)+pairFact('Runtime',f?.runtimeMinutes?f.runtimeMinutes+' min':'')+pairFact('Credit',f?.credit)+pairFact('Mapped land references',refs.map(v=>v.name).join(' · '));
  const ranked=rankRelated(x),bridge=ranked.find(v=>v.themeCount&&!v.land&&v.x.record!==x.record),related=[...new Map([bridge,...ranked].filter(Boolean).map(v=>[v.x.id,v])).values()].slice(0,3);
  const atlasURL=safeLink(globeMode()?new URL('maker/'+encodeURIComponent(x.record)+'.html#'+encodeURIComponent(x.film),document.baseURI).href:new URL(x.href||'./',location.href).href);
  p.innerHTML='<div class="weave-preview-head"><button type="button" data-preview-back>← Back</button><span>Film preview</span></div><div class="weave-preview-main">'+thumb(x,globeMode())+'<div><h3 tabindex="-1">'+esc(x.title)+'</h3><p>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</p><div class="weave-discovery-actions"><button class="weave-primary-add" type="button" data-preview-add="'+esc(x.id)+'"'+(has?' disabled':'')+'>'+(has?'On thread':'+ Add')+'</button>'+viewingLink(x)+'</div></div></div><div class="weave-preview-themes">'+themeButtons(x)+'</div>'+(terms(x).length?'<small class="weave-preview-note">Themes from the catalog. Select two to explore their intersection.</small>':'')+(media?.synopsis?'<p class="weave-preview-synopsis">'+esc(media.synopsis)+'</p>':'')+'<details class="weave-preview-facts"><summary>Film details and sources</summary><dl>'+facts+'</dl>'+(src?'<a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">Synopsis source ↗</a>':'')+(atlasURL?' <a href="'+esc(atlasURL)+'" target="_blank" rel="noopener noreferrer">Atlas film record ↗</a>':'')+'</details>'+(related.length?'<h4>Discover next</h4><div class="weave-encounter-grid">'+related.map(v=>'<article><button type="button" class="weave-encounter-art" data-preview-film="'+esc(v.x.id)+'">'+thumb(v.x,globeMode())+'<strong>'+esc(v.x.title)+'</strong></button><small>'+esc([v.x.maker,v.x.year].filter(Boolean).join(' · '))+'</small><small class="weave-encounter-reason">'+esc(v.bases.find(t=>t.startsWith('Shared theme:'))||v.bases[0])+'</small><button type="button" data-film-pair="'+esc(v.x.id)+'" data-pair-seed="'+esc(x.id)+'">Compare</button></article>').join('')+'</div>':'');
  p.hidden=false;panel.classList.add('has-film-preview');
 }
 function renderLensResults(){
  const box=$('#weave-lens-results');if(!themeLens){box.hidden=true;return;}const films=themeLens.films.slice().sort((a,b)=>azSort.compare(a.title,b.title));
  box.innerHTML='<div class="weave-preview-head"><h3>'+esc(themeLens.terms.join(' × '))+'</h3><button type="button" data-clear-lens aria-label="Clear theme filter">×</button></div><p>'+films.length+' '+(films.length===1?'film':'films')+' · '+themeLens.lands.size+' mapped land references</p><small>Catalog coverage, not a measure of cultural significance.</small>'+(films.length?'':'<p class="weave-preview-synopsis">No films match both selected themes in the current catalog. Choose another theme or clear the second one.</p>')+'<div class="weave-encounter-grid">'+films.slice(0,lensLimit).map(x=>'<article><button type="button" class="weave-encounter-art" data-preview-film="'+esc(x.id)+'" data-preview-from="lens">'+thumb(x)+'<strong>'+esc(x.title)+'</strong></button><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small></article>').join('')+'</div>'+(films.length>lensLimit?'<button type="button" data-lens-more>More films</button>':'');
  box.hidden=false;
 }
 function previewBack(){if(previewTrail.length){const prior=previewTrail.pop();showPreview(prior.film,prior.origin||{},{back:true});return;}const o=previewOrigin;if(globeMode()&&o?.from==='globe'){close();window.AtlasGlobe?.returnFromPreview?.();return;}closePreview();closeFilmPair();if(o?.land)showLand(o.land);else if(o?.from==='search')setTab('add');else if(themeLens)renderLensResults();else if(o?.from==='theme')window.AtlasThemeWeb?.open?.();}
 let suggestSignature='';
 function renderSuggest(){
  const box=$('#weave-suggest'),c=S.current(),t=S.activeThread();
  const seed=c.items.find(x=>x.id===active&&x.type==='film')||[...t.items].reverse().map(id=>c.items.find(x=>x.id===id)).find(x=>x?.type==='film');
  if(!seed){box.hidden=true;closeFilmPair();if(suggestSignature){box.innerHTML='';suggestSignature='';}return;}
  const signature=JSON.stringify([c.id,t.id,seed.id,t.items]);if(signature===suggestSignature)return;suggestSignature=signature;closeFilmPair();
  const ly=yearNum(seed),onThread=new Set(t.items.map(id=>c.items.find(x=>x.id===id)).filter(Boolean).map(key));
  const ranked=rankRelated(seed).filter(p=>!onThread.has(key(p.x)));
  const picks=[],used=new Set(),makers=new Set();
  const take=p=>{if(!p||used.has(key(p.x)))return;used.add(key(p.x));makers.add(p.x.record);picks.push(p);};
  // Lead with a documented thematic bridge across distinct mapped references when possible.
  const seedEvidence=suggestEvidence(seed);
  take(ranked.find(p=>p.themeCount&&seedEvidence?.land.size&&suggestEvidence(p.x)?.land.size&&!p.land&&p.x.record!==seed.record)||ranked[0]);
  take(ranked.find(p=>!used.has(key(p.x))&&!makers.has(p.x.record)&&p.themeCount));
  for(const p of ranked){if(picks.length>=3)break;if(!makers.has(p.x.record))take(p);}
  for(const p of ranked){if(picks.length>=3)break;take(p);}
  box.hidden=!picks.length;
  box.innerHTML=picks.length?'<div class="weave-suggest-head"><h3>Discover next</h3><p class="weave-suggest-seed">'+esc(seed.title)+'</p></div><div class="weave-discovery-grid">'+picks.map(({x,bases})=>'<article class="constellate-result weave-follow-result" draggable="true" data-drag-film="'+esc(x.id)+'">'+thumb(x)+'<div class="weave-discovery-copy"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small><small class="weave-theme-tags">'+esc(bases.find(b=>b.startsWith('Shared theme:'))||bases[0])+'</small><div class="weave-discovery-actions"><button type="button" data-film-pair="'+esc(x.id)+'" data-pair-seed="'+esc(seed.id)+'">Compare</button>'+viewingLink(x)+'<button type="button" data-weave-follow="'+esc(x.id)+'" aria-label="Add '+esc(x.title)+'">+ Add</button></div></div></article>').join('')+'</div>':'';
 }
 // Compare is a transient view. No thread or annotation is changed until Add.
 function closeFilmPair(){const box=$('#weave-film-pair');if(box)box.hidden=true;}
 function pairFact(label,value){return value?'<dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd>':'';}
 function pairCard(x){
  const f=filmOf(x),r=A.recordById(x.record),media=f&&A.mediaForFilm(f);
  const source=f?.themeSource,people=publishedValues(r?.community).join(' · '),languages=publishedValues(f?.languageLabels||f?.languages||f?.language).join(' · ');
  const facts=pairFact('Year',x.year)+pairFact('People',people)+pairFact('Language',languages)+pairFact('Form',f?.weaveForm||f?.medium)+pairFact('Themes',terms(x).join(' · '));
  let safeSource='';try{if(new URL(source).protocol==='https:')safeSource=source;}catch{}
  return '<article class="weave-pair-film">'+thumb(x)+'<h4>'+esc(x.title)+'</h4><p>'+esc(x.maker||'')+'</p><dl>'+facts+'</dl>'+(media?.synopsis?'<details><summary>Synopsis</summary><p>'+esc(media.synopsis)+'</p></details>':'')+'<div class="weave-discovery-actions">'+viewingLink(x)+(safeSource?'<a href="'+esc(safeSource)+'" target="_blank" rel="noopener noreferrer">Synopsis source ↗</a>':'')+'</div></article>';
 }
 function showFilmPair(a,b){
  if(!a||!b)return;const box=$('#weave-film-pair'),shared=terms(a).filter(t=>terms(b).includes(t)),bases=suggestionBases(a,b).bases.filter(x=>!x.startsWith('Shared theme:'));
  box.innerHTML='<div class="weave-pair-head"><h3>Compare films</h3><button type="button" data-pair-close aria-label="Close" title="Close">×</button></div>'+(shared.length?'<p class="weave-pair-shared">'+esc('Shared theme: '+shared.join(' · '))+'</p>':'')+(bases.length?'<p class="weave-pair-bases">'+esc(bases.join(' · '))+'</p>':'')+'<div class="weave-pair-grid">'+pairCard(a)+pairCard(b)+'</div><div class="weave-discovery-actions"><button type="button" data-weave-follow="'+esc(b.id)+'">+ Add</button></div>';
  box.hidden=false;box.querySelector('[data-pair-close]')?.focus({preventScroll:true});box.scrollIntoView({block:'nearest',behavior:motion.matches?'auto':'smooth'});
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
 function readingHTML(){const c=S.current(),base=new URL('./',location.href).href,ts=c.threads.filter(t=>t.visible&&t.items.length),row=(t,id)=>{const x=c.items.find(y=>y.id===id);if(!x)return '';const f=filmOf(x),links=readingConnections(t,id),th=terms(x);return `<li><h3>${esc(x.title)}</h3><p class="m">${esc([x.maker,x.year,landCaption(x)].filter(Boolean).join(' · '))}</p>${th.length?`<p class="m">Themes: ${esc(th.join(', '))}${f?.themeSource?` · <a href="${esc(f.themeSource)}">synopsis source</a>`:''}</p>`:''}${x.type==='concept'&&x.note?`<p>${esc(x.note)}</p>`:''}${t.notes[id]?`<p>${esc(t.notes[id])}</p>`:''}${links.map(l=>`<p class="m">${connectionHTML(l,id)}</p>`).join('')}${x.href?`<p class="m"><a href="${esc(new URL(x.href,base).href)}">Open in the atlas</a></p>`:''}</li>`;};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.name)}</title><style>body{font:17px/1.55 Georgia,serif;max-width:720px;margin:40px auto;padding:0 18px;color:#1b1c1d;background:#f8f8f9}h1{font-weight:400;font-size:2em;margin:0 0 .2em}h2{font-weight:400;border-top:1px solid #ccc;padding-top:.8em;margin-top:2em}h3{margin:0;font-size:1.05em}li{margin:0 0 1.1em}.m{font:14px/1.45 system-ui,sans-serif;color:#555;margin:.2em 0}a{color:#175fac}footer{font:13px/1.5 system-ui,sans-serif;color:#555;border-top:1px solid #ccc;margin-top:2.5em;padding-top:1em}</style></head><body><h1>${esc(c.name)}</h1>${c.author?`<p class="m">Created by ${esc(c.author)}</p>`:''}${c.note?`<p>${esc(c.note)}</p>`:''}${ts.map(t=>`<h2>${esc(t.name)}</h2>${t.description?`<p>${esc(t.description)}</p>`:''}${summary(t)?`<p class="m">${esc(summary(t))}</p>`:''}<ol>${t.items.map(id=>row(t,id)).join('')}</ol>`).join('')||'<p>No visible threads.</p>'}<footer>${esc(citation(shareURL('read')||base))}<br>Themes are tagged from each film’s published synopsis. Filmmakers, peoples and lands follow the atlas’s own sourcing.</footer></body></html>`;}


 let starMode=false,starBoxes=[];
 function starLabel(x,p){const text=chipText(x.title,24),w=text.length*6.1+8;let spot=null;for(const [dx,dy,anchor] of [[14,4,'start'],[-14,4,'end'],[14,-12,'start'],[14,20,'start'],[-14,-12,'end'],[-14,20,'end']]){const x0=anchor==='start'?p.x+dx:p.x+dx-w,box=[x0,p.y+dy-11,x0+w,p.y+dy+4];if(!starBoxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])){spot=[dx,dy,anchor,box];break;}}if(!spot)spot=[14,4,'start',[p.x+14,p.y-7,p.x+14+w,p.y+8]];starBoxes.push(spot[3]);return `<text class="weave-star-label" data-weave-knot="${esc(x.id)}" data-star-dx="${spot[0]}" data-star-dy="${spot[1]}" text-anchor="${spot[2]}" x="${(p.x+spot[0]).toFixed(1)}" y="${(p.y+spot[1]).toFixed(1)}">${esc(text)}</text>`;}
 function cardSet(){
  const c=S.current(),vis=c.items.filter(x=>visibleItem(x.id));
  starMode=false;
  if(cardsAll||compactSky())return null;
  // 2026-11-11: when film cards would pile on one another (a hemisphere-wide view, a phone),
  // films are drawn as named stars and only the selected film and its neighbours open into cards.
  const spots=vis.filter(x=>x.type!=='concept').map(x=>anchors.get(x.id)).filter(Boolean);
  let crowded=false;for(let i=0;i<spots.length&&!crowded;i++)for(let j=i+1;j<spots.length;j++)if(Math.abs(spots[i].x-spots[j].x)<178&&Math.abs(spots[i].y-spots[j].y)<52){crowded=true;break;}
  if(crowded){starMode=true;const set=new Set(vis.filter(x=>x.type==='concept').map(x=>x.id)),ok=new Set(vis.map(x=>x.id)),keep=id=>{if(id&&ok.has(id))set.add(id);};
   for(const id of [active,first,shiftFirst,drag?.id,drawLast])keep(id);
   return set;}
  if(vis.length<=8)return null;
  // A dense constellation still has every film position and a continuous ribbon.
  // Only its thumbnail cards are sampled; the remaining film stops stay clickable.
  const cap=size.width<700?7:11,valid=new Set(vis.map(x=>x.id)),set=new Set(vis.filter(x=>x.type==='concept').map(x=>x.id));
  const keep=id=>{if(id&&valid.has(id))set.add(id);};
  for(const l of c.links){keep(l.source);keep(l.target);}
  for(const id of [active,first,shiftFirst,drag?.id,drawLast])keep(id);
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
 // Keep the next-film choices immediately after the selected film card.
 $('#constellate-context').after($('#weave-suggest'));
 function setTab(tab){if(tab==='add'){closePreview();showLand('');closeFilmPair();}const ed=$('#weave-editor');$('#weave-browse-films')?.setAttribute('aria-pressed',String(tab==='add'));if(ed.dataset.tab!==tab){ed.dataset.tab=tab;panel.scrollTop=0;}if(tab==='add')renderResults();}
 setTab(S.current().items.length?'thread':'add');

 function syncStage(){const root=document.documentElement;if(enabled)root.dataset.weaveStage=player?'play':reading?'read':'build';else delete root.dataset.weaveStage;}
 function modeButtons(m){syncStage();clearNotice();[['constellate-edit','edit'],['constellate-read','read'],['constellate-share','share'],['weave-play','play']].forEach(([id,k])=>$('#'+id).setAttribute('aria-pressed',String(m===k)));}
 $('#constellate-edit').addEventListener('click',()=>modeButtons('edit'));
 // C. sort a thread by year, or as a route (nearest place next)
 function sortThread(by){const t=S.activeThread(),c=S.current(),it=id=>c.items.find(x=>x.id===id);let order;if(by==='year'){order=t.items.map((id,i)=>({id,i,y:yearNum(it(id))})).sort((a,b)=>(a.y||9999)-(b.y||9999)||a.i-b.i).map(o=>o.id);}else{const pts=t.items.map(id=>({id,p:it(id)?.type==='concept'?null:anchors.get(id)})),placed=pts.filter(o=>o.p),rest=pts.filter(o=>!o.p);if(placed.length<3){status('Add films with places to order this thread as a route.');return;}const start=placed.reduce((a,b)=>(b.p.y<a.p.y?b:a));order=[start];const left=new Set(placed.filter(o=>o!==start));while(left.size){const cur=order.at(-1);let best=null,bd=Infinity;for(const o of left){const d=Math.hypot(o.p.x-cur.p.x,o.p.y-cur.p.y);if(d<bd){bd=d;best=o;}}order.push(best);left.delete(best);}order=[...order,...rest].map(o=>o.id);}
  if(order.join()===t.items.join()){status('Already in that order.');return;}transaction(by==='year'?'Order by year':'Order by place',()=>{t.items=order;return S.save();});status(by==='year'?'Ordered by year. ↶ Undo restores your order.':'Ordered as a route from north to south, nearest place next. ↶ Undo restores your order.');}
 $('#weave-sort-year').onclick=()=>sortThread('year');$('#weave-sort-place').onclick=()=>sortThread('place');
 // F. hovering a film in the list shows where it would land
 function ghost(x){graph.querySelector('#weave-ghost')?.remove();if(!x||!enabled||unmapped)return;const a=anchor(x);if(!a||a.x<0||a.y<0||a.x>size.width||a.y>size.height)return;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='weave-ghost';g.setAttribute('transform',`translate(${a.x.toFixed(1)},${a.y.toFixed(1)})`);g.innerHTML=`<circle r="13"/><circle r="4" class="dot"/><text x="17" y="4">${esc(chipText(x.title,34))}</text>`;graph.querySelector('#constellate-world')?.append(g);}
 for(const sel of ['#constellate-results','#weave-suggest','#weave-land']){$(sel).addEventListener('pointerover',e=>{const r=e.target.closest('[data-drag-film],[data-wl]');if(r&&e.pointerType!=='touch')ghost(catalogById.get(r.dataset.dragFilm||r.dataset.wl));});$(sel).addEventListener('pointerleave',()=>ghost(null));}
 document.addEventListener('pointerdown',e=>{const h=$('#constellate-how');if(h?.open&&!h.contains(e.target))h.open=false;});
 window.addEventListener('popstate',e=>{if(window.AtlasRoute?.globe)return;if(skipPop){skipPop=false;e.stopImmediatePropagation();return;}if(enabled&&new URLSearchParams(location.search).get('constellate')!=='1'){exit({restore:false,fromHistory:true});return;}if(enabled&&selPushed){e.stopImmediatePropagation();backToList(true);}},true);
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
 const editor={setTab,open,browse,close,exit,showPreview,get previewFilm(){return previewFilm},previewLandIds:()=>previewFilm?references(previewFilm).map(r=>r.id):[],showThemeLens,clearThemeLens,landMatchesTheme,themeIntersection,themeTerms:()=>[...discoveryIndex().byTheme.keys()],thumb,openLand,openLands,readFromStart,undo,redo,fit,add,globeCollect,globeConnect,followFilm,showPicker,setRead,readThread,shareURL,citation,csvExport,jsonExport,choose,startLink,reference,tags,play:playWeave,stopPlay,pausePlay,playStep,get playing(){return !!player},get enabled(){return enabled},get selectedLand(){return landShown},get selectedLandIds(){return [...selectedLandIds]},get positions(){return new Map(positions)},get anchors(){return new Map(anchors)},get catalog(){return catalog},themeFilms,themeThread,landThread,landFilmCount,refreshDiscoveryMode,globeLandFilmCount:id=>globeIndex().byLand.get(id)?.films.length||0,globeLandCatalogFilms:globeLandFilms,globeCreditIndex:()=>globeIndex(),installGlobePublication,globeMetadata,globeMakerMetadata,globeFacetExport,globeViewingRoutes,landCatalogFilms:id=>(landFilms().get(id)?.films||[]).filter(x=>!themeLens||themeLens.ids.has(x.id)),trace:startTrace,stopTrace,get tracing(){return !!trace},terms,sourceImage,get view(){return{k:1,x:0,y:0}}};
 window.AtlasCollectionEditor=editor;
 if(!globeEntry)window.AtlasConstellate=editor;
 // Share snapshots are additive: never replace a newer local weave with an old link.
 const incoming=new URL(inbound);
 const payload=new URLSearchParams(incoming.hash.slice(1)).get('weave');
 const query=incoming.searchParams;
 try{
  if(payload){
   if(payload.length>100000)throw Error('Share link is too large. Import JSON instead.');
   const compressed=payload.startsWith('z');
   const encoded=compressed?payload.slice(1):payload;
   const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const json=compressed?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text():new TextDecoder().decode(bytes);
   const raw=JSON.parse(json);
   if(raw.version!==2||!raw.weave)throw Error('Unsupported constellation link.');
   const fingerprint=String([...payload].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619),2166136261)>>>0);
   busy=true;
   S.importWeave(raw.weave,fingerprint);
   restorePersistedAnnotations({...raw.weave,id:S.current().id});
   S.save();
   busy=false;
   known.set(S.current().id,copy(S.current()));
  }else if((globeEntry||query.get('constellate')==='1')&&query.get('weave')){
   const id=query.get('weave');
   if(S.state.collections.some(c=>c.id===id)){
    busy=true;
    S.activate(id);
    busy=false;
   }
  }
  if(!globeEntry&&(payload||query.get('constellate')==='1')){
   const read=query.get('read')==='1';
   open({dock:!!payload||read||!!S.current().items.length});
   if(payload){
    if(read)readFromStart();else setRead(false);
    fit('quiet');
   }else if(read)setRead(true);
   if(query.get('play')==='1')playWeave();
  }
 }catch(err){
  busy=false;
  if(!globeEntry)open();
  status('Could not open share link: '+err.message);
 }
 return editor;
})();
window.AtlasCollectionEditorReady.catch(e=>console.error('Collection editor could not initialize',e));
