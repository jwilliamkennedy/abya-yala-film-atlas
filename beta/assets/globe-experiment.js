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
let lastStatus=0;
const nowMs=()=>performance.now();
function liveStats(){
 if(!liveReady||!live)return null;
 let elevation=null;try{elevation=live.queryTerrainElevation(center);}catch{}
 return {version:live.version||null,zoom:live.getZoom(),pitch:live.getPitch(),mesh:live.getTerrain()?.source||null,elevation,received:{...received},errors:{...sourceErrors},wheelActive};
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
function territoryTone(id){let h=2166136261;for(const c of String(id)){h=Math.imul(h^c.charCodeAt(0),16777619);}return tones[(h>>>0)%tones.length];}
const rgba=(rgb,a)=>'rgba('+rgb+','+a+')';
const sphere={type:'Sphere'};
function camera(){return {center:[...center],zoom,projection:'globe',renderer:liveReady?'maplibre-globe':'orthographic-canvas'};}
function renderSoon(){if(!active||raf)return;raf=requestAnimationFrame(()=>{raf=0;draw();});}
function sync(){if(!active)return;renderSoon();if(!pointers.size&&!flight&&!wheelActive&&!live?.isMoving())scheduleSettle(75);}
window.AtlasGlobe={get active(){return active},get camera(){return active?camera():null},get pointCount(){return points.length},get geometryCount(){return records.length},get anchorFailures(){return [...anchorFailures]},get anchors(){return points.map(p=>({id:p.id,coordinate:[...p.coord],sourceId:p.anchor.sourceId,component:p.anchor.component,method:p.anchor.method}))},get landArea(){return landArea},get terrain(){return liveReady?'tiled':reliefState},get tileState(){return liveStats()},goTo(coord,mapZoom){if(liveReady&&Array.isArray(coord)&&coord.length===2&&coord.every(Number.isFinite)&&Number.isFinite(mapZoom))setCamera(coord,Math.pow(2,mapZoom-liveBaseZoom),0);},get focus(){return {ids:[...focusIds],inside:inside.map(r=>r.id),settled};},sync,close};
function close(){
 const wasActive=active;closed=true;active=false;clearTimeout(settleTimer);cancelFlight();if(raf)cancelAnimationFrame(raf);raf=0;ro?.disconnect();
 clearTimeout(liveTimer);stopWheel();liveReady=false;live?.remove();live=null;liveHost=null;relief?.dispose();relief=null;host?.remove();host=null;document.body.classList.remove('atlas-globe-experiment');if(wasActive&&C()?.enabled)C().refreshDiscoveryMode();
 const u=new URL(location.href);u.searchParams.delete('globe');history.replaceState(history.state,'',u.href);
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
 records.sort((a,b)=>a.name.localeCompare(b.name));points.sort((a,b)=>a.name.localeCompare(b.name));
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
  out.push({p,xy,match:c.landMatchesTheme([p.id]),distance:Math.hypot(xy[0]-W/2,xy[1]-H/2)});
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
 function liveLandData(ids){
  const features=[];
  for(const id of ids){const r=byId.get(id);if(!r)continue;const color='rgb('+territoryTone(id)+')',match=C().landMatchesTheme([id]);
   const focus=focusIds.includes(id)||[...C().selectedLandIds].includes(id)||C().previewLandIds().includes(id);
   for(const {feature} of r.shapes)features.push({type:'Feature',properties:{land:id,color,match:match?1:0,focus:focus?1:0},geometry:geoPolygon(feature.geometry)});
  }
  return {type:'FeatureCollection',features};
 }
 function livePointsData(){
  return {type:'FeatureCollection',features:points.map(p=>({type:'Feature',properties:{land:p.id,name:p.name,focus:focusIds.includes(p.id)?1:0,match:C().landMatchesTheme([p.id])?1:0},geometry:{type:'Point',coordinates:p.coord}}))};
 }
 function updateLive(){
  if(!liveReady)return;
  if(live.isMoving()||wheelActive){const t=nowMs();if(t-lastLiveUpdate<95)return;lastLiveUpdate=t;}
  const ps=screenPoints();near=ps.filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
  host.classList.toggle('has-tuning',!!near.length||!!inside.length&&settled);
  host.classList.toggle('has-cinema',near.length>0||settled&&inside.some(v=>C().landMatchesTheme([v.id])&&v.count));
  // Keep the source stable while dragging. Rebuild only once the camera settles or theme changes.
  if(live.isMoving()||wheelActive)return;
  const ids=[...new Set([...focusIds,...C().selectedLandIds,...C().previewLandIds(),...ps.filter(v=>v.match&&v.distance<=aperture()*2.4).sort((a,b)=>a.distance-b.distance).slice(0,8).map(v=>v.p.id)])];
  const sig=JSON.stringify([ids,focusIds,C().selectedLandIds,C().previewLandIds(),points.filter(p=>C().landMatchesTheme([p.id])).map(p=>p.id)]);
  if(sig===liveSignature)return;liveSignature=sig;
  live.getSource('native-lands')?.setData(liveLandData(ids));
  live.getSource('cinema-points')?.setData(livePointsData());
 }
 function readLiveCamera(){const p=live.getCenter();center=[wrap(p.lng),p.lat];zoom=Math.pow(2,live.getZoom()-liveBaseZoom);}
 // Centered wheel/pinch uses accumulated logarithmic scale, not a restarted easing
 // animation. The geographic point inside the fixed aperture stays fixed.
 function stopWheel(resetGesture=true){if(wheelFrame)cancelAnimationFrame(wheelFrame);wheelFrame=0;wheelGoal=null;wheelActive=false;if(resetGesture)gestureStart=null;}
 function queueZoom(goal){
  if(!liveReady)return;
  wheelGoal=clamp(goal,live.getMinZoom(),live.getMaxZoom());wheelLast=nowMs();
  if(!wheelActive){live.stop();wheelActive=true;movement();}
  if(wheelFrame)return;
  function frame(t){
   wheelFrame=0;if(!active||!liveReady||wheelGoal===null){stopWheel();return;}
   const current=live.getZoom(),delta=wheelGoal-current;
   const next=reduced.matches||Math.abs(delta)<.008?wheelGoal:current+delta*.36;
   if(Math.abs(next-current)>1e-6)live.jumpTo({zoom:next});
   if(Math.abs(wheelGoal-live.getZoom())>.008||t-wheelLast<90){wheelFrame=requestAnimationFrame(frame);return;}
   stopWheel(false);readLiveCamera();if(live.getZoom()<6&&landscape){landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');live.setPitch(0);}finishMove();updateDetailStatus(true);
  }
  wheelFrame=requestAnimationFrame(frame);
 }
 function installZoom(){
  // Only one wheel handler. Touchscreen pinch remains MapLibre's native centered gesture.
  live.scrollZoom.disable();live.touchZoomRotate.enable({around:'center'});live.touchZoomRotate.disableRotation();
  liveHost.addEventListener('wheel',e=>{
   if(!liveReady)return;e.preventDefault();e.stopPropagation();
   if(gestureStart!==null||nowMs()<gestureUntil)return;
   const unit=e.deltaMode===1?16:e.deltaMode===2?H:1;
   const dy=e.deltaY*unit;
   if(!dy||Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.5)return;
   const d=clamp(-dy*(e.ctrlKey?.010:.0045),-1.25,1.25);
   queueZoom((wheelGoal??live.getZoom())+d);
  },{capture:true,passive:false});
  liveHost.addEventListener('gesturestart',e=>{e.preventDefault();stopWheel();gestureStart=live.getZoom();},{capture:true,passive:false});
  liveHost.addEventListener('gesturechange',e=>{if(gestureStart===null)return;e.preventDefault();queueZoom(gestureStart+Math.log2(Math.max(.05,e.scale)));},{capture:true,passive:false});
  liveHost.addEventListener('gestureend',e=>{e.preventDefault();gestureStart=null;gestureUntil=nowMs()+160;},{capture:true,passive:false});
  liveHost.addEventListener('pointerdown',()=>{if(wheelActive){stopWheel();finishMove();}},{capture:true});
 }
 function failLive(reason){
  if(!liveHost)return;console.warn('Native globe unavailable; using local fallback',reason);stopWheel();
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
   const style={version:8,projection:{type:'globe'},terrain:{source:'dem',exaggeration:1},glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{
    earth:{type:'geojson',data:{type:'Feature',properties:{},geometry:geoPolygon(earth)}},
    marble:{type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],tileSize:256,maxzoom:8,attribution:'NASA Blue Marble / GIBS'},
    satellite:{type:'raster',tiles:['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],tileSize:256,minzoom:4,maxzoom:14,attribution:'EOxCloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)'},
    places:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'OpenStreetMap contributors / OpenFreeMap'},
    dem:{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,maxzoom:12,encoding:'terrarium',attribution:'Mapterhorn terrain'},
    hilldem:{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,maxzoom:12,encoding:'terrarium',attribution:'Mapterhorn terrain'},
    'native-lands':{type:'geojson',data:emptyGeo(),tolerance:0,buffer:128,maxzoom:14},
    'cinema-points':{type:'geojson',data:livePointsData(),maxzoom:14}
   },layers:[
    {id:'sea',type:'background',paint:{'background-color':'#1c3446'}},
    {id:'fallback-land',type:'fill',source:'earth',paint:{'fill-color':'#69877b'}},
    {id:'marble',type:'raster',source:'marble',paint:{'raster-saturation':-.08,'raster-contrast':.09,'raster-fade-duration':180}},
    {id:'satellite',type:'raster',source:'satellite',minzoom:4,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,0,6,1],'raster-saturation':-.04,'raster-contrast':.12,'raster-brightness-max':.98,'raster-fade-duration':180}},
    {id:'relief',type:'hillshade',source:'hilldem',minzoom:3,paint:{'hillshade-exaggeration':.43,'hillshade-shadow-color':'#19272c','hillshade-highlight-color':'#f1e5ce','hillshade-accent-color':'#2b423a','hillshade-illumination-direction':315}},
    {id:'river-context',type:'line',source:'places','source-layer':'waterway',minzoom:7,filter:['==',['get','class'],'river'],paint:{'line-color':'#9ac9d7','line-opacity':.55,'line-width':['interpolate',['linear'],['zoom'],7,.35,12,1.4]}},
    {id:'city-context',type:'symbol',source:'places','source-layer':'place',minzoom:5,filter:['match',['get','class'],['city','town'],true,false],layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],5,10,10,13],'symbol-sort-key':['coalesce',['get','rank'],99],'text-padding':8,'text-allow-overlap':false},paint:{'text-color':'#e2e9e4','text-halo-color':'#20362e','text-halo-width':1.1,'text-opacity':.75}},
    {id:'land-color',type:'fill',source:'native-lands',paint:{'fill-color':['get','color'],'fill-opacity':['case',['==',['get','match'],0],.07,['==',['get','focus'],1],.30,.13],'fill-opacity-transition':{duration:160,delay:0}}},
    {id:'land-outline',type:'line',source:'native-lands',paint:{'line-color':['get','color'],'line-opacity':['case',['==',['get','match'],0],.24,['==',['get','focus'],1],.92,.53],'line-width':['interpolate',['linear'],['zoom'],1,.8,5,1.4,11,2]}},
    {id:'cinema-glow',type:'circle',source:'cinema-points',paint:{'circle-radius':5,'circle-color':'#e8eed9','circle-opacity':['case',['==',['get','match'],1],.13,0],'circle-blur':.9,'circle-pitch-alignment':'map'}},
    {id:'cinema-light',type:'circle',source:'cinema-points',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2,7,3.2],'circle-color':'#e5ebd8','circle-opacity':['case',['==',['get','match'],1],.95,.22],'circle-pitch-alignment':'map'}},
    {id:'indigenous-names',type:'symbol',source:'cinema-points',minzoom:3.5,filter:['==',['get','focus'],1],layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':14,'text-anchor':'top','text-offset':[0,.55],'text-padding':5,'text-allow-overlap':true,'text-ignore-placement':false},paint:{'text-color':'#f4eee0','text-halo-color':'#172a31','text-halo-width':1.65}}
   ]};
   live=new ml.Map({container:liveHost,style,center,zoom:liveBaseZoom,minZoom:Math.max(-2,liveBaseZoom-0.35),maxZoom:14,maxPitch:55,attributionControl:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,renderWorldCopies:false,cooperativeGestures:false,fadeDuration:120,trackResize:false});
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
    clearTimeout(liveTimer);liveReady=true;host.classList.add('globe-live');cancelFlight();readLiveCamera();installZoom();movement();finishMove();updateDetailStatus(true);
    // Keep the default overhead view. An explicit landscape button exposes the actual mesh.
    $('#globe-landscape').hidden=false;
    live.on('zoomend',()=>{if(live.getZoom()<6&&landscape&&!wheelActive){landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');live.easeTo({pitch:0,duration:reduced.matches?0:220});}});
    live.getCanvas().setAttribute('aria-label','Rotate and zoom the globe; Enter explores the focused lands');
    live.getCanvas().addEventListener('keydown',e=>{if(e.key==='Enter'&&focusIds.length){e.preventDefault();C().openLands(focusIds);}});
    live.on('movestart',()=>{if(!liveReady||wheelActive)return;liveMoved=true;movement();});
    live.on('move',()=>{if(!liveReady)return;readLiveCamera();renderSoon();});
    live.on('moveend',()=>{if(!liveReady)return;readLiveCamera();if(wheelActive)return;liveMoved=false;finishMove();updateDetailStatus(true);});
    live.on('click',e=>{
     const h=10,q=e.point;
     const hit=live.queryRenderedFeatures([[q.x-h,q.y-h],[q.x+h,q.y+h]],{layers:['cinema-light']}).find(f=>C().landMatchesTheme([f.properties.land]));
     const p=hit&&points.find(v=>v.id===hit.properties.land);
     if(p){setCamera(p.coord,zoom);return;}
     const coord=[wrap(e.lngLat.lng),e.lngLat.lat];
     if(records.some(r=>r.shapes.some(s=>includesBounds(s.bounds,coord)&&d3.geoContains(s.feature,coord))))setCamera(coord,zoom);
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
 for(const id of new Set([...focused,...selected,...preview]))wanted.set(id,C().landMatchesTheme([id])?.49:.14);
 const now=performance.now();let fading=false;
 for(const id of new Set([...paint.keys(),...wanted.keys()])){
  const target=wanted.get(id)||0,old=paint.get(id)||{alpha:0,t:now-16};
  const alpha=reduced.matches?target:old.alpha+(target-old.alpha)*(1-Math.exp(-Math.min(100,now-old.t)/65));
  if(Math.abs(alpha-target)>.008)fading=true;
  if(alpha<.008&&!target){paint.delete(id);continue;}paint.set(id,{alpha,t:now});
  const rec=byId.get(id);if(!rec)continue;const rgb=territoryTone(id);
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
 host.classList.toggle('has-cinema',near.length>0||settled&&inside.some(v=>C().landMatchesTheme([v.id])&&v.count));
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
function matchingFilms(id){return C().globeLandCatalogFilms(id);}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function button(label,fn,cls){const b=el('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;}
function drawEncounter(){
 const panel=$('#globe-encounter'),status=$('#globe-status'),actual=new Set(inside.map(r=>r.id));
 const chosen=focusIds.map(id=>byId.get(id)).filter(Boolean);
 const sig=JSON.stringify([focusIds,inside.map(v=>v.id),chosen.map(v=>matchingFilms(v.id).map(f=>f.id)),previewLimit]);
 if(sig===focusKey)return;focusKey=sig;panel.replaceChildren();
 if(!chosen.length){panel.append(el('small','globe-kicker','Explore the globe'),el('strong',null,'Move a light into the circle'),el('p','globe-empty','Land references and their cinema will appear here.'));status.textContent='No land reference in focus';return;}
 const found=chosen.filter(r=>matchingFilms(r.id).length),primary=found[0]||chosen[0];
 panel.append(el('small','globe-kicker',actual.has(primary.id)?'Land at the focal point':'Nearby land reference'));
 const heading=el('div','globe-encounter-heading');heading.append(el('strong',null,primary.name),el('small',null,matchingFilms(primary.id).length+' matching film credits'));panel.append(heading);
 if(chosen.length>1){const choices=el('div','globe-choices');for(const r of chosen){const b=button(r.name+' · '+matchingFilms(r.id).length,()=>{C().openLand(r.id);sync();});choices.append(b);}panel.append(choices);}
 const films=matchingFilms(primary.id);if(films.length){
  const list=el('div','globe-film-strip');for(const film of films.slice(0,previewLimit)){
   const b=button('',()=>{C().showPreview(film,{land:primary.id});sync();},'globe-film');
   const art=el('span','globe-film-art');art.innerHTML=C().thumb(film);
   const copy=el('span','globe-film-copy');const ref=A().recordLandReferences(film.record).find(r=>r.id===primary.id);copy.append(el('strong',null,film.title),el('small',null,[film.maker,film.year].filter(Boolean).join(' · ')),el('small',null,ref?.status==='sourced'?'Sourced land association':'Provisional land association'));b.append(art,copy);list.append(b);
  }panel.append(list);
  panel.append(button('Explore all '+films.length+' film credits',()=>{C().openLand(primary.id);sync();},'globe-more'));
 }else{panel.append(el('p','globe-empty',primary.count?'No films match the current theme selection.':'No linked films in the Atlas yet.'));}
 status.textContent=chosen.length+' land reference'+(chosen.length===1?'':'s')+' in focus';
}
function settle(){
 if(!active||!W||!H||pointers.size||flight||wheelActive||live?.isMoving())return;settled=true;updateProjection();inside=underFocus();
 const nearby=screenPoints().filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
 const direct=inside.filter(v=>C().landMatchesTheme([v.id])&&matchingFilms(v.id).length);
 // All overlapping land references remain available. Catalogue size never ranks peoples.
 // If no matching film sits beneath the focus, an actual nearby indexed point may respond.
 const next=[...new Set([...direct.map(v=>v.id),...nearby.map(v=>v.p.id),...inside.map(v=>v.id)])];
 if(next.join('|')!==focusIds.join('|'))previewLimit=3;
 focusIds=next;drawEncounter();renderSoon();
}
function scheduleSettle(ms=180){clearTimeout(settleTimer);settleTimer=setTimeout(settle,ms);}
function movement(){
 settled=false;focusKey='';host.classList.add('is-moving');$('#globe-encounter').setAttribute('aria-busy','true');renderSoon();scheduleSettle();
}
function finishMove(){host.classList.remove('is-moving');$('#globe-encounter').setAttribute('aria-busy','false');scheduleSettle(140);}
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
function markup(){
 host=el('section');host.id='atlas-rotational-globe';host.setAttribute('aria-label','Rotatable cinema atlas');
 host.innerHTML='<canvas id="globe-surface" tabindex="0" aria-label="Rotate the globe using arrow keys, plus and minus to zoom, Enter to explore the focused lands"></canvas><div id="globe-aperture" aria-hidden="true"></div><div class="globe-instructions">Drag to rotate · zoom to explore</div><div class="globe-guide"><label for="globe-find" class="sr-only">Find a land reference</label><select id="globe-find"><option value="">Find a land…</option></select><div id="globe-detail-status" class="globe-detail-status" aria-live="off">Loading detailed map</div><div class="globe-buttons"><button type="button" id="globe-home">Americas</button><button type="button" id="globe-plus" aria-label="Zoom in">+</button><button type="button" id="globe-minus" aria-label="Zoom out">−</button></div><button type="button" id="globe-landscape" aria-pressed="false" hidden>Terrain view</button><button type="button" id="globe-close">Flat workspace</button></div><section id="globe-encounter" aria-label="Cinema at the focal point"></section><div class="globe-footer"><span><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth (fallback)</a> · <a href="https://earthobservatory.nasa.gov/features/BlueMarble" target="_blank" rel="noopener">NASA Blue Marble</a> · <a href="https://cloudless.eox.at/license-non-commercial" target="_blank" rel="noopener">EOxCloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 &amp; 2017)</a> · <a href="https://mapterhorn.com/attribution/" target="_blank" rel="noopener">Mapterhorn terrain</a> · <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · Existing 2023 Atlas references: <a href="https://native-land.ca/" target="_blank" rel="noopener">Native Land Digital</a> / <a href="https://education.nationalgeographic.org/resource/mapmaker-indigenous-territories/" target="_blank" rel="noopener">MapMaker</a>. Reference shapes, not official boundaries or filming locations.</span><span id="globe-status" class="sr-only" role="status" aria-live="polite"></span></div>';
 $('.map-panel').append(host);canvas=$('#globe-surface');ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
 const sel=$('#globe-find');for(const p of points){const o=el('option',null,p.name+' ('+p.count+')');o.value=p.id;sel.append(o);}
 sel.onchange=()=>{const p=points.find(v=>v.id===sel.value);if(p)setCamera(p.coord,Math.max(zoom,2.2));};
 $('#globe-home').onclick=()=>{sel.value='';landscape=false;$('#globe-landscape').setAttribute('aria-pressed','false');if(liveReady)live.setPitch(0);setCamera([-91,12],1);};
 $('#globe-landscape').onclick=()=>{if(!liveReady)return;stopWheel();landscape=!landscape;$('#globe-landscape').setAttribute('aria-pressed',String(landscape));live.easeTo({zoom:landscape?Math.max(live.getZoom(),7):live.getZoom(),pitch:landscape?42:0,duration:reduced.matches?0:350});};
 $('#globe-plus').onclick=()=>setCamera(flightTarget?.center||center,(flightTarget?.zoom||zoom)*1.4);$('#globe-minus').onclick=()=>setCamera(flightTarget?.center||center,(flightTarget?.zoom||zoom)/1.4);$('#globe-close').onclick=close;
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
  active=true;loadRelief();document.body.classList.add('atlas-globe-experiment');host.dataset.ready='true';C().refreshDiscoveryMode();
  ro=new ResizeObserver(resize);ro.observe(canvas);resize();draw();settle();bootLive();
 }catch(e){fallback(e);}
}
const started=Date.now();(function wait(){if(closed)return;if(C()?.enabled&&A()?.lands&&window.topojson&&window.d3&&window.AtlasGeoIntegrity){boot();return;}if(Date.now()-started<20000)setTimeout(wait,100);})();
})();
