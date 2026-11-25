/* Globe discovery: one native MapLibre camera, real raster tiles and a DEM mesh.
 * All territory shapes and cinema anchors use the existing Atlas reference data.
 * The old orthographic canvas is a clearly labeled, local-only overview fallback.
 */
(()=>{'use strict';
if(!window.AtlasRoute?.globe)return;
const $=s=>document.querySelector(s),C=()=>window.AtlasCollectionEditor,A=()=>window.AtlasCatalogue;
// Start independent fetches together instead of waiting for the flat catalogue
// interface and its data to finish constructing. Catch immediately; boot owns recovery.
const nativeModule=import(new URL('assets/maplibre/maplibre-gl.mjs',document.baseURI).href).then(value=>({value}),error=>({error}));
const worldRequest=fetch(new URL('assets/world-50m.json',document.baseURI)).then(async r=>{if(!r.ok)throw Error('Geography unavailable');return {value:await r.json()};}).catch(error=>({error}));
const DEG=180/Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=v=>((v+180)%360+360)%360-180;
let active=false,closed=false,host=null,canvas=null,ctx=null,ro=null,raf=0,settleTimer=0,bootFailure=null;
let W=0,H=0,dpr=1,zoom=1,center=[-91,12],proj=null,path=null,earth=null,landArea=0;
let records=[],points=[],byId=new Map(),near=[],inside=[],focusIds=[],focusKey='',settled=false,anchorFailures=[];
let targetCoordinate=null,targetPrimary='',targetMode='overview',localNameKey='',targetScreen=null,targetReason='none';
let pointers=new Map(),gesture=null,dragged=false,previousFocus=null;
const labelAnchors=new Map(),labelFailures=new Set();let labelQueue=null,labelTimer=0,labelUploaded=-1,labelFocusKey='';
let relief=null,reliefState='deferred',flight=0,flightTarget=null,lastDrag=null;
let live=null,liveReady=false,liveHost=null,liveSignature='',liveBaseZoom=0,liveTimer=0;
 const startup={fallbackPaint:null,nativeLoaded:null,handoff:null,revealed:null,reason:null,localReady:null,imageryReady:false,firstVisible:null,firstRenderer:null,stableFrames:0,stableMs:0};
 let firstSceneTimer=0;
let wheelFrame=0,wheelGoal=null,wheelLast=0,wheelTick=0,wheelActive=false,gestureStart=null,gestureUntil=0,landscape=false,lastLiveUpdate=0;
const received={marble:0,satellite:0,dem:0,hilldem:0,places:0},sourceErrors={};
let ambientCount=0,landsVisible=true,landStrength=1,edgeMode='selected',lastCameraChange=0,lastCameraKey='',activeMapPointers=new Set(),pendingFilm='',rankCache=new Map(),zoomListeners=null,lastStatus=0,frameTimes=[],lastRender=0,preferredLand='',filmOffset=0,yearBand='',lastEncounter='',recent=[];
let themeTrace=false,themeRoutes=[],themeSourceKey='',filmStripStart=0;
let featured=null,lastVisiblePosterKey='',posterKey='',journey=[],artSizes=new Map(),posterLayoutFrame=0,posterReason='initializing',boundaryStats={features:0,segments:0,datelineSplits:0},menuMode='',themeLensHome=null,menuListeners=null,encounterExpanded=false;
const inputStats={wheel:0,pinch:0,safari:0,touch:0,zoomEvents:0,lastDelta:0,lastBefore:null,lastAfter:null,lastInputMs:null};
const params=new URL(window.AtlasRoute.canonical).searchParams;landsVisible=params.get('territories')!=='off';
let inboundEncounter={land:params.get('land')||'',film:params.get('film')||'',maker:params.get('maker')||''};
function restoreEncounter(){
 if(!active||publicationStatus!=='ready'||!inboundEncounter)return;
 const {land:inboundLand,film,maker}=inboundEncounter;const land=A().landById(inboundLand)?.id||inboundLand;inboundEncounter=null;if(!land&&!film&&!maker)return;
 const idx=C().globeCreditIndex(),refs=f=>(idx.refs.get(f.id)||[]).filter(r=>byId.has(r.id));
 let work=film?idx.films.find(f=>f.id===film||f.film===film&&(!maker||f.record===maker)):null;
 if(film&&!work)return;
 if(!work&&maker){const credits=idx.films.filter(f=>f.record===maker);work=credits.find(f=>refs(f).length)||credits[0];}
 const selected=byId.has(land)&&(!work||refs(work).some(r=>r.id===land))?land:(!land&&work?refs(work)[0]?.id:'');
 if(!selected){if(work)previewFromGlobe(work,'',null);else if(maker){const record=A().recordById(maker),input=$('#globe-search');if(record&&input){if(menuMode!=='find')setMenu('find');input.value=record.name||record.title||maker;input.dispatchEvent(new Event('input',{bubbles:true}));}}return;}
 if(!initialCamera){gotoLand(selected,work?.id||'',true);return;}
 preferredLand=selected;pendingFilm=work?.id||'';focusKey='';scheduleSettle(80);
}
const initialCamera=(()=>{const a=params.get('at')?.split(',').map(Number);return a?.length===3&&a.every(Number.isFinite)&&Math.abs(a[0])<=180&&Math.abs(a[1])<=85&&a[2]>=-2&&a[2]<=14?a:null;})();
let requestedPitch=initialCamera&&params.has('pitch')&&Number.isFinite(Number(params.get('pitch')))?clamp(Number(params.get('pitch')),0,42):0;
function currentTheme(){return [$('#weave-map-theme')?.value,$('#weave-map-theme-second')?.value].filter(Boolean);}
function shareView(){const u=new URL('./',document.baseURI),s=liveStats();if(W&&H){const base=Math.max(-1.3,Math.log2(Math.min(W,H)*.87*Math.PI/512)),mapZoom=s?.zoom??clamp(base+Math.log2(Math.max(.1,zoom)),-2,14);u.searchParams.set('at',[center[0].toFixed(5),clamp(center[1],-85,85).toFixed(5),mapZoom.toFixed(3)].join(','));}if(settled&&featured){u.searchParams.set('land',featured.land);u.searchParams.set('film',featured.film.id);}if(s?.pitch>0)u.searchParams.set('pitch',s.pitch.toFixed(2));if(!landsVisible)u.searchParams.set('territories','off');if(landStrength!==1)u.searchParams.set('lands',String(landStrength));if(edgeMode!=='selected')u.searchParams.set('edges',edgeMode);const t=currentTheme();if(t.length)u.searchParams.set('themes',JSON.stringify(t));else u.searchParams.delete('themes');if(yearBand)u.searchParams.set('period',yearBand);else u.searchParams.delete('period');for(const [key,val] of Object.entries(facetFilter))if(val)u.searchParams.set(key,val);return u.href;}
function recordVisit(r){if(recent[0]?.id===r.id)return;recent=[{id:r.id,name:r.name},...recent.filter(v=>v.id!==r.id)].slice(0,10);try{sessionStorage.setItem('atlas-globe-recent',JSON.stringify(recent));}catch{}updateRecent();}
function updateRecent(){const s=$('#globe-recent');if(!s)return;s.replaceChildren(el('option',null,'Recently explored…'));for(const r of recent){if(!byId.has(r.id))continue;const o=el('option',null,r.name);o.value=r.id;s.append(o);}s.hidden=s.options.length<2;}
function invalidateFilters(){pendingFilm='';filmOffset=0;focusKey='';liveSignature='';refreshMenuLabels();movement();scheduleSettle(80);}
function setPeriod(v){yearBand=v;invalidateFilters();}
function periodMatch(f){if(!yearBand)return true;const y=Number(f.year);return Number.isFinite(y)&&y>=Number(yearBand)&&y<Number(yearBand)+20;}
function rankedFilms(id){const key=id+'|'+filterKey(),cached=rankCache.get(key);if(cached)return cached;const fs=matchingFilms(id),seen=new Set(),ranked=fs.slice().sort((a,b)=>a.title.localeCompare(b.title)||String(a.maker||'').localeCompare(String(b.maker||''))||a.id.localeCompare(b.id)).filter(f=>{if(seen.has(f.id))return false;seen.add(f.id);return true;});if(rankCache.size>160)rankCache.clear();rankCache.set(key,ranked);return ranked;}
function safeViewing(f){const links=C().globeViewingRoutes(f);return links.map(l=>{try{if(new URL(l.url).protocol!=='https:')return null;return {url:l.url,label:/trailer|teaser|preview/i.test(l.title||'')?'Trailer':/watch|full film|stream|viewing|ver pel[ií]cula|ver filme/i.test(l.title||'')?'Watch':'Film page'};}catch{return null;}}).filter(Boolean).sort((a,b)=>['Watch','Trailer','Film page'].indexOf(a.label)-['Watch','Trailer','Film page'].indexOf(b.label))[0]||null;}
function externalLink(label,url,cls){try{const u=new URL(url,location.href);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&u.origin===location.origin))return null;}catch{return null;}const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function gotoLand(id,filmId='',overview=false){id=A().landById(id)?.id||id;pendingFilm=filmId;const r=byId.get(id);if(!r)return;const a=territoryAnchor(r)?.coordinates;if(!a)return;preferredLand=id;filmOffset=0;const distance=d3.geoDistance(center,a);setCamera(a,overview?Math.max(2.2,Math.min(zoom,4)):Math.max(zoom,2.2),Math.round(clamp(280+distance*200,280,850)));}
function surprise(){const current=preferredLand||lastEncounter;const candidates=points.filter(p=>matchingFilms(p.id).length&&p.id!==current);const unseen=candidates.filter(p=>!recent.some(r=>r.id===p.id)),pool=unseen.length?unseen:candidates;if(pool.length)gotoLand(pool[Math.floor(Math.random()*pool.length)].id,'',true);else if($('#globe-status'))$('#globe-status').textContent='No additional mapped films match the selected filters.';}
function relatedEncounters(seed,land){
 const idx=C().globeCreditIndex(),ts=C().terms(seed),activeThemes=currentTheme(),origin=pointById.get(land);
 if(!ts.length)return [];
 const seedRefs=new Set(idx.refs.get(seed.id)?.map(r=>r.id)||[]),visitedFilms=new Set(journey.map(v=>v.film)),visitedLands=new Set([...recent.map(v=>v.id),...journey.map(v=>v.land)]);
 const candidates=new Map();
 for(const t of ts)for(const f of idx.byTheme.get(t)||[]){
  if(f.id===seed.id||f.film===seed.film||!periodMatch(f)||!matchesFacets(f))continue;
  const tags=C().terms(f),shared=tags.filter(x=>ts.includes(x));if(!activeThemes.every(x=>tags.includes(x)))continue;
  for(const ref of idx.refs.get(f.id)||[]){
   const p=pointById.get(ref.id);if(!p||ref.id===land||seedRefs.has(ref.id))continue;
   const key=f.id+'|'+ref.id;if(candidates.has(key))continue;
   const term=shared.find(x=>activeThemes.includes(x))||shared[0];
   const distance=origin?d3.geoDistance(origin.coord,p.coord):0;
   const score=shared.length*10+(ref.status==='sourced'?2:0)-(visitedLands.has(ref.id)?12:0)-(visitedFilms.has(f.id)?20:0);
   candidates.set(key,{film:f,ref,term,shared,score,distance});
  }
 }
 const out=[],films=new Set(),lands=new Set();
 const ranked=[...candidates.values()].sort((a,b)=>b.score-a.score||a.distance-b.distance||a.film.title.localeCompare(b.film.title));
 const add=v=>{if(!v||films.has(v.film.film)||lands.has(v.ref.id))return false;out.push(v);films.add(v.film.film);lands.add(v.ref.id);return true;};
 add(ranked[0]);const eligible=v=>!films.has(v.film.film)&&!lands.has(v.ref.id);
 // Offer a regional encounter and a longer geographic connection when the published themes permit.
 add(ranked.find(v=>eligible(v)&&v.distance<.25&&v.score>=ranked[0].score-12));
 add(ranked.find(v=>eligible(v)&&v.distance>=.25&&v.score>=ranked[0].score-12));
 for(const v of ranked){if(out.length>=3)break;add(v);}
 return out;
}
function followRelated(related){if(featured)journey.push({land:featured.land,film:featured.film.id,theme:currentTheme(),period:yearBand,facets:{...facetFilter},center:[...center],zoom});if(journey.length>20)journey.shift();if(!currentTheme().length)C().showThemeLens([related.term]);gotoLand(related.ref.id,related.film.id,true);}
function journeyBack(){const v=journey.pop();if(!v)return;yearBand=v.period||'';$('#globe-period').value=yearBand;for(const key of Object.keys(facetFilter)){facetFilter[key]=v.facets?.[key]||'';$('#globe-filter-'+key).value=facetFilter[key];}if(v.theme.length)C().showThemeLens(v.theme);else C().clearThemeLens();pendingFilm=v.film;preferredLand=v.land;filmOffset=0;focusKey='';liveSignature='';refreshMenuLabels();setCamera(v.center,v.zoom);}
function syncTerrain(){if(!liveReady||!live)return;const z=live.getZoom(),want=z>=6.2||(z>=5.7&&!!live.getTerrain())||(landscape&&z>5.4);if(want&&!live.getTerrain())live.setTerrain({source:'dem',exaggeration:1});else if(!want&&live.getTerrain())live.setTerrain(null);}

const nowMs=()=>performance.now();
function liveStats(){
 if(!liveReady||!live)return null;
 let elevation=null;try{elevation=live.queryTerrainElevation(center);}catch{}
 return {version:live.version||null,zoom:live.getZoom(),pitch:live.getPitch(),mesh:live.getTerrain()?.source||null,elevation,received:{...received},errors:{...sourceErrors},wheelActive:wheelActive||live.isZooming(),sourceUpdates:{...sourceUpdates},tileCacheLimit:W<760?96:240,motion:{moving:live.isMoving(),pointers:activeMapPointers.size,quietMs:nowMs()-lastCameraChange,settled},input:{...inputStats},startup:{...startup},medianFrameMs:frameTimes.length?frameTimes.slice().sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)]:null};
}
function updateMapCredits(z=0){const a=$('#globe-credit-live'),b=$('#globe-credit-fallback'),c=$('#globe-credit-satellite');if(a&&a.hidden===liveReady)a.hidden=!liveReady;if(b&&b.hidden!==liveReady)b.hidden=liveReady;const hideSatellite=!liveReady||z<=4;if(c&&c.hidden!==hideSatellite)c.hidden=hideSatellite;}
function updateDetailStatus(force=false){
 const t=nowMs();if(!force&&t-lastStatus<160)return;lastStatus=t;
 const e=$('#globe-detail-status');if(!e)return;
 if(!liveReady){e.textContent='Overview only · loading detailed map';updateMapCredits();return;}
 const s=liveStats(),z=s.zoom;updateMapCredits(z);
 const img=z>=6?'satellite':'marble',ok=received[img]>0;
 const level=z<4?'Planet':z<7?'Region':z<10?'Landscape':'Local';
 e.textContent=level+' · '+(ok?(img==='marble'?'Earth imagery':'Satellite imagery'):(sourceErrors[img]?'Imagery unavailable':'Loading imagery'))+(s.mesh&&received.dem?' · Elevation':sourceErrors.dem?' · Elevation unavailable':'');
 e.title='Live imagery and elevation availability; if a source fails, the map does not invent detail.';
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const paint=new Map();
const tones=['213,157,90','183,135,194','89,190,174','219,123,113','137,174,226','196,192,100','224,157,181','121,192,124'];
const territoryColors=new Map();
function territoryTone(id){if(territoryColors.has(id))return territoryColors.get(id);let h=2166136261;for(const c of String(id)){h=Math.imul(h^c.charCodeAt(0),16777619);}return tones[(h>>>0)%tones.length];}
// Stable greedy palette assignment using nearby anchor geography; colors convey no cultural classification.
function assignTerritoryColors(){const used=[];for(const p of points){const neighbors=used.filter(q=>d3.geoDistance(p.coord,q.coord)<.32);const score=tones.map((t,i)=>({t,i,n:neighbors.filter(q=>q.t===t).length})).sort((a,b)=>a.n-b.n||a.i-b.i);const t=score[0].t;territoryColors.set(p.id,t);used.push({...p,t});}}
const rgba=(rgb,a)=>'rgba('+rgb+','+a+')';
const sphere={type:'Sphere'};
function camera(){if(liveReady&&live){const p=live.getCenter();return {center:[wrap(p.lng),p.lat],zoom:Math.pow(2,live.getZoom()-liveBaseZoom),projection:'globe',renderer:'maplibre-globe'};}return {center:[...center],zoom,projection:'globe',renderer:'orthographic-canvas'};}
function renderSoon(){if(!active||raf)return;raf=requestAnimationFrame(()=>{raf=0;draw();});}
let lastSettledFilter='';
function sync(){if(!active)return;refreshMenuLabels();renderCollection();renderSoon();const sameFilter=lastSettledFilter===filterKey();if(settled&&!sameFilter){movement();scheduleSettle(75);return;}if(settled&&focusKey&&!readingJourney&&sameFilter&&!live?.isMoving()){updateCollectButton();placeEmergent();return;}if(!pointers.size&&!flight&&!wheelActive&&(!live?.isMoving()||settled))scheduleSettle(75);}
window.AtlasGlobe={get active(){return active},get startupFailure(){return bootFailure},get camera(){return active?camera():null},get pointCount(){return points.length},get geometryCount(){return records.length},get anchorFailures(){return [...anchorFailures]},get territoryNames(){return {indexed:labelAnchors.size,total:records.length,failures:[...labelFailures],withoutCinema:[...labelAnchors.keys()].filter(id=>!pointById.has(id)).length,anchors:[...labelAnchors].map(([id,a])=>({id,coordinate:a.coordinates,sourceId:a.sourceId}))}},get anchors(){return points.map(p=>({id:p.id,coordinate:[...p.coord],sourceId:p.anchor.sourceId,component:p.anchor.component,method:p.anchor.method}))},get landArea(){return landArea},get territoryLayer(){return {visible:landsVisible,strength:landStrength,edgeMode,edgeVisibility:liveReady?['native-ambient-line','land-outline'].map(id=>live.getLayoutProperty(id,'visibility')):[],features:ambientCount,boundaries:{...boundaryStats},fill:liveReady?live.getPaintProperty('native-ambient-fill','fill-opacity'):null,outline:liveReady?live.getPaintProperty('native-ambient-line','line-opacity'):null}},get terrain(){return liveReady?'tiled':reliefState},get tileState(){return liveStats()},matchingCreditIds:id=>matchingFilms(id).map(f=>f.id),cinemaCounts:id=>({...cinemaStats(matchingFilms(id))}),get cinemaMarkers(){return livePointsData().features.map(f=>({land:f.properties.land,films:f.properties.films,makers:f.properties.makers,credits:f.properties.count,coordinate:f.geometry.coordinates}));},artworkInventory:()=>({lands:records.map(r=>({id:r.id,name:r.name,credits:C().globeLandFilmCount(r.id),matching:matchingFilms(r.id).length})),credits:C().globeCreditIndex().films.map(f=>({id:f.id,film:f.film,title:f.title,maker:f.maker,record:f.record,source:C().sourceImage(f)||'',published:C().globeMetadata(f)?.image||'',view:safeViewing(f),watch:watchEntry(f)?{embedded:watchEntry(f).links.some(l=>l.embed),links:watchEntry(f).links}:null,lands:(C().globeCreditIndex().refs.get(f.id)||[]).map(r=>r.id)}))}),get collectionStars(){return [...groupedStars()].map(([land,group])=>{const p=group[0],q=liveReady?live.project(p.coord):null;return {land,items:group.map(x=>x.id),coordinate:p.coord,screen:q?[q.x,q.y]:null,visible:visible(p.coord)};})},get themeConnections(){return {enabled:themeTrace,links:themeGeometry().features.map(f=>f.properties)}},get discovery(){return {collection:collectionSummary(),themeCoverage:themeCoverage(),menu:menuMode,period:yearBand,filters:{...facetFilter},publication:publicationStatus,preferredLand,recent:[...recent],filmOffset,featured:featured?{land:featured.land,film:featured.film.id}:null,journeyDepth:journey.length,posterVisible:!$('#globe-emergent')?.hidden,posterReason,artState:$('#globe-encounter .globe-art-feature')?.dataset.artState||null,shareURL:shareView()}},goTo(coord,mapZoom){if(liveReady&&Array.isArray(coord)&&coord.length===2&&coord.every(Number.isFinite)&&Number.isFinite(mapZoom))setCamera(coord,Math.pow(2,mapZoom-liveBaseZoom),0);},get focus(){return {ids:[...focusIds],inside:inside.map(r=>r.id),settled,target:{mode:targetMode,radius:aperture(),screen:targetScreen,coordinate:targetCoordinate,primary:targetPrimary,reason:targetReason,nearby:near.map(v=>v.p.id)}};},openMenu(mode){if(!active||!host||host.inert||!['find','collection','more','theme'].includes(mode))return false;if(menuMode!==mode)setMenu(mode);return true;},sync,close,returnFromPreview};
let previewReturn=null,previewHome=null;
function previewFromGlobe(film,land='',trigger=null){previewReturn={film:film.id,land,trigger};C().showPreview(film,{land,from:'globe'});sync();}
function returnFromPreview(){const origin=previewReturn;previewReturn=null;if(!active)return;sync();requestAnimationFrame(()=>{if(!active)return;const trigger=origin?.trigger;if(trigger?.isConnected&&!trigger.hidden&&trigger.getClientRects().length){trigger.focus({preventScroll:true});return;}if(origin&&origin.film===featured?.film.id){$('#globe-encounter .globe-film-title')?.focus({preventScroll:true});return;}(liveReady?live.getCanvas():canvas)?.focus({preventScroll:true});});}
function close(){
 clearTimeout(firstSceneTimer);firstSceneTimer=0;
 closed=true;active=false;delete document.documentElement.dataset.globeEntry;clearStarDrag();closeGlobePlayer();clearTimeout(settleTimer);clearTimeout(labelTimer);labelTimer=0;cancelFlight();if(raf)cancelAnimationFrame(raf);raf=0;if(posterLayoutFrame)cancelAnimationFrame(posterLayoutFrame);posterLayoutFrame=0;ro?.disconnect();
 clearTimeout(liveTimer);stopWheel();zoomListeners?.abort();zoomListeners=null;restoreThemeLens();liveReady=false;live?.remove();live=null;liveHost=null;relief?.dispose();relief=null;host?.remove();host=null;document.body.classList.remove('atlas-globe-experiment');
}
function canonicalize(){
 const route=window.AtlasRoute?.canonical;if(!route)return;
 const target=new URL(route),local=new URL(location.href).searchParams.get('weave'),store=window.AtlasCollections;
 // A collection ID is local to this browser. Preserve a genuinely saved
 // collection on reload, but never mistake an unknown legacy ID for a portable
 // snapshot. A portable #weave payload always has precedence.
 if(!target.hash&&local&&store?.saved(local)&&store.current()?.id===local)target.searchParams.set('weave',local);
 if(location.href!==target.href)try{history.replaceState(history.state,'',target.href);}catch{}
}
function fallback(e){
 bootFailure=String(e?.stack||e);console.warn('Globe discovery unavailable',bootFailure);close();canonicalize();
 if(window.AtlasRoute?.globe){document.documentElement.dataset.globeEntry='error';const p=$('#globe-stage-loading');if(p){p.replaceChildren();const box=el('span',null,'The map could not initialize. ');const retry=button('Reload',()=>location.reload());box.append(retry);p.append(box);}return;}
 const p=el('p','globe-fallback','The globe could not initialize.');$('.map-panel')?.append(p);
}
function normalizeGeometry(g){
 if(!g)return g;
 if(g.type==='GeometryCollection')return {type:g.type,geometries:g.geometries.map(normalizeGeometry)};
 if(!['Polygon','MultiPolygon'].includes(g.type))return g;
 const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 const cleaned=polys.map(poly=>poly.map((r,i)=>{
  const area=d3.geoArea({type:'Polygon',coordinates:[r]});
  return (i===0?area>2*Math.PI:area<2*Math.PI)?r.slice().reverse():r;
 }));
 return {type:g.type,coordinates:g.type==='Polygon'?cleaned[0]:cleaned};
}
const pointById=new Map();
// Archipelagic source polygons can have centroids far out at sea. For the
// Hawaiian relay use the largest contained Natural Earth land component;
// the anchor remains inside the original Native Land source polygon.
function cinemaAnchor(l,fs){
 const fallback=window.AtlasGeoIntegrity.anchor(fs);
 if(l.id!==window.AtlasHawaiiRelay?.canonical||!fallback||!earth)return fallback;
 const source=fs.find(f=>String(f.id)===fallback.sourceId);
 if(!source)return fallback;
 const components=earth.type==='Polygon'?[earth.coordinates]:earth.type==='MultiPolygon'?earth.coordinates:[];
 let best=null;
 for(const coordinates of components){
  const polygon={type:'Polygon',coordinates},area=d3.geoArea(polygon);
  if(!(area>0&&area<2*Math.PI)||best&&area<=best.area)continue;
  const p=d3.geoCentroid(polygon);
  if(d3.geoContains(polygon,p)&&d3.geoContains(source,p))best={area,p};
 }
 return best?{...fallback,coordinates:best.p,method:'contained-terrestrial-component-centroid',anchorSource:'Natural Earth 1:50m land within Native Land source 35877'}:fallback;
}
function collect(){
 for(const l of A().lands){
  if(l.browseGroup||!l.groups?.length)continue;
  const fs=[...new Map(l.groups.flatMap(g=>g.features).map(f=>[String(f.id),f])).values()].filter(f=>f.geometry);
  if(!fs.length)continue;
  const shapes=fs.map(f=>({feature:f,bounds:f.bounds||d3.geoBounds(f)}));
  const r={id:l.id,name:A().landDisplayName(l),fullName:l.name||A().landDisplayName(l),aliases:l.aliases||[],shapes,count:C().globeLandFilmCount(l.id)};
  records.push(r);byId.set(r.id,r);
  if(!r.count)continue;
  const anchor=cinemaAnchor(l,fs),coord=anchor?.coordinates;
  if(!coord||!fs.some(f=>String(f.id)===anchor.sourceId&&d3.geoContains(f,coord))){anchorFailures.push(l.id);continue;}
  // Anchor is deterministic and independent of the flat map, zoom, or viewport.
  const point={...r,coord,anchor};points.push(point);pointById.set(r.id,point);
 }
 records.sort((a,b)=>a.name.localeCompare(b.name));points.sort((a,b)=>a.name.localeCompare(b.name));assignTerritoryColors();
}
function resize(){
 if(!host||!canvas)return;const footer=$('.globe-footer'),h0=Math.ceil(footer?.getBoundingClientRect().height||0)+'px';if(host.style.getPropertyValue('--globe-footer-height')!==h0){host.style.setProperty('--globe-footer-height',h0);placeEmergent();}
 const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
 const w=b.width,h=b.height,ratio=Math.min(window.devicePixelRatio||1,2);const layout=w<580?'compact':'wide';if(host.dataset.layout!==layout)host.dataset.layout=layout;
 const primary=$('.globe-primary')?.getBoundingClientRect(),root=host.getBoundingClientRect(),footerTop=footer?.getBoundingClientRect().top??root.bottom;
 const room=Math.max(0,Math.floor(footerTop-(primary?.bottom??root.top)-16));const menuRoom=room+'px';host.style.setProperty('--globe-encounter-room',Math.max(0,room-4)+'px');if(host.style.getPropertyValue('--globe-menu-room')!==menuRoom)host.style.setProperty('--globe-menu-room',menuRoom);
 if(w===W&&h===H&&ratio===dpr)return;
 W=w;H=h;targetScreen=null;dpr=ratio;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);if(live)live.resize();renderSoon();scheduleSettle(100);
}
function radius(){return Math.max(70,Math.min(W,H)*.445)*zoom;}
// A native failure or shared detail URL can enter the overview above its usual limit.
// Allow a continuous descent from that scale, without offering additional local detail.
function overviewZoom(value){return clamp(value,.8,Math.max(25,zoom));}
// The local renderer uses the same time-based logarithmic easing as native pinch.
// A burst of wheel input accumulates against its goal, not a lagging camera frame.
function queueOverviewZoom(delta){
 if(!active||liveReady||!Number.isFinite(delta)||!delta)return;
 requestedPitch=0;cancelFlight();const current=Math.log2(zoom);
 wheelGoal=clamp((wheelGoal??current)+delta,Math.log2(.8),Math.log2(Math.max(25,zoom)));wheelLast=nowMs();
 if(!wheelActive){wheelActive=true;movement();}
 if(wheelFrame)return;
 function frame(t){
  wheelFrame=0;if(!active||liveReady||wheelGoal===null){stopWheel();return;}
  const next=wheelStep(Math.log2(zoom),t);
  zoom=Math.pow(2,next);renderSoon();
  if(Math.abs(wheelGoal-next)>1e-9||t-wheelLast<90){wheelFrame=requestAnimationFrame(frame);return;}
  stopWheel();finishMove();
 }
 wheelFrame=requestAnimationFrame(frame);
}
function updateProjection(){
 proj.rotate([-center[0],-center[1],0]).translate([W/2,H/2]).scale(radius());
}
function visible(p){return d3.geoDistance(center,p)<Math.PI/2-1e-5;}
function shape(g,fill,stroke,width=1){
 ctx.beginPath();path(g);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function screenPoints(native=liveReady){
 const out=[],stamp=filterKey(),[tx,ty]=targetScreen||[W/2,H/2];
 for(const p of points){if(!visible(p.coord))continue;const pos=native?live.project(p.coord):null;const xy=pos?[pos.x,pos.y]:proj(p.coord);if(!xy?.every(Number.isFinite)||xy[0]<-10||xy[1]<-10||xy[0]>W+10||xy[1]>H+10)continue;
  out.push({p,xy,match:matchingFilms(p.id,stamp).length>0,distance:Math.hypot(xy[0]-tx,xy[1]-ty)});
 }
 return out;
}
// A local Natural Earth equirectangular raster, inverse-projected per fragment.
// The vector coastline remains authoritative: relief is clipped to the exact land path.
function setupRelief(image){
 const layer=document.createElement('canvas'),gl=layer.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL unavailable for relief');
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const vs=shader(gl.VERTEX_SHADER,'attribute vec2 a; void main(){gl_Position=vec4(a,0.0,1.0);}');
 const fs=shader(gl.FRAGMENT_SHADER,`
 precision highp float;
 uniform sampler2D raster;
 uniform vec2 viewport;
 uniform vec2 origin;
 uniform vec2 camera;
 uniform float radius;
 const float PI=3.141592653589793;
 void main(){
  vec2 xy=(gl_FragCoord.xy/viewport-origin)/radius;
  // origin and radius are expressed in width-normalized CSS coordinates;
  // restore the aspect ratio for the vertical component.
  xy.y*=viewport.y/viewport.x;
  float rr=dot(xy,xy);
  if(rr>1.0){gl_FragColor=vec4(0.0);return;}
  float z=sqrt(max(0.0,1.0-rr)), b=camera.y;
  float lat=asin(clamp(xy.y*cos(b)+z*sin(b),-1.0,1.0));
  float lon=camera.x+atan(xy.x,z*cos(b)-xy.y*sin(b));
  vec2 uv=vec2(fract(lon/(2.0*PI)+0.5),clamp(0.5-lat/PI,0.0,1.0));
  vec3 earth=texture2D(raster,uv).rgb;
  // Desaturate the hypsometric base without erasing ridge-and-valley relief.
  float lum=dot(earth,vec3(0.299,0.587,0.114));
  vec3 tinted=mix(earth,vec3(lum),0.38);
  vec3 base=mix(vec3(0.32,0.43,0.36),tinted,0.72);
  float light=0.82+0.18*max(0.0,dot(vec3(xy,z),normalize(vec3(-0.35,0.45,0.82))));
  gl_FragColor=vec4(base*light,1.0);
 }`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 const u={};for(const k of ['viewport','origin','camera','radius','raster'])u[k]=gl.getUniformLocation(program,k);
 gl.uniform1i(u.raster,0);
 layer.addEventListener('webglcontextlost',e=>{e.preventDefault();reliefState='unavailable';relief=null;renderSoon();});
 return {draw(){
  const factor=Math.min(dpr,1400/Math.max(W,H)),w=Math.max(1,Math.round(W*factor)),h=Math.max(1,Math.round(H*factor));
  if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h;}
  gl.viewport(0,0,w,h);gl.uniform2f(u.viewport,w,h);gl.uniform2f(u.origin,.5,.5);
  gl.uniform2f(u.camera,center[0]/DEG,center[1]/DEG);gl.uniform1f(u.radius,radius()/W);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  ctx.save();ctx.beginPath();path(earth);ctx.clip();ctx.drawImage(layer,0,0,W,H);ctx.restore();
 },dispose(){gl.deleteTexture(tex);gl.deleteBuffer(buf);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);}};
}
function loadRelief(){
 if(reliefState!=='deferred')return;reliefState='loading';
 const image=new Image();image.onload=()=>{if(!active)return;try{relief=setupRelief(image);reliefState='ready';}catch(e){reliefState='unavailable';console.warn('Globe relief unavailable',e);}renderSoon();};
 image.onerror=()=>{reliefState='unavailable';};image.src=new URL('assets/globe-relief-hyp-50m.png',document.baseURI);
}
// Native globe projection, native gestures and one geographic renderer for imagery,
 // relief, territory geometries and catalog anchors. The orthographic canvas is an offline fallback.
 const emptyGeo=()=>({type:'FeatureCollection',features:[]});
 function geoPolygon(g){
  // D3 reference polygons have spherical clockwise exteriors; GeoJSON uses the inverse.
  if(g.type==='Polygon')return {type:g.type,coordinates:g.coordinates.map(r=>r.slice().reverse())};
  if(g.type==='MultiPolygon')return {type:g.type,coordinates:g.coordinates.map(p=>p.map(r=>r.slice().reverse()))};
  if(g.type==='GeometryCollection')return {type:g.type,geometries:g.geometries.map(geoPolygon)};
  return g;
 }
 // All reference geometry is kept visible, not just land under the aperture.
 // Deduplicate identical source features shared by multiple catalogue groupings.
 function boundaryData(collection,track=false){
   let segments=0,splits=0,longEdges=0;const features=[];
   const rings=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='GeometryCollection'?g.geometries.flatMap(rings):[];
   const same=(p,q)=>p[0]===q[0]&&p[1]===q[1];
   for(const f of collection.features){
    const lines=[];
    for(const ring of rings(f.geometry)){
     if(ring.length<2)continue;
     let line=[ring[0]];
     const append=p=>{if(!same(line[line.length-1],p))line.push(p);};
     const flush=()=>{if(line.length>1){for(let i=1;i<line.length;i++)if(Math.abs(line[i][0]-line[i-1][0])>180)longEdges++;lines.push(line);}};
     for(let i=1;i<ring.length;i++){
      const p=ring[i-1],q=ring[i],delta=q[0]-p[0];
      if(Math.abs(delta)>180){
       const edge=delta>0?-180:180,adjust=q[0]+(delta>0?-360:360),denom=adjust-p[0];
       // +180 and -180 are the same meridian. Preserve any north/south edge
       // there without dividing by zero or sending a line across the planet.
       const lat=denom===0?q[1]:p[1]+(q[1]-p[1])*(edge-p[0])/denom;
       if(Number.isFinite(lat)){
        append([edge,lat]);flush();line=[[-edge,lat]];append(q);splits++;continue;
       }
      }
      append(q);
     }
     flush();
    }
    if(lines.length){segments+=lines.length;features.push({type:'Feature',properties:f.properties,geometry:{type:'MultiLineString',coordinates:lines}});}
   }
   if(track)boundaryStats={features:features.length,segments,datelineSplits:splits,longEdges};return {type:'FeatureCollection',features};
  }
  function ambientLandData(){
  const unique=new Map();
  for(const r of records)for(const {feature} of r.shapes){
   const key=String(feature.id);if(unique.has(key))continue;
   unique.set(key,{type:'Feature',properties:{land:r.id,name:r.name,color:'rgb('+territoryTone(r.id)+')'},geometry:geoPolygon(feature.geometry)});
  }
  ambientCount=unique.size;return {type:'FeatureCollection',features:[...unique.values()]};
 }
 const landLayerIds=['native-ambient-fill','native-ambient-line','land-color','land-outline','indigenous-names','indigenous-regional-names','indigenous-local-name'];
 function opacityExpression(values){return ['interpolate',['linear'],['zoom'],...values.flatMap(([z,a])=>[z,Math.min(.85,a*landStrength)])];}
 function syncLandVisibility(){
  const b=$('#globe-lands');if(b){b.setAttribute('aria-pressed',String(landsVisible));b.textContent=landsVisible?'Lands: on':'Lands: off';}
  if(liveReady){for(const id of landLayerIds)if(live.getLayer(id)){const show=landsVisible&&(id==='native-ambient-line'?edgeMode==='all':id==='land-outline'?edgeMode!=='none':true);live.setLayoutProperty(id,'visibility',show?'visible':'none');}live.setPaintProperty('native-ambient-fill','fill-opacity',opacityExpression([[0,.07],[3,.12],[6,.16],[10,.15],[14,.13]]));live.setPaintProperty('native-ambient-line','line-opacity',opacityExpression([[0,.09],[3,.16],[6,.24],[12,.32]]));}
  renderSoon();
 }
 function liveLandData(ids){
  const features=[];
  for(const id of ids){const r=byId.get(id);if(!r)continue;const color='rgb('+territoryTone(id)+')',match=matchingFilms(id).length>0;
   const focus=featured?.land===id||preferredLand===id||[...C().selectedLandIds].includes(id)||C().previewLandIds().includes(id);
   if(focus)for(const {feature} of r.shapes)features.push({type:'Feature',properties:{land:id,color,match:match?1:0,focus:1},geometry:geoPolygon(feature.geometry)});
  }
  return {type:'FeatureCollection',features};
 }
 // Territory names have their own source: a cinema credit is not a prerequisite
 // for a place to be named. Anchors are always contained in source geometry.
 function territoryAnchor(r){
  if(!r)return null;if(labelAnchors.has(r.id))return labelAnchors.get(r.id);if(labelFailures.has(r.id))return null;
  const a=pointById.get(r.id)?.anchor||window.AtlasGeoIntegrity.anchor(r.shapes.map(s=>s.feature));
  if(!a?.coordinates||!r.shapes.some(s=>String(s.feature.id)===a.sourceId&&d3.geoContains(s.feature,a.coordinates))){labelFailures.add(r.id);return null;}
  labelAnchors.set(r.id,a);return a;
 }
 function territoryLabelData(){
  return {type:'FeatureCollection',features:[...labelAnchors].map(([id,a])=>({type:'Feature',properties:{land:id,name:byId.get(id).name,fullName:byId.get(id).fullName},geometry:{type:'Point',coordinates:a.coordinates}}))};
 }
 function seedTerritoryLabels(){for(const p of points)labelAnchors.set(p.id,p.anchor);return territoryLabelData();}
 function updateTerritoryLabels(){
  if(!liveReady||!live||!settled||!landsVisible)return;
  const z=live.getZoom();if(z<3)return;
  for(const id of focusIds)territoryAnchor(byId.get(id));
  const key=focusIds.slice().sort().join('|');
  if(key!==labelFocusKey){labelFocusKey=key;const selected=['in',['get','land'],['literal',focusIds]];live.setFilter('indigenous-names',selected);live.setFilter('indigenous-regional-names',['!',selected]);}
  if(labelUploaded!==labelAnchors.size){labelUploaded=labelAnchors.size;live.getSource('native-labels')?.setData(territoryLabelData());}
  // At close scale a vast territory's ordinary label anchor can be far offscreen.
  // Use the actual contained focal point, not a fabricated settlement or film location.
  const local=targetMode==='local'&&inside.find(r=>r.id===targetPrimary),anchor=local&&labelAnchors.get(local.id),xy=anchor&&live.project(anchor.coordinates),offscreen=local&&(!xy||xy.x<30||xy.y<30||xy.x>W-30||xy.y>H-30);
  const localKey=offscreen&&targetCoordinate?JSON.stringify([local.id,targetCoordinate]):'';
  if(localKey!==localNameKey){localNameKey=localKey;live.getSource('native-local-label')?.setData(localKey?{type:'FeatureCollection',features:[{type:'Feature',properties:{name:local.name},geometry:{type:'Point',coordinates:targetCoordinate}}]}:emptyGeo());}
  if(z<5.5||labelTimer)return;
  if(!labelQueue){
   // Begin with territories in the vicinity; remaining names are indexed in
   // short background slices, never synchronously at startup.
   const proximity=r=>{const b=r.shapes[0].bounds;const span=(b[1][0]-b[0][0]+360)%360;return d3.geoDistance(center,[wrap(b[0][0]+span/2),(b[0][1]+b[1][1])/2]);};
   labelQueue=records.filter(r=>!labelAnchors.has(r.id)&&!labelFailures.has(r.id)).map(r=>({r,d:proximity(r)})).sort((a,b)=>a.d-b.d).map(v=>v.r);
  }
  if(!labelQueue.length)return;
  labelTimer=setTimeout(()=>{labelTimer=0;if(!liveReady||!active||!settled||live.isMoving()||live.getZoom()<5.5)return;const until=nowMs()+9;let n=0;while(labelQueue.length&&n<24&&(n===0||nowMs()<until)){territoryAnchor(labelQueue.shift());n++;}updateTerritoryLabels();},55);
 }
 // One marker per verified territorial reference, never per inferred residence
 // or filming location. Count exact catalogue IDs rather than merging titles.
 const cinemaStatsCache=new WeakMap();
 function cinemaStats(films){
  let result=cinemaStatsCache.get(films);if(result)return result;
  result={credits:new Set(films.map(f=>f.id)).size,films:new Set(films.map(f=>f.film||f.id)).size,makers:new Set(films.map(f=>f.record).filter(Boolean)).size};
  cinemaStatsCache.set(films,result);return result;
 }
 const countLabel=(n,word)=>n+' '+word+(n===1?'':'s');
 function cinemaSummary(stats){return countLabel(stats.films,'film')+' · '+countLabel(stats.makers,'filmmaker')+(stats.credits!==stats.films?' · '+countLabel(stats.credits,'credit'):'');}
 function livePointsData(){
  const focus=new Set(focusIds),stamp=filterKey(),lens=currentTheme().length?1:0;
  return {type:'FeatureCollection',features:points.map(p=>{const stats=cinemaStats(matchingFilms(p.id,stamp));return {type:'Feature',properties:{land:p.id,name:p.name,focus:focus.has(p.id)?1:0,match:stats.credits>0?1:0,count:stats.credits,films:stats.films,makers:stats.makers,lens},geometry:{type:'Point',coordinates:p.coord}};})};
 }
 let focusSourceKey='',pointSourceKey='',sourceUpdates={focus:0,points:0};
 function updateLive(){
  if(!liveReady)return;updateCollectionMap();updateThemeMap();
  if(live.isMoving()||wheelActive){const t=nowMs();if(t-lastLiveUpdate<95)return;lastLiveUpdate=t;}
  updateTarget();if(!settled)near=screenPoints().filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));targetFeedback();
  // Keep the source stable while dragging. Rebuild only once the camera settles or theme changes.
  if((live.isMoving()&&!settled)||wheelActive)return;
  const ids=[...new Set([...focusIds,...C().selectedLandIds,...C().previewLandIds()])];
  const sig=JSON.stringify([ids,featured?.land,preferredLand,focusIds,C().selectedLandIds,C().previewLandIds(),currentTheme(),yearBand,facetFilter,publicationStatus]);
  if(sig===liveSignature)return;liveSignature=sig;
  const selected=new Set([featured?.land,preferredLand,...C().selectedLandIds,...C().previewLandIds()].filter(Boolean));
  const activeIds=ids.filter(id=>selected.has(id)).sort();
  const fk=JSON.stringify([activeIds,filterKey()]),pk=JSON.stringify([focusIds,filterKey()]);
  if(fk!==focusSourceKey){focusSourceKey=fk;const focusData=liveLandData(activeIds);live.getSource('native-lands')?.setData(focusData);live.getSource('native-focus-edges')?.setData(boundaryData(focusData));sourceUpdates.focus++;}
  if(pk!==pointSourceKey){pointSourceKey=pk;live.getSource('cinema-points')?.setData(livePointsData());sourceUpdates.points++;}
 }
 function readLiveCamera(){const p=live.getCenter();center=[wrap(p.lng),p.lat];zoom=Math.pow(2,live.getZoom()-liveBaseZoom);const k=[center[0].toFixed(7),center[1].toFixed(7),live.getZoom().toFixed(6),live.getPitch().toFixed(4)].join('|');if(k!==lastCameraKey){lastCameraKey=k;lastCameraChange=nowMs();}}
 // Centered wheel/pinch uses accumulated logarithmic scale, not a restarted easing
 // animation. The geographic point inside the fixed aperture stays fixed.
 function wheelStep(current,t){const dt=wheelTick?clamp(t-wheelTick,1,80):16.7;wheelTick=t;const delta=wheelGoal-current;return reduced.matches||Math.abs(delta)<.008?wheelGoal:current+delta*(1-Math.exp(-dt/62));}
 function stopWheel(resetGesture=true){if(wheelFrame)cancelAnimationFrame(wheelFrame);wheelFrame=0;wheelGoal=null;wheelTick=0;wheelActive=false;if(resetGesture)gestureStart=null;}
 function queueZoom(goal){
  if(!liveReady)return;
  wheelGoal=clamp(goal,live.getMinZoom(),live.getMaxZoom());wheelLast=nowMs();
  if(!wheelActive){wheelActive=true;live.stop();movement();}
  if(wheelFrame)return;
  function frame(t){
   wheelFrame=0;if(!active||!liveReady||wheelGoal===null){stopWheel();return;}
   const current=live.getZoom(),next=wheelStep(current,t);
   if(Math.abs(next-current)>1e-6){
    const pitch=landscape?42*clamp((next-5.4)/1.6,0,1):live.getPitch();
    live.jumpTo({center:live.getCenter(),zoom:next,pitch});
   }
   if(Math.abs(wheelGoal-live.getZoom())>1e-5||t-wheelLast<90){wheelFrame=requestAnimationFrame(frame);return;}
   stopWheel(false);readLiveCamera();syncTerrain();inputStats.lastAfter=live.getZoom();if(live.getZoom()<=5.4&&landscape){landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');}finishMove();updateDetailStatus(true);
  }
  wheelFrame=requestAnimationFrame(frame);
 }
 function installZoom(){
  // Trackpad scroll and mouse wheel: native MapLibre inertia, with more responsive
  // rates. Native touch pinch remains centered on the fixed discovery aperture.
  live.scrollZoom.enable({around:'center'});
  live.scrollZoom.setZoomRate?.(1/45);
  live.scrollZoom.setWheelZoomRate?.(1/170);
  live.touchZoomRotate.enable({around:'center'});live.touchZoomRotate.disableRotation();
  zoomListeners?.abort();zoomListeners=new AbortController();
  const opts={capture:true,passive:false,signal:zoomListeners.signal};
  // Safari can retarget gestures to the document. Check the actual pointer
  // location as well as the event path, without grabbing scroll over controls.
  let mapPointer=false;
  window.addEventListener('pointermove',e=>{mapPointer=!!liveHost&&!!document.elementFromPoint(e.clientX,e.clientY)?.closest('#globe-live-map');},{capture:true,passive:true,signal:zoomListeners.signal});
  const isMap=e=>{
   if(!liveReady||!liveHost)return false;
   if(e.composedPath().includes(liveHost))return true;
   if(Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)){
    const hit=document.elementFromPoint(e.clientX,e.clientY);
    if(hit?.closest('#globe-live-map'))return true;
    if(hit?.closest('#globe-encounter,.globe-guide,.globe-footer'))return false;
   }
   return e.type.startsWith('gesture')&&mapPointer;
  };
  const stop=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
  // Capture at WINDOW before other page or map handlers. Ordinary wheel events
  // are left to MapLibre. Ctrl+wheel and Safari GestureEvent each have exactly
  // one zoom owner and never propagate to browser page zoom if delivered here.
  window.addEventListener('wheel',e=>{
   if(!isMap(e))return;
   inputStats.wheel++;if(e.ctrlKey)inputStats.pinch++;
   inputStats.lastDelta=e.deltaY;inputStats.lastBefore=live.getZoom();inputStats.lastInputMs=nowMs();
   inputStats.lastTrusted=e.isTrusted;
   if(!e.ctrlKey)return;
   stop(e);
   if(gestureStart!==null||nowMs()<gestureUntil)return;
   const unit=e.deltaMode===1?16:e.deltaMode===2?H:1,d=clamp(-e.deltaY*unit*.014,-1.25,1.25);
   if(!d)return;
   queueZoom((wheelGoal??live.getZoom())+d);
  },opts);
  window.addEventListener('gesturestart',e=>{
   if(!isMap(e))return;stop(e);live.stop();stopWheel();gestureStart=live.getZoom();
   inputStats.pinch++;inputStats.safari++;inputStats.lastBefore=gestureStart;
  },opts);
  window.addEventListener('gesturechange',e=>{
   if(gestureStart===null||!liveReady)return;stop(e);queueZoom(gestureStart+Math.log2(Math.max(.05,e.scale)));
  },opts);
  window.addEventListener('gestureend',e=>{
   if(gestureStart===null)return;stop(e);gestureStart=null;gestureUntil=nowMs()+180;
   if(!wheelActive)finishMove();
  },opts);
  liveHost.addEventListener('touchstart',e=>{if(e.touches.length===2)inputStats.touch++;},{passive:true,signal:zoomListeners.signal});
  liveHost.addEventListener('pointerdown',e=>{activeMapPointers.add(e.pointerId);if(wheelActive){stopWheel();finishMove();}},{capture:true,signal:zoomListeners.signal});
  const release=e=>{if(activeMapPointers.delete(e.pointerId))scheduleSettle(220);};
  window.addEventListener('pointerup',release,opts);window.addEventListener('pointercancel',release,opts);
  window.addEventListener('blur',()=>{activeMapPointers.clear();stopWheel();if(active)finishMove();},{signal:zoomListeners.signal});
 }
 // Publish a complete first scene once. The overview is an emergency/slow-load
 // path, not a compulsory animation before the detailed renderer.
 function showFirstScene(renderer){
  if(!active||!host||startup.firstVisible!==null)return;
  clearTimeout(firstSceneTimer);firstSceneTimer=0;
  startup.firstVisible=nowMs();startup.firstRenderer=renderer;
  host.dataset.firstRenderer=renderer;host.dataset.ready='true';host.inert=false;
  document.documentElement.dataset.globeEntry='ready';canonicalize();const menu=params.get('menu');if(['find','collection','more','theme'].includes(menu)&&menuMode!==menu)setMenu(menu);
 }
 function failLive(reason){
  if(!active)return;clearStarDrag();console.warn('Native globe unavailable; using local fallback',reason);const focused=!!liveHost?.contains(document.activeElement);if(liveReady&&live){try{readLiveCamera();}catch{}}stopWheel();zoomListeners?.abort();zoomListeners=null;
  clearTimeout(liveTimer);liveReady=false;try{live?.remove();}catch{}live=null;liveHost?.remove();liveHost=null;activeMapPointers.clear();requestedPitch=0;
  host?.classList.remove('globe-live','globe-revealed');landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');canvas.tabIndex=0;canvas.removeAttribute('aria-hidden');$('#globe-landscape').hidden=true;updateMapCredits();if(focused)canvas.focus({preventScroll:true});const e=$('#globe-detail-status');if(e)e.textContent='Overview only · detailed map unavailable';movement();draw();showFirstScene('overview');loadRelief();scheduleSettle(100);
 }
 async function bootLive(){
  try{
   const result=await nativeModule;if(result.error)throw result.error;const lib=result.value,ml=lib.default||lib;
   if(!active)return;
   liveHost=el('div');liveHost.id='globe-live-map';host.insertBefore(liveHost,canvas);
   // 512 CSS pixels per world at zoom 0. Use a viewport-dependent overview size.
   liveBaseZoom=Math.max(-1.3,Math.log2(Math.min(W,H)*.87*Math.PI/512));
   const ambient=ambientLandData();const style={version:8,projection:{type:'globe'},sky:{'sky-color':'#101b29','horizon-color':'#7295a7','fog-color':'#a8bac0','atmosphere-blend':['interpolate',['linear'],['zoom'],0,.24,5,.10,8,0],'horizon-fog-blend':.25,'sky-horizon-blend':.45,'fog-ground-blend':.15},glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{
    earth:{type:'geojson',data:{type:'Feature',properties:{},geometry:geoPolygon(earth)}},
    marble:{type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],tileSize:256,maxzoom:8,attribution:'NASA Blue Marble / GIBS'},
    satellite:{type:'raster',tiles:['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg'],tileSize:256,minzoom:4,maxzoom:14,attribution:'EOxCloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)'},
    places:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'OpenStreetMap contributors / OpenFreeMap'},
    dem:{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,maxzoom:12,encoding:'terrarium',attribution:'Mapterhorn terrain'},
    hilldem:{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,maxzoom:12,encoding:'terrarium',attribution:'Mapterhorn terrain'},
    'native-ambient':{type:'geojson',data:ambient,tolerance:.375,buffer:64,maxzoom:12},
    'native-ambient-edges':{type:'geojson',data:boundaryData(ambient,true),tolerance:.375,buffer:64,maxzoom:12},
    'native-focus-edges':{type:'geojson',data:emptyGeo(),tolerance:0,buffer:128,maxzoom:14},
    'native-lands':{type:'geojson',data:emptyGeo(),tolerance:0,buffer:128,maxzoom:14},
    'native-labels':{type:'geojson',data:seedTerritoryLabels(),maxzoom:14},
    'native-local-label':{type:'geojson',data:emptyGeo(),maxzoom:14},
    'cinema-points':{type:'geojson',data:livePointsData(),maxzoom:14},'globe-collected':{type:'geojson',data:emptyGeo(),maxzoom:14},'globe-authored-links':{type:'geojson',data:emptyGeo(),tolerance:0,maxzoom:14},'globe-theme-links':{type:'geojson',data:emptyGeo(),tolerance:0,maxzoom:14}
   },layers:[
    {id:'sea',type:'background',paint:{'background-color':'#213d50'}},
    {id:'fallback-land',type:'fill',source:'earth',paint:{'fill-color':'#69877b'}},
    {id:'marble',type:'raster',source:'marble',paint:{'raster-saturation':-.04,'raster-contrast':.12,'raster-fade-duration':180}},
    {id:'satellite',type:'raster',source:'satellite',minzoom:4,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,0,6,1],'raster-saturation':-.04,'raster-contrast':.12,'raster-brightness-max':.98,'raster-fade-duration':180}},
    {id:'relief',type:'hillshade',source:'hilldem',minzoom:3,paint:{'hillshade-exaggeration':.43,'hillshade-shadow-color':'#19272c','hillshade-highlight-color':'#f1e5ce','hillshade-accent-color':'#2b423a','hillshade-illumination-direction':315}},
    {id:'lake-context',type:'fill',source:'places','source-layer':'water',minzoom:6,filter:['==',['get','class'],'lake'],paint:{'fill-color':'#527f92','fill-opacity':.37}},
    {id:'river-context',type:'line',source:'places','source-layer':'waterway',minzoom:7,filter:['==',['get','class'],'river'],paint:{'line-color':'#9ac9d7','line-opacity':.55,'line-width':['interpolate',['linear'],['zoom'],7,.35,12,1.4]}},
    {id:'water-names',type:'symbol',source:'places','source-layer':'water_name',minzoom:7,layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':11,'text-padding':9},paint:{'text-color':'#b9dce6','text-halo-color':'#24404e','text-halo-width':1}},
    {id:'mountain-names',type:'symbol',source:'places','source-layer':'mountain_peak',minzoom:8,layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':11,'text-padding':9,'symbol-sort-key':['coalesce',['get','rank'],99]},paint:{'text-color':'#f3e7d2','text-halo-color':'#333d36','text-halo-width':1}},
    // Ambient territory references are deliberately translucent; overlapping
    // polygons remain visible without claiming exclusive ownership.
    {id:'native-ambient-fill',type:'fill',source:'native-ambient',paint:{'fill-color':['get','color'],'fill-opacity':['interpolate',['linear'],['zoom'],0,.07,3,.12,6,.16,10,.15,14,.13],'fill-outline-color':'rgba(0,0,0,0)'}},
    {id:'native-ambient-line',type:'line',source:'native-ambient-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-opacity':['interpolate',['linear'],['zoom'],0,.09,3,.16,6,.24,12,.32],'line-width':['interpolate',['linear'],['zoom'],0,.35,4,.65,8,.95,14,1.4]}},
    {id:'land-color',type:'fill',source:'native-lands',paint:{'fill-color':['get','color'],'fill-opacity':['case',['==',['get','match'],0],.02,['==',['get','focus'],1],.14,.07],'fill-opacity-transition':{duration:160,delay:0},'fill-outline-color':'rgba(0,0,0,0)'}},
    {id:'land-outline',type:'line',source:'native-focus-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-opacity':['case',['==',['get','match'],0],.16,['==',['get','focus'],1],.62,.32],'line-width':['interpolate',['linear'],['zoom'],1,.6,5,1,11,1.5]}},
    {id:'cinema-glow',type:'circle',source:'cinema-points',paint:{'circle-radius':5,'circle-color':'#e8eed9','circle-opacity':['case',['==',['get','match'],1],.13,0],'circle-blur':.9,'circle-pitch-alignment':'map'}},
    {id:'cinema-light',type:'circle',source:'cinema-points',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,1.8,3,2.6,4,2.7,7,2.4],'circle-color':'#dce9d8','circle-opacity':['case',['==',['get','match'],1],.92,.08],'circle-pitch-alignment':'viewport'}},
    {id:'cinema-count',type:'symbol',source:'cinema-points',minzoom:3.8,filter:['==',['get','match'],1],layout:{'text-field':['to-string',['get','films']],'text-font':['Noto Sans Regular'],'text-size':11,'text-anchor':'left','text-offset':[.65,0],'text-padding':4,'text-allow-overlap':false,'text-ignore-placement':false,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','symbol-sort-key':['case',['==',['get','focus'],1],0,1]},paint:{'text-color':'#eff2e9','text-halo-color':'#1b393e','text-halo-width':1.35,'text-opacity':['interpolate',['linear'],['zoom'],3.8,0,4.6,1]}},
    {id:'globe-theme-link',type:'line',source:'globe-theme-links',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ebcc87','line-width':1.5,'line-opacity':.72}},
    {id:'globe-user-link',type:'line',source:'globe-authored-links',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-opacity':.6,'line-width':1.2,'line-dasharray':[2,2]}},
    {id:'globe-user-halo',type:'circle',source:'globe-collected',paint:{'circle-radius':7,'circle-color':['get','color'],'circle-blur':.95,'circle-opacity':.28}},
    {id:'globe-user-star',type:'circle',source:'globe-collected',paint:{'circle-radius':['case',['==',['get','selected'],1],4.2,['>', ['get','count'],1],3.8,2.7],'circle-color':'#f1f6e8','circle-stroke-color':['get','color'],'circle-stroke-width':1,'circle-opacity':.98}},
    {id:'indigenous-regional-names',type:'symbol',source:'native-labels',minzoom:5.5,layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5.5,11,11,14],'text-anchor':'top','text-offset':[0,.6],'text-padding':11,'text-max-width':12,'text-allow-overlap':false,'text-ignore-placement':false},paint:{'text-color':'#dce9dd','text-halo-color':'#172a31','text-halo-width':1.45,'text-opacity':['interpolate',['linear'],['zoom'],5.5,0,7,.82,10,.94]}},
    {id:'indigenous-local-name',type:'symbol',source:'native-local-label',minzoom:7,layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':15,'text-anchor':'top','text-offset':[0,1.5],'text-max-width':18,'text-padding':7,'text-allow-overlap':false},paint:{'text-color':'#f4eee0','text-halo-color':'#172a31','text-halo-width':1.65}},
    {id:'indigenous-names',type:'symbol',source:'native-labels',minzoom:3,filter:['in',['get','land'],['literal',[]]],layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],3,12,7,14,11,15],'text-anchor':'top','text-offset':[0,.65],'text-padding':7,'text-max-width':12,'text-allow-overlap':false,'text-ignore-placement':false},paint:{'text-color':'#f4eee0','text-halo-color':'#172a31','text-halo-width':1.65,'text-opacity':['interpolate',['linear'],['zoom'],3,0,4.3,1]}}
   ]};
   live=new ml.Map({container:liveHost,style,center:initialCamera?initialCamera.slice(0,2):center,zoom:initialCamera?initialCamera[2]:liveBaseZoom,minZoom:Math.max(-2,liveBaseZoom-0.35),maxZoom:14,maxPitch:55,attributionControl:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,renderWorldCopies:false,cooperativeGestures:false,fadeDuration:120,trackResize:false,maxTileCacheSize:W<760?96:240,scrollZoom:{around:'center'}});
   live.keyboard?.disableRotation?.();
    live.getCanvas().addEventListener('webglcontextlost',e=>{e.preventDefault();failLive('Graphics context lost');},{once:true});
   // Source readiness alone can be true after an error. Count actual tile loads.
   live.on('sourcedata',e=>{
    if(e.sourceId in received&&e.coord&&e.tile?.state==='loaded'){received[e.sourceId]++;updateDetailStatus();}
   });
   live.on('error',e=>{
    const id=e.sourceId||e.tile?.source||'other';sourceErrors[id]=(sourceErrors[id]||0)+1;updateDetailStatus();
   });
   live.on('load',()=>{
    startup.nativeLoaded=nowMs();clearTimeout(liveTimer);handoff();
   });
   function handoff(){
    if(!active||!live||liveReady)return;
    // Do not steal an ongoing fallback drag or flight. Transfer the actual visible camera.
    if(pointers.size||flight||wheelActive){liveTimer=setTimeout(handoff,50);return;}
    const target={center:[wrap(center[0]),clamp(center[1],-85,85)],zoom:clamp(liveBaseZoom+Math.log2(Math.max(.1,zoom)),live.getMinZoom(),live.getMaxZoom())};
    target.pitch=target.zoom>5.4?Math.min(requestedPitch,42*clamp((target.zoom-5.4)/1.6,0,1)):0;requestedPitch=0;landscape=target.pitch>0;$('#globe-landscape').setAttribute('aria-pressed',String(landscape));
    const focused=document.activeElement===canvas;
    draw();live.jumpTo(target);liveReady=true;startup.handoff=nowMs();host.classList.add('globe-live');readLiveCamera();installZoom();
    canvas.tabIndex=-1;canvas.setAttribute('aria-hidden','true');if(focused)live.getCanvas().focus({preventScroll:true});
    syncTerrain();syncLandVisibility();settle();updateLive();updateDetailStatus(true);
    // Wait for a rendered frame with local geometry, not remote imagery or global idle.
    const map=live,core=['earth','native-ambient','native-ambient-edges','native-lands','native-focus-edges','native-labels','native-local-label','cinema-points','globe-collected','globe-authored-links'];
    let revealed=false,stableSince=null,stableSignature='',stableFrames=0;
    function reveal(reason){if(revealed||!active||live!==map)return;revealed=true;clearTimeout(liveTimer);map.off('render',check);startup.revealed=nowMs();startup.reason=reason;host.classList.add('globe-revealed');showFirstScene('native');}
    function check(){
     if(revealed||!active||live!==map)return;
     const t=nowMs(),elapsed=t-startup.handoff,local=core.every(id=>map.isSourceLoaded(id));
     if(local&&startup.localReady===null)startup.localReady=t;
     // A source-loaded event is not a painted frame. Also wait for publication
     // and the final encounter/camera, including newly queued GeoJSON updates.
     const img=map.getZoom()>=6?'satellite':'marble';
     startup.imageryReady=received[img]>0&&map.isSourceLoaded(img);
     const imagerySettled=startup.imageryReady||elapsed>=3500;
     const elevationSettled=!map.getTerrain()||map.isSourceLoaded('dem')||elapsed>=4500;
     const catalogSettled=publicationStatus!=='loading'||elapsed>=3500;
     const fontsSettled=!document.fonts||document.fonts.status==='loaded'||elapsed>=2200;
     const ready=local&&settled&&!map.isMoving()&&!wheelActive&&imagerySettled&&elevationSettled&&catalogSettled&&fontsSettled;
     const signature=JSON.stringify([lastCameraKey,focusKey,liveSignature,sourceUpdates,publicationStatus,startup.imageryReady,received[img],map.getTerrain()?.source]);
     if(!ready||stableSince===null||signature!==stableSignature){stableSince=ready?t:null;stableSignature=signature;stableFrames=0;}
     if(!ready)return;
     stableFrames++;startup.stableFrames=stableFrames;startup.stableMs=t-stableSince;
     // Raster fades last 180ms; symbol/fill fades also need time to finish.
     // Require a sustained sequence of unchanged, actually rendered frames.
     if(stableFrames>=3&&startup.stableMs>=420)reveal(startup.imageryReady?'local-and-imagery':'local-sources');
    }
    map.on('render',check);
    const awaitFrame=()=>{if(revealed||!active||live!==map)return;if(nowMs()-startup.handoff>12000){failLive('Detailed scene did not stabilize');return;}map.triggerRepaint();liveTimer=setTimeout(awaitFrame,100);};
    awaitFrame();
    /* Initial theme already applied in overview; preserve visitor choices. */
    restoreEncounter();
    live.on('render',()=>{const t=nowMs();if(lastRender&&t-lastRender<250){frameTimes.push(t-lastRender);if(frameTimes.length>120)frameTimes.shift();}lastRender=t;});
    live.on('zoom',()=>{inputStats.zoomEvents++;inputStats.lastAfter=live.getZoom();});
    live.addControl(new ml.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-right');
    // Keep the default overhead view. An explicit landscape button exposes the actual mesh.
    $('#globe-landscape').hidden=false;
    live.on('zoomend',()=>{if(landscape&&!wheelActive&&live.getZoom()<7){const pitch=42*clamp((live.getZoom()-5.4)/1.6,0,1);if(live.getZoom()<=5.4){landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');}if(Math.abs(live.getPitch()-pitch)>.5)live.easeTo({pitch,duration:reduced.matches?0:200});}});
    live.getCanvas().setAttribute('aria-label','Rotate and zoom the globe; Enter explores the focused lands');
    live.getCanvas().addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(settled&&focusIds.length)focusEncounter();return;}if(['+','=','-'].includes(e.key)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();queueZoom((wheelGoal??live.getZoom())+(e.key==='-'?-.65:.65));}},{capture:true});
    live.on('movestart',()=>{if(!liveReady||wheelActive)return;movement();});
    live.on('move',()=>{if(!liveReady)return;readLiveCamera();renderSoon();if(!settled)scheduleSettle(180);});
    live.on('idle',()=>{if(!settled&&!wheelActive)scheduleSettle(100);updateDetailStatus(true);});
    live.on('moveend',()=>{if(!liveReady)return;readLiveCamera();if(wheelActive)return;syncTerrain();finishMove();updateDetailStatus(true);});
    installStarDrawing();
    live.on('click',e=>{
     const h=10,q=e.point;if(nowMs()<suppressStarClickUntil)return;
     const star=starAt(q.x,q.y);if(star){selectStar(star);return;}
     const hit=live.queryRenderedFeatures([[q.x-h,q.y-h],[q.x+h,q.y+h]],{layers:['cinema-light','cinema-count']}).filter(f=>matchingFilms(f.properties.land).length>0).map(f=>({f,p:pointById.get(f.properties.land)})).filter(v=>v.p).sort((a,b)=>{const pa=live.project(a.p.coord),pb=live.project(b.p.coord);return Math.hypot(pa.x-q.x,pa.y-q.y)-Math.hypot(pb.x-q.x,pb.y-q.y)||a.p.id.localeCompare(b.p.id);})[0]?.f;
     const p=hit&&pointById.get(hit.properties.land);
     if(p){selectMapLand(p.id,p.coord);return;}
     const coord=[wrap(e.lngLat.lng),e.lngLat.lat];
     const land=landAt(coord);if(land)selectMapLand(land.id,coord);
    });

   }
   live.on('error',e=>{if(!liveReady&&/WebGL|shader|context/i.test(String(e.error)))failLive(e.error);});
   liveTimer=setTimeout(()=>{if(!liveReady)failLive('Map initialization timeout');},18000);
  }catch(e){failLive(e);}
 }
 function draw(){
 if(!W||!H)return;updateTarget();if(liveReady){updateLive();if(startup.firstRenderer!=='overview'||host.classList.contains('globe-revealed'))return;}
 // A visible overview follows the native camera while local tiles stabilize.
 // Never leave an interactive but frozen canvas above the incoming renderer.
 updateProjection();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#101b29';ctx.fillRect(0,0,W,H);
 const r=radius(),ocean=ctx.createRadialGradient(W/2-r*.25,H/2-r*.3,0,W/2,H/2,r);
 ocean.addColorStop(0,'#426f80');ocean.addColorStop(.72,'#315667');ocean.addColorStop(1,'#203b50');
 shape(sphere,ocean,null);shape(earth,'#69877b',null);
 if(relief){try{relief.draw();}catch(e){reliefState='unavailable';relief.dispose();relief=null;}}
 shape(earth,null,'rgba(180,201,184,.55)',.42);
 const ps=screenPoints(false);
 // Render only the exact existing reference shapes currently under the aperture
 // or selected by the visitor. No arbitrary territory outlines or country proxies.
 const selected=new Set(C().selectedLandIds),preview=new Set(C().previewLandIds());
 const focused=new Set(focusIds),wanted=new Map();
 // Restrict ambient color to the closest visible references, keeping overlap legible.
 for(const {p,match,distance} of ps.filter(v=>v.match&&v.distance<=aperture()*2.4).sort((a,b)=>a.distance-b.distance).slice(0,8))wanted.set(p.id,.15);
 for(const id of new Set([...focused,...selected,...preview]))wanted.set(id,matchingFilms(id).length?.49:.14);
 const now=performance.now();let fading=false;
 for(const id of new Set([...paint.keys(),...wanted.keys()])){
  const target=wanted.get(id)||0,old=paint.get(id)||{alpha:0,t:now-16};
  const alpha=reduced.matches?target:old.alpha+(target-old.alpha)*(1-Math.exp(-Math.min(100,now-old.t)/65));
  if(Math.abs(alpha-target)>.008)fading=true;
  if(alpha<.008&&!target){paint.delete(id);continue;}paint.set(id,{alpha,t:now});
  const rec=byId.get(id);if(!rec||!landsVisible)continue;const rgb=territoryTone(id);
  for(const f of rec.shapes){const emphasis=focused.has(id)||selected.has(id)||preview.has(id),stroke=edgeMode==='none'||edgeMode==='selected'&&!emphasis?null:rgba(rgb,Math.min(.85,alpha*1.65*landStrength));shape(f.feature,rgba(rgb,Math.min(.85,alpha*.72*landStrength)),stroke,emphasis?1.25:.75);}
 }
 if(fading)renderSoon();
 for(const f of themeGeometry().features)shape(f,null,'rgba(235,204,135,.72)',1.4);
 shape(sphere,null,'rgba(190,212,220,.36)',.75);
 if(!liveReady)near=ps.filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
 for(const {p,xy,match} of ps){
  const chosen=focused.has(p.id)||selected.has(p.id)||preview.has(p.id),countAlpha=match?clamp((mapScale()-3.8)/.8,0,1):0,rr=chosen?3:2,rgb=territoryTone(p.id);
  if(chosen&&match){ctx.beginPath();ctx.arc(xy[0],xy[1],rr+3,0,2*Math.PI);ctx.fillStyle=rgba(rgb,.23);ctx.fill();}
  ctx.beginPath();ctx.arc(xy[0],xy[1],rr,0,2*Math.PI);ctx.fillStyle=match?(chosen?'#f8eed8':'#e0e7dc'):'rgba(208,222,219,.22)';ctx.fill();
  if(countAlpha>0){ctx.save();ctx.globalAlpha=countAlpha;ctx.font='500 11px '+(getComputedStyle(host).getPropertyValue('--ui-sans').trim()||'system-ui');ctx.fillStyle='#eff2e9';ctx.textAlign='left';ctx.textBaseline='middle';const label=String(cinemaStats(matchingFilms(p.id)).films);ctx.strokeStyle='#1b393e';ctx.lineWidth=2;ctx.strokeText(label,xy[0]+6,xy[1]);ctx.fillText(label,xy[0]+6,xy[1]);ctx.restore();}
 }
 targetFeedback();if(startup.fallbackPaint===null)startup.fallbackPaint=nowMs();
}
function mapScale(){return liveReady?live.getZoom():Math.log2(Math.max(.1,zoom))+Math.max(-1.3,Math.log2(Math.min(W,H)*.87*Math.PI/512));}
function aperture(){const z=mapScale(),base=W<=760?23:29;return Math.round(z<4?base:z<7?base-(base-13)*(z-4)/3:13);}
function updateTarget(){if(!host)return;const z=mapScale();targetMode=z>=7?'local':z>=4?'landscape':'overview';const size=2*aperture()+'px';if(host.style.getPropertyValue('--globe-target-size')!==size)host.style.setProperty('--globe-target-size',size);if(host.dataset.targetMode!==targetMode)host.dataset.targetMode=targetMode;}
function targetFeedback(){if(!host)return;const chosen=settled&&byId.get(targetPrimary),unmappedReading=!!readingJourney&&!journeyReference(currentReadingItem());host.classList.toggle('has-tuning',settled?!!chosen:targetMode==='overview'&&near.length>0);host.classList.toggle('has-cinema',!unmappedReading&&(settled?!!chosen&&matchingFilms(chosen.id).length>0:targetMode==='overview'&&near.length>0));}
function chooseTarget(chosen){const actual=new Set(inside.map(r=>r.id)),direct=chosen.filter(r=>actual.has(r.id)),matching=direct.filter(r=>matchingFilms(r.id).length);const preferred=chosen.find(r=>r.id===preferredLand);if(preferred)return preferred;const prior=direct.find(r=>r.id===lastEncounter);if(targetMode!=='overview'&&direct.length)return (prior&&(!matching.length||matching.includes(prior))?prior:null)||matching[0]||direct[0];const marker=near.map(v=>byId.get(v.p.id)).find(r=>r&&chosen.includes(r));return (prior&&matching.includes(prior)?prior:null)||marker||matching[0]||prior||direct[0]||chosen[0]||null;}
function includesBounds(bounds,p){
 const [[west,south],[east,north]]=bounds,[lon,lat]=p;
 return lat>=south-1e-7&&lat<=north+1e-7&&(west<=east?lon>=west-1e-7&&lon<=east+1e-7:lon>=west-1e-7||lon<=east+1e-7);
}
function landsAt(coord){return records.filter(r=>r.shapes.some(s=>includesBounds(s.bounds,coord)&&d3.geoContains(s.feature,coord)));}
function landAt(coord){const hit=landsAt(coord);return hit.find(r=>r.id===preferredLand)||hit.find(r=>matchingFilms(r.id).length)||hit[0]||null;}
function selectMapLand(id,coord){preferredLand=id;pendingFilm='';filmOffset=0;setCamera(coord,zoom);}
// Resolve the visible reticle against the same CSS-pixel coordinate system
// used by the active renderer. The pitched map center is not a substitute for
// the geographic point actually under the target.
function underFocus(){
 const rect=$('#globe-aperture').getBoundingClientRect(),surface=(liveReady?live.getCanvas():canvas).getBoundingClientRect();
 targetScreen=[rect.left+rect.width/2-surface.left,rect.top+rect.height/2-surface.top];
 let p=null;
 try{if(liveReady){const c=live.unproject(targetScreen);p=[wrap(c.lng),c.lat];}else if(Math.hypot(targetScreen[0]-W/2,targetScreen[1]-H/2)<=radius())p=proj.invert(targetScreen);}catch{}
 targetCoordinate=p?.every(Number.isFinite)&&Math.abs(p[1])<=90?[...p]:null;
 if(!targetCoordinate)return [];
 return landsAt(targetCoordinate);
}
function matchingFilms(id,stamp=filterKey()){if(stamp!==matchingStamp){matchingStamp=stamp;matchingCache.clear();}if(!matchingCache.has(id))matchingCache.set(id,C().globeLandCatalogFilms(id).filter(f=>periodMatch(f)&&matchesFacets(f)));return matchingCache.get(id);}
// Lazy public CSV projection: exact credit key, including multiline source evidence.
let publicRowsPromise=null,facetRowsPromise=null,publicationStatus='loading',facetFilter={language:'',form:'',length:''},matchingCache=new Map(),matchingStamp='',filtersInitialized=false;
function parsePublicCSV(raw,required=['filmmaker_id','film_id']){
 const rows=[];let row=[],cell='',quoted=false;raw=raw.replace(/^\uFEFF/,'');
 for(let i=0;i<raw.length;i++){const ch=raw[i];if(quoted){if(ch==='"'){if(raw[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=ch;}
 else if(ch==='"'&&!cell)quoted=true;else if(ch===','){row.push(cell);cell='';}
 else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&raw[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
 else cell+=ch;}
 if(cell||row.length){row.push(cell);rows.push(row);}if(quoted)throw Error('Incomplete CSV quote');
 const header=rows.shift()||[];if(!required.every(k=>header.includes(k)))throw Error('Unexpected public CSV schema');
 return rows.filter(r=>r.some(Boolean)).map(r=>{if(r.length!==header.length)throw Error('Public CSV column mismatch');return Object.fromEntries(header.map((k,i)=>[k,r[i]]));});
}
function publicRows(){
 if(!publicRowsPromise)publicRowsPromise=fetch(new URL('data/atlas-published.csv',document.baseURI),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Public record unavailable');return r.text();}).then(parsePublicCSV).then(rows=>{const map=new Map();for(const row of rows){const k=row.filmmaker_id+'|'+row.film_id;if(!map.has(k))map.set(k,[]);map.get(k).push(row);}return map;}).catch(e=>{publicRowsPromise=null;throw e;});
 return publicRowsPromise;
}
const publicGroups={
 'Filmmaker':['filmmaker_id','name','aliases','entity','nation','community','affiliation_basis','country_codes','country_basis','lands','status','review_status','maker_evidence','source_1_url','source_1_quote','source_1_detail','source_2_url','source_2_quote','source_2_detail','source_3_url','source_3_quote','source_3_detail','more_sources'],
 'Film credit':['film_id','title','year','credit','medium','runtime_min','co_directed_with','film_source'],
 'Language and themes':['languages','language_codes','language_source','language_note','themes','primary_theme','form','length','theme_source'],
 'Artwork':['image_url','image_original','image_page','image_credit','image_kind','image_rights'],
 'Viewing':['watch_1_label','watch_1_url','watch_1_note','watch_2_label','watch_2_url','watch_2_note']
};
const fieldLabel=k=>k.replaceAll('_',' ').replace(/^./,v=>v.toUpperCase());
function renderPublicFields(box,row){
 const seen=new Set();
 const section=(title,keys)=>{const fields=keys.filter(k=>Object.hasOwn(row,k)&&row[k]!==''&&!seen.has(k));if(!fields.length)return;const group=el('section','globe-data-group');group.append(el('strong',null,title));const dl=el('dl');for(const k of fields){seen.add(k);const dd=el('dd'),v=row[k];dl.append(el('dt',null,fieldLabel(k)),dd);
 if(/^https?:\/\/[^\s]+$/i.test(v)){const link=externalLink(v,v);if(link)dd.append(link);else dd.textContent=v;}else dd.textContent=v;
 }group.append(dl);box.append(group);};
 for(const [label,keys] of Object.entries(publicGroups))section(label,keys);
 section('Additional public fields',Object.keys(row));
}
function creditDetails(film,summaryContent=[]){
 const d=el('details','globe-credit-details');d.append(el('summary',null,'Details & sources'),...summaryContent);const body=el('div','globe-credit-data');d.append(body);
 let loading=false,done=false;d.addEventListener('toggle',async()=>{if(!d.open||done||loading)return;loading=true;body.replaceChildren(el('p',null,'Loading public record…'));
 try{const rows=(await publicRows()).get(film.record+'|'+film.film)||[];if(!d.isConnected)return;body.replaceChildren();
 if(!rows.length){body.append(el('p',null,'No exact row in the current public CSV. The Atlas record remains available.'));}else{if(rows.length>1)body.append(el('p',null,'Multiple public rows share this credit key; all are shown.'));for(const row of rows)renderPublicFields(body,row);}
 const link=externalLink('Download public CSV',new URL('data/atlas-published.csv',document.baseURI).href);if(link)body.append(link);done=true;
 }catch(e){if(d.isConnected)body.replaceChildren(el('p',null,'Public CSV could not load. Close and reopen to retry.'));}finally{loading=false;placeEmergent();}
 });return d;
}
function exactFacet(film){return C().globeMetadata(film)||window.ATLAS_FACETS?.films?.[film.film]||{};}
function facetRows(){
 if(!facetRowsPromise)facetRowsPromise=fetch(new URL('data/film-facets.csv',document.baseURI),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Facet CSV unavailable');return r.text();}).then(raw=>parsePublicCSV(raw,['film_id','field','value'])).catch(e=>{facetRowsPromise=null;throw e;});
 return facetRowsPromise;
}
function showPublicationStatus(){
 const e=$('#globe-csv-status');if(e)e.textContent=publicationStatus==='ready'?'Published catalogue synchronized':publicationStatus==='error'?'Published CSV unavailable · showing baked catalogue':'Checking published catalogue…';
 const b=$('#globe-csv-retry');if(b)b.hidden=publicationStatus!=='error';
}
async function synchronizePublication(){
 publicationStatus='loading';showPublicationStatus();
 try{
  const [rows,facets]=await Promise.all([publicRows(),facetRows()]);if(!active||closed)return;
  const current=featured?.film.id;
  C().installGlobePublication(rows,facets);publicationStatus='ready';
  rankCache.clear();matchingCache.clear();matchingStamp='';coverageMemo=null;focusKey='';liveSignature='';posterKey='';
  if(current&&!inboundEncounter?.film)pendingFilm=current;
  refreshFacetOptions();showPublicationStatus();restoreEncounter();sync();scheduleSettle(100);
 }catch(e){if(!active)return;publicationStatus='error';showPublicationStatus();console.warn('Globe publication synchronization:',e);}
}
function filterKey(){return JSON.stringify([currentTheme(),yearBand,facetFilter,publicationStatus]);}
function matchesFacets(f){const v=exactFacet(f);return (!facetFilter.language||(v.l||[]).includes(facetFilter.language))&&(!facetFilter.form||v.f===facetFilter.form)&&(!facetFilter.length||v.n===facetFilter.length);}
function refreshFacetOptions(){
 const films=C().globeCreditIndex().films;
 for(const [key,field] of [['language','l'],['form','f'],['length','n']]){
  const select=$('#globe-filter-'+key);if(!select)continue;
  const counts=new Map();for(const f of films){const v=exactFacet(f)[field];for(const t of Array.isArray(v)?v:v?[v]:[])counts.set(t,(counts.get(t)||0)+1);}
  const wanted=facetFilter[key]||(!filtersInitialized?params.get(key):'')||'';
  select.replaceChildren(el('option',null,'All '+(key==='length'?'lengths':key==='form'?'forms':'languages')));select.firstChild.value='';
  for(const [term,count] of [...counts].sort((a,b)=>a[0].localeCompare(b[0]))){const o=el('option',null,term+' ('+count+')');o.value=term;select.append(o);}
  facetFilter[key]=counts.has(wanted)?wanted:'';select.value=facetFilter[key];
 }
 if(publicationStatus==='ready')filtersInitialized=true;
 refreshMenuLabels();
}
function changeFacet(key,value){facetFilter[key]=value;invalidateFilters();}
function clearDiscoveryFilters(){yearBand='';$('#globe-period').value='';for(const key of Object.keys(facetFilter)){facetFilter[key]='';$('#globe-filter-'+key).value='';}filtersInitialized=true;invalidateFilters();C().clearThemeLens();}

function creditProfile(film){return new URL('maker/'+encodeURIComponent(film.record)+'.html#'+encodeURIComponent(film.film),document.baseURI).href;}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function button(label,fn,cls){const b=el('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;}
// One small preview emerges from the encounter, not a film-location pin.
 // Keep the aperture and surrounding gesture area unobstructed and avoid every dock.
 // Use intrinsic image dimensions, never the aspect ratio of an unrelated work.
 function artwork(container,film,kind){
  const source=C().sourceImage(film);
  container.classList.add('globe-artwork','globe-art-'+kind);
  container.dataset.film=film.id;container.dataset.source=source||'';
  // Missing/loading/failed art has no visible footprint. Keep diagnostics on the element.
  container.replaceChildren();container.hidden=true;
  if(!source){container.dataset.artState='missing';return;}
  let url;try{url=new URL(source,location.href);if(!['http:','https:'].includes(url.protocol))throw Error('invalid image');}catch{container.dataset.artState='missing';return;}
  const img=el('img');img.alt='';img.decoding='async';img.draggable=false;img.loading='eager';img.fetchPriority=kind==='feature'?'high':kind==='emergent'?'auto':'low';img.referrerPolicy='strict-origin-when-cross-origin';
  let timer=0,finished=false;
  const measure=()=>{
   if(finished||!img.naturalWidth||!img.naturalHeight)return;finished=true;clearTimeout(timer);
   const ratio=img.naturalWidth/img.naturalHeight;
   artSizes.set(source,{w:img.naturalWidth,h:img.naturalHeight,ratio});
   container.dataset.artState='ready';container.hidden=false;container.dataset.orientation=ratio<.86?'portrait':ratio>1.25?'landscape':'square';
   container.style.setProperty('--art-ratio',String(ratio));
   container.style.setProperty('--art-natural-width',img.naturalWidth+'px');
   container.style.setProperty('--art-natural-height',img.naturalHeight+'px');
   container.style.setProperty('--art-feature-width',Math.min(img.naturalWidth,212*ratio)+'px');
   container.style.setProperty('--art-mobile-width',Math.min(img.naturalWidth,132*ratio)+'px');
   container.style.setProperty('--art-strip-width',Math.min(img.naturalWidth,64*ratio)+'px');
   if(active&&container.isConnected){cancelAnimationFrame(posterLayoutFrame);posterLayoutFrame=requestAnimationFrame(()=>{posterLayoutFrame=0;placeEmergent();});}
  };
  img.addEventListener('load',measure,{once:true});
  const failed=reason=>{if(finished)return;finished=true;clearTimeout(timer);container.dataset.artState='broken';container.dataset.artFailure=reason;container.hidden=true;img.remove();img.removeAttribute('src');if(kind==='emergent'&&active&&container.isConnected)placeEmergent();};
  img.addEventListener('error',()=>failed('error'),{once:true});timer=setTimeout(()=>failed('timeout'),12000);
  container.dataset.artState='loading';container.append(img);img.src=url.href;if(img.complete&&img.naturalWidth)measure();
 }
 function placeEmergent(){
  const b=$('#globe-emergent');if(!b)return;
  const hide=why=>{posterReason=why;b.hidden=true;b.style.visibility='';};
  if(menuMode)return hide('menu-open');if(encounterExpanded||$('#globe-encounter .globe-encounter-disclosures>details[open]'))return hide('reading-details');if(!settled)return hide('moving');if(!featured)return hide('no-matching-film');if(!C().sourceImage(featured.film))return hide('no-recorded-image');if(!liveReady)return hide('overview-fallback');
  const key=featured.land+'|'+featured.film.id+'|'+C().sourceImage(featured.film);
  // Build before placement: decoded proportions, not guessed dimensions, drive layout.
  if(key!==posterKey){
   posterKey=key;b.replaceChildren();
   const a=el('span','globe-emergent-art');artwork(a,featured.film,'emergent');
   b.append(a,el('span','globe-emergent-title',featured.film.title),el('span','globe-emergent-meta',[featured.film.maker,featured.film.year].filter(Boolean).join(' · ')));
   b.setAttribute('aria-label','Preview '+featured.film.title+' · '+byId.get(featured.land)?.name);
  }
  const source=C().sourceImage(featured.film),size=artSizes.get(source),art=b.querySelector('.globe-emergent-art');
  if(!size||art?.dataset.artState!=='ready')return hide(art?.dataset.artState==='broken'?'image-failed':'image-loading');
  const mobile=W<560,maxW=mobile?108:166,maxH=mobile?108:148,root=host.getBoundingClientRect();
  const blocks=['.globe-primary','#globe-collection-toggle','.globe-menu-panel:not([hidden])','.globe-zoom','#globe-encounter','.globe-footer','#weave-theme-lens','#constellate-mode','#constellate-popup'].map(s=>$(s)).filter(e=>e&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const q=e.getBoundingClientRect();return {x:q.x-root.x,y:q.y-root.y,w:q.width,h:q.height};});
  b.style.visibility='hidden';b.hidden=false;
  for(const factor of [1,.82,.66]){
   const scale=Math.min(1,maxW*factor/size.w,maxH*factor/size.h),imageW=size.w*scale,imageH=size.h*scale;
   if(imageW<38||imageH<28)continue;
   b.style.setProperty('--poster-image-width',imageW+'px');b.style.setProperty('--poster-image-height',imageH+'px');
   const w=b.offsetWidth,h=b.offsetHeight,clear=aperture()+15;
   const candidates=[[W/2+clear,H/2-h/2],[W/2-clear-w,H/2-h/2],[W/2-w/2,H/2-clear-h],[W/2-w/2,H/2+clear],[W/2+clear,H/2-h-8],[W/2-clear-w,H/2-h-8],[W/2+clear,H/2+8],[W/2-clear-w,H/2+8],[W/2-w-8,H/2-clear-h],[W/2+8,H/2-clear-h]];
   const pos=candidates.find(([x,y])=>x>5&&y>5&&x+w<W-5&&y+h<H-5&&!blocks.some(q=>x<q.x+q.w+4&&x+w+4>q.x&&y<q.y+q.h+4&&y+h+4>q.y));
   if(pos){b.style.left=pos[0]+'px';b.style.top=pos[1]+'px';b.style.visibility='';posterReason='visible';if(lastVisiblePosterKey!==key){lastVisiblePosterKey=key;b.classList.remove('globe-art-arrive');void b.offsetWidth;b.classList.add('globe-art-arrive');}return;}
  }
  return hide('no-safe-space-or-small-image');
 }
 function landSources(ref){
 const b=el('div','globe-source-group');
 b.append(el('p','globe-association-note',ref?.status==='sourced'?'Sourced land association.':'Provisional land association; not a verified filming location.'));
 if(ref?.basis)b.append(el('p',null,ref.basis));
 if(ref?.source){const a=externalLink('Association source ↗',ref.source);if(a)b.append(a);}
 b.append(el('p',null,'Native Land Digital / MapMaker reference geometry (2023). Overlaps are intentional; shapes are not official boundaries or filming locations.'));
 const a=externalLink('Native Land Digital ↗','https://native-land.ca/');if(a)b.append(a);
 return b;
}
let watchLookupSource=null,watchLookup=new Map();
function watchEntry(film){const source=window.ATLAS_WATCH?.films;if(source!==watchLookupSource){watchLookupSource=source;watchLookup=new Map((source||[]).filter(x=>x.links?.some(l=>l.url)).map(x=>[x.fid,x]));}return watchLookup.get(film.film);}
function watchURL(film){const u=new URL('watch.html',document.baseURI);u.hash=encodeURIComponent(film.film);u.searchParams.set('fromGlobe',new URL(shareView()).search.slice(1));return u.href;}
// Embed only already indexed full films on explicitly approved player hosts.
let globePlayer=null,playerReturn=null;
function embeddedRoute(entry){
 for(const l of entry?.links||[]){try{const u=new URL(l.embed);if(u.protocol==='https:'&&((['www.youtube-nocookie.com','www.youtube.com'].includes(u.hostname)&&/^\/embed\/[A-Za-z0-9_-]+$/.test(u.pathname))||(u.hostname==='player.vimeo.com'&&/^\/video\/\d+$/.test(u.pathname))))return l;}catch{}}
 return null;
}
function closeGlobePlayer(){const d=globePlayer;if(!d)return;const trigger=playerReturn;playerReturn=null;globePlayer=null;d.querySelector('iframe')?.removeAttribute('src');if(d.open)d.close();d.remove();if(active&&trigger?.isConnected)trigger.focus({preventScroll:true});}
function openGlobePlayer(film,route,trigger){
 if(!active||!settled||!host||host.inert||!route||typeof HTMLDialogElement==='undefined'||!HTMLDialogElement.prototype.showModal)return false;
 closeGlobePlayer();if(menuMode)setMenu('');playerReturn=trigger;
 const d=el('dialog','globe-player'),header=el('div','globe-player-head'),copy=el('div'),heading=el('h2',null,film.title),dismiss=button('Close',closeGlobePlayer);
 d.id='globe-player';d.setAttribute('aria-labelledby','globe-player-title');heading.id='globe-player-title';copy.append(heading,el('p',null,[film.maker,film.year].filter(Boolean).join(' · ')));dismiss.setAttribute('aria-label','Close film player');header.append(copy,dismiss);d.append(header);
 const frame=el('iframe');frame.title='Player: '+film.title;frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';d.append(frame);
 const foot=el('div','globe-player-foot'),source=externalLink('Open at film source ↗',route.url),watch=externalLink('Watch page ↗',watchURL(film));if(source)foot.append(source);if(watch)foot.append(watch);d.append(foot);
 d.addEventListener('cancel',e=>{e.preventDefault();closeGlobePlayer();});d.addEventListener('close',()=>{if(globePlayer===d)closeGlobePlayer();});
 host.append(d);globePlayer=d;try{d.showModal();frame.src=route.embed;dismiss.focus({preventScroll:true});return true;}catch{closeGlobePlayer();return false;}
}
function encounterLinks(film,work){
 const actions=el('div','globe-film-actions'),meta=C().globeMetadata(film),view=safeViewing(film);
 const watch=watchEntry(film),route=embeddedRoute(watch),embedded=!!route;
 // Never label a trailer or an information page as full-film playback.
 const play=embedded?externalLink('▶ Play',watchURL(film),'globe-view-link'):
  watch?externalLink('Watch ↗',watchURL(film),'globe-view-link'):
  view&&view.label==='Watch'?externalLink('▶ Watch ↗',view.url,'globe-view-link'):
  view&&view.label==='Trailer'?externalLink('▶ Trailer ↗',view.url,'globe-view-link'):null;
 if(play){play.dataset.viewKind=embedded?'indexed-embed':watch?'indexed-external':view?.label==='Trailer'?'trailer':'external-watch';if(embedded)play.addEventListener('click',e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&openGlobePlayer(film,route,play))e.preventDefault();});actions.append(play);}
 const source=view?.label==='Film page'?view.url:meta?.row?.film_source||work?.sourceURL;
 const external=source&&externalLink('Film page ↗',source,'globe-source-link');
 const profile=externalLink('Atlas record ↗',creditProfile(film),'globe-source-link');
 if(external)actions.append(external);else if(profile)actions.append(profile);
 return {actions,profile,external};
}
function otherLands(chosen,primary){
 const others=chosen.filter(r=>r.id!==primary.id);if(!others.length)return null;
 const actual=new Set(inside.map(r=>r.id)),d=el('details','globe-overlap');
 const overlapping=others.filter(r=>actual.has(r.id)).length,nearby=others.length-overlapping;
 d.append(el('summary',null,[overlapping?'Overlapping lands ('+overlapping+')':'',nearby?'Nearby references ('+nearby+')':''].filter(Boolean).join(' · ')));
 const list=el('div','globe-choices');
 for(const [label,group] of [['At focal point',others.filter(r=>actual.has(r.id))],['Nearby cinema references',others.filter(r=>!actual.has(r.id))]]){
  if(!group.length)continue;list.append(el('small','globe-land-group',label));
  for(const r of group.sort((a,b)=>a.name.localeCompare(b.name))){
   const n=matchingFilms(r.id).length,btn=button(r.name+(n?' · '+n+' '+(n===1?'credit':'credits'):' · no matching films'),()=>{
    preferredLand=r.id;pendingFilm='';filmOffset=0;focusKey='';drawEncounter();renderSoon();
    const next=$('#globe-encounter .globe-overlap');if(next){next.open=true;next.querySelector('summary')?.focus({preventScroll:true});}
   },'globe-land-choice');
   btn.dataset.landId=r.id;btn.dataset.relation=actual.has(r.id)?'contains':'nearby';list.append(btn);
  }
 }
 d.append(list);return d;
}
let collectionSourceKey='',collectionPanelKey='',linkFrom='',linkTo='',drawingLink=false,collectionNotice='',connectionDraft=null,starGroup='',starDrag=null,cancelledStarPointer=null,suppressStarClickUntil=0;
const store=()=>window.AtlasCollections;
function collectionState(){return store()?.current();}
function collectedPoints(){
 const cur=collectionState(),visible=new Set(cur?.threads.filter(t=>t.visible).flatMap(t=>t.items)||[]),out=[];
 for(const x of cur?.items||[]){
  if(x.type!=='film'||!visible.has(x.id))continue;
  const ref=C().reference(x),p=ref&&pointById.get(ref.id);if(p)out.push({id:x.id,film:x.film,title:x.title,land:ref.id,coord:p.coord});
 }return out;
}
const threadTones={'star-blue':'#83b8d4','star-yellow':'#d4c58c','star-red':'#d69e96','star-bluewhite':'#c8dbe7','star-orange':'#dbb28c','star-white':'#dbe4d9',blue:'#83b8d4',orange:'#dbb28c',teal:'#88bdae',purple:'#b8a6d4',rose:'#d6a6bb',olive:'#bac397',cyan:'#98c5d0',red:'#d69e96'};
function groupedStars(){const groups=new Map();for(const x of collectedPoints()){if(!groups.has(x.land))groups.set(x.land,[]);groups.get(x.land).push(x);}return groups;}
// Ephemeral catalogue theme connections, distinct from authored links.
function themeGeometry(){
 const a=featured&&pointById.get(featured.land);if(!themeTrace||!settled||!a)return emptyGeo();
 return {type:'FeatureCollection',features:themeRoutes.slice(0,3).flatMap(v=>{
  const b=pointById.get(v.ref.id);if(!b||b.id===a.id)return [];
  const interpolate=d3.geoInterpolate(a.coord,b.coord),n=Math.max(8,Math.ceil(d3.geoDistance(a.coord,b.coord)*60)),segments=[];let segment=[interpolate(0)];
  for(let i=1;i<=n;i++){const p=segment.at(-1),q=interpolate(i/n),delta=q[0]-p[0];if(Math.abs(delta)>180){const edge=delta>0?-180:180,adjust=q[0]+(delta>0?-360:360),t=(edge-p[0])/(adjust-p[0]),lat=p[1]+(q[1]-p[1])*t;if(Number.isFinite(lat)){segment.push([edge,lat]);segments.push(segment);segment=[[-edge,lat],q];continue;}}segment.push(q);}
  if(segment.length>1)segments.push(segment);return segments.length?[{type:'Feature',properties:{fromFilm:featured.film.id,toFilm:v.film.id,fromLand:a.id,toLand:b.id,theme:v.term},geometry:{type:'MultiLineString',coordinates:segments}}]:[];
 })};
}
function updateThemeMap(){if(!liveReady)return;const key=JSON.stringify([themeTrace,settled,featured?.film.id,featured?.land,themeRoutes.map(v=>[v.film.id,v.ref.id,v.term])]);if(key===themeSourceKey)return;themeSourceKey=key;live.getSource('globe-theme-links')?.setData(themeGeometry());}
function toggleThemeTrace(){themeTrace=!themeTrace;const b=$('#globe-trace-themes');if(b){b.setAttribute('aria-pressed',String(themeTrace));b.textContent=themeTrace?'Hide thematic lines':'Show thematic lines';}updateThemeMap();renderSoon();}
function collectionGeometry(){
 const grouped=groupedStars(),stars=[...grouped.values()].flat(),byItem=new Map(stars.map(x=>[x.id,x])),lines=[];
 const threads=collectionState()?.threads.filter(t=>t.visible)||[],tone=id=>threadTones[threads.find(t=>t.items.includes(id))?.color]||'#c8dbe7';
 const nodes=[...grouped.values()].map(group=>({type:'Feature',properties:{color:tone(group[0].id),land:group[0].land,item:group[0].id,count:group.length,selected:group.some(x=>x.id===linkFrom||x.id===linkTo)?1:0},geometry:{type:'Point',coordinates:group[0].coord}}));
 for(const l of collectionState()?.links||[]){
  const a=byItem.get(l.source),b=byItem.get(l.target);if(!a||!b||a.land===b.land)continue;
  const interpolate=d3.geoInterpolate(a.coord,b.coord),n=Math.max(8,Math.ceil(d3.geoDistance(a.coord,b.coord)*60)),segments=[],first=interpolate(0);let segment=[first];
  for(let i=1;i<=n;i++){const p=segment.at(-1),q=interpolate(i/n),delta=q[0]-p[0];if(Math.abs(delta)>180){const edge=delta>0?-180:180,adjust=q[0]+(delta>0?-360:360),t=(edge-p[0])/(adjust-p[0]),lat=p[1]+(q[1]-p[1])*t;if(Number.isFinite(lat)){segment.push([edge,lat]);segments.push(segment);segment=[[-edge,lat],q];continue;}}segment.push(q);}
  if(segment.length>1)segments.push(segment);if(segments.length)lines.push({type:'Feature',properties:{id:l.id,kind:l.kind,color:threadTones[threads.find(t=>t.items.includes(l.source)&&t.items.includes(l.target))?.color]||'#b4d7de'},geometry:{type:'MultiLineString',coordinates:segments}});
 }
 return {stars:{type:'FeatureCollection',features:nodes},lines:{type:'FeatureCollection',features:lines},mapped:stars.length};
}
function collectionSummary(){const c=collectionState(),g=collectionGeometry();return {id:c?.id,name:c?.name,items:c?.items.filter(x=>x.type==='film').length||0,mapped:g.mapped,stars:g.stars.features.length,lines:g.lines.features.length,links:c?.links.length||0,saved:!!c&&store().saved(c.id)&&!store().dirty()};}
function updateCollectionMap(){if(!liveReady)return;const c=collectionState(),key=JSON.stringify([c?.id,c?.items.map(x=>x.id),c?.pins,c?.threads.map(t=>[t.visible,t.color,t.items]),c?.links,linkFrom,linkTo]);if(key===collectionSourceKey)return;collectionSourceKey=key;const g=collectionGeometry();live.getSource('globe-collected')?.setData(g.stars);live.getSource('globe-authored-links')?.setData(g.lines);}
function starAt(x,y){
 if(!liveReady)return null;
 const h=10,hit=live.queryRenderedFeatures([[x-h,y-h],[x+h,y+h]],{layers:['globe-user-star']});
 // Choose the closest visible anchor rather than layer order when symbols overlap.
 const groups=groupedStars();const candidates=[...new Set(hit.map(f=>f.properties.land))].map(id=>{const group=groups.get(id),p=group?.[0];if(!p)return null;const q=live.project(p.coord);return {id,group,d:Math.hypot(q.x-x,q.y-y)};}).filter(Boolean).sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id));
 return candidates[0]||null;
}
function openStarGroup(id){
 starGroup=id;collectionNotice='';if(menuMode!=='collection')setMenu('collection');else renderCollection(true);
 $('#globe-star-group-heading')?.focus({preventScroll:true});
}
function selectStar(hit){
 if(!hit)return;
 if(hit.group.length>1){openStarGroup(hit.id);return;}
 const id=hit.group[0].id;
 if(drawingLink){starGroup='';pickLink(id);if(linkTo&&menuMode!=='collection')setMenu('collection');else if(!linkTo&&menuMode==='collection')setMenu('');return;}
 const item=collectionState()?.items.find(x=>x.id===id);if(item)openCollected(item);
}
function clearStarDrag(completed=false){
 const drag=starDrag;starDrag=null;$('#globe-draw-preview')?.remove();if(drag&&completed!==true){cancelledStarPointer=drag.pointer;suppressStarClickUntil=nowMs()+350;}
 if(drag?.pan&&liveReady)live.dragPan.enable();
 if(drag?.element?.hasPointerCapture?.(drag.pointer))try{drag.element.releasePointerCapture(drag.pointer);}catch{}
 return drag;
}
function installStarDrawing(){
 const surface=live.getCanvas(),opts={capture:true,passive:false,signal:zoomListeners.signal};
 const local=e=>{const b=surface.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top];};
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const preview=(a,b)=>{
  let svg=$('#globe-draw-preview');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='globe-draw-preview';svg.setAttribute('aria-hidden','true');const line=document.createElementNS(svg.namespaceURI,'line');svg.append(line);host.append(svg);}
  const line=svg.firstChild;for(const [k,v] of Object.entries({x1:a[0],y1:a[1],x2:b[0],y2:b[1]}))line.setAttribute(k,String(v));
 };
 window.addEventListener('pointerdown',e=>{
  if(starDrag&&e.pointerId!==starDrag.pointer){clearStarDrag();return;}
  if(cancelledStarPointer===e.pointerId)cancelledStarPointer=null;
  if(!drawingLink||linkTo||!settled||!e.isPrimary||e.button!==0||e.pointerType==='touch'||!surface.contains(e.target))return;
  const xy=local(e),hit=starAt(...xy);if(!hit)return;
  const source=hit.group.find(x=>x.id===linkFrom)||(hit.group.length===1?hit.group[0]:null);if(!source)return;
  if(linkFrom&&linkFrom!==source.id)return; // click/tap still selects a second star
  stop(e);const pan=live.dragPan.isEnabled();if(pan)live.dragPan.disable();const q=live.project(source.coord);
  starDrag={pointer:e.pointerId,source:source.id,land:hit.id,start:xy,anchor:[q.x,q.y],pan,element:surface,moved:false};
  try{surface.setPointerCapture(e.pointerId);}catch{}
 },opts);
 window.addEventListener('pointermove',e=>{const drag=starDrag;if(!drag||e.pointerId!==drag.pointer)return;stop(e);const xy=local(e);if(Math.hypot(xy[0]-drag.start[0],xy[1]-drag.start[1])>5)drag.moved=true;if(drag.moved)preview(drag.anchor,xy);},opts);
 window.addEventListener('pointerup',e=>{
  if(cancelledStarPointer===e.pointerId){cancelledStarPointer=null;suppressStarClickUntil=nowMs()+350;stop(e);return;}
  const drag=starDrag;if(!drag||e.pointerId!==drag.pointer)return;stop(e);
  const hit=starAt(...local(e));clearStarDrag(true);suppressStarClickUntil=nowMs()+350;
  if(!drag.moved){if(hit)selectStar(hit);return;}
  if(!hit||hit.id===drag.land)return; // cancellation never writes a relation
  if(!linkFrom)pickLink(drag.source);
  selectStar(hit);
 },opts);
 window.addEventListener('pointercancel',e=>{if(starDrag?.pointer===e.pointerId)clearStarDrag();if(cancelledStarPointer===e.pointerId)cancelledStarPointer=null;},opts);
 window.addEventListener('blur',clearStarDrag,{signal:zoomListeners.signal});
 window.addEventListener('click',e=>{if(nowMs()<suppressStarClickUntil&&surface.contains(e.target)){stop(e);suppressStarClickUntil=0;}},opts);
}
function pickLink(id){if(!collectionState()?.items.some(x=>x.id===id&&x.type==='film'))return;if(!drawingLink){drawingLink=true;linkFrom=id;linkTo='';}else if(!linkFrom||linkFrom===id){linkFrom=id;linkTo='';}else{linkTo=id;}collectionNotice='';collectionPanelKey='';renderCollection();updateCollectButton();renderSoon();}
function collectFilm(film,land){if(!settled||featured?.film.id!==film.id||featured?.land!==land)return;const ok=C().globeCollect(film,land);collectionNotice=ok?'Added to '+store().activeThread().name+'.':'Could not add this film.';collectionPanelKey='';updateCollectButton();renderCollection();renderSoon();sync();}
function openCollected(x){starGroup='';const ref=C().reference(x);if(!ref||!pointById.has(ref.id)){if(menuMode)setMenu('');const exact=C().globeCreditIndex().films.find(f=>f.id===x.id);if(exact)previewFromGlobe(exact,'',null);else{collectionNotice='This film has no current catalogue record.';setMenu('collection');}return;}if(menuMode)setMenu('');clearDiscoveryFilters();gotoLand(ref.id,x.id,true);}
let readingJourney=null;
function journeyItems(){const cur=collectionState(),t=store()?.activeThread();return (t?.items||[]).map(id=>cur.items.find(x=>x.id===id)).filter(Boolean);}
function journeyReference(x){if(x?.type!=='film')return null;const ref=C().reference(x);return ref&&pointById.has(ref.id)?ref:null;}
function currentReadingItem(){if(!readingJourney)return null;const cur=collectionState(),t=store()?.activeThread();if(readingJourney.collection!==cur?.id||readingJourney.thread!==t?.id){readingJourney=null;return null;}const item=journeyItems().find(x=>x.id===readingJourney.item);if(!item)readingJourney=null;return item||null;}
function readJourneyStep(i){const cur=collectionState(),t=store().activeThread(),items=journeyItems();if(i<0||i>=items.length)return;const item=items[i],ref=journeyReference(item);readingJourney={collection:cur.id,thread:t.id,index:i,item:item.id};if(menuMode)setMenu('');focusKey='';if(ref){clearDiscoveryFilters();gotoLand(ref.id,item.id,true);}else{drawEncounter();placeEmergent();}renderSoon();}
function journeyControls(film){if(!readingJourney)return null;const cur=collectionState(),t=store().activeThread(),items=journeyItems();if(readingJourney.collection!==cur.id||readingJourney.thread!==t.id){readingJourney=null;return null;}const i=items.findIndex(x=>x.id===readingJourney.item);if(i<0){readingJourney=null;return null;}const box=el('div','globe-reading-journey'),row=el('div','globe-buttons'),prev=button('‹',()=>readJourneyStep(i-1)),next=button('›',()=>readJourneyStep(i+1)),end=button('End',()=>{readingJourney=null;focusKey='';drawEncounter();});prev.disabled=i===0;next.disabled=i===items.length-1;const noun=items.every(x=>x.type==='film')?'film':'item';prev.setAttribute('aria-label','Previous '+noun+' in thread');next.setAttribute('aria-label','Next '+noun+' in thread');row.append(prev,el('small',null,(i+1)+' / '+items.length),next,end);box.append(el('small','globe-source-label','Reading · '+t.name),row);
 if(film.id!==items[i].id){box.append(button('Return to thread film',()=>readJourneyStep(i)));return box;}
 for(const note of new Set([t.notes?.[film.id],film.note].filter(Boolean)))box.append(el('p',null,note));
 const incoming=i>0&&cur.links.find(l=>l.source===items[i-1].id&&l.target===film.id);if(incoming){box.append(el('small',null,'Your connection: '+incoming.label));if(incoming.note)box.append(el('p',null,incoming.note));}
 return box;}
function renderCollection(force=false){
 const panel=$('#globe-collection-panel'),toggle=$('#globe-collection-toggle'),cur=collectionState();if(!panel||!toggle||!cur)return;
 const films=cur.items.filter(x=>x.type==='film'),summary=collectionSummary();
 const label=(drawingLink?'Connecting': 'My films')+(films.length?' ('+films.length+')':'');if(toggle.textContent!==label)toggle.textContent=label;toggle.setAttribute('aria-label',drawingLink?'Connecting films':label);
 const key=JSON.stringify([cur.id,cur.name,cur.activeThread,cur.threads.map(t=>[t.id,t.name,t.visible,t.items]),cur.items,cur.links,cur.pins,summary.saved,store().state.collections.map(c=>[c.id,c.name,store().saved(c.id)]),drawingLink,linkFrom,linkTo,collectionNotice,starGroup]);
 if(!force&&key===collectionPanelKey)return;collectionPanelKey=key;
 if(panel.hidden)return;
 const priorCollection=panel.dataset.collection,priorThread=panel.dataset.thread,sameCollection=priorCollection===cur.id&&priorThread===cur.activeThread;
 const openSettings=sameCollection&&panel.querySelector('.globe-collection-settings')?.open,openLinks=sameCollection&&panel.querySelector('.globe-authored-list')?.open;
 const scroll=sameCollection?panel.scrollTop:0,focused=panel.contains(document.activeElement)?document.activeElement:null;
 const focusId=focused?.id,focusLabel=focused?.getAttribute('aria-label'),focusItem=focused?.dataset.collectedId;
 panel.replaceChildren();panel.dataset.collection=cur.id;panel.dataset.thread=cur.activeThread;
 function restoreCollectionPanel(){
  if(openSettings)panel.querySelector('.globe-collection-settings').open=true;
  if(openLinks&&panel.querySelector('.globe-authored-list'))panel.querySelector('.globe-authored-list').open=true;
  panel.scrollTop=scroll;
  if(focused){const target=[...panel.querySelectorAll('button,input,select,textarea')].find(e=>focusId&&e.id===focusId||focusLabel&&e.getAttribute('aria-label')===focusLabel||focusItem&&e.dataset.collectedId===focusItem);if(target&&!target.disabled)target.focus({preventScroll:true});}
 }
 const settings=el('details','globe-collection-settings');settings.append(el('summary',null,'Manage collections and threads'));const name=el('label',null,'Constellation'),select=el('select');select.setAttribute('aria-label','Choose constellation');for(const c of store().state.collections){const o=el('option',null,c.name+(store().saved(c.id)?'':' · Draft'));o.value=c.id;select.append(o);}select.value=cur.id;select.onchange=()=>{clearStarDrag();starGroup='';drawingLink=false;linkFrom=linkTo='';connectionDraft=null;collectionNotice='';store().activate(select.value);renderCollection(true);};name.append(select);settings.append(name);
 const thread=el('label',null,'Thread'),ts=el('select');ts.setAttribute('aria-label','Choose thread');for(const t of cur.threads){const o=el('option',null,t.name);o.value=t.id;ts.append(o);}ts.value=cur.activeThread;ts.onchange=()=>{clearStarDrag();starGroup='';drawingLink=false;linkFrom=linkTo='';connectionDraft=null;cur.activeThread=ts.value;store().save();renderCollection(true);};thread.append(ts);settings.append(thread);
 const info=el('p','globe-collection-info',films.length+' collected films · '+summary.mapped+' mapped · '+cur.links.length+' connections');panel.append(info);
 const actions=el('div','globe-buttons');const save=button(summary.saved?'Saved in browser':'Save',()=>{collectionNotice=store().persist()?'Saved in this browser.':'Save failed. Export a JSON copy.';renderCollection(true);});save.disabled=!cur.items.length||summary.saved;save.id='globe-save-collection';const fresh=button('New',()=>{if(store().dirty()&&cur.items.length&&!window.confirm('Start a new draft? The current draft stays in this tab until saved.'))return;clearStarDrag();starGroup='';drawingLink=false;linkFrom=linkTo='';connectionDraft=null;collectionNotice='';store().create('Untitled constellation');renderCollection(true);});actions.append(save);settings.append(fresh);panel.append(actions);
 const exportCopy=button('Export JSON',()=>{const blob=new Blob([JSON.stringify(C().jsonExport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='atlas-collection.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});settings.append(exportCopy);panel.append(settings);if(films.length){const share=button('Share constellation',async()=>{const snapshot=C().shareURL('globe');if(!snapshot){collectionNotice='Too large to share as a link. Export JSON under Manage collections and threads.';renderCollection(true);return;}const u=new URL(shareView());u.hash=new URL(snapshot).hash;try{await navigator.clipboard.writeText(u.href);collectionNotice='Constellation link copied.';renderCollection(true);}catch{const field=el('input');field.readOnly=true;field.value=u.href;field.setAttribute('aria-label','Shareable constellation link');share.after(field);field.select();}});actions.append(share);}
 const msg=el('p','globe-collection-info',collectionNotice||(!films.length?'Collect a film to begin.':'Choose films to revisit or connect.'));msg.setAttribute('role','status');panel.append(msg);
 if(!films.length&&!journeyItems().length){restoreCollectionPanel();return;}
 const draw=button(drawingLink?'Cancel connection':'Connect two films',()=>{drawingLink=!drawingLink;linkFrom=linkTo='';connectionDraft=null;collectionNotice='';renderCollection(true);updateCollectButton();renderSoon();});draw.id='globe-draw-link';draw.disabled=films.length<1;draw.setAttribute('aria-pressed',String(drawingLink));panel.append(draw);if(!drawingLink&&journeyItems().length){const read=button('Read this thread',()=>readJourneyStep(0));read.id='globe-read-thread';panel.append(read);}
 if(drawingLink){panel.append(el('p','globe-collection-info',!linkFrom?'Choose a film or star.':!linkTo?'Explore or choose another collected film.':'Give your connection a reason.'));
  if(linkFrom&&linkTo){const form=el('form','globe-link-form'),from=films.find(x=>x.id===linkFrom),to=films.find(x=>x.id===linkTo);if(from&&to){form.append(el('strong',null,from.title+' → '+to.title));const reason=el('input');reason.id='globe-link-reason';reason.required=true;reason.maxLength=180;reason.placeholder='Why do these films connect?';reason.setAttribute('aria-label','Connection reason');const kind=el('select');kind.setAttribute('aria-label','Connection type');for(const [v,l] of [['interpretation','My interpretation'],['question','My question']]){const o=el('option',null,l);o.value=v;kind.append(o);}const note=el('textarea');note.placeholder='Optional note';note.setAttribute('aria-label','Connection note');note.maxLength=10000;const submit=el('button',null,'Save connection');submit.type='submit';const draftKey=JSON.stringify([cur.id,cur.activeThread,linkFrom,linkTo]);
 if(connectionDraft?.key!==draftKey)connectionDraft={key:draftKey,reason:'',kind:'interpretation',note:''};
 reason.value=connectionDraft.reason;kind.value=connectionDraft.kind;note.value=connectionDraft.note;
 const rememberDraft=()=>{connectionDraft={key:draftKey,reason:reason.value,kind:kind.value,note:note.value};};
 form.addEventListener('input',rememberDraft);kind.addEventListener('change',rememberDraft);
 form.append(reason,kind,note,submit);form.onsubmit=e=>{e.preventDefault();if(C().globeConnect(linkFrom,linkTo,reason.value,note.value,kind.value)){drawingLink=false;linkFrom=linkTo='';connectionDraft=null;collectionNotice='Your connection is saved in the draft.';renderCollection(true);updateCollectButton();renderSoon();}};panel.append(form);}}
 }
 const group=groupedStars().get(starGroup);if(starGroup&&!group)starGroup='';
 if(group){const header=el('div','globe-star-group'),heading=el('strong',null,byId.get(starGroup)?.name||'Collected films');heading.id='globe-star-group-heading';heading.tabIndex=-1;header.append(heading,el('small',null,group.length+' collected films at this land reference'),button('Show all collected films',()=>{starGroup='';renderCollection(true);}));panel.append(header);}
 const list=el('div','globe-collected-list');const displayed=group?films.filter(x=>group.some(g=>g.id===x.id)):films;for(const x of displayed){const p=C().reference(x),b=button(x.title,()=>{if(!drawingLink){openCollected(x);return;}pickLink(x.id);if(!linkTo&&starGroup){starGroup='';setMenu('');}else if(linkTo){starGroup='';renderCollection(true);$('#globe-link-reason')?.focus({preventScroll:true});}},'globe-collected-item');b.dataset.collectedId=x.id;b.setAttribute('aria-pressed',String(linkFrom===x.id||linkTo===x.id));const row=el('div');row.append(b,el('small',null,[x.maker,p?.name||'Not mapped'].filter(Boolean).join(' · ')));list.append(row);}panel.append(list);
 const displayedLinks=group?cur.links.filter(l=>group.some(x=>x.id===l.source)&&group.some(x=>x.id===l.target)):cur.links;
 if(displayedLinks.length){const details=el('details','globe-authored-list');details.append(el('summary',null,(group?'Connections within this land':'Your connections')+' ('+displayedLinks.length+')'));for(const l of displayedLinks){const a=cur.items.find(x=>x.id===l.source),b=cur.items.find(x=>x.id===l.target);if(a&&b)details.append(el('p',null,a.title+' → '+b.title+' · '+l.label+' ('+l.kind+')'));}panel.append(details);}
 restoreCollectionPanel();
}
function updateCollectButton(){const b=$('#globe-collect-film'),link=$('#globe-connect-featured');if(!b||!featured)return;const id=featured.film.id,on=!!store()?.activeThread().items.includes(id),inCollection=!!collectionState()?.items.some(x=>x.id===id&&x.type==='film');b.disabled=on;b.textContent=on?'Collected':'＋ Collect';if(link){link.hidden=!inCollection;link.disabled=drawingLink&&linkFrom===id&&!linkTo;link.textContent=drawingLink&&linkFrom&&linkFrom!==id?'Connect to this film':drawingLink&&linkFrom===id?'First film selected':'Connect';link.setAttribute('aria-pressed',String(drawingLink&&(linkFrom===id||linkTo===id)));}}
function setEncounterExpanded(value){encounterExpanded=!!value;const panel=$('#globe-encounter'),toggle=$('#globe-expand-encounter');if(panel)panel.dataset.expanded=String(encounterExpanded);if(toggle){toggle.textContent=encounterExpanded?'−':'↗';toggle.setAttribute('aria-expanded',String(encounterExpanded));toggle.setAttribute('aria-label',encounterExpanded?'Reduce film panel':'Expand film panel');toggle.title=toggle.getAttribute('aria-label');}placeEmergent();}
function focusEncounter(){const target=$('#globe-encounter .globe-film-title')||$('#globe-encounter summary')||$('#globe-encounter button');if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}}
function filmStrip(films){
 const strip=el('div','globe-film-strip'),head=el('div','globe-strip-heading'),track=el('div','globe-strip-track');
 const move=delta=>{filmOffset=(filmOffset+delta+films.length)%films.length;focusKey='';drawEncounter();};
 const prev=button('‹',()=>move(-1),'globe-cycle'),next=button('›',()=>move(1),'globe-cycle');prev.setAttribute('aria-label','Previous film');next.setAttribute('aria-label','Next film');
 head.append(el('strong',null,'Films'),el('small',null,(filmOffset+1)+' / '+films.length),prev,next);
 track.setAttribute('role','group');track.setAttribute('aria-label','Film thumbnails');track.tabIndex=0;
 const size=8;filmStripStart=Math.max(0,Math.min(filmStripStart,Math.max(0,films.length-size)));if(filmOffset<filmStripStart||filmOffset>=filmStripStart+size)filmStripStart=Math.min(filmOffset,Math.max(0,films.length-size));
 for(let i=filmStripStart;i<Math.min(filmStripStart+size,films.length);i++){
  const f=films[i],b=button('',()=>{filmOffset=i;focusKey='';drawEncounter();focusEncounter();},'globe-strip-item'),thumb=el('span','globe-strip-art');
  b.dataset.stripFilm=f.id;b.setAttribute('aria-label',f.title+' · '+f.maker);if(i===filmOffset)b.setAttribute('aria-current','true');
  artwork(thumb,f,'strip');b.append(thumb,el('span','globe-strip-title',f.title));track.append(b);
 }
 strip.append(head,track);requestAnimationFrame(()=>{if(!track.isConnected)return;const selected=track.querySelector('[aria-current=true]');if(selected&&selected.offsetLeft+selected.offsetWidth>track.scrollLeft+track.clientWidth)track.scrollLeft=selected.offsetLeft+selected.offsetWidth-track.clientWidth;});return strip;
}
function landFilmPicker(films){
 const details=el('details','globe-land-films'),summary=el('summary',null,'All credits ('+films.length+')'),list=el('div','globe-land-film-list');details.append(summary,list);
 let limit=0;const append=()=>{const end=Math.min(limit+30,films.length);list.querySelector('.globe-land-film-more')?.remove();for(let i=limit;i<end;i++){const f=films[i],b=button('',()=>{if(!settled)return;filmOffset=i;focusKey='';drawEncounter();focusEncounter();},'globe-land-film');b.append(el('strong',null,f.title),el('small',null,[f.maker,f.year].filter(Boolean).join(' · ')));b.dataset.filmId=f.id;if(i===filmOffset)b.setAttribute('aria-current','true');list.append(b);}limit=end;if(limit<films.length)list.append(button('Show more films',append,'globe-land-film-more'));};
 details.addEventListener('toggle',()=>{if(details.open&&!limit)append();});return details;
}
function drawUnmappedReading(item,panel,status){
 const key=JSON.stringify(['unmapped-reading',readingJourney,store()?.activeThread()?.notes,collectionState()?.links,item]);
 if(key===focusKey){placeEmergent();return;}focusKey=key;featured=null;
 const hadFocus=panel.contains(document.activeElement),priorLabel=hadFocus?document.activeElement?.getAttribute('aria-label'):null;
 panel.replaceChildren();panel.dataset.land='';panel.dataset.film=item.id;panel.scrollTop=0;
 panel.append(el('small','globe-association',item.type==='film'?'Film without a mapped land reference':item.type==='maker'?'Filmmaker in the authored thread':'Authored constellation item'));
 const title=el('strong','globe-unmapped-title',item.title);panel.append(title);
 if(item.type==='film'){
  const exact=C().globeCreditIndex().films.find(f=>f.id===item.id||f.film===item.film&&f.record===item.record);
  panel.append(el('small','globe-film-byline',[item.maker,item.year].filter(Boolean).join(' · ')));
  if(exact){const {actions}=encounterLinks(exact,C().globeMetadata(exact)?.film);if(actions.childNodes.length)panel.append(actions);}
 }
 const controls=journeyControls(item);if(controls)panel.append(controls);
 status.textContent='Reading '+item.title+' without moving the globe';
 if(hadFocus){const next=[...panel.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===priorLabel&&!b.disabled);if(next)next.focus({preventScroll:true});else panel.querySelector('.globe-reading-journey button:not(:disabled)')?.focus({preventScroll:true});}
 placeEmergent();
}
function drawEncounter(){
 const panel=$('#globe-encounter'),status=$('#globe-status'),actual=new Set(inside.map(r=>r.id));
 const chosen=focusIds.map(id=>byId.get(id)).filter(Boolean);
 const primary=chooseTarget(chosen);targetPrimary=primary?.id||'';targetReason=!primary?'none':actual.has(primary.id)?'contains-target':near.some(v=>v.p.id===primary.id)?'nearby-marker':'explicit-anchor';targetFeedback();
 const readingItem=currentReadingItem();if(readingItem&&!journeyReference(readingItem)){drawUnmappedReading(readingItem,panel,status);return;}
 const films=primary?rankedFilms(primary.id):[];
 if(primary&&lastEncounter!==primary.id){filmOffset=0;filmStripStart=0;lastEncounter=primary.id;}
 if(pendingFilm){const i=films.findIndex(f=>f.id===pendingFilm);if(i>=0){filmOffset=i;pendingFilm='';}}
 filmOffset=Math.min(filmOffset,Math.max(0,films.length-1));
 const sig=JSON.stringify([focusIds,inside.map(v=>v.id),primary?.id,films.map(f=>f.id),filmOffset,yearBand,currentTheme(),facetFilter,publicationStatus,pendingFilm,journey.length,readingJourney,readingJourney?collectionState()?.id:null,readingJourney?collectionState()?.activeThread:null,readingJourney?store()?.activeThread().items:null]);
 if(sig===focusKey){updateCollectButton();const link=panel.querySelector('[data-view-kind^="indexed-"]');if(link&&featured)link.href=watchURL(featured.film);placeEmergent();return;}focusKey=sig;
 const nextFilm=films[filmOffset],sameEncounter=!!primary&&panel.dataset.land===primary.id&&panel.dataset.film===(nextFilm?.id||'');
 const savedScroll=sameEncounter?panel.scrollTop:0,openDetails=[...panel.querySelectorAll('details[open]')].map(d=>d.classList[0]);
 const oldArt=sameEncounter?panel.querySelector('.globe-feature-art'):null;
 const activeControl=panel.contains(document.activeElement)?document.activeElement:null;
 const focusLabel=activeControl?.getAttribute('aria-label'),focusId=activeControl?.id;
 panel.replaceChildren();panel.dataset.expanded=String(encounterExpanded);panel.dataset.land=primary?.id||'';panel.dataset.film=nextFilm?.id||'';panel.scrollTop=0;
 function restorePanel(){
  if(sameEncounter){for(const d of panel.querySelectorAll('details'))if(openDetails.includes(d.classList[0]))d.open=true;panel.scrollTop=savedScroll;}
  // Repeated Previous/Next and keyboard reading retain their control after replacement.
  if(activeControl){const candidate=[...panel.querySelectorAll('button,a,summary')].find(e=>focusId&&e.id===focusId||focusLabel&&e.getAttribute('aria-label')===focusLabel);if(candidate&&!candidate.disabled)candidate.focus({preventScroll:true});else if(sameEncounter)panel.querySelector('.globe-film-title')?.focus({preventScroll:true});}
 }
 if(!primary){featured=null;themeRoutes=[];setEncounterExpanded(false);panel.append(el('strong',null,'Explore the globe'),el('p','globe-empty','Move the globe to bring a cinema light into focus.'));status.textContent='No land reference in focus';restorePanel();placeEmergent();return;}
 recordVisit(primary);
 const film=films[filmOffset],ref=film?A().recordLandReferences(film.record).find(r=>r.id===primary.id):null;
 const head=el('div','globe-encounter-heading'),landTitle=el('strong',null,primary.name);if(primary.fullName!==primary.name)landTitle.title=primary.fullName;head.append(landTitle);
 if(films.length){head.append(el('small','globe-cinema-count',countLabel(cinemaStats(films).films,'film')+' · '+countLabel(cinemaStats(films).makers,'filmmaker')));const expand=button(encounterExpanded?'−':'↗',()=>setEncounterExpanded(!encounterExpanded),'globe-expand-encounter');expand.id='globe-expand-encounter';expand.setAttribute('aria-expanded',String(encounterExpanded));expand.setAttribute('aria-label',encounterExpanded?'Reduce film panel':'Expand film panel');expand.title=expand.getAttribute('aria-label');head.append(expand);}else setEncounterExpanded(false);
 panel.append(head);const activeThemes=currentTheme();if(activeThemes.length)head.append(el('small','globe-active-theme',activeThemes.join(' · ')));
 const assoc=el('small','globe-association',film?(ref?.status==='sourced'?'Sourced association':'Provisional association'):(actual.has(primary.id)?'Land at the focal point':'Nearby land reference'));if(film&&!actual.has(primary.id))assoc.textContent='Nearby · '+assoc.textContent;if(!film||ref?.status!=='sourced'||!actual.has(primary.id))head.append(assoc);
 if(film){
  featured={land:primary.id,film};const card=el('div','globe-featured'+(sameEncounter?'':' globe-art-arrive')),reuseArt=oldArt&&oldArt.dataset.source===(C().sourceImage(film)||''),art=reuseArt?oldArt:el('button','globe-feature-art');
  art.type='button';art.onclick=()=>previewFromGlobe(film,primary.id,art);art.setAttribute('aria-label','Preview '+film.title);if(!reuseArt)artwork(art,film,'feature');
  const copy=el('div','globe-feature-copy'),title=button(film.title,()=>previewFromGlobe(film,primary.id,title),'globe-film-title');
  const work=C().globeMetadata(film)?.film||A().recordById(film.record)?.films.find(x=>x.id===film.film),facet=exactFacet(film),format=facet.f||work?.weaveForm||work?.medium;
  const rawLength=facet.n||work?.weaveLength,length=({S:'Short',F:'Feature',M:'Mid-length'})[rawLength]||rawLength,runtime=Number(work?.runtimeMinutes)>0?work.runtimeMinutes+' min':'';
  copy.append(title,el('small','globe-film-byline',[film.maker,film.year].filter(Boolean).join(' · ')));
  const facts=[format,length,runtime].filter(Boolean).join(' · ');if(facts)copy.append(el('small','globe-film-facts',facts));
  const {actions,profile,external}=encounterLinks(film,work);const actionRow=el('div','globe-encounter-actions');for(const a of [...actions.children])if(a.classList.contains('globe-view-link'))actionRow.append(a);
  const inThread=store()?.activeThread().items.includes(film.id),collect=button(inThread?'Collected':'＋ Collect',()=>collectFilm(film,primary.id),'globe-collect-film');collect.id='globe-collect-film';collect.disabled=!!inThread;actionRow.append(collect);const link=button('Connect',()=>{if(!settled||featured?.film.id!==film.id)return;pickLink(film.id);updateCollectButton();if(linkTo&&menuMode!=='collection')setMenu('collection');else if(linkFrom&&!linkTo){collectionNotice='Explore and collect another film, then connect it.';if(menuMode==='collection')setMenu('');renderCollection(true);}},'globe-connect-featured');link.id='globe-connect-featured';link.hidden=true;actionRow.append(link);
  copy.append(actionRow);card.append(art,copy);panel.append(card);updateCollectButton();const reading=journeyControls(film);if(reading)panel.append(reading);
  if(films.length>1)panel.append(filmStrip(films));
  const disclosures=el('div','globe-encounter-disclosures');if(films.length>1)disclosures.append(landFilmPicker(films));const other=otherLands(chosen,primary);if(other)disclosures.append(other);
  const source=landSources(ref);if(external)source.append(external);if(profile)source.append(profile);
  const language=facet.l||work?.languageLabels||work?.languages,lang=Array.isArray(language)?language.join(' · '):typeof language==='string'?language:'';
  if(lang)source.append(el('p',null,'Language: '+lang));
  const themes=el('div','globe-film-themes');for(const t of C().terms(film))themes.append(button(t,()=>{C().showThemeLens([t]);filmOffset=0;sync();}));if(themes.childNodes.length){source.append(el('small','globe-source-label','Themes'),themes);}
  const related=relatedEncounters(film,primary.id);themeRoutes=related;if(related.length){const routes=el('div','globe-related-list');routes.append(el('small','globe-source-label','Shared catalogue themes · film connections, not relationships between peoples'));const trace=button(themeTrace?'Hide thematic lines':'Show thematic lines',toggleThemeTrace,'globe-theme-trace');trace.id='globe-trace-themes';trace.setAttribute('aria-pressed',String(themeTrace));routes.append(trace);for(const [i,v] of related.entries()){const bridge=button('',()=>followRelated(v),'globe-related');const thumb=el('span','globe-strip-art'),copy=el('span','globe-list-copy');artwork(thumb,v.film,'strip');copy.append(el('strong',null,v.film.title),el('small',null,v.ref.name+' · '+v.shared.join(' · ')));bridge.append(thumb,copy);bridge.dataset.targetFilm=v.film.id;bridge.dataset.targetLand=v.ref.id;routes.append(bridge);}if(routes.querySelector('button')){const relatedDetails=el('details','globe-related-details');relatedDetails.append(el('summary',null,'Connections ('+related.length+')'),routes);disclosures.append(relatedDetails);}}
  if(journey.length){const back=button('‹ Previous encounter',journeyBack,'globe-related');back.id='globe-journey-back';panel.append(back);}
  disclosures.append(creditDetails(film,[source]));for(const d of disclosures.children){d.name='atlas-globe-encounter';d.addEventListener('toggle',()=>{if(d.open){for(const other of disclosures.children)if(other!==d&&other.open)other.open=false;}placeEmergent();});}panel.append(disclosures);
 }else{
  featured=null;themeRoutes=[];panel.append(el('p','globe-empty',primary.count?'No films match the active filters.':'No linked films in the Atlas yet.'));
  const other=otherLands(chosen,primary);if(other)panel.append(other);
  if(primary.count)panel.append(button('Clear film filters',clearDiscoveryFilters,'globe-more'));else if(points.some(p=>matchingFilms(p.id).length))panel.append(button('Discover a film',surprise,'globe-more'));
  const d=el('details','globe-credit-details');d.append(el('summary',null,'Sources'),landSources(null));panel.append(d);
 }
 status.textContent=primary.name+' · '+films.length+' matching film credits';restorePanel();placeEmergent();updateThemeMap();renderSoon();
}

function settle(){
 if(!active||!W||!H)return;
 if(pointers.size||activeMapPointers.size||flight||wheelActive||gestureStart!==null){scheduleSettle(180);return;}
 // Never resolve the geographic encounter against an intermediate camera frame.
 // A busy tab can pause animation frames for >350ms while MapLibre is still moving.
 if(liveReady){readLiveCamera();if(live.isMoving()){scheduleSettle(180);return;}}
 settled=true;host.classList.remove('is-moving');$('#globe-encounter').setAttribute('aria-busy','false');updateProjection();updateTarget();inside=underFocus();
 const nearby=screenPoints().filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));near=nearby;
 const direct=inside.filter(v=>matchingFilms(v.id).length);
 // All overlapping land references remain available. Catalogue size never ranks peoples.
 // If no matching film sits beneath the focus, an actual nearby indexed point may respond.
 // An explicit selection at its exact camera anchor takes precedence over
 // incidental overlapping polygons, including anchors clamped at the poles.
 // A freely moved camera does not retain a remote territory.
 const requested=labelAnchors.get(preferredLand)?.coordinates||pointById.get(preferredLand)?.coord,cap=liveReady?85:89.9;
 const atRequestedAnchor=!!requested&&!!targetCoordinate&&d3.geoDistance(targetCoordinate,[requested[0],clamp(requested[1],-cap,cap)])<.0001;
 const next=[...new Set([...direct.map(v=>v.id),...nearby.map(v=>v.p.id),...inside.map(v=>v.id),...(atRequestedAnchor?[preferredLand]:[])])];
 if(preferredLand&&!next.includes(preferredLand)){preferredLand='';pendingFilm='';}
 focusIds=next;
 // Preserve the exact credit only if the resolved territory remains the same.
 // Do not carry a pending credit into an unrelated overlapping territory.
 if(!pendingFilm&&featured&&chooseTarget(next.map(id=>byId.get(id)).filter(Boolean))?.id===featured.land&&matchingFilms(featured.land).some(f=>f.id===featured.film.id))pendingFilm=featured.film.id;
 lastSettledFilter=filterKey();drawEncounter();updateTerritoryLabels();placeEmergent();renderSoon();
}
function scheduleSettle(ms=180){clearTimeout(settleTimer);settleTimer=setTimeout(settle,ms);}
function movement(){
 clearStarDrag();settled=false;placeEmergent();host.classList.add('is-moving');$('#globe-encounter').setAttribute('aria-busy','true');renderSoon();scheduleSettle();
}
function finishMove(){if(!host)return;/* Keep the prior encounter inactive until focal geography settles. */scheduleSettle(140);}
function cancelFlight(){if(flight)cancelAnimationFrame(flight);flight=0;flightTarget=null;}
function setCamera(c,z=zoom,duration=300){
 inboundEncounter=null;requestedPitch=0;
 if(liveReady){stopWheel();movement();const target={center:[wrap(c[0]),clamp(c[1],-85,85)],zoom:clamp(liveBaseZoom+Math.log2(Math.max(.1,z)),live.getMinZoom(),live.getMaxZoom()),duration:reduced.matches?0:duration};live.easeTo(target);return;}
 stopWheel();cancelFlight();const goal=[wrap(c[0]),clamp(c[1],-89.9,89.9)],goalZoom=overviewZoom(z);
 movement();
 if(reduced.matches||duration===0){center=goal;zoom=goalZoom;finishMove();return;}
 flightTarget={center:goal,zoom:goalZoom};
 const start=performance.now(),interpolate=d3.geoInterpolate(center,goal),fromZoom=zoom;
 function tick(now){const t=clamp((now-start)/duration,0,1),ease=1-Math.pow(1-t,3);
  center=interpolate(ease);zoom=fromZoom*Math.exp(Math.log(goalZoom/fromZoom)*ease);renderSoon();
  if(t<1){flight=requestAnimationFrame(tick);}else{flight=0;flightTarget=null;center=goal;zoom=goalZoom;finishMove();}
 }
 flight=requestAnimationFrame(tick);
}
function midpoint(){const ps=[...pointers.values()];if(!ps.length)return null;return ps.length===1?{x:ps[0].x,y:ps[0].y,d:0}:{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2,d:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)};}
function wire(){
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;stopWheel();cancelFlight();lastDrag=null;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=midpoint();dragged=pointers.size>1;clearTimeout(settleTimer);canvas.classList.add('grabbing');});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const m=midpoint(),g=gesture;gesture=m;if(!m||!g)return;
  const dx=m.x-g.x,dy=m.y-g.y;if(Math.abs(dx)+Math.abs(dy)>1||Math.abs(m.d-g.d)>1)dragged=true;if(!dragged)return;inboundEncounter=null;requestedPitch=0;
  if(m.d&&g.d)zoom=overviewZoom(zoom*m.d/g.d);
  const scale=DEG/radius(),cos=Math.max(.35,Math.cos(center[1]/DEG));
  const now=performance.now(),dt=lastDrag?clamp(now-lastDrag.t,8,80):16;lastDrag={t:now,lon:-dx*scale/cos/dt,lat:dy*scale/dt};
  center=[wrap(center[0]-dx*scale/cos),clamp(center[1]+dy*scale,-89.9,89.9)];movement();
 });
 function end(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);gesture=midpoint();if(pointers.size)return;canvas.classList.remove('grabbing');
  if(!dragged&&e.type==='pointerup'){const b=canvas.getBoundingClientRect(),xy=[e.clientX-b.left,e.clientY-b.top];const found=screenPoints().filter(v=>v.match&&Math.hypot(v.xy[0]-xy[0],v.xy[1]-xy[1])<14).sort((a,b)=>Math.hypot(a.xy[0]-xy[0],a.xy[1]-xy[1])-Math.hypot(b.xy[0]-xy[0],b.xy[1]-xy[1]));if(found.length){selectMapLand(found[0].p.id,found[0].p.coord);return;}
   // The overview is also navigable by territory, including lands without films.
   if(Math.hypot(xy[0]-W/2,xy[1]-H/2)<=radius()){const coord=proj.invert(xy);if(coord?.every(Number.isFinite)){const land=landAt(coord);if(land){selectMapLand(land.id,coord);return;}}}
  }
  if(dragged&&e.type==='pointerup'&&!reduced.matches&&lastDrag&&performance.now()-lastDrag.t<75){
   const dx=clamp(lastDrag.lon*65,-12,12),dy=clamp(lastDrag.lat*65,-10,10);
   if(Math.hypot(dx,dy)>.12){setCamera([center[0]+dx,center[1]+dy],zoom,240);return;}
  }
  finishMove();
 }
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(liveReady||pointers.size)return;const unit=e.deltaMode===1?16:e.deltaMode===2?H:1,delta=clamp(-e.deltaY*unit*(e.ctrlKey?.009:.004)/Math.LN2,-1.25,1.25);if(!delta)return;inboundEncounter=null;queueOverviewZoom(delta);},{passive:false});
 canvas.addEventListener('keydown',e=>{const k=e.key,step=12/Math.sqrt(zoom);if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home','Enter'].includes(k))return;e.preventDefault();e.stopPropagation();if(k==='Enter'){if(settled&&focusIds.length)focusEncounter();return;}if(k==='Home'){setCamera([-91,12],1);return;}if(k==='+'||k==='='){setCamera(center,zoom*1.4);return;}if(k==='-'){setCamera(center,zoom/1.4);return;}setCamera([center[0]+(k==='ArrowRight'?step:k==='ArrowLeft'?-step:0),center[1]+(k==='ArrowUp'?step:k==='ArrowDown'?-step:0)]);});
}
let coverageMemo=null;
function themeCoverage(){const stamp=filterKey();if(coverageMemo?.stamp===stamp)return coverageMemo.value;const seen=new Set();let lands=0;for(const p of points){const fs=matchingFilms(p.id,stamp);if(fs.length)lands++;for(const f of fs)seen.add(f.id);}const value={lands,credits:seen.size};coverageMemo={stamp,value};return value;}
function refreshMenuLabels(){
 const b=$('#globe-theme-toggle'),t=currentTheme(),period=$('#globe-period')?.value;
 if(b){b.textContent=t.length?'Themes ('+t.length+')':'Themes';b.classList.toggle('has-filter',!!t.length);b.title=t.join(' + ')||'Explore films by theme';}
 const legend=$('#globe-theme-coverage');if(legend){legend.hidden=!t.length;if(t.length){const c=themeCoverage();const label=c.credits+' matching mapped credits · '+c.lands+' lands. Numbers count distinct indexed film IDs at a land reference, not filming locations or cultural significance.';if(legend.textContent!==label)legend.textContent=label;}}
 const m=$('#globe-more-toggle'),filters=Object.values(facetFilter).filter(Boolean).length+Number(!!period);if(m){m.textContent=filters?'Map ('+filters+')':'Map';m.title=period?'Map settings · '+period+'–'+(Number(period)+19):'Map settings';}
}
function setMenu(mode='',restoreFocus=false){
 if(!host)return;const prior=menuMode,hadPanelFocus=!!prior&&!!$('#globe-'+prior+'-panel')?.contains(document.activeElement);menuMode=mode===menuMode?'':mode;host.dataset.menu=menuMode;
 for(const key of ['find','theme','more','collection']){
  const b=$('#globe-'+key+'-toggle'),p=$('#globe-'+key+'-panel');if(!b||!p)continue;
  b.setAttribute('aria-expanded',String(menuMode===key));p.hidden=menuMode!==key;
 }
 if(prior&&!menuMode&&(restoreFocus||hadPanelFocus))$('#globe-'+prior+'-toggle')?.focus({preventScroll:true});
 if(menuMode==='find'&&!matchMedia('(pointer: coarse)').matches)$('#globe-search')?.focus({preventScroll:true});
 if(menuMode==='theme')$('#weave-map-theme')?.focus({preventScroll:true});
 if(menuMode==='collection')renderCollection(true);else if(prior==='collection')starGroup='';refreshMenuLabels();placeEmergent();
}
function restoreThemeLens(){
 const lens=$('#weave-theme-lens');
 if(lens&&themeLensHome?.parent){const p=themeLensHome.parent,next=themeLensHome.next;p.insertBefore(lens,next?.parentNode===p?next:null);}
 themeLensHome=null;const popup=$('#constellate-popup');if(popup&&previewHome?.parent){const {parent,next}=previewHome;parent.insertBefore(popup,next?.parentNode===parent?next:null);}previewHome=null;menuListeners?.abort();menuListeners=null;
}
function markup(){
 host=el('section');host.id='atlas-rotational-globe';host.inert=true;host.setAttribute('aria-label','Rotatable cinema atlas');
 host.innerHTML='<canvas id="globe-surface" tabindex="0" aria-label="Rotate the globe using arrow keys, plus and minus to zoom, Enter to explore the focused lands"></canvas><div id="globe-aperture" aria-hidden="true"></div><button id="globe-emergent" type="button" hidden></button><div class="globe-instructions">Drag to explore · scroll or pinch to zoom</div><nav class="globe-guide" aria-label="Globe navigation"><div class="globe-primary"><button type="button" id="globe-find-toggle" aria-expanded="false" aria-controls="globe-find-panel">Find</button><button type="button" id="globe-theme-toggle" aria-expanded="false" aria-controls="globe-theme-panel">Themes</button><button type="button" id="globe-surprise">Discover</button><button type="button" id="globe-more-toggle" aria-expanded="false" aria-controls="globe-more-panel">Map</button><button type="button" id="globe-collection-toggle" aria-expanded="false" aria-controls="globe-collection-panel">My films</button></div><div id="globe-collection-panel" class="globe-menu-panel" hidden></div><div id="globe-find-panel" class="globe-menu-panel" hidden><label for="globe-search">Find films or filmmakers</label><input id="globe-search" type="search" placeholder="Title or filmmaker…" autocomplete="off"><div id="globe-search-results" aria-live="polite"></div><p class="globe-marker-key">Lights mark land references with indexed cinema. At closer scales, numbers show distinct indexed films, not individual locations.</p><label for="globe-find">Find a land</label><select id="globe-find"><option value="">Choose a land…</option></select><select id="globe-recent" aria-label="Recently explored lands" hidden><option value="">Recently explored…</option></select></div><div id="globe-theme-panel" class="globe-menu-panel" hidden></div><div id="globe-more-panel" class="globe-menu-panel" hidden><div class="globe-buttons"><button type="button" id="globe-home">Americas</button><button type="button" id="globe-landscape" aria-pressed="false" hidden>Terrain</button></div><label for="globe-period">Film period</label><select id="globe-period"><option value="">All years</option></select><div class="globe-buttons"><button type="button" id="globe-lands" aria-pressed="true" title="Toggle Indigenous reference territories">Lands: on</button><button type="button" id="globe-share">Share view</button></div><details class="globe-settings"><summary>Land visibility</summary><label for="globe-opacity" class="sr-only">Territory visibility</label><select id="globe-opacity" aria-label="Territory visibility"><option value="0.65">Subtle</option><option value="1" selected>Balanced</option><option value="1.6">Stronger</option></select><label for="globe-edges">Territory outlines</label><select id="globe-edges"><option value="selected">Selected land only</option><option value="none">No outlines</option><option value="all">All outlines</option></select></details><details class="globe-catalog-filters"><summary>Film filters</summary><label for="globe-filter-language">Language</label><select id="globe-filter-language"></select><label for="globe-filter-form">Form</label><select id="globe-filter-form"></select><label for="globe-filter-length">Length</label><select id="globe-filter-length"></select><button type="button" id="globe-clear-filters">Clear film filters</button></details><div id="globe-csv-status" role="status"></div><button type="button" id="globe-csv-retry" hidden>Retry catalogue sync</button><div id="globe-detail-status" class="globe-detail-status" aria-live="off">Loading detailed map</div></div></nav><div class="globe-zoom" aria-label="Zoom controls"><button type="button" id="globe-plus" aria-label="Zoom in">+</button><button type="button" id="globe-minus" aria-label="Zoom out">−</button></div><section id="globe-encounter" aria-label="Cinema at the focal point"></section><div class="globe-footer"><span id="globe-attribution"><a href="https://native-land.ca/" target="_blank" rel="noopener">Native Land Digital</a><span id="globe-credit-fallback"> · Natural Earth</span><span id="globe-credit-live" hidden> · <a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noopener">NASA GIBS</a> · <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · <a href="https://mapterhorn.com/attribution/" target="_blank" rel="noopener">Mapterhorn</a></span><span id="globe-credit-satellite" hidden> · <a href="https://cloudless.eox.at/" target="_blank" rel="noopener">EOxCloudless</a> by <a href="https://eox.at/" target="_blank" rel="noopener">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016 &amp; 2017)</span></span><a class="globe-map-sources" href="map-sources.html" target="_blank" rel="noopener">Map sources ↗</a><span id="globe-status" class="sr-only" role="status" aria-live="polite"></span></div>';
 const stage=$('#atlas-globe-stage');if(!stage)throw Error('Public globe stage missing');stage.append(host);const popup=$('#constellate-popup');if(popup){previewHome={parent:popup.parentNode,next:popup.nextSibling};stage.append(popup);}const lens=$('#weave-theme-lens');if(lens){themeLensHome={parent:lens.parentNode,next:lens.nextSibling};$('#globe-theme-panel').append(lens,el('p','globe-theme-coverage'));const legend=$('.globe-theme-coverage');legend.id='globe-theme-coverage';legend.hidden=true;}
 for(const key of ['find','theme','more','collection'])$('#globe-'+key+'-toggle').onclick=()=>setMenu(key);renderCollection();
 menuListeners=new AbortController();const opts={capture:true,signal:menuListeners.signal};
 document.addEventListener('pointerdown',e=>{if(menuMode&&!e.target.closest('.globe-guide'))setMenu('');},opts);
 // Window capture precedes document-level legacy Escape handlers, which can exit Constellate.
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&starDrag){e.preventDefault();e.stopImmediatePropagation();clearStarDrag();return;}if(e.key==='Escape'&&globePlayer){e.preventDefault();e.stopImmediatePropagation();closeGlobePlayer();return;}if(e.key==='Escape'&&menuMode){e.preventDefault();e.stopImmediatePropagation();setMenu('',true);return;}if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();const popup=$('#constellate-popup');if(popup&&!popup.hidden){C()?.close();returnFromPreview();}}},opts);
 $('#weave-map-theme')?.addEventListener('change',refreshMenuLabels,{signal:menuListeners.signal});$('#weave-map-theme-second')?.addEventListener('change',refreshMenuLabels,{signal:menuListeners.signal});
 canvas=$('#globe-surface');ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
 $('#globe-emergent').onclick=()=>{if(featured){previewFromGlobe(featured.film,featured.land,$('#globe-emergent'));placeEmergent();}};
 for(const key of Object.keys(facetFilter))$('#globe-filter-'+key).onchange=e=>changeFacet(key,e.target.value);
 $('#globe-clear-filters').onclick=clearDiscoveryFilters;$('#globe-csv-retry').onclick=synchronizePublication;
 const search=$('#globe-search'),results=$('#globe-search-results');
 const normalize=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[ʻʼ‘’']/g,'').toLowerCase();
 search.addEventListener('input',()=>{const q=normalize(search.value).trim();results.replaceChildren();if(q.length<2)return;const idx=C().globeCreditIndex(),landMatches=records.filter(p=>normalize([p.name,p.fullName,...p.aliases].join(' ')).includes(q)).slice(0,5);for(const p of landMatches){const item=el('div','globe-search-result');item.append(button(p.name+' · '+p.count+' film credits',()=>{setMenu('');clearDiscoveryFilters();gotoLand(p.id);},'globe-search-film'),el('small',null,'Land reference'));results.append(item);}const matches=idx.films.filter(f=>{const r=A().recordById(f.record),work=r?.films.find(x=>x.id===f.film);return normalize([f.title,f.maker,r?.community,r?.nation,...(Array.isArray(r?.aliases)?r.aliases:[]),...(Array.isArray(work?.aliases)?work.aliases:[]),...(exactFacet(f).l||[]),...C().terms(f),...(idx.refs.get(f.id)||[]).flatMap(ref=>{const land=byId.get(ref.id);return land?[land.name,...land.aliases]:[];})].join(' ')).includes(q);});for(const f of matches.slice(0,12)){const refs=idx.refs.get(f.id)||[],ref=refs.find(x=>byId.has(x.id));const item=el('div','globe-search-result');const b=button(f.title+' · '+[f.maker,f.year].filter(Boolean).join(' · '),()=>{setMenu('');if(ref){clearDiscoveryFilters();gotoLand(ref.id,f.id,true);}else previewFromGlobe(f,'',null);},'globe-search-film');item.append(b,el('small',null,ref?'Mapped land association':'No mapped land association'));if(!ref){const link=externalLink('Atlas record ↗',creditProfile(f));if(link)item.append(link);}results.append(item);}if(!matches.length&&!landMatches.length)results.append(el('p',null,'No matching films or lands.'));else if(matches.length>12)results.append(el('small',null,'Showing 12 of '+matches.length+' credits. Refine search.'));});
 const sel=$('#globe-find');for(const p of records){const o=el('option',null,p.name+(p.count?' ('+p.count+')':' · no films yet'));o.value=p.id;sel.append(o);}
 sel.onchange=()=>{if(sel.value){setMenu('');gotoLand(sel.value);}};
 const years=$('#globe-period');for(let y=1900;y<=2020;y+=20){const o=el('option',null,y+'–'+(y+19));o.value=String(y);years.append(o);}if([...years.options].some(o=>o.value===params.get('period'))){yearBand=params.get('period');years.value=yearBand;}years.onchange=()=>{setPeriod(years.value);refreshMenuLabels();};
 try{recent=JSON.parse(sessionStorage.getItem('atlas-globe-recent')||'[]').filter(x=>x&&byId.has(x.id)).slice(0,10);}catch{}updateRecent();
 $('#globe-recent').onchange=e=>{if(e.target.value){setMenu('');gotoLand(e.target.value);}};
 $('#globe-surprise').onclick=()=>{setMenu('');surprise();};
 $('#globe-lands').onclick=()=>{landsVisible=!landsVisible;syncLandVisibility();if(landsVisible)updateTerritoryLabels();};
 if(['0.65','1','1.6'].includes(params.get('lands'))){landStrength=Number(params.get('lands'));$('#globe-opacity').value=String(landStrength);}
 $('#globe-opacity').onchange=e=>{landStrength=Number(e.target.value);if(!landsVisible)landsVisible=true;syncLandVisibility();};
 if(['none','all','selected'].includes(params.get('edges')))edgeMode=params.get('edges');$('#globe-edges').value=edgeMode;
 $('#globe-edges').onchange=e=>{edgeMode=e.target.value;syncLandVisibility();};syncLandVisibility();
 $('.globe-settings').addEventListener('toggle',()=>placeEmergent());
 $('#globe-encounter').addEventListener('toggle',()=>placeEmergent(),true);
 // Pointer events are already disabled while moving; keyboard and assistive
 // activation must also wait for the new geographic encounter to resolve.
 $('#globe-encounter').addEventListener('click',e=>{if(!settled){e.preventDefault();e.stopImmediatePropagation();}},true);
 $('#globe-encounter').addEventListener('keydown',e=>{if(!settled&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);
 $('#globe-share').onclick=async()=>{const u=shareView();try{await navigator.clipboard.writeText(u);$('#globe-share').textContent='Copied';setTimeout(()=>{if($('#globe-share'))$('#globe-share').textContent='Share view';},1400);}catch{const input=el('input','globe-share-url');input.value=u;input.readOnly=true;input.setAttribute('aria-label','Shareable globe link');$('#globe-share').after(input);input.select();}};

 $('#globe-home').onclick=()=>{setMenu('');sel.value='';preferredLand='';filmOffset=0;landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');if(liveReady)live.setPitch(0);setCamera([-91,12],1);};
 $('#globe-landscape').onclick=()=>{if(!liveReady)return;setMenu('');stopWheel();landscape=!landscape;$('#globe-landscape').setAttribute('aria-pressed',String(landscape));if(landscape&&!live.getTerrain())live.setTerrain({source:'dem',exaggeration:1});live.easeTo({zoom:landscape?Math.max(live.getZoom(),7):live.getZoom(),pitch:landscape?42:0,duration:reduced.matches?0:350});};
 $('#globe-plus').onclick=()=>{if(liveReady)queueZoom((wheelGoal??live.getZoom())+.65);else setCamera(flightTarget?.center||center,(flightTarget?.zoom||zoom)*1.5);};$('#globe-minus').onclick=()=>{if(liveReady)queueZoom((wheelGoal??live.getZoom())-.65);else setCamera(flightTarget?.center||center,(flightTarget?.zoom||zoom)/1.5);};
 wire();
}
async function boot(){
 try{
  const result=await worldRequest;if(result.error)throw result.error;const world=result.value;if(closed)return;
  const collection=world.objects.countries;if(!collection?.geometries?.length)throw Error('No Natural Earth geometry');
  earth=normalizeGeometry(topojson.merge(world,collection.geometries));landArea=d3.geoArea(earth);
  // Earth's dry land is about 29% of its surface. Catch winding inversions or empty topology before displaying a sphere.
  if(!Number.isFinite(landArea)||landArea<2.5||landArea>4.8)throw Error('Natural Earth land area is invalid: '+landArea);
  collect();if(!points.length)throw Error('No mapped cinema references');
  proj=d3.geoOrthographic().clipAngle(90).precision(.65);markup();path=d3.geoPath(proj,ctx);
  active=true;C().close();document.body.classList.add('atlas-globe-experiment');C().refreshDiscoveryMode();refreshFacetOptions();synchronizePublication();
  ro=new ResizeObserver(resize);ro.observe(canvas);ro.observe($('.globe-footer'));ro.observe($('.globe-primary'));resize();if(initialCamera){center=initialCamera.slice(0,2);const base=Math.max(-1.3,Math.log2(Math.min(W,H)*.87*Math.PI/512));zoom=Math.pow(2,initialCamera[2]-base);}try{const t=JSON.parse(params.get('themes')||'[]');if(Array.isArray(t)&&t.every(x=>typeof x==='string')&&t.length)C().showThemeLens(t);}catch{}settle();draw();
  // The loading screen stays still while the native scene is prepared. A slow
  // module/connection still gets a usable local overview, not a blank map.
  firstSceneTimer=setTimeout(()=>{if(startup.firstVisible===null){showFirstScene('overview');draw();}},9000);
  bootLive();
 }catch(e){fallback(e);}
}
Promise.resolve(window.AtlasCollectionEditorReady).then(editor=>{
 if(!editor||!A()?.lands)throw Error('Atlas catalogue or collection editor unavailable');
 return boot();
}).catch(fallback);
})();
