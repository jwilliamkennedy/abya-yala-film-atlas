
import * as maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs';

/* Test-only synthesis: the full beta interface + Summer terrain + Native Land
 * archive polygons. Country circles are filmography indexes, NOT film sites.
 * No territory or Indigenous identity is inferred from geographic proximity.
 * This module does not write to any source records or storage. */
const ATLAS = window.Atlas;
const $ = (id) => document.getElementById(id);
const svg = $('atlas');
const panel = svg.closest('.map-panel');
const stage = document.createElement('div');
stage.id='atlas-terrain';
stage.setAttribute('aria-label','Summer terrain with colorful Indigenous territory references and filmography country indexes');
svg.parentNode.insertBefore(stage,svg);
const picker = document.createElement('div');
picker.id='terrain-choices';picker.hidden=true;
panel.appendChild(picker);
const key = document.createElement('div');
key.id='terrain-key';
key.innerHTML='<span class="terrain-key-color"></span> Indigenous territory references<small>Translucent overlaps · terrain underneath · circles open filmographies</small>';
stage.appendChild(key);
const palette=['#e55248','#e4a434','#38a58b','#8d61d1','#279cc6','#cf5592','#adbc3d','#db7850','#547bc8','#bb6d36','#37a4b0','#d4a44e','#a660bb','#58a268','#cf5963','#b8a63f','#5f83b6','#db7748','#ba5aa7','#35a18a'];
const hash=(s)=>{let n=2166136261;for(const char of String(s||'')){n^=char.codePointAt(0);n=Math.imul(n,16777619);}return n>>>0;};
const color=(name)=>palette[hash(name)%palette.length];
const pretty=(s)=>String(s||'Unknown').trim();
const sourceLands=new Map(),featureLands=new Map();
const territories=new Map();
let map=null,loaded=false,features=[],countries=[],lastSelection='',lastBounds='',lastMapSelection='';
let landOn=true,outlineOn=true,filmOn=true,labelsOn=true;
function hidePicker(){picker.hidden=true;picker.replaceChildren();}
function choice(title,subtitle,fn){
 const b=document.createElement('button');b.className='terrain-choice';b.type='button';b.textContent=title;
 if(subtitle){const sub=document.createElement('span');sub.textContent=subtitle;b.appendChild(sub);}
 b.addEventListener('click',()=>{hidePicker();fn();});picker.appendChild(b);
}
function showPicker(point,heading){
 picker.replaceChildren();
 const h=document.createElement('div');h.className='terrain-choice-heading';h.textContent=heading;picker.appendChild(h);
 const close=document.createElement('button');close.type='button';close.textContent='×';close.className='terrain-choice-close';close.setAttribute('aria-label','Close territory choices');close.onclick=hidePicker;picker.appendChild(close);
 picker.hidden=false;
 const x=Math.max(8,Math.min(Math.round(point.x+10),Math.max(8,stage.clientWidth-330)));
 const y=Math.max(8,Math.min(Math.round(point.y+8),Math.max(8,stage.clientHeight-250)));
 const stageRect=stage.getBoundingClientRect(),panelRect=panel.getBoundingClientRect();
 picker.style.left=(stageRect.left-panelRect.left+x)+'px';picker.style.top=(stageRect.top-panelRect.top+y)+'px';
}
function position(){
 const r=svg.getBoundingClientRect(),p=panel.getBoundingClientRect();
 if(!r.width||!r.height)return;
 Object.assign(stage.style,{left:(r.left-p.left)+'px',top:(r.top-p.top)+'px',width:r.width+'px',height:r.height+'px'});
 if(map)map.resize();
}
position();
new ResizeObserver(()=>position()).observe(svg);
window.addEventListener('resize',position,{passive:true});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')hidePicker();});
async function ready(){if(!ATLAS||!ATLAS.ready)throw new Error('The cloned beta did not initialize');await ATLAS.ready;}
function buildTerritories(){
 for(const land of ATLAS.lands){
  if(land.id==='GROUP-MAYA')continue;
  for(const group of land.groups||[]){
   for(const f of group.features||[]){
    const id=String(f.id);
    if(!territories.has(id))territories.set(id,f);
    if(!featureLands.has(id))featureLands.set(id,land);
   }
  }
 }
 features=[...territories.values()].filter(f=>f.geometry && (f.geometry.type==='Polygon'||f.geometry.type==='MultiPolygon')).map(f=>({
  type:'Feature',id:String(f.id),geometry:f.geometry,
  properties:{name:pretty(f.properties?.name),atlasId:String(f.id),atlasColor:color(f.properties?.name)}
 }));
 const labels=[];
 for(const land of ATLAS.lands){
  if(!land.supplied||!land.groups?.length||land.id==='GROUP-MAYA')continue;
  const fs=land.groups.flatMap(g=>g.features||[]).filter(f=>f.geometry);
  if(!fs.length)continue;
  let p=window.d3.geoCentroid({type:'FeatureCollection',features:fs});
  if(!p?.every(Number.isFinite)||!fs.some(f=>window.d3.geoContains(f,p))){
   const f=fs[0];const ring=f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates[0][0];
   p=ring?.[Math.floor(ring.length/3)]||null;
  }
  if(!p||!p.every(Number.isFinite))continue;
  labels.push({type:'Feature',geometry:{type:'Point',coordinates:p},properties:{label:pretty(land.name),landId:land.id}});
 }
 return {type:'FeatureCollection',features:labels};
}
async function buildCountries(){
 const response=await fetch('assets/archive.json');
 if(!response.ok)throw new Error('Country anchor index unavailable');
 const a=await response.json();
 countries=a.countries.filter(c=>Array.isArray(c.coordinates)&&c.coordinates.length===2);
 const points=[];
 for(const c of countries){
  const totals=ATLAS.countryStats(c);
  const count=Number(totals?.films)||0;
  if(!count)continue;
  points.push({type:'Feature',geometry:{type:'Point',coordinates:c.coordinates},properties:{code:c.code,name:c.name,count,filmmakers:Number(totals?.filmmakers)||0}});
 }
 return {type:'FeatureCollection',features:points};
}
function addLayers(labelData,filmData){
 const t={type:'FeatureCollection',features};
 map.addSource('indigenous-land-archive',{type:'geojson',data:t,generateId:false});
 map.addLayer({id:'atlas-color-territories',type:'fill',source:'indigenous-land-archive',
  paint:{'fill-color':['get','atlasColor'],'fill-opacity':['interpolate',['linear'],['zoom'],1,0.40,4,0.48,9,0.36]}});
 map.addLayer({id:'atlas-territory-outline',type:'line',source:'indigenous-land-archive',
  paint:{'line-color':['get','atlasColor'],'line-width':['interpolate',['linear'],['zoom'],1,0.65,5,1.25,10,1.8],'line-opacity':0.84}});
 map.addLayer({id:'atlas-territory-hit',type:'fill',source:'indigenous-land-archive',
  paint:{'fill-color':'#1a4f52','fill-opacity':0.003}});
 map.addSource('autonymic-land-labels',{type:'geojson',data:labelData});
 map.addLayer({id:'atlas-autonym-labels',type:'symbol',source:'autonymic-land-labels',minzoom:3.1,
  layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular','Arial Unicode MS Regular'],
   'text-size':['interpolate',['linear'],['zoom'],3,10,8,15],'text-max-width':13,'text-allow-overlap':false,'text-padding':4},
  paint:{'text-color':'#213f3c','text-halo-color':'rgba(250,246,227,0.92)','text-halo-width':1.4}});
 map.addSource('film-country-indexes',{type:'geojson',data:filmData});
 map.addLayer({id:'atlas-film-anchor',type:'circle',source:'film-country-indexes',
  paint:{'circle-radius':['interpolate',['linear'],['zoom'],1,10,4,14,8,17],
   'circle-color':'#133f4f','circle-opacity':0.92,'circle-stroke-width':2,'circle-stroke-color':'#f5eac8'}});
 map.addLayer({id:'atlas-film-anchor-count',type:'symbol',source:'film-country-indexes',
  layout:{'text-field':['to-string',['get','count']],'text-font':['Noto Sans Regular','Arial Unicode MS Regular'],
   'text-size':['interpolate',['linear'],['zoom'],1,10,5,12],'text-allow-overlap':true},
  paint:{'text-color':'#fff9e8','text-halo-color':'#133f4f','text-halo-width':0.3}});
 updateLayers();
}
function updateLayers(){
 if(!loaded)return;
 for(const [name,visible] of [['atlas-color-territories',landOn],['atlas-territory-outline',outlineOn],['atlas-territory-hit',landOn||outlineOn],['atlas-autonym-labels',labelsOn],['atlas-film-anchor',filmOn],['atlas-film-anchor-count',filmOn]]){
  if(map.getLayer(name))map.setLayoutProperty(name,'visibility',visible?'visible':'none');
 }
}
function mapClick(e){
 const films=filmOn?map.queryRenderedFeatures(e.point,{layers:['atlas-film-anchor']}):[];
 if(films.length){
  const c=films[0].properties||{};
  showPicker(e.point,pretty(c.name)+' · '+c.count+' indexed films');
  choice('Browse filmmakers','Country-level catalog index; not a filming location',()=>{ATLAS.switchView('filmmakers');ATLAS.selectCountry(c.code);});
  choice('Browse films','Country-level credits; no personal location inferred',()=>{ATLAS.switchView('films');ATLAS.selectCountry(c.code);});
  return;
 }
 const lbl=labelsOn?map.queryRenderedFeatures(e.point,{layers:['atlas-autonym-labels']}):[];
 if(lbl.length){const land=ATLAS.landById(lbl[0].properties?.landId);if(land){hidePicker();ATLAS.switchView('land');ATLAS.selectLand(land.id);return;}}
 const hits=map.getLayer('atlas-territory-hit')&&(landOn||outlineOn)?map.queryRenderedFeatures(e.point,{layers:['atlas-territory-hit']}):[];
 const unique=[...new Map(hits.map(f=>[String(f.properties?.atlasId||f.id),f])).values()];
 if(!unique.length){hidePicker();return;}
 unique.sort((a,b)=>pretty(a.properties?.name).localeCompare(pretty(b.properties?.name)));
 showPicker(e.point,unique.length+' overlapping territory reference'+(unique.length===1?'':'s'));
 for(const f of unique){
  const land=featureLands.get(String(f.properties?.atlasId||f.id));
  const name=pretty(f.properties?.name);
  if(land)choice(name,land.supplied?'Atlas autonymic entry · explore filmmakers and films':'Archived territory · film links only when sourced',()=>{
   ATLAS.switchView('land');ATLAS.selectLand(land.id);
  });
  else choice(name,'Archived reference; no indexed association',()=>{});
 }
 const note=document.createElement('p');note.textContent='Overlaps are shown individually; boundaries are provisional, not legal claims.';picker.appendChild(note);
}
function mapMove(e){
 if(!loaded)return;
 const layers=[...(filmOn?['atlas-film-anchor']:[]),...(labelsOn?['atlas-autonym-labels']:[]),...((landOn||outlineOn)?['atlas-territory-hit']:[])].filter(id=>map.getLayer(id));
 stage.style.cursor=layers.length&&map.queryRenderedFeatures(e.point,{layers}).length?'pointer':'grab';
}
function boundsOf(obj){
 if(!obj)return null;
 try{
  const b=window.d3.geoBounds(obj);
  if(!b||!b.flat().every(Number.isFinite))return null;
  const w=b[0][0],s=b[0][1],e=b[1][0],n=b[1][1];
  if(w>e||e-w>245)return null;
  return [[w,s],[e,n]];
 }catch{return null;}
}
function focusMap(){
 const s=ATLAS.state;
 let bounds=null,center=null,maxZoom=6;
 if(s.record){
  const obj=ATLAS.recordMapFocus(s.record);
  bounds=boundsOf(obj?.geometry);
  maxZoom=obj?.kind==='country'?4.5:6;
 }else if(s.crossLand||s.land){
  const l=ATLAS.landById(s.crossLand||s.land);
  if(l)bounds=boundsOf({type:'FeatureCollection',features:l.groups.flatMap(g=>g.features||[])});
 }else if(s.country||s.landCountry){
  const c=countries.find(c=>c.code===(s.country||s.landCountry));
  if(c)center=c.coordinates;
 }
 if(bounds){
  map.fitBounds(bounds,{padding:{top:80,bottom:90,left:50,right:50},maxZoom,duration:600});
 }else if(center){
  map.flyTo({center,zoom:4,duration:600});
 }
}
function selectionSignature(){
 const s=ATLAS.state;
 return [s.record||'',s.film||'',s.land||'',s.crossLand||'',s.country||'',s.landCountry||''].join('|');
}
function bindBeta(){
 // Existing search, tabs, saved lists, cards and dossier handlers stay native.
 // This bridge only mirrors the selection in the terrain map.
 setInterval(()=>{
  const current=selectionSignature();
  if(current!==lastSelection){const was=lastSelection;lastSelection=current;if(loaded&&current.replace(/\|/g,''))focusMap();if(loaded&&was&&!current.replace(/\|/g,''))hidePicker();}
 },320);
 const intercept=(id,handler)=>{
  const el=$(id);if(!el)return;
  el.addEventListener('click',(e)=>{if(!loaded)return;e.preventDefault();e.stopImmediatePropagation();handler();},{capture:true});
 };
 intercept('zoom-in',()=>map.zoomIn({duration:300}));
 intercept('zoom-out',()=>map.zoomOut({duration:300}));
 intercept('zoom-reset',()=>{hidePicker();map.fitBounds([[-169,-60],[-28,77]],{padding:24,duration:650});});
 intercept('zoom-selection',()=>focusMap());
 intercept('world',()=>{
  const next=$('world').getAttribute('aria-pressed')!=='true';
  $('world').setAttribute('aria-pressed',String(next));ATLAS.state.world=next;
  next?map.flyTo({center:[-82,7],zoom:1.15,duration:650}):map.fitBounds([[-169,-60],[-28,77]],{padding:22,duration:650});
 });
 const layerDetail=$('layers')?.querySelector('div');
 if(layerDetail){
  const e=document.createElement('div');e.className='terrain-layers';
  const choices=[['terrain-fill','Color territories',true,v=>{landOn=v;updateLayers();}],
   ['terrain-outlines','Territory outlines',true,v=>{outlineOn=v;updateLayers();}],
   ['terrain-labels','Indigenous land names',true,v=>{labelsOn=v;updateLayers();}],
   ['terrain-films','Filmography circles',true,v=>{filmOn=v;updateLayers();}]];
  for(const [id,title,on,callback] of choices){
   const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id=id;input.checked=on;
   input.addEventListener('change',()=>{callback(input.checked);hidePicker();});
   label.append(input,document.createTextNode(title));e.appendChild(label);
  }
  const small=document.createElement('small');small.textContent='2023 territory archive · approximate reference shapes. Film circles are country catalog anchors.';e.appendChild(small);layerDetail.after(e);
 }
 map.on('zoom',()=>{const z=$('zoom-level');if(z)z.textContent=Math.pow(2,map.getZoom()-2).toFixed(1)+'×';});
}
function fallbackStyle(){
 return {version:8,sources:{relief:{type:'raster',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png','https://b.tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:17,attribution:'© OpenTopoMap · © OpenStreetMap contributors'}},layers:[{id:'topographic-relief',type:'raster',source:'relief'}]};
}
async function init(){
 try{
  await ready();
  const labels=buildTerritories(),filmPoints=await buildCountries();
  position();
  const options={container:stage,style:'https://styles.maptoolkit.org/summer.json',center:[-88,15],zoom:2.25,minZoom:1.05,maxZoom:15,renderWorldCopies:true,attributionControl:false};
  map=new maplibregl.Map(options);
  map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'Territories: Native Land Digital / MapMaker (2023), provisional · Cinema: Indigenous Cinema Atlas'}),'bottom-right');
  map.addControl(new maplibregl.ScaleControl({unit:'metric',maxWidth:85}),'bottom-left');
  let fallback=false;
  map.on('error',(e)=>{console.warn('Terrain experiment map',e.error||e);if(!loaded&&!fallback&&/style|failed|fetch|404|403/i.test(String(e.error?.message||''))){fallback=true;map.setStyle(fallbackStyle());}});
  map.on('load',()=>{
   try{
    addLayers(labels,filmPoints);
    loaded=true;position();stage.style.visibility='visible';document.body.classList.add('terrain-ready');
    map.fitBounds([[-169,-60],[-28,77]],{padding:24,duration:0});
    updateLayers();lastSelection=selectionSignature();
    const label=$('map-caption');
    if(label)label.textContent='Select a colored territory or filmography circle; overlapping lands remain individually selectable.';
    const stat=$('map-state');if(stat&&!stat.dataset.terrainStatus)stat.dataset.terrainStatus='ready';
   }catch(e){console.error('Map layers failed',e);stage.style.visibility='hidden';}
  });
  map.on('click',mapClick);
  map.on('mousemove',mapMove);
  map.on('dragstart',hidePicker);
  bindBeta();
 }catch(e){
  console.error('The experiment could not initialize; original copied beta remains visible.',e);
  const badge=document.querySelector('.terrain-test-mark');if(badge)badge.textContent='TERRAIN TEST UNAVAILABLE · ORIGINAL BETA VISIBLE';
 }
}
init();
