/* Globe discovery: one native MapLibre camera, real raster tiles and a DEM mesh.
 * All territory shapes and cinema anchors use the existing Atlas reference data.
 * The old orthographic canvas is a clearly labeled, local-only overview fallback.
 */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('globe')!=='1')return;
const $=s=>document.querySelector(s),C=()=>window.AtlasConstellate,A=()=>window.Atlas;
const DEG=180/Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=v=>((v+180)%360+360)%360-180;
let active=false,closed=false,host=null,canvas=null,ctx=null,ro=null,raf=0,settleTimer=0;
let W=0,H=0,dpr=1,zoom=1,center=[-91,12],proj=null,path=null,earth=null,landArea=0;
let records=[],points=[],byId=new Map(),near=[],inside=[],focusIds=[],focusKey='',previewLimit=3,settled=false,anchorFailures=[];
let pointers=new Map(),gesture=null,dragged=false,previousFocus=null;
let relief=null,reliefState='loading',flight=0,flightTarget=null,lastDrag=null;
let live=null,liveReady=false,liveHost=null,liveSignature='',liveBaseZoom=0,liveMoved=false,liveTimer=0;
let wheelFrame=0,wheelGoal=null,wheelLast=0,wheelActive=false,gestureStart=null,gestureUntil=0,landscape=false,lastLiveUpdate=0;
const received={marble:0,satellite:0,dem:0,hilldem:0,places:0},sourceErrors={};
let ambientCount=0,landsVisible=true,landStrength=1,lastCameraChange=0,lastCameraKey='',activeMapPointers=new Set(),pendingFilm='',rankCache=new Map(),zoomListeners=null,lastStatus=0,frameTimes=[],lastRender=0,preferredLand='',filmOffset=0,yearBand='',lastEncounter='',recent=[],lastRelated=null;
let featured=null,posterKey='',journey=[],returning=false,artSizes=new Map(),artFailures=new Set(),posterLayoutFrame=0,posterReason='initializing',boundaryStats={features:0,segments:0,datelineSplits:0},menuMode='',themeLensHome=null,menuListeners=null,encounterExpanded=false;
const inputStats={wheel:0,pinch:0,safari:0,touch:0,zoomEvents:0,lastDelta:0,lastBefore:null,lastAfter:null,lastInputMs:null};
const params=new URLSearchParams(location.search);
const initialCamera=(()=>{const a=params.get('at')?.split(',').map(Number);return a?.length===3&&a.every(Number.isFinite)&&Math.abs(a[0])<=180&&Math.abs(a[1])<=85&&a[2]>=-2&&a[2]<=14?a:null;})();
function currentTheme(){return [$('#weave-map-theme')?.value,$('#weave-map-theme-second')?.value].filter(Boolean);}
function shareView(){const u=new URL(location.pathname,location.origin),s=liveStats();u.searchParams.set('constellate','1');u.searchParams.set('globe','1');if(s)u.searchParams.set('at',[center[0].toFixed(5),center[1].toFixed(5),s.zoom.toFixed(3)].join(','));if(landStrength!==1)u.searchParams.set('lands',String(landStrength));else u.searchParams.delete('lands');const t=currentTheme();if(t.length)u.searchParams.set('themes',JSON.stringify(t));else u.searchParams.delete('themes');if(yearBand)u.searchParams.set('period',yearBand);else u.searchParams.delete('period');for(const [key,val] of Object.entries(facetFilter))if(val)u.searchParams.set(key,val);return u.href;}
function recordVisit(r){if(recent[0]?.id===r.id)return;recent=[{id:r.id,name:r.name},...recent.filter(v=>v.id!==r.id)].slice(0,10);try{sessionStorage.setItem('atlas-globe-recent',JSON.stringify(recent));}catch{}updateRecent();}
function updateRecent(){const s=$('#globe-recent');if(!s)return;s.replaceChildren(el('option',null,'Recently explored…'));for(const r of recent){if(!byId.has(r.id))continue;const o=el('option',null,r.name);o.value=r.id;s.append(o);}s.hidden=s.options.length<2;}
function setPeriod(v){yearBand=v;filmOffset=0;focusKey='';liveSignature='';settle();renderSoon();}
function periodMatch(f){if(!yearBand)return true;const y=Number(f.year);return Number.isFinite(y)&&y>=Number(yearBand)&&y<Number(yearBand)+20;}
function rankedFilms(id){const key=id+'|'+filterKey(),cached=rankCache.get(key);if(cached)return cached;const fs=matchingFilms(id),seen=new Set(),ranked=fs.map(f=>({f,art:!!C().sourceImage(f)&&!artFailures.has(C().sourceImage(f)),view:!!safeViewing(f)})).sort((a,b)=>Number(b.art)-Number(a.art)||Number(b.view)-Number(a.view)||a.f.title.localeCompare(b.f.title)).map(v=>v.f).filter(f=>{if(seen.has(f.id))return false;seen.add(f.id);return true;});if(rankCache.size>160)rankCache.clear();rankCache.set(key,ranked);return ranked;}
function safeViewing(f){const work=A().recordById(f.record)?.films.find(x=>x.id===f.film);const links=C().globeViewingRoutes(f);return links.map(l=>{try{if(new URL(l.url).protocol!=='https:')return null;return {url:l.url,label:/trailer|teaser|preview/i.test(l.title||'')?'Trailer':/watch|full film|stream|viewing|ver pel[ií]cula|ver filme/i.test(l.title||'')?'Watch':'Film page'};}catch{return null;}}).filter(Boolean).sort((a,b)=>['Watch','Trailer','Film page'].indexOf(a.label)-['Watch','Trailer','Film page'].indexOf(b.label))[0]||null;}
function externalLink(label,url,cls){try{const u=new URL(url,location.href);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&u.origin===location.origin))return null;}catch{return null;}const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function gotoLand(id,filmId='',overview=false){pendingFilm=filmId;const r=byId.get(id);if(!r)return;const p=points.find(x=>x.id===id),a=p?.coord||window.AtlasGeoIntegrity.anchor(r.shapes.map(s=>s.feature))?.coordinates;if(!a)return;preferredLand=id;filmOffset=0;setCamera(a,overview?Math.max(2.2,Math.min(zoom,4)):Math.max(zoom,2.2));}
function surprise(){const current=preferredLand||lastEncounter;const candidates=points.filter(p=>matchingFilms(p.id).length&&p.id!==current);if(candidates.length)gotoLand(candidates[Math.floor(Math.random()*candidates.length)].id,'',true);else if($('#globe-status'))$('#globe-status').textContent='No additional mapped films match the selected filters.';}
function relatedEncounter(seed,land){const idx=C().globeCreditIndex(),ts=C().terms(seed),activeThemes=currentTheme();if(!ts.length)return null;const visited=new Set(idx.refs.get(seed.id)?.map(r=>r.id)||[]);let best=null;for(const t of ts){for(const f of idx.byTheme.get(t)||[]){if(f.id===seed.id||!periodMatch(f)||!matchesFacets(f)||!activeThemes.every(x=>C().terms(f).includes(x)))continue;for(const ref of idx.refs.get(f.id)||[]){if(ref.id===land||visited.has(ref.id)||!byId.has(ref.id)||!points.some(p=>p.id===ref.id))continue;const p=points.find(p=>p.id===ref.id),origin=points.find(p=>p.id===land);if(origin&&d3.geoDistance(origin.coord,p.coord)<.15)continue;const score=C().terms(f).filter(x=>ts.includes(x)).length*10+Number(!!C().sourceImage(f))+Number(!!safeViewing(f))+(recent.some(x=>x.id===ref.id)?-4:0);if(!best||score>best.score)best={film:f,ref,term:t,score};}}}return best;}
function followRelated(related){if(featured)journey.push({land:featured.land,film:featured.film.id,theme:currentTheme(),center:[...center],zoom});if(journey.length>20)journey.shift();if(!currentTheme().length)C().showThemeLens([related.term]);gotoLand(related.ref.id,related.film.id,true);}
function journeyBack(){const v=journey.pop();if(!v)return;returning=true;if(v.theme.length)C().showThemeLens(v.theme);else C().clearThemeLens();pendingFilm=v.film;preferredLand=v.land;filmOffset=0;setCamera(v.center,v.zoom);returning=false;}
function syncTerrain(){if(!liveReady||!live)return;const z=live.getZoom(),want=z>=6.2||(z>=5.7&&!!live.getTerrain());if(want&&!live.getTerrain())live.setTerrain({source:'dem',exaggeration:1});else if(!want&&live.getTerrain())live.setTerrain(null);}

const nowMs=()=>performance.now();
function liveStats(){
 if(!liveReady||!live)return null;
 let elevation=null;try{elevation=live.queryTerrainElevation(center);}catch{}
 return {version:live.version||null,zoom:live.getZoom(),pitch:live.getPitch(),mesh:live.getTerrain()?.source||null,elevation,received:{...received},errors:{...sourceErrors},wheelActive:wheelActive||live.isZooming(),motion:{moving:live.isMoving(),pointers:activeMapPointers.size,quietMs:nowMs()-lastCameraChange,settled},input:{...inputStats},medianFrameMs:frameTimes.length?frameTimes.slice().sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)]:null};
}
function updateDetailStatus(force=false){
 const t=nowMs();if(!force&&t-lastStatus<160)return;lastStatus=t;
 const e=$('#globe-detail-status');if(!e)return;
 if(!liveReady){e.textContent='Overview only · loading detailed map';return;}
 const s=liveStats(),z=s.zoom;
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
function sync(){if(!active)return;refreshMenuLabels();renderSoon();if(!pointers.size&&!flight&&!wheelActive&&(!live?.isMoving()||settled))scheduleSettle(75);}
window.AtlasGlobe={get active(){return active},get camera(){return active?camera():null},get pointCount(){return points.length},get geometryCount(){return records.length},get anchorFailures(){return [...anchorFailures]},get anchors(){return points.map(p=>({id:p.id,coordinate:[...p.coord],sourceId:p.anchor.sourceId,component:p.anchor.component,method:p.anchor.method}))},get landArea(){return landArea},get territoryLayer(){return {visible:landsVisible,strength:landStrength,features:ambientCount,boundaries:{...boundaryStats},fill:liveReady?live.getPaintProperty('native-ambient-fill','fill-opacity'):null,outline:liveReady?live.getPaintProperty('native-ambient-line','line-opacity'):null}},get terrain(){return liveReady?'tiled':reliefState},get tileState(){return liveStats()},matchingCreditIds:id=>matchingFilms(id).map(f=>f.id),artworkInventory:()=>({lands:records.map(r=>({id:r.id,name:r.name,credits:C().globeLandFilmCount(r.id),matching:matchingFilms(r.id).length})),credits:C().globeCreditIndex().films.map(f=>({id:f.id,film:f.film,title:f.title,maker:f.maker,record:f.record,source:C().sourceImage(f)||'',published:C().globeMetadata(f)?.image||'',lands:(C().globeCreditIndex().refs.get(f.id)||[]).map(r=>r.id)}))}),get discovery(){return {menu:menuMode,period:yearBand,filters:{...facetFilter},publication:publicationStatus,preferredLand,recent:[...recent],filmOffset,featured:featured?{land:featured.land,film:featured.film.id}:null,journeyDepth:journey.length,posterVisible:!$('#globe-emergent')?.hidden,posterReason,artState:$('#globe-encounter .globe-art-feature')?.dataset.artState||null,shareURL:shareView()}},goTo(coord,mapZoom){if(liveReady&&Array.isArray(coord)&&coord.length===2&&coord.every(Number.isFinite)&&Number.isFinite(mapZoom))setCamera(coord,Math.pow(2,mapZoom-liveBaseZoom),0);},get focus(){return {ids:[...focusIds],inside:inside.map(r=>r.id),settled};},sync,close};
function close(){
 const wasActive=active;closed=true;active=false;clearTimeout(settleTimer);cancelFlight();if(raf)cancelAnimationFrame(raf);raf=0;if(posterLayoutFrame)cancelAnimationFrame(posterLayoutFrame);posterLayoutFrame=0;ro?.disconnect();
 clearTimeout(liveTimer);stopWheel();zoomListeners?.abort();zoomListeners=null;restoreThemeLens();liveReady=false;live?.remove();live=null;liveHost=null;relief?.dispose();relief=null;host?.remove();host=null;document.body.classList.remove('atlas-globe-experiment');if(wasActive&&C()?.enabled)C().refreshDiscoveryMode();
 const u=new URL(location.href);for(const k of ['globe','at','themes','period','lands','language','form','length'])u.searchParams.delete(k);history.replaceState(history.state,'',u.href);
}
function fallback(e){console.warn('Globe discovery unavailable',e);close();const p=document.createElement('p');p.className='globe-fallback';p.textContent='The globe could not initialize. The flat workspace remains available.';$('.map-panel')?.append(p);setTimeout(()=>p.remove(),9000);}
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
function collect(){
 for(const l of A().lands){
  if(l.browseGroup||!l.groups?.length)continue;
  const fs=[...new Map(l.groups.flatMap(g=>g.features).map(f=>[String(f.id),f])).values()].filter(f=>f.geometry);
  if(!fs.length)continue;
  const shapes=fs.map(f=>({feature:f,bounds:f.bounds||d3.geoBounds(f)}));
  const r={id:l.id,name:A().landDisplayName(l),shapes,count:C().globeLandFilmCount(l.id)};
  records.push(r);byId.set(r.id,r);
  if(!r.count)continue;
  const anchor=window.AtlasGeoIntegrity.anchor(fs),coord=anchor?.coordinates;
  if(!coord||!fs.some(f=>String(f.id)===anchor.sourceId&&d3.geoContains(f,coord))){anchorFailures.push(l.id);continue;}
  // Anchor is deterministic and independent of the flat map, zoom, or viewport.
  points.push({...r,coord,anchor});
 }
 records.sort((a,b)=>a.name.localeCompare(b.name));points.sort((a,b)=>a.name.localeCompare(b.name));assignTerritoryColors();
}
function resize(){
 const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
 const w=b.width,h=b.height,ratio=Math.min(window.devicePixelRatio||1,2);
 if(w===W&&h===H&&ratio===dpr)return;
 W=w;H=h;dpr=ratio;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);if(live)live.resize();renderSoon();scheduleSettle(100);
}
function radius(){return Math.max(70,Math.min(W,H)*.445)*zoom;}
function updateProjection(){
 proj.rotate([-center[0],-center[1],0]).translate([W/2,H/2]).scale(radius());
}
function visible(p){return d3.geoDistance(center,p)<Math.PI/2-1e-5;}
function shape(g,fill,stroke,width=1){
 ctx.beginPath();path(g);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function screenPoints(){
 const c=C(),out=[];
 for(const p of points){if((!liveReady||live.getZoom()<5)&&!visible(p.coord))continue;const pos=liveReady?live.project(p.coord):null;const xy=pos?[pos.x,pos.y]:proj(p.coord);if(!xy?.every(Number.isFinite)||xy[0]<-10||xy[1]<-10||xy[0]>W+10||xy[1]>H+10)continue;
  out.push({p,xy,match:matchingFilms(p.id).length>0,distance:Math.hypot(xy[0]-W/2,xy[1]-H/2)});
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
  let segments=0,splits=0;const features=[];
  const rings=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='GeometryCollection'?g.geometries.flatMap(rings):[];
  for(const f of collection.features){const lines=[];for(const ring of rings(f.geometry)){let line=[ring[0]];for(let i=1;i<ring.length;i++){const p=ring[i-1],q=ring[i],delta=q[0]-p[0];if(Math.abs(delta)>180){const edge=delta>0?-180:180,adjust=q[0]+(delta>0?-360:360),t=(edge-p[0])/(adjust-p[0]),lat=p[1]+(q[1]-p[1])*t; if(Number.isFinite(lat)){line.push([edge,lat]);if(line.length>1)lines.push(line);line=[[-edge,lat],q];splits++;continue;}}line.push(q);}if(line.length>1)lines.push(line);}
   if(lines.length){segments+=lines.length;features.push({type:'Feature',properties:f.properties,geometry:{type:'MultiLineString',coordinates:lines}});}}
  if(track)boundaryStats={features:features.length,segments,datelineSplits:splits};return {type:'FeatureCollection',features};
 }
 function ambientLandData(){
  const unique=new Map();
  for(const r of records)for(const {feature} of r.shapes){
   const key=String(feature.id);if(unique.has(key))continue;
   unique.set(key,{type:'Feature',properties:{land:r.id,name:r.name,color:'rgb('+territoryTone(r.id)+')'},geometry:geoPolygon(feature.geometry)});
  }
  ambientCount=unique.size;return {type:'FeatureCollection',features:[...unique.values()]};
 }
 const landLayerIds=['native-ambient-fill','native-ambient-line','land-color','land-outline','indigenous-names'];
 function opacityExpression(values){return ['interpolate',['linear'],['zoom'],...values.flatMap(([z,a])=>[z,Math.min(.85,a*landStrength)])];}
 function syncLandVisibility(){
  const b=$('#globe-lands');if(b){b.setAttribute('aria-pressed',String(landsVisible));b.textContent=landsVisible?'Lands: on':'Lands: off';}
  if(liveReady){for(const id of landLayerIds)if(live.getLayer(id))live.setLayoutProperty(id,'visibility',landsVisible?'visible':'none');live.setPaintProperty('native-ambient-fill','fill-opacity',opacityExpression([[0,.07],[3,.12],[6,.16],[10,.15],[14,.13]]));live.setPaintProperty('native-ambient-line','line-opacity',opacityExpression([[0,.09],[3,.16],[6,.24],[12,.32]]));}
  renderSoon();
 }
 function liveLandData(ids){
  const features=[];
  for(const id of ids){const r=byId.get(id);if(!r)continue;const color='rgb('+territoryTone(id)+')',match=matchingFilms(id).length>0;
   const focus=focusIds.includes(id)||[...C().selectedLandIds].includes(id)||C().previewLandIds().includes(id);
   for(const {feature} of r.shapes)features.push({type:'Feature',properties:{land:id,color,match:match?1:0,focus:focus?1:0},geometry:geoPolygon(feature.geometry)});
  }
  return {type:'FeatureCollection',features};
 }
 function livePointsData(){
  return {type:'FeatureCollection',features:points.map(p=>({type:'Feature',properties:{land:p.id,name:p.name,focus:focusIds.includes(p.id)?1:0,match:matchingFilms(p.id).length>0?1:0},geometry:{type:'Point',coordinates:p.coord}}))};
 }
 function updateLive(){
  if(!liveReady)return;
  if(live.isMoving()||wheelActive){const t=nowMs();if(t-lastLiveUpdate<95)return;lastLiveUpdate=t;}
  const ps=screenPoints();near=ps.filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
  host.classList.toggle('has-tuning',!!near.length||!!inside.length&&settled);
  host.classList.toggle('has-cinema',near.length>0||settled&&inside.some(v=>matchingFilms(v.id).length>0));
  // Keep the source stable while dragging. Rebuild only once the camera settles or theme changes.
  if((live.isMoving()&&!settled)||wheelActive)return;
  const ids=[...new Set([...focusIds,...C().selectedLandIds,...C().previewLandIds()])];
  const sig=JSON.stringify([ids,focusIds,C().selectedLandIds,C().previewLandIds(),currentTheme(),yearBand,facetFilter,publicationStatus]);
  if(sig===liveSignature)return;liveSignature=sig;
  const focusData=liveLandData(ids);live.getSource('native-lands')?.setData(focusData);live.getSource('native-focus-edges')?.setData(boundaryData(focusData));
  live.getSource('cinema-points')?.setData(livePointsData());
 }
 function readLiveCamera(){const p=live.getCenter();center=[wrap(p.lng),p.lat];zoom=Math.pow(2,live.getZoom()-liveBaseZoom);const k=[center[0].toFixed(7),center[1].toFixed(7),live.getZoom().toFixed(6),live.getPitch().toFixed(4)].join('|');if(k!==lastCameraKey){lastCameraKey=k;lastCameraChange=nowMs();}}
 // Centered wheel/pinch uses accumulated logarithmic scale, not a restarted easing
 // animation. The geographic point inside the fixed aperture stays fixed.
 function stopWheel(resetGesture=true){if(wheelFrame)cancelAnimationFrame(wheelFrame);wheelFrame=0;wheelGoal=null;wheelActive=false;if(resetGesture)gestureStart=null;}
 function queueZoom(goal){
  if(!liveReady)return;
  wheelGoal=clamp(goal,live.getMinZoom(),live.getMaxZoom());wheelLast=nowMs();
  if(!wheelActive){wheelActive=true;live.stop();movement();}
  if(wheelFrame)return;
  function frame(t){
   wheelFrame=0;if(!active||!liveReady||wheelGoal===null){stopWheel();return;}
   const current=live.getZoom(),delta=wheelGoal-current;
   const next=reduced.matches||Math.abs(delta)<.008?wheelGoal:current+delta*.36;
   if(Math.abs(next-current)>1e-6)live.jumpTo({center:live.getCenter(),zoom:next});
   if(Math.abs(wheelGoal-live.getZoom())>.008||t-wheelLast<90){wheelFrame=requestAnimationFrame(frame);return;}
   stopWheel(false);readLiveCamera();syncTerrain();inputStats.lastAfter=live.getZoom();if(live.getZoom()<6&&landscape){landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');live.setPitch(0);}finishMove();updateDetailStatus(true);
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
 function failLive(reason){
  if(!liveHost)return;console.warn('Native globe unavailable; using local fallback',reason);stopWheel();zoomListeners?.abort();zoomListeners=null;
  clearTimeout(liveTimer);liveReady=false;live?.remove();live=null;liveHost.remove();liveHost=null;
  host?.classList.remove('globe-live');if(active){const e=$('#globe-detail-status');if(e)e.textContent='Overview only · detailed map unavailable';renderSoon();scheduleSettle(100);}
 }
 async function bootLive(){
  try{
   const lib=await import(new URL('assets/maplibre/maplibre-gl.mjs',document.baseURI).href),ml=lib.default||lib;
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
    'cinema-points':{type:'geojson',data:livePointsData(),maxzoom:14}
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
    {id:'city-context',type:'symbol',source:'places','source-layer':'place',minzoom:5,filter:['match',['get','class'],['city','town'],true,false],layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5,10,10,13],'symbol-sort-key':['coalesce',['get','rank'],99],'text-padding':8,'text-allow-overlap':false},paint:{'text-color':'#e2e9e4','text-halo-color':'#20362e','text-halo-width':1.1,'text-opacity':.75}},
    // Ambient territory references are deliberately translucent; overlapping
    // polygons remain visible without claiming exclusive ownership.
    {id:'native-ambient-fill',type:'fill',source:'native-ambient',paint:{'fill-color':['get','color'],'fill-opacity':['interpolate',['linear'],['zoom'],0,.07,3,.12,6,.16,10,.15,14,.13]}},
    {id:'native-ambient-line',type:'line',source:'native-ambient-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-opacity':['interpolate',['linear'],['zoom'],0,.09,3,.16,6,.24,12,.32],'line-width':['interpolate',['linear'],['zoom'],0,.35,4,.65,8,.95,14,1.4]}},
    {id:'land-color',type:'fill',source:'native-lands',paint:{'fill-color':['get','color'],'fill-opacity':['case',['==',['get','match'],0],.02,['==',['get','focus'],1],.14,.07],'fill-opacity-transition':{duration:160,delay:0}}},
    {id:'land-outline',type:'line',source:'native-focus-edges',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-opacity':['case',['==',['get','match'],0],.16,['==',['get','focus'],1],.62,.32],'line-width':['interpolate',['linear'],['zoom'],1,.6,5,1,11,1.5]}},
    {id:'cinema-glow',type:'circle',source:'cinema-points',paint:{'circle-radius':5,'circle-color':'#e8eed9','circle-opacity':['case',['==',['get','match'],1],.13,0],'circle-blur':.9,'circle-pitch-alignment':'map'}},
    {id:'cinema-light',type:'circle',source:'cinema-points',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,1.8,7,2.8],'circle-color':'#e5ebd8','circle-opacity':['case',['==',['get','match'],1],.95,.22],'circle-pitch-alignment':'map'}},
    {id:'indigenous-names',type:'symbol',source:'cinema-points',minzoom:3.5,filter:['==',['get','focus'],1],layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':14,'text-anchor':'top','text-offset':[0,.55],'text-padding':5,'text-allow-overlap':false,'text-ignore-placement':false},paint:{'text-color':'#f4eee0','text-halo-color':'#172a31','text-halo-width':1.65}}
   ]};
   live=new ml.Map({container:liveHost,style,center,zoom:liveBaseZoom,minZoom:Math.max(-2,liveBaseZoom-0.35),maxZoom:14,maxPitch:55,attributionControl:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,renderWorldCopies:false,cooperativeGestures:false,fadeDuration:120,trackResize:false,maxTileCacheSize:160,scrollZoom:{around:'center'}});
   live.keyboard?.disableRotation?.();
   // Source readiness alone can be true after an error. Count actual tile loads.
   live.on('sourcedata',e=>{
    if(e.sourceId in received&&e.coord&&e.tile?.state==='loaded'){received[e.sourceId]++;updateDetailStatus();}
   });
   live.on('error',e=>{
    const id=e.sourceId||e.tile?.source||'other';sourceErrors[id]=(sourceErrors[id]||0)+1;updateDetailStatus();
   });
   live.on('load',()=>{
    if(!active||!live)return;
    clearTimeout(liveTimer);liveReady=true;host.classList.add('globe-live');cancelFlight();readLiveCamera();installZoom();
    if(initialCamera)live.jumpTo({center:initialCamera.slice(0,2),zoom:initialCamera[2]});
    readLiveCamera();syncTerrain();syncLandVisibility();movement();finishMove();updateDetailStatus(true);
    try{const t=JSON.parse(params.get('themes')||'[]');if(Array.isArray(t)&&t.every(x=>typeof x==='string')&&t.length)C().showThemeLens(t);}catch{}
    live.on('render',()=>{const t=nowMs();if(lastRender&&t-lastRender<250){frameTimes.push(t-lastRender);if(frameTimes.length>120)frameTimes.shift();}lastRender=t;});
    live.on('zoom',()=>{inputStats.zoomEvents++;inputStats.lastAfter=live.getZoom();});
    live.addControl(new ml.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-right');
    // Keep the default overhead view. An explicit landscape button exposes the actual mesh.
    $('#globe-landscape').hidden=false;
    live.on('zoomend',()=>{if(live.getZoom()<6&&landscape&&!wheelActive){landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');live.easeTo({pitch:0,duration:reduced.matches?0:220});}});
    live.getCanvas().setAttribute('aria-label','Rotate and zoom the globe; Enter explores the focused lands');
    live.getCanvas().addEventListener('keydown',e=>{if(e.key==='Enter'&&focusIds.length){e.preventDefault();C().openLands(focusIds);}});
    live.on('movestart',()=>{if(!liveReady||wheelActive)return;liveMoved=true;movement();});
    live.on('move',()=>{if(!liveReady)return;readLiveCamera();renderSoon();if(!settled)scheduleSettle(180);});
    live.on('idle',()=>{if(!settled&&!wheelActive)scheduleSettle(100);updateDetailStatus(true);});
    live.on('moveend',()=>{if(!liveReady)return;readLiveCamera();if(wheelActive)return;liveMoved=false;syncTerrain();finishMove();updateDetailStatus(true);});
    live.on('click',e=>{
     const h=10,q=e.point;
     const hit=live.queryRenderedFeatures([[q.x-h,q.y-h],[q.x+h,q.y+h]],{layers:['cinema-light']}).find(f=>matchingFilms(f.properties.land).length>0);
     const p=hit&&points.find(v=>v.id===hit.properties.land);
     if(p){preferredLand=p.id;filmOffset=0;setCamera(p.coord,zoom);return;}
     const coord=[wrap(e.lngLat.lng),e.lngLat.lat];
     const hitLands=records.filter(r=>r.shapes.some(s=>includesBounds(s.bounds,coord)&&d3.geoContains(s.feature,coord)));if(hitLands.length){preferredLand=(hitLands.find(r=>r.id===preferredLand)||hitLands.find(r=>matchingFilms(r.id).length)||hitLands[0]).id;filmOffset=0;setCamera(coord,zoom);}
    });

   });
   live.on('error',e=>{if(!liveReady&&/WebGL|shader|context/i.test(String(e.error)))failLive(e.error);});
   liveTimer=setTimeout(()=>{if(!liveReady)failLive('Map initialization timeout');},18000);
  }catch(e){failLive(e);}
 }
 function draw(){
 if(!W||!H)return;if(liveReady){updateLive();return;}updateProjection();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#101b29';ctx.fillRect(0,0,W,H);
 const r=radius(),ocean=ctx.createRadialGradient(W/2-r*.25,H/2-r*.3,0,W/2,H/2,r);
 ocean.addColorStop(0,'#426f80');ocean.addColorStop(.72,'#315667');ocean.addColorStop(1,'#203b50');
 shape(sphere,ocean,null);shape(earth,'#69877b',null);
 if(relief){try{relief.draw();}catch(e){reliefState='unavailable';relief.dispose();relief=null;}}
 shape(earth,null,'rgba(180,201,184,.55)',.42);
 const ps=screenPoints();
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
  for(const f of rec.shapes)shape(f.feature,rgba(rgb,alpha*.72),rgba(rgb,Math.min(.92,alpha*1.65)),focused.has(id)||selected.has(id)?1.25:.75);
 }
 if(fading)renderSoon();
 shape(sphere,null,'rgba(190,212,220,.36)',.75);
 near=ps.filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
 for(const {p,xy,match} of ps){
  const chosen=focused.has(p.id)||selected.has(p.id)||preview.has(p.id),rr=chosen?3.2:1.9,rgb=territoryTone(p.id);
  if(chosen&&match){ctx.beginPath();ctx.arc(xy[0],xy[1],rr+3,0,2*Math.PI);ctx.fillStyle=rgba(rgb,.23);ctx.fill();}
  ctx.beginPath();ctx.arc(xy[0],xy[1],rr,0,2*Math.PI);ctx.fillStyle=match?(chosen?'#f8eed8':'#e0e7dc'):'rgba(208,222,219,.22)';ctx.fill();
 }
 host.classList.toggle('has-tuning',!!near.length||!!inside.length&&settled);
 host.classList.toggle('has-cinema',near.length>0||settled&&inside.some(v=>matchingFilms(v.id).length>0));
}
function aperture(){return W<560?23:29;}
function includesBounds(bounds,p){
 const [[west,south],[east,north]]=bounds,[lon,lat]=p;
 return lat>=south-1e-7&&lat<=north+1e-7&&(west<=east?lon>=west-1e-7&&lon<=east+1e-7:lon>=west-1e-7||lon<=east+1e-7);
}
function underFocus(){
 const c=liveReady?live.unproject([W/2,H/2]):null,p=c?[wrap(c.lng),c.lat]:center;
 return records.filter(rec=>rec.shapes.some(s=>includesBounds(s.bounds,p)&&d3.geoContains(s.feature,p)));
}
function matchingFilms(id){const stamp=filterKey();if(stamp!==matchingStamp){matchingStamp=stamp;matchingCache.clear();}if(!matchingCache.has(id))matchingCache.set(id,C().globeLandCatalogFilms(id).filter(f=>periodMatch(f)&&matchesFacets(f)));return matchingCache.get(id);}
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
function creditDetails(film){
 const d=el('details','globe-credit-details');d.append(el('summary',null,'Full credit and sources'));const body=el('div','globe-credit-data');d.append(body);
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
  rankCache.clear();matchingCache.clear();matchingStamp='';focusKey='';liveSignature='';posterKey='';
  if(current)pendingFilm=current;
  refreshFacetOptions();showPublicationStatus();sync();scheduleSettle(100);
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
function changeFacet(key,value){facetFilter[key]=value;filmOffset=0;focusKey='';liveSignature='';refreshMenuLabels();scheduleSettle(80);renderSoon();}
function clearDiscoveryFilters(){C().clearThemeLens();setPeriod('');$('#globe-period').value='';for(const key of Object.keys(facetFilter)){facetFilter[key]='';$('#globe-filter-'+key).value='';}focusKey='';liveSignature='';filtersInitialized=true;refreshMenuLabels();scheduleSettle(80);renderSoon();}

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
  const placeholder=el('span','globe-art-placeholder',film.title);placeholder.setAttribute('aria-hidden','true');
  container.replaceChildren(placeholder);
  if(!source){container.dataset.artState='missing';return;}
  let url;try{url=new URL(source,location.href);if(!['http:','https:'].includes(url.protocol))throw Error('invalid image');}catch{container.dataset.artState='missing';return;}
  const img=el('img');img.alt='';img.decoding='async';img.draggable=false;img.loading=kind==='strip'?'lazy':'eager';img.referrerPolicy='strict-origin-when-cross-origin';
  const measure=()=>{
   if(!img.naturalWidth||!img.naturalHeight)return;
   const ratio=img.naturalWidth/img.naturalHeight;
   artFailures.delete(source);artSizes.set(source,{w:img.naturalWidth,h:img.naturalHeight,ratio});
   container.dataset.artState='ready';container.dataset.orientation=ratio<.86?'portrait':ratio>1.25?'landscape':'square';
   container.style.setProperty('--art-ratio',String(ratio));
   container.style.setProperty('--art-natural-width',img.naturalWidth+'px');
   container.style.setProperty('--art-natural-height',img.naturalHeight+'px');
   container.style.setProperty('--art-feature-width',Math.min(img.naturalWidth,212*ratio)+'px');
   container.style.setProperty('--art-mobile-width',Math.min(img.naturalWidth,132*ratio)+'px');
   container.style.setProperty('--art-strip-width',Math.min(img.naturalWidth,64*ratio)+'px');
   if(active&&container.isConnected){cancelAnimationFrame(posterLayoutFrame);posterLayoutFrame=requestAnimationFrame(()=>{posterLayoutFrame=0;placeEmergent();});}
  };
  img.addEventListener('load',measure,{once:true});
  img.addEventListener('error',()=>{artFailures.add(source);rankCache.clear();container.dataset.artState='broken';placeholder.title='Recorded artwork could not load; film remains available';img.remove();if(kind==='emergent')placeEmergent();},{once:true});
  container.dataset.artState='loading';container.append(img);img.src=url.href;if(img.complete&&img.naturalWidth)measure();
 }
 function placeEmergent(){
  const b=$('#globe-emergent');if(!b)return;
  const hide=why=>{posterReason=why;b.hidden=true;b.style.visibility='';};
  if(menuMode)return hide('menu-open');if(!settled)return hide('moving');if(!featured)return hide('no-matching-film');if(!C().sourceImage(featured.film))return hide('no-recorded-image');if(!liveReady)return hide('overview-fallback');
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
  const blocks=['.globe-primary','.globe-menu-panel:not([hidden])','.globe-zoom','#globe-encounter','.globe-footer','#weave-theme-lens','#constellate-mode','#constellate-popup'].map(s=>$(s)).filter(e=>e&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const q=e.getBoundingClientRect();return {x:q.x-root.x,y:q.y-root.y,w:q.width,h:q.height};});
  b.style.visibility='hidden';b.hidden=false;
  for(const factor of [1,.82,.66]){
   const scale=Math.min(1,maxW*factor/size.w,maxH*factor/size.h),imageW=size.w*scale,imageH=size.h*scale;
   if(imageW<38||imageH<28)continue;
   b.style.setProperty('--poster-image-width',imageW+'px');b.style.setProperty('--poster-image-height',imageH+'px');
   const w=b.offsetWidth,h=b.offsetHeight,clear=aperture()+15;
   const candidates=[[W/2+clear,H/2-h/2],[W/2-clear-w,H/2-h/2],[W/2-w/2,H/2-clear-h],[W/2-w/2,H/2+clear],[W/2+clear,H/2-h-8],[W/2-clear-w,H/2-h-8],[W/2+clear,H/2+8],[W/2-clear-w,H/2+8],[W/2-w-8,H/2-clear-h],[W/2+8,H/2-clear-h]];
   const pos=candidates.find(([x,y])=>x>5&&y>5&&x+w<W-5&&y+h<H-5&&!blocks.some(q=>x<q.x+q.w+4&&x+w+4>q.x&&y<q.y+q.h+4&&y+h+4>q.y));
   if(pos){b.style.left=pos[0]+'px';b.style.top=pos[1]+'px';b.style.visibility='';posterReason='visible';return;}
  }
  return hide('no-safe-space-or-small-image');
 }
 function drawEncounter(){
 const panel=$('#globe-encounter'),status=$('#globe-status'),actual=new Set(inside.map(r=>r.id));
 const chosen=focusIds.map(id=>byId.get(id)).filter(Boolean);
 const primary=chosen.find(r=>r.id===preferredLand)||chosen.find(r=>actual.has(r.id)&&matchingFilms(r.id).length)||chosen.find(r=>matchingFilms(r.id).length)||chosen.find(r=>actual.has(r.id))||chosen[0];
 const sig=JSON.stringify([focusIds,inside.map(v=>v.id),primary?.id,primary?matchingFilms(primary.id).map(f=>f.id):[],filmOffset,yearBand,currentTheme(),facetFilter,publicationStatus,pendingFilm,journey.length]);
 if(sig===focusKey){placeEmergent();return;}focusKey=sig;panel.replaceChildren();
 if(!primary){featured=null;placeEmergent();panel.append(el('strong',null,'Explore the globe'),el('p','globe-empty','Move a light into the circle to discover cinema.'));status.textContent='No land reference in focus';return;}
 const films=rankedFilms(primary.id);
 if(lastEncounter!==primary.id){filmOffset=0;lastEncounter=primary.id;}
 if(pendingFilm){const i=films.findIndex(f=>f.id===pendingFilm);if(i>=0){filmOffset=i;pendingFilm='';}}
 filmOffset=Math.min(filmOffset,Math.max(0,films.length-1));
 recordVisit(primary);
 const head=el('div','globe-encounter-heading');head.append(el('strong',null,primary.name),el('small',null,films.length+' film credit'+(films.length===1?'':'s')));
 panel.append(el('small','globe-kicker',actual.has(primary.id)?'Land at the focal point':'Nearby land reference'),head);
 if(chosen.length>1){const overlap=el('details','globe-overlap');overlap.append(el('summary',null,chosen.length+' land references · '+chosen.filter(r=>matchingFilms(r.id).length).length+' with matching films'));const choices=el('div','globe-choices');for(const r of chosen){const btn=button(r.name+' · '+matchingFilms(r.id).length,()=>{preferredLand=r.id;filmOffset=0;focusKey='';drawEncounter();renderSoon();},'globe-land-choice');btn.setAttribute('aria-pressed',String(primary.id===r.id));choices.append(btn);}overlap.append(choices);panel.append(overlap);}
 if(films.length){
  const film=films[filmOffset];featured={land:primary.id,film};const card=el('div','globe-featured'),art=button('',()=>{C().showPreview(film,{land:primary.id});sync();},'globe-feature-art');
  art.setAttribute('aria-label','Preview '+film.title);artwork(art,film,'feature');
  const copy=el('div','globe-feature-copy'),title=button(film.title,()=>{C().showPreview(film,{land:primary.id});sync();},'globe-film-title');
  const ref=A().recordLandReferences(film.record).find(r=>r.id===primary.id);copy.append(title,el('small','globe-film-byline',[film.maker,film.year].filter(Boolean).join(' · ')));const work=C().globeMetadata(film)?.film||A().recordById(film.record)?.films.find(x=>x.id===film.film);const facet=exactFacet(film),format=facet.f||work?.weaveForm||work?.medium;const language=facet.l||work?.languageLabels||work?.languages;const lang=Array.isArray(language)?language.join(' · '):typeof language==='string'?language:'';const length=facet.n||({S:'Short',F:'Feature',M:'Mid-length'}[work?.weaveLength]||work?.weaveLength),runtime=Number(work?.runtimeMinutes)>0?work.runtimeMinutes+' min':'';const facts=[format,length,runtime,lang].filter(Boolean).join(' · ');if(facts)copy.append(el('small','globe-film-facts',facts));copy.append(el('small','globe-provenance',ref?.status==='sourced'?'Sourced land association':'Provisional land association'));
  if(ref?.source){const source=externalLink('Association source',ref.source,'globe-source-link');if(source)copy.append(source);}
  const actions=el('div','globe-film-actions');const view=safeViewing(film);if(view){const a=externalLink(view.label+' ↗',view.url,'globe-view-link');if(a)actions.append(a);}
  const profile=externalLink('Atlas record ↗',creditProfile(film),'globe-source-link');if(profile)actions.append(profile);copy.append(actions);
  const themes=el('div','globe-film-themes');for(const t of C().terms(film).slice(0,3))themes.append(button(t,()=>{C().showThemeLens([t]);filmOffset=0;sync();}));if(themes.childNodes.length)copy.append(themes);
  card.append(art,copy);panel.append(card);
  const extras=el('details','globe-film-extras');extras.open=encounterExpanded;extras.append(el('summary',null,'More films and land sources'));extras.addEventListener('toggle',()=>{encounterExpanded=extras.open;placeEmergent();});const strip=el('div','globe-film-strip');for(const f of films.slice(filmOffset,filmOffset+3)){const btn=button('',()=>{filmOffset=films.indexOf(f);focusKey='';drawEncounter();},'globe-film');btn.setAttribute('aria-label','Select '+f.title);btn.setAttribute('aria-pressed',String(f.id===film.id));const a=el('span','globe-film-art');artwork(a,f,'strip');const c=el('span','globe-film-copy');c.append(el('strong',null,f.title),el('small',null,f.year||''));btn.append(a,c);strip.append(btn);}extras.append(strip);
  const nav=el('div','globe-encounter-nav');const prev=button('‹',()=>{filmOffset=(filmOffset+films.length-1)%films.length;focusKey='';drawEncounter();},'globe-cycle'),next=button('›',()=>{filmOffset=(filmOffset+1)%films.length;focusKey='';drawEncounter();},'globe-cycle');prev.setAttribute('aria-label','Previous film');next.setAttribute('aria-label','Next film');prev.disabled=next.disabled=films.length<2;
  nav.append(prev,el('small',null,(filmOffset+1)+' / '+films.length),next,button('Land catalogue',()=>{C().openLand(primary.id);sync();},'globe-more'));panel.append(nav);
  const related=relatedEncounter(film,primary.id);if(related){const bridge=button('Follow '+related.term+' · '+related.ref.name,()=>{followRelated(related);},'globe-related');bridge.title=related.film.title;bridge.dataset.targetFilm=related.film.id;bridge.dataset.targetLand=related.ref.id;panel.append(bridge);}panel.append(extras,creditDetails(film));
 }else{featured=null;panel.append(el('p','globe-empty',primary.count?'No films match the active filters.':'No linked films in the Atlas yet. This is still a mapped land reference.'),button('Explore this land',()=>C().openLand(primary.id),'globe-more'));if(primary.count)panel.append(button('Clear film filters',clearDiscoveryFilters,'globe-more'));else if(points.some(p=>matchingFilms(p.id).length))panel.append(button('Discover a film',surprise,'globe-more'));}
 if(journey.length){const back=button('‹ Previous encounter',journeyBack,'globe-related');back.id='globe-journey-back';panel.append(back);}
 const provenance=el('details','globe-land-source');provenance.append(el('summary',null,'About these land references'),el('p',null,'The atlas uses the 2023 Native Land Digital / MapMaker reference geometry. Overlaps are intentional; these are not official boundaries or filming locations.'));const link=externalLink('Native Land Digital ↗','https://native-land.ca/');if(link)provenance.append(link);const extra=panel.querySelector('.globe-film-extras');(extra||panel).append(provenance);
 status.textContent=primary.name+' · '+films.length+' matching film credits';placeEmergent();
}

function settle(){
 if(!active||!W||!H)return;
 if(pointers.size||activeMapPointers.size||flight||wheelActive||gestureStart!==null){scheduleSettle(180);return;}
 if(liveReady){readLiveCamera();if(live.isMoving()&&nowMs()-lastCameraChange<350){scheduleSettle(180);return;}}
 settled=true;host.classList.remove('is-moving');$('#globe-encounter').setAttribute('aria-busy','false');updateProjection();inside=underFocus();
 const nearby=screenPoints().filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
 const direct=inside.filter(v=>matchingFilms(v.id).length);
 // All overlapping land references remain available. Catalogue size never ranks peoples.
 // If no matching film sits beneath the focus, an actual nearby indexed point may respond.
 const next=[...new Set([...direct.map(v=>v.id),...nearby.map(v=>v.p.id),...inside.map(v=>v.id)])];
 if(next.join('|')!==focusIds.join('|')){previewLimit=3;if(!next.includes(preferredLand))preferredLand='';}
 focusIds=next;drawEncounter();placeEmergent();renderSoon();
}
function scheduleSettle(ms=180){clearTimeout(settleTimer);settleTimer=setTimeout(settle,ms);}
function movement(){
 settled=false;placeEmergent();host.classList.add('is-moving');$('#globe-encounter').setAttribute('aria-busy','true');renderSoon();scheduleSettle();
}
function finishMove(){if(!host)return;host.classList.remove('is-moving');$('#globe-encounter').setAttribute('aria-busy','false');scheduleSettle(140);}
function cancelFlight(){if(flight)cancelAnimationFrame(flight);flight=0;flightTarget=null;}
function setCamera(c,z=zoom,duration=300){
 if(liveReady){stopWheel();const target={center:[wrap(c[0]),clamp(c[1],-85,85)],zoom:clamp(liveBaseZoom+Math.log2(Math.max(.1,z)),live.getMinZoom(),live.getMaxZoom()),duration:reduced.matches?0:duration};live.easeTo(target);return;}
 cancelFlight();const goal=[wrap(c[0]),clamp(c[1],-89.9,89.9)],goalZoom=clamp(z,.8,25);
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
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;cancelFlight();lastDrag=null;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=midpoint();dragged=pointers.size>1;clearTimeout(settleTimer);canvas.classList.add('grabbing');});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const m=midpoint(),g=gesture;gesture=m;if(!m||!g)return;
  const dx=m.x-g.x,dy=m.y-g.y;if(Math.abs(dx)+Math.abs(dy)>1||Math.abs(m.d-g.d)>1)dragged=true;if(!dragged)return;
  if(m.d&&g.d)zoom=clamp(zoom*m.d/g.d,.8,25);
  const scale=DEG/radius(),cos=Math.max(.35,Math.cos(center[1]/DEG));
  const now=performance.now(),dt=lastDrag?clamp(now-lastDrag.t,8,80):16;lastDrag={t:now,lon:-dx*scale/cos/dt,lat:dy*scale/dt};
  center=[wrap(center[0]-dx*scale/cos),clamp(center[1]+dy*scale,-89.9,89.9)];movement();
 });
 function end(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);gesture=midpoint();if(pointers.size)return;canvas.classList.remove('grabbing');
  if(!dragged&&e.type==='pointerup'){const b=canvas.getBoundingClientRect(),xy=[e.clientX-b.left,e.clientY-b.top];const found=screenPoints().filter(v=>v.match&&Math.hypot(v.xy[0]-xy[0],v.xy[1]-xy[1])<14).sort((a,b)=>Math.hypot(a.xy[0]-xy[0],a.xy[1]-xy[1])-Math.hypot(b.xy[0]-xy[0],b.xy[1]-xy[1]));if(found.length){setCamera(found[0].p.coord,zoom);return;}}
  if(dragged&&e.type==='pointerup'&&!reduced.matches&&lastDrag&&performance.now()-lastDrag.t<75){
   const dx=clamp(lastDrag.lon*65,-12,12),dy=clamp(lastDrag.lat*65,-10,10);
   if(Math.hypot(dx,dy)>.12){setCamera([center[0]+dx,center[1]+dy],zoom,240);return;}
  }
  finishMove();
 }
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();cancelFlight();const delta=e.deltaY*(e.deltaMode===1?16:1);zoom=clamp(zoom*Math.exp(-clamp(delta,-350,350)*(e.ctrlKey?.009:.004)),.8,25);movement();finishMove();},{passive:false});
 canvas.addEventListener('keydown',e=>{const k=e.key,step=12/Math.sqrt(zoom);if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home','Enter'].includes(k))return;e.preventDefault();e.stopPropagation();if(k==='Enter'){if(focusIds.length)C().openLands(focusIds);return;}if(k==='Home'){setCamera([-91,12],1);return;}if(k==='+'||k==='='){setCamera(center,zoom*1.4);return;}if(k==='-'){setCamera(center,zoom/1.4);return;}setCamera([center[0]+(k==='ArrowRight'?step:k==='ArrowLeft'?-step:0),center[1]+(k==='ArrowUp'?step:k==='ArrowDown'?-step:0)]);});
}
function refreshMenuLabels(){
 const b=$('#globe-theme-toggle'),t=currentTheme(),period=$('#globe-period')?.value;
 if(b){b.textContent=t.length?'Themes ('+t.length+')':'Themes';b.classList.toggle('has-filter',!!t.length);b.title=t.join(' + ')||'Explore films by theme';}
 const m=$('#globe-more-toggle'),filters=Object.values(facetFilter).filter(Boolean).length+Number(!!period);if(m){m.textContent=filters?'Map ('+filters+')':'Map';m.title=period?'Map settings · '+period+'–'+(Number(period)+19):'Map settings';}
}
function setMenu(mode='',restoreFocus=false){
 if(!host)return;const prior=menuMode;menuMode=mode===menuMode?'':mode;
 for(const key of ['find','theme','more']){
  const b=$('#globe-'+key+'-toggle'),p=$('#globe-'+key+'-panel');if(!b||!p)continue;
  b.setAttribute('aria-expanded',String(menuMode===key));p.hidden=menuMode!==key;
 }
 if(restoreFocus&&prior)$('#globe-'+prior+'-toggle')?.focus({preventScroll:true});
 if(menuMode==='find')$('#globe-find')?.focus({preventScroll:true});
 if(menuMode==='theme')$('#weave-map-theme')?.focus({preventScroll:true});
 refreshMenuLabels();placeEmergent();
}
function restoreThemeLens(){
 const lens=$('#weave-theme-lens');
 if(lens&&themeLensHome?.parent){const p=themeLensHome.parent,next=themeLensHome.next;p.insertBefore(lens,next?.parentNode===p?next:null);}
 themeLensHome=null;menuListeners?.abort();menuListeners=null;
}
function markup(){
 host=el('section');host.id='atlas-rotational-globe';host.setAttribute('aria-label','Rotatable cinema atlas');
 host.innerHTML='<canvas id="globe-surface" tabindex="0" aria-label="Rotate the globe using arrow keys, plus and minus to zoom, Enter to explore the focused lands"></canvas><div id="globe-aperture" aria-hidden="true"></div><button id="globe-emergent" type="button" hidden></button><div class="globe-instructions">Drag to explore · scroll or pinch to zoom</div><nav class="globe-guide" aria-label="Globe navigation"><div class="globe-primary"><button type="button" id="globe-find-toggle" aria-expanded="false" aria-controls="globe-find-panel">Find</button><button type="button" id="globe-theme-toggle" aria-expanded="false" aria-controls="globe-theme-panel">Themes</button><button type="button" id="globe-surprise">Discover</button><button type="button" id="globe-more-toggle" aria-expanded="false" aria-controls="globe-more-panel">Map</button></div><div id="globe-find-panel" class="globe-menu-panel" hidden><label for="globe-search">Find films or filmmakers</label><input id="globe-search" type="search" placeholder="Title or filmmaker…" autocomplete="off"><div id="globe-search-results" aria-live="polite"></div><label for="globe-find">Find a land</label><select id="globe-find"><option value="">Choose a land…</option></select><select id="globe-recent" aria-label="Recently explored lands" hidden><option value="">Recently explored…</option></select></div><div id="globe-theme-panel" class="globe-menu-panel" hidden></div><div id="globe-more-panel" class="globe-menu-panel" hidden><div class="globe-buttons"><button type="button" id="globe-home">Americas</button><button type="button" id="globe-landscape" aria-pressed="false" hidden>Terrain</button></div><label for="globe-period">Film period</label><select id="globe-period"><option value="">All years</option></select><div class="globe-buttons"><button type="button" id="globe-lands" aria-pressed="true" title="Toggle Indigenous reference territories">Lands: on</button><button type="button" id="globe-share">Share view</button></div><details class="globe-settings"><summary>Land visibility</summary><label for="globe-opacity" class="sr-only">Territory visibility</label><select id="globe-opacity" aria-label="Territory visibility"><option value="0.65">Subtle</option><option value="1" selected>Balanced</option><option value="1.6">Stronger</option></select></details><details class="globe-catalog-filters"><summary>Film filters</summary><label for="globe-filter-language">Language</label><select id="globe-filter-language"></select><label for="globe-filter-form">Form</label><select id="globe-filter-form"></select><label for="globe-filter-length">Length</label><select id="globe-filter-length"></select><button type="button" id="globe-clear-filters">Clear film filters</button></details><div id="globe-csv-status" role="status"></div><button type="button" id="globe-csv-retry" hidden>Retry catalogue sync</button><div id="globe-detail-status" class="globe-detail-status" aria-live="off">Loading detailed map</div><button type="button" id="globe-close">Flat workspace</button></div></nav><div class="globe-zoom" aria-label="Zoom controls"><button type="button" id="globe-plus" aria-label="Zoom in">+</button><button type="button" id="globe-minus" aria-label="Zoom out">−</button></div><section id="globe-encounter" aria-label="Cinema at the focal point"></section><div class="globe-footer"><span><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth (fallback)</a> · <a href="https://earthobservatory.nasa.gov/features/BlueMarble" target="_blank" rel="noopener">NASA Blue Marble</a> · <a href="https://cloudless.eox.at/license-non-commercial" target="_blank" rel="noopener">EOxCloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 &amp; 2017)</a> · <a href="https://mapterhorn.com/attribution/" target="_blank" rel="noopener">Mapterhorn terrain</a> · <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · Existing 2023 Atlas references: <a href="https://native-land.ca/" target="_blank" rel="noopener">Native Land Digital</a> / <a href="https://education.nationalgeographic.org/resource/mapmaker-indigenous-territories/" target="_blank" rel="noopener">MapMaker</a>. Reference shapes, not official boundaries or filming locations.</span><span id="globe-status" class="sr-only" role="status" aria-live="polite"></span></div>';
 $('.map-panel').append(host);const lens=$('#weave-theme-lens');if(lens){themeLensHome={parent:lens.parentNode,next:lens.nextSibling};$('#globe-theme-panel').append(lens);}
 for(const key of ['find','theme','more'])$('#globe-'+key+'-toggle').onclick=()=>setMenu(key);
 menuListeners=new AbortController();const opts={capture:true,signal:menuListeners.signal};
 document.addEventListener('pointerdown',e=>{if(menuMode&&!e.target.closest('.globe-guide'))setMenu('');},opts);
 // Window capture precedes document-level legacy Escape handlers, which can exit Constellate.
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuMode){e.preventDefault();e.stopImmediatePropagation();setMenu('',true);}},opts);
 $('#weave-map-theme')?.addEventListener('change',refreshMenuLabels,{signal:menuListeners.signal});$('#weave-map-theme-second')?.addEventListener('change',refreshMenuLabels,{signal:menuListeners.signal});
 canvas=$('#globe-surface');ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
 $('#globe-emergent').onclick=()=>{if(featured){C().showPreview(featured.film,{land:featured.land});placeEmergent();sync();}};
 for(const key of Object.keys(facetFilter))$('#globe-filter-'+key).onchange=e=>changeFacet(key,e.target.value);
 $('#globe-clear-filters').onclick=clearDiscoveryFilters;$('#globe-csv-retry').onclick=synchronizePublication;
 const search=$('#globe-search'),results=$('#globe-search-results');
 const normalize=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 search.addEventListener('input',()=>{const q=normalize(search.value).trim();results.replaceChildren();if(q.length<2)return;const idx=C().globeCreditIndex(),matches=idx.films.filter(f=>{const r=A().recordById(f.record),work=r?.films.find(x=>x.id===f.film);return normalize([f.title,f.maker,r?.community,r?.nation,...(Array.isArray(r?.aliases)?r.aliases:[]),...(Array.isArray(work?.aliases)?work.aliases:[]),...(exactFacet(f).l||[]),...C().terms(f)].join(' ')).includes(q);});for(const f of matches.slice(0,12)){const refs=idx.refs.get(f.id)||[],ref=refs.find(x=>byId.has(x.id));const item=el('div','globe-search-result');const b=button(f.title+' · '+[f.maker,f.year].filter(Boolean).join(' · '),()=>{setMenu('');if(ref){clearDiscoveryFilters();gotoLand(ref.id,f.id,true);}else C().showPreview(f);},'globe-search-film');item.append(b,el('small',null,ref?'Mapped land association':'No mapped land association'));if(!ref){const link=externalLink('Atlas record ↗',creditProfile(f));if(link)item.append(link);}results.append(item);}if(!matches.length)results.append(el('p',null,'No matching film credits.'));else if(matches.length>12)results.append(el('small',null,'Showing 12 of '+matches.length+' credits. Refine search.'));});
 const sel=$('#globe-find');for(const p of records){const o=el('option',null,p.name+(p.count?' ('+p.count+')':' · no films yet'));o.value=p.id;sel.append(o);}
 sel.onchange=()=>{if(sel.value){setMenu('');gotoLand(sel.value);}};
 const years=$('#globe-period');for(let y=1900;y<=2020;y+=20){const o=el('option',null,y+'–'+(y+19));o.value=String(y);years.append(o);}if([...years.options].some(o=>o.value===params.get('period'))){yearBand=params.get('period');years.value=yearBand;}years.onchange=()=>{setPeriod(years.value);refreshMenuLabels();};
 try{recent=JSON.parse(sessionStorage.getItem('atlas-globe-recent')||'[]').filter(x=>x&&byId.has(x.id)).slice(0,10);}catch{}updateRecent();
 $('#globe-recent').onchange=e=>{if(e.target.value){setMenu('');gotoLand(e.target.value);}};
 $('#globe-surprise').onclick=()=>{setMenu('');surprise();};
 $('#globe-lands').onclick=()=>{landsVisible=!landsVisible;syncLandVisibility();};
 if(['0.65','1','1.6'].includes(params.get('lands'))){landStrength=Number(params.get('lands'));$('#globe-opacity').value=String(landStrength);}
 $('#globe-opacity').onchange=e=>{landStrength=Number(e.target.value);if(!landsVisible)landsVisible=true;syncLandVisibility();};
 $('.globe-settings').addEventListener('toggle',()=>placeEmergent());
 $('#globe-encounter').addEventListener('toggle',()=>placeEmergent(),true);
 $('#globe-share').onclick=async()=>{const u=shareView();try{await navigator.clipboard.writeText(u);$('#globe-share').textContent='Copied';setTimeout(()=>{if($('#globe-share'))$('#globe-share').textContent='Share view';},1400);}catch{const input=el('input','globe-share-url');input.value=u;input.readOnly=true;input.setAttribute('aria-label','Shareable globe link');$('#globe-share').after(input);input.select();}};

 $('#globe-home').onclick=()=>{setMenu('');sel.value='';preferredLand='';filmOffset=0;landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');if(liveReady)live.setPitch(0);setCamera([-91,12],1);};
 $('#globe-landscape').onclick=()=>{if(!liveReady)return;setMenu('');stopWheel();landscape=!landscape;$('#globe-landscape').setAttribute('aria-pressed',String(landscape));if(landscape&&!live.getTerrain())live.setTerrain({source:'dem',exaggeration:1});live.easeTo({zoom:landscape?Math.max(live.getZoom(),7):live.getZoom(),pitch:landscape?42:0,duration:reduced.matches?0:350});};
 $('#globe-plus').onclick=()=>{if(liveReady)queueZoom((wheelGoal??live.getZoom())+.65);else setCamera(flightTarget?.center||center,(flightTarget?.zoom||zoom)*1.5);};$('#globe-minus').onclick=()=>{if(liveReady)queueZoom((wheelGoal??live.getZoom())-.65);else setCamera(flightTarget?.center||center,(flightTarget?.zoom||zoom)/1.5);};$('#globe-close').onclick=close;
 wire();
}
async function boot(){
 try{
  const resp=await fetch(new URL('assets/world-50m.json',document.baseURI));if(!resp.ok)throw Error('Geography unavailable');const world=await resp.json();if(closed||!C()?.enabled)return;
  const collection=world.objects.countries;if(!collection?.geometries?.length)throw Error('No Natural Earth geometry');
  earth=normalizeGeometry(topojson.merge(world,collection.geometries));landArea=d3.geoArea(earth);
  // Earth's dry land is about 29% of its surface. Catch winding inversions or empty topology before displaying a sphere.
  if(!Number.isFinite(landArea)||landArea<2.5||landArea>4.8)throw Error('Natural Earth land area is invalid: '+landArea);
  collect();if(!points.length)throw Error('No mapped cinema references');
  proj=d3.geoOrthographic().clipAngle(90).precision(.65);markup();path=d3.geoPath(proj,ctx);
  active=true;loadRelief();document.body.classList.add('atlas-globe-experiment');host.dataset.ready='true';C().refreshDiscoveryMode();refreshFacetOptions();synchronizePublication();
  ro=new ResizeObserver(resize);ro.observe(canvas);resize();draw();settle();bootLive();
 }catch(e){fallback(e);}
}
const started=Date.now();(function wait(){if(closed)return;if(C()?.enabled&&A()?.lands&&window.topojson&&window.d3&&window.AtlasGeoIntegrity){boot();return;}if(Date.now()-started<20000)setTimeout(wait,100);})();
})();
