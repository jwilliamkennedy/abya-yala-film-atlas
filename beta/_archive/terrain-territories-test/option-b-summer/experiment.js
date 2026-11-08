import * as maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs';
import { LogoControl } from 'https://cdn.jsdelivr.net/npm/@maptoolkit/maplibre-logo-control@1.0.0/+esm';

/* Option B / Summer: isolated read-only cartographic experiment.
 * Source geometry is the Atlas archive. Country circles are catalog navigation
 * anchors, never filming sites or inferred Indigenous identity locations.
 * Land-to-filmmaker links appear only where the Atlas has a sourced link.
 */
const $ = id => document.getElementById(id);
const views = {
 americas:{center:[-91,16],zoom:2.45,label:'Abya Yala & Turtle Island'},
 guatemala:{center:[-91.3,15.5],zoom:6.1,label:'Guatemalan Highlands'},
 oaxaca:{center:[-96.8,17.0],zoom:6.35,label:'Oaxaca'},
 andes:{center:[-73,-13.3],zoom:5.9,label:'Andes'},
 wallmapu:{center:[-71.45,-39.2],zoom:5.65,label:'Wallmapu'},
 north:{center:[-104,47],zoom:3.45,label:'Northern Turtle Island'},
 amazon:{center:[-67,-5.8],zoom:4.2,label:'Amazonia'}
};
const published = new Set(['Map Ready','Discovery · credit supported','Discovery · directing credit sourced']);
const state = {map:null,mapReady:false,records:[],recordById:new Map(),countries:[],anchors:new Map(),
 landIndex:new Map(),namedLands:[],dataReady:false,landDataReady:false,territories:[],
 selected:null,hasFilmLayer:false,hasLandLayer:false,landError:null,filmError:null};
const clean = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[’‘ʻʼ]/g,"'").toLowerCase().replace(/\s*\([^)]*\)/g,' ').replace(/\s+/g,' ').trim();
const sourceMatches = (a,b) => {
 const x=clean(a),y=clean(b);
 return x===y || (x==='binniza' && y.split('/').some(p=>p.trim()==='binniza')) ||
   (x==="maaya'" && /maya \(yucateco\)/i.test(b));
};
const el = (tag,text,klass) => { const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(klass)e.className=klass;return e; };
const safeURL = value => {try{const u=new URL(String(value));return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
function link(label,url){
 const href=safeURL(url);if(!href)return el('span','Source unavailable','minor-note');
 const a=el('a',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function status(message,error=false){$('status').textContent=message;$('status').style.color=error?'#a24d43':'#2d676e';}
function regionMove(){const d=views[$('region').value]||views.americas;state.map.flyTo({
 center:d.center,zoom:d.zoom,pitch:0,bearing:0,essential:true,
 duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:850
});}
function selectedPanel(title,description){
 const slot=$('selection');slot.replaceChildren();
 slot.append(el('h2',title));
 if(description)slot.append(el('p',description));
 return slot;
}
function catalogStats(){
 const films=state.records.reduce((sum,r)=>sum+(r.films||[]).length,0);
 const countries=new Set(state.records.filter(r=>state.anchors.has(r.country)).map(r=>r.country)).size;
 $('counts').textContent=state.records.length+' filmmakers · '+films+' film credits';
 return {films,countries};
}
function filmSource(f,r){
 return safeURL(f.sourceURL||f.url||f.filmURL)||safeURL((r.sources||[]).find(x=>safeURL(x.url))?.url);
}
function filmCard(r,f,into){
 const card=el('div',null,'film-card');
 card.append(el('strong',f.title||'Untitled film'));
 const meta=[r.name||r.director,f.year||null,r.nation||r.community||null].filter(Boolean).join(' · ');
 card.append(el('span',meta));
 const src=filmSource(f,r);if(src)card.append(link('Film / credit source ↗',src));
 into.append(card);return card;
}
function showCountry(countryCode,focusTitle){
 const group=state.records.filter(r=>r.country===countryCode&&Array.isArray(r.films)&&r.films.length);
 const c=state.anchors.get(countryCode);
 const title=(c&&c.name)||group[0]?.countryName||countryCode;
 let count=group.reduce((a,r)=>a+r.films.length,0);
 const slot=selectedPanel(title+' · '+count+' film credits',
   'Country-level catalog anchor only. No film location, Indigenous territory, residence or citizenship is inferred from this point.');
 if(focusTitle){
  const hit=group.flatMap(r=>(r.films||[]).map(f=>({r,f}))).find(x=>x.f.title===focusTitle);
  if(hit){slot.append(el('span','SELECTED FILM','count-note'));filmCard(hit.r,hit.f,slot);}
 }
 slot.append(el('span','CATALOG FILMOGRAPHY','count-note'));
 const sc=el('div',null,'scroll');let shown=0;
 const sorted=group.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
 for(const r of sorted){for(const f of r.films||[]){filmCard(r,f,sc);shown++;if(shown>=70)break;}if(shown>=70)break;}
 slot.append(sc);
 if(shown<count)slot.append(el('p','Showing the first '+shown+' of '+count+' credits. Search above to locate a specific film.','minor-note'));
 state.selected={type:'country',id:countryCode};
 if(c&&state.map){state.map.easeTo({center:c.coordinates,zoom:Math.max(4,Math.min(6,state.map.getZoom())),pitch:0,duration:600});}
}
function landMatches(rawName){
 const result=[],seen=new Set();
 for(const n of state.namedLands){
  if(sourceMatches(n.name,rawName)|| (n.aliases||[]).some(a=>sourceMatches(a,rawName))){
   if(!seen.has(n.id)){result.push(n);seen.add(n.id);}
  }
 }
 return result;
}
function linkedFilmmakersForSource(rawName){
 const hits=new Map();
 for(const land of landMatches(rawName)){
  for(const edge of state.landIndex.get(land.id)||[]){
   const r=state.recordById.get(edge.record);
   if(!r||!published.has(r.status))continue;
   if(!hits.has(r.id))hits.set(r.id,{record:r,edge,land});
  }
 }
 return [...hits.values()];
}
function showLands(names,point){
 const uniq=[...new Set(names)].sort((a,b)=>{
  const ac=linkedFilmmakersForSource(a).length,bc=linkedFilmmakersForSource(b).length;
  return bc-ac||a.localeCompare(b);
 });
 const withLinks=uniq.filter(n=>linkedFilmmakersForSource(n).length).length;
 const slot=selectedPanel(uniq.length===1?uniq[0]:'Overlapping Indigenous territory references',
  uniq.length+' reference '+(uniq.length===1?'shape':'shapes')+' at the selected point. '+
  withLinks+' have explicitly sourced filmmaker associations in the Atlas. Overlap does not imply affiliation.');
 const sc=el('div',null,'scroll');
 for(const name of uniq.slice(0,28)){
  const box=el('div',null,'land-card');box.append(el('h3',name));
  const ties=linkedFilmmakersForSource(name);
  if(!ties.length){box.append(el('p','No source-backed filmmaker connection indexed for this polygon.','minor-note'));}
  else{
   box.append(el('span',ties.length+' source-backed filmmaker '+(ties.length===1?'connection':'connections'),'link-state'));
   let displayed=0;
   for(const {record:r,edge,land} of ties){
    const works=r.films||[];
    if(!works.length){
     box.append(el('p',(r.name||r.director)+' · film credit not yet indexed','minor-note'));
    }else{
     for(const f of works.slice(0,4)){filmCard(r,f,box);displayed++;if(displayed>=12)break;}
    }
    if(displayed>=12)break;
   }
   if(ties.some(x=>(x.record.films||[]).length))box.append(el('p','Filmography shown through sourced filmmaker affiliation, not inferred shooting geography.','minor-note'));
   const cite=ties.find(x=>safeURL(x.edge.source));
   if(cite)box.append(link('Affiliation evidence ↗',cite.edge.source));
  }
  sc.append(box);
 }
 slot.append(sc);
 if(uniq.length>28)slot.append(el('p','Additional overlapping references omitted from this panel; zoom closer for finer selection.','minor-note'));
 state.selected={type:'land',point};
}
function renderSearch(){
 const q=clean($('search').value);
 $('results').replaceChildren();
 if(q.length<2){$('searchhint').textContent='Search by title, filmmaker or named community; results link back to film browsing anchors.';return;}
 const matches=[];
 for(const r of state.records){
  const person=clean([r.name,r.director,r.nation,r.community].filter(Boolean).join(' '));
  for(const f of r.films||[]){
   if(clean(f.title).includes(q)||person.includes(q)){
    matches.push({r,f});if(matches.length>=70)break;
   }
  }
  if(matches.length>=70)break;
 }
 $('searchhint').textContent=matches.length+' matching film credits'+(matches.length===70?' (first 70)':'');
 for(const {r,f} of matches.slice(0,40)){
  const btn=el('button',null,'result');
  btn.type='button';
  btn.append(el('strong',f.title||'Untitled film'),el('span',[r.name||r.director,r.nation,r.countryName].filter(Boolean).join(' · ')));
  btn.onclick=()=>{showCountry(r.country,f.title);$('panel').scrollTop=0;};
  $('results').append(btn);
 }
}
function filmFeatures(){
 const byCountry=new Map();
 for(const r of state.records){
  if(!state.anchors.has(r.country))continue;
  let o=byCountry.get(r.country);
  if(!o){o={code:r.country,name:state.anchors.get(r.country).name,count:0,directors:new Set()};byCountry.set(r.country,o);}
  const n=(r.films||[]).length;
  if(n){o.count+=n;o.directors.add(r.id);}
 }
 return {type:'FeatureCollection',features:[...byCountry.values()].filter(x=>x.count>0).map(x=>({
  type:'Feature',geometry:{type:'Point',coordinates:state.anchors.get(x.code).coordinates},
  properties:{code:x.code,name:x.name,count:x.count,makers:x.directors.size}
 }))};
}
function updateFilmVisibility(){
 if(!state.map||!state.map.getLayer('film-circles'))return;
 for(const id of ['film-circles','film-labels']){
  state.map.setLayoutProperty(id,'visibility',$('film-points').checked?'visible':'none');
 }
}
function addFilmLayers(){
 if(!state.mapReady||!state.dataReady||state.hasFilmLayer)return;
 const map=state.map,data=filmFeatures();
 map.addSource('country-film-anchors',{type:'geojson',data});
 map.addLayer({id:'film-circles',type:'circle',source:'country-film-anchors',
  paint:{'circle-radius':['step',['get','count'],8,5,10,15,12,30,14,60,17,100,20],
  'circle-color':'#27646b','circle-stroke-color':'#fffdf6','circle-stroke-width':2.4,'circle-opacity':0.91}});
 map.addLayer({id:'film-labels',type:'symbol',source:'country-film-anchors',
  layout:{'text-field':['to-string',['get','count']],'text-size':11,
    'text-font':['Open Sans Regular','Arial Unicode MS Regular'],'text-allow-overlap':true},
  paint:{'text-color':'#ffffff','text-halo-color':'#12424a','text-halo-width':0.5}});
 state.hasFilmLayer=true;
 updateFilmVisibility();
}
function addLandLayers(){
 if(!state.mapReady||!state.landDataReady||state.hasLandLayer)return;
 const map=state.map;
 const payload={type:'FeatureCollection',features:state.territories};
 map.addSource('atlas-archived-territories',{type:'geojson',data:payload});
 const labelLayer=(map.getStyle().layers||[]).find(l=>l.type==='symbol');
 // Keep geographical labels and mountains readable underneath/above; the map is never blank.
 const before=labelLayer?.id||undefined;
 map.addLayer({id:'land-fills',type:'fill',source:'atlas-archived-territories',
  paint:{'fill-color':'#c48d67',
    'fill-opacity':['interpolate',['linear'],['zoom'],2,0.09,6,0.115,11,0.065]}},before);
 map.addLayer({id:'land-outlines',type:'line',source:'atlas-archived-territories',
  paint:{'line-color':'#965e43','line-opacity':0.63,
   'line-width':['interpolate',['linear'],['zoom'],2,0.55,7,1.05,12,1.5]}},before);
 // Transparent polygon query layer — one click can report every overlap; no click handler
 // is bound to any single polygon, and film dots are queried first.
 map.addLayer({id:'land-hit',type:'fill',source:'atlas-archived-territories',
  paint:{'fill-color':'#000000','fill-opacity':0.001}},before);
 state.hasLandLayer=true;updateLandVisibility();
}
function updateLandVisibility(){
 if(!state.map||!state.hasLandLayer)return;
 state.map.setLayoutProperty('land-fills','visibility',$('fill').checked?'visible':'none');
 state.map.setLayoutProperty('land-outlines','visibility',$('outline').checked?'visible':'none');
 state.map.setLayoutProperty('land-hit','visibility',($('fill').checked||$('outline').checked)?'visible':'none');
}
async function filmData(){
 try{
  const [catalogResponse,archiveResponse]=await Promise.all([
   fetch('../assets/catalog-records.json'),fetch('../assets/archive.json')
  ]);
  if(!catalogResponse.ok||!archiveResponse.ok)throw Error('Catalog or geography metadata missing');
  const [original,archive]=await Promise.all([catalogResponse.json(),archiveResponse.json()]);
  let records=original.map(r=>({...r,films:Array.isArray(r.films)?r.films.slice():[]}));
  const countries=archive.countries.slice();
  if(window.AtlasUpdate1031?.apply){
   window.AtlasUpdate1031.apply(records,countries);
  }
  // The experiment deliberately uses the site's published-status gate. Records awaiting
  // identity/credit confirmation are never promoted merely because they have a country.
  const ids=new Set(),ready=[];
  for(const r of records){
   if(!r||!r.id||ids.has(r.id)||!published.has(r.status))continue;
   ids.add(r.id);r.name=r.name||r.director||'Unnamed maker';
   r.films=(r.films||[]).filter(f=>f&&f.title);
   ready.push(r);
  }
  state.records=ready;
  state.recordById=new Map(ready.map(r=>[r.id,r]));
  state.countries=countries;
  state.anchors=new Map(countries.filter(c=>Array.isArray(c.coordinates)&&c.coordinates.length===2).map(c=>[c.code,c]));
  // No inferred land links: only separately sourced relations are brought forward.
  const index=new Map();
  for(const edge of (window.ATLAS_LAND_CROSSINDEX?.edges||[])){
   if(edge.status!=='sourced'||!safeURL(edge.source))continue;
   if(!index.has(edge.land))index.set(edge.land,[]);
   if(!index.get(edge.land).some(e=>e.record===edge.record))index.get(edge.land).push(edge);
  }
  state.landIndex=index;
  state.namedLands=window.ATLAS_NAMES_DATA?.records||[];
  state.dataReady=true;
  const stats=catalogStats();
  status('Catalog ready · '+stats.films+' film credits · '+stats.countries+' mapped country anchors');
  addFilmLayers();renderSearch();
 }catch(err){
  state.filmError=err;
  status('Could not load film index: '+err.message,true);
  $('counts').textContent='Film index unavailable';
  console.error('Film index:',err);
 }
}
function landData(){
 return new Promise((resolve,reject)=>{
  if(window.ATLAS_TERRITORIES?.features)return resolve(window.ATLAS_TERRITORIES.features);
  const s=document.createElement('script');s.src='../territories-data.js';s.async=true;
  s.onload=()=>window.ATLAS_TERRITORIES?.features?resolve(window.ATLAS_TERRITORIES.features):reject(Error('Territory GeoJSON missing'));
  s.onerror=()=>reject(Error('Territory reference file unavailable'));document.head.append(s);
 });
}
async function loadLand(){
 try{
  const features=await landData();
  state.territories=features.filter(f=>f&&f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type));
  state.landDataReady=true;
  addLandLayers();
  const stats=catalogStats();
  status('Summer map ready · '+stats.films+' film credits · '+state.territories.length+' archived land polygons');
 }catch(err){
  state.landError=err;
  status('Territory overlay unavailable; films and terrain remain usable.',true);
  console.warn('Territory source:',err);
 }
}
function mapClick(event){
 const map=state.map;
 if(state.hasFilmLayer&&$('film-points').checked){
  const films=map.queryRenderedFeatures(event.point,{layers:['film-circles']});
  if(films.length){showCountry(films[0].properties.code);$('panel').scrollTop=0;return;}
 }
 if(state.hasLandLayer&&($('fill').checked||$('outline').checked)){
  const shapes=map.queryRenderedFeatures(event.point,{layers:['land-hit']});
  const names=[...new Set(shapes.map(f=>String(f.properties?.name||'Unnamed territory reference')))];
  if(names.length){showLands(names,[event.lngLat.lng,event.lngLat.lat]);$('panel').scrollTop=0;return;}
 }
}
function mapPointer(event){
 const map=state.map,layers=[];
 if(state.hasFilmLayer&&$('film-points').checked)layers.push('film-circles');
 if(state.hasLandLayer&&($('outline').checked||$('fill').checked))layers.push('land-hit');
 map.getCanvas().style.cursor=layers.length&&map.queryRenderedFeatures(event.point,{layers}).length?'pointer':'grab';
}
function init(){
 $('region').onchange=regionMove;
 $('home').onclick=regionMove;
 $('outline').onchange=updateLandVisibility;
 $('fill').onchange=updateLandVisibility;
 $('film-points').onchange=updateFilmVisibility;
 $('search').oninput=renderSearch;
 const first=views.guatemala;
 try{
  const map=new maplibregl.Map({container:'map',
   style:'https://styles.maptoolkit.org/summer.json',
   center:first.center,zoom:first.zoom,minZoom:1.05,maxZoom:16.5,
   maxPitch:65,pitch:0,bearing:0,renderWorldCopies:false,attributionControl:false});
  state.map=map;
  map.addControl(new maplibregl.NavigationControl({showZoom:true,showCompass:true}),'top-right');
  map.addControl(new maplibregl.ScaleControl({unit:'metric',maxWidth:110}),'bottom-left');
  map.addControl(new LogoControl(),'bottom-left');
  map.addControl(new maplibregl.AttributionControl({compact:false,customAttribution:[
   '<a href="https://www.maptoolkit.org/" target="_blank" rel="noopener noreferrer">© Maptoolkit</a>',
   '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
   '<a href="https://native-land.ca/" target="_blank" rel="noopener noreferrer">Native Land Digital</a>'
  ]}),'bottom-right');
  map.on('load',()=>{
   state.mapReady=true;$('loading-map').hidden=true;
   addFilmLayers();addLandLayers();
   if(!state.dataReady)status('Terrain loaded · preparing the film index and territory references');
  });
  map.on('click',mapClick);
  map.on('mousemove',mapPointer);
  map.on('error',e=>{
   const msg=String(e?.error?.message||'Unknown provider error');
   if(!state.mapReady&&/style|tile|fetch|403|404/i.test(msg)){
    $('loading-map').textContent='Maptoolkit Summer resource error; reload or try again.';
    status('Map provider reported an error: '+msg.slice(0,100),true);
   }
   console.warn('Summer map:',msg);
  });
  window.AtlasSummerExperiment={getStatus:()=>({
   mapReady:state.mapReady,dataReady:state.dataReady,landReady:state.landDataReady,
   mapStyle:'https://styles.maptoolkit.org/summer.json',
   filmmakers:state.records.length,filmCredits:state.records.reduce((a,r)=>a+r.films.length,0),
   sourcePolygons:state.territories.length,sourcedRelations:[...state.landIndex.values()].reduce((a,v)=>a+v.length,0),
   filmError:state.filmError?.message||null,landError:state.landError?.message||null,
   zoom:state.map?.getZoom()
  }),map:map,goTo:regionMove};
  filmData();
  loadLand();
 }catch(err){
  $('loading-map').textContent='The summer map could not initialize.';
  status(err.message,true);
  console.error(err);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
