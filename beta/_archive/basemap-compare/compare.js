import * as maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs';
import { LogoControl } from 'https://cdn.jsdelivr.net/npm/@maptoolkit/maplibre-logo-control@1.0.0/+esm';

/* Isolated, read-only basemap A/B comparison. This module does not import the
 * Atlas application, write its archive or change the public/beta entry pages.
 * The 2023 Native Land Digital / MapMaker geometry is optional and unmodified. */
const $ = id => document.getElementById(id);
const presets = {
  guatemala: {center:[-91.35,15.55],zoom:6.55,name:'Guatemalan Highlands'},
  oaxaca: {center:[-96.7,17.05],zoom:6.65,name:'Oaxaca / Sierra Madre'},
  andes: {center:[-72.4,-13.5],zoom:6.55,name:'Andes / Southern Peru'},
  wallmapu: {center:[-71.5,-39.3],zoom:5.75,name:'Wallmapu'},
  turtle: {center:[-103.0,46.5],zoom:3.5,name:'Turtle Island'},
  americas: {center:[-91,18],zoom:2.4,name:'Abya Yala & Turtle Island'}
};
const urlFor = {
  left: name => 'https://tiles.openfreemap.org/styles/' + name,
  right: name => 'https://styles.maptoolkit.org/' + name + '.json'
};
const selectedStyle = {left:'positron',right:'hiking'};
const state = {left:null,right:null,syncing:false,ready:{left:false,right:false},
  errors:{left:[],right:[]},overlayCount:0,overlay:null,region:'guatemala'};
let popup = {left:null,right:null};
const layerIds = {fill:'comparison-reference-fill',line:'comparison-reference-outline',hit:'comparison-reference-hit'};
const sourceId = 'comparison-source-territories';

function report(message){
  $('summary').textContent = message;
}
function setStatus(side,message,isError=false){
  $('status-'+side).textContent = message;
  $('status-'+side).style.color = isError?'#9a5146':'#427069';
}
function errors(side){
  return state.errors[side].slice();
}
function sourceData(){
  const record=window.ATLAS_TERRITORIES;
  if(!record||!Array.isArray(record.features))return null;
  const features=record.features.filter(f=>f&&f.properties&&f.geometry&&
    (f.geometry.type==='Polygon'||f.geometry.type==='MultiPolygon'));
  state.overlayCount=features.length;
  return {type:'FeatureCollection',features};
}
function syncStyleLayers(map){
  if(!map||!map.getStyle())return;
  if(!state.overlay)state.overlay=sourceData();
  if(!state.overlay)return;
  try {
    if(!map.getSource(sourceId))map.addSource(sourceId,{type:'geojson',data:state.overlay});
    const labels=(map.getStyle().layers||[]).find(l=>l.type==='symbol');
    const before=labels&&labels.id;
    if(!map.getLayer(layerIds.fill))map.addLayer({
      id:layerIds.fill,type:'fill',source:sourceId,
      layout:{visibility:'none'},
      paint:{'fill-color':'#c39364','fill-opacity':[
        'interpolate',['linear'],['zoom'],2,0.085,7,0.13,12,0.085
      ]}
    },before);
    if(!map.getLayer(layerIds.line))map.addLayer({
      id:layerIds.line,type:'line',source:sourceId,
      layout:{visibility:'none'},
      paint:{'line-color':'#8a4f36','line-opacity':0.63,
        'line-width':['interpolate',['linear'],['zoom'],2,0.55,7,0.95,12,1.45]}
    },before);
    // Transparent feature query layer: no polygon should swallow the underlying map,
    // and one mouse click can disclose all overlapping reference features.
    if(!map.getLayer(layerIds.hit))map.addLayer({
      id:layerIds.hit,type:'fill',source:sourceId,
      layout:{visibility:'none'},
      paint:{'fill-color':'#000000','fill-opacity':0.001}
    },before);
    const visible=$('territory-outlines').checked||$('territory-fills').checked;
    map.setLayoutProperty(layerIds.fill,'visibility',$('territory-fills').checked?'visible':'none');
    map.setLayoutProperty(layerIds.line,'visibility',$('territory-outlines').checked?'visible':'none');
    map.setLayoutProperty(layerIds.hit,'visibility',visible?'visible':'none');
  }catch(err){
    if(state.errors[map===state.left?'left':'right'].length<6)
      state.errors[map===state.left?'left':'right'].push('Territory layer: '+err.message);
  }
}
let territoryLoad=null;
function loadArchivedTerritories(){
  if(state.overlay)return Promise.resolve(state.overlay);
  if(territoryLoad)return territoryLoad;
  territoryLoad=new Promise((resolve,reject)=>{
    if(window.ATLAS_TERRITORIES){
      state.overlay=sourceData();
      return state.overlay?resolve(state.overlay):reject(new Error('Malformed territory data'));
    }
    const script=document.createElement('script');
    script.src='../territories-data.js';
    script.async=true;
    script.onload=()=>{
      state.overlay=sourceData();
      if(state.overlay)resolve(state.overlay);
      else reject(new Error('Archived territory dataset did not define GeoJSON features'));
    };
    script.onerror=()=>reject(new Error('Could not retrieve archived territory dataset'));
    document.head.appendChild(script);
  }).catch(err=>{
    territoryLoad=null;
    report('Territory overlays could not load: '+err.message+
      '. The two basemaps remain fully usable.');
    console.warn(err);
    return null;
  });
  return territoryLoad;
}
async function overlaysChanged(){
  const enabled=$('territory-outlines').checked||$('territory-fills').checked;
  if(enabled&&!state.overlay){
    report('Loading the original 2023 territory polygons on request. Basemaps remain interactive.');
    await loadArchivedTerritories();
  }
  ['left','right'].forEach(side=>syncStyleLayers(state[side]));
  if(!enabled){
    report('Territory overlays hidden. Compare the two physical basemaps directly.');
  }else if(state.overlay){
    report('Archived Indigenous territory references are enabled on both basemaps ('+
      state.overlayCount+' polygon features). Zoom and click to compare overlaps.');
  }
}
function allOverlaps(map,point){
  if(!map.getLayer(layerIds.hit))return [];
  const found=map.queryRenderedFeatures(point,{layers:[layerIds.hit]});
  const seen=new Set(),names=[];
  for(const f of found){
    const name=String(f.properties&&f.properties.name||'Unnamed source reference');
    if(!seen.has(name)){seen.add(name);names.push(name);}
  }
  return names.sort((a,b)=>a.localeCompare(b));
}
function showOverlaps(map,side,e){
  if(!($('territory-outlines').checked||$('territory-fills').checked))return;
  const names=allOverlaps(map,e.point);
  if(!names.length)return;
  if(popup[side])popup[side].remove();
  const content=document.createElement('div'),head=document.createElement('strong');
  head.textContent=names.length+' overlapping archive'+(names.length===1?' reference':' references')+' at this location';
  content.appendChild(head);
  const list=document.createElement('ul');
  names.slice(0,18).forEach(name=>{
    const li=document.createElement('li');
    li.textContent=name;
    list.appendChild(li);
  });
  content.appendChild(list);
  if(names.length>18){
    const extra=document.createElement('small');
    extra.textContent='+'+(names.length-18)+' additional source references';
    content.appendChild(extra);
  }
  const note=document.createElement('small');
  note.textContent='2023 source map. These are not definitive boundaries or verified filmmaker identities.';
  content.appendChild(note);
  popup[side]=new maplibregl.Popup({closeButton:true,maxWidth:'320px'})
    .setLngLat(e.lngLat).setDOMContent(content).addTo(map);
}
function mirrorCamera(side){
  if(state.syncing||!$('link-cameras').checked)return;
  const src=state[side],dst=state[side==='left'?'right':'left'];
  if(!src||!dst)return;
  state.syncing=true;
  try{
    dst.jumpTo({
      center:src.getCenter(),zoom:src.getZoom(),pitch:src.getPitch(),bearing:src.getBearing()
    });
  }catch(err){
    if(state.errors[side].length<6)state.errors[side].push('Camera: '+err.message);
  }finally{state.syncing=false;}
  $('pitch').value=String(Math.round(src.getPitch()/5)*5);
  $('pitch-label').textContent=Math.round(src.getPitch())+'°';
}
function regionMove(){
  const region=$('region').value,p=presets[region]||presets.guatemala;
  state.region=region;
  const pitch=Number($('pitch').value);
  // With linked cameras, animate one master only. Animating both would make
  // the two synchronizers cancel one another's flight on each frame.
  const targets=$('link-cameras').checked?['left']:['left','right'];
  targets.forEach(side=>{
    const m=state[side];
    if(!m)return;
    const opts={center:p.center,zoom:p.zoom,pitch,bearing:0,duration:900,essential:true};
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)opts.duration=0;
    m.flyTo(opts);
  });
  report('Camera centered on '+p.name+'. Drag either map; the two views remain synchronized.');
}
function switchStyle(side){
  const name=$('style-'+side).value,map=state[side];
  selectedStyle[side]=name;
  if(!map)return;
  state.ready[side]=false;
  $('loading-'+side).hidden=false;
  $('loading-'+side).textContent='Changing map style…';
  setStatus(side,'Loading '+name+' style…');
  map.setStyle(urlFor[side](name));
}
function attach(map,side){
  map.addControl(new maplibregl.NavigationControl({showZoom:true,showCompass:true}),'top-right');
  map.addControl(new maplibregl.ScaleControl({unit:'metric',maxWidth:105}),'bottom-left');
  if(side==='right')map.addControl(new LogoControl(),'bottom-left');
  map.on('style.load',()=>{
    syncStyleLayers(map);
    state.ready[side]=true;
    $('loading-'+side).hidden=true;
    setStatus(side,'Style loaded · '+selectedStyle[side]+' · drag, zoom and compare');
    if(state.ready.left&&state.ready.right){
      report('Both maps loaded. Explore '+presets[state.region].name+
        '. Try each map at multiple zoom levels, with and without the archived territory overlays.');
    }
  });
  map.on('move',()=>mirrorCamera(side));
  map.on('click',e=>showOverlaps(map,side,e));
  map.on('error',e=>{
    const msg=String(e&&e.error&&e.error.message||'Unknown map tile error');
    if(state.errors[side].length<6)state.errors[side].push(msg);
    if(/fetch|style|tile|source|glyph|403|404|429/i.test(msg)){
      setStatus(side,'A remote map resource reported an error; see console for details.',true);
      if(!state.ready[side]){
        $('loading-'+side).hidden=false;
        $('loading-'+side).textContent='Map provider unavailable: '+msg.slice(0,140);
      }
    }
  });
}
function init(){
  const p=presets.guatemala;
  const args={center:p.center,zoom:p.zoom,pitch:0,bearing:0,
    minZoom:1.0,maxZoom:17,maxPitch:70,renderWorldCopies:false,
    attributionControl:{customAttribution:'',compact:false}};
  try{
    state.left=new maplibregl.Map({...args,container:'map-left',style:urlFor.left(selectedStyle.left)});
    state.right=new maplibregl.Map({...args,container:'map-right',style:urlFor.right(selectedStyle.right)});
    attach(state.left,'left');
    attach(state.right,'right');
    $('region').onchange=regionMove;
    $('reset').onclick=regionMove;
    $('pitch').oninput=e=>{
      const val=Number(e.target.value);
      $('pitch-label').textContent=val+'°';
      state.left.easeTo({pitch:val,duration:0});
      state.right.easeTo({pitch:val,duration:0});
    };
    $('style-left').onchange=()=>switchStyle('left');
    $('style-right').onchange=()=>switchStyle('right');
    $('territory-outlines').onchange=overlaysChanged;
    $('territory-fills').onchange=overlaysChanged;
    $('link-cameras').onchange=()=>{
      if($('link-cameras').checked)mirrorCamera('left');
    };
    window.AtlasBasemapCompare={
      getStatus:()=>({
        ready:{...state.ready},styles:{...selectedStyle},
        region:state.region,overlayCount:state.overlayCount,
        source:'2023 Native Land Digital / MapMaker snapshot',
        errors:{left:errors('left'),right:errors('right')},
        leftZoom:state.left.getZoom(),rightZoom:state.right.getZoom()
      }),
      restoreCamera:regionMove,
      maps:{left:state.left,right:state.right}
    };
  }catch(err){
    report('The independent basemap test could not initialize: '+err.message);
    console.error(err);
    ['left','right'].forEach(side=>{
      $('loading-'+side).textContent='Unable to initialize the map viewer.';
    });
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
