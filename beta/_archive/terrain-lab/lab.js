/* Indigenous Cinema Atlas: isolated, read-only terrain laboratory.
 * This page never imports, modifies or writes the filmmaker/film catalog.
 */
(function(){
'use strict';
var regions={
 guatemala:{center:[-90.9,15.65],zoom:7.0,name:'Guatemalan Highlands'},
 oaxaca:{center:[-96.4,16.95],zoom:6.75,name:'Oaxaca / Sierra Madre'},
 andes:{center:[-72.35,-14.35],zoom:6.5,name:'Andes / Southern Peru'}
};
var app={maps:{},manifest:null,area:'guatemala',ready:{left:false,right:false},errors:[],
  overlayData:null,overlayPending:null,syncing:false,styleReset:false};
window.AtlasTerrainLab={status:app.ready,errors:app.errors,
  getSourceSummary:function(){return {area:app.area,mode:'two-map',naturalEarth:app.manifest&&app.manifest.source_url,loaded:app.ready,indigenousShapes:app.overlayData&&app.overlayData.features.length};}};
var el=function(id){return document.getElementById(id);};
var status=function(message,failed){el('status').textContent=message;el('status').style.color=failed?'#9b3d39':'#526f63';};
var escapeHTML=function(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
function imageStyle(region){
 var r=app.manifest.regions[region], b=r.bounds;
 return {
  version:8,name:'Natural Earth II source-raster study',
  sources:{'natural-earth':{type:'image',url:r.file,
    coordinates:[[b[0],b[3]],[b[2],b[3]],[b[2],b[1]],[b[0],b[1]]]}},
  layers:[
    {id:'ne-water',type:'background',paint:{'background-color':'#537f8f'}},
    {id:'natural-earth-shaded-relief',type:'raster',source:'natural-earth',paint:{'raster-opacity':1}}
  ]
 };
}
function position(){var p=regions[app.area];return {center:p.center,zoom:p.zoom,pitch:Number(el('pitch').value),bearing:0};}
function makeDem(map){
 if(map.getSource('terrain-elevation'))return;
 map.addSource('terrain-elevation',{
  type:'raster-dem',
  tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
  tileSize:512,maxzoom:12,encoding:'terrarium',
  attribution:'<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>'
 });
 var layers=map.getStyle().layers||[], firstLabel=layers.find(function(l){return l.type==='symbol';});
 map.addLayer({id:'terrain-shadows',type:'hillshade',source:'terrain-elevation',
   paint:{'hillshade-exaggeration':Number(el('shade').value)/100,
     'hillshade-shadow-color':'#514738','hillshade-highlight-color':'#f0ebd7',
     'hillshade-accent-color':'#777f70'}},firstLabel&&firstLabel.id);
}
function refreshHeight(){
 Object.keys(app.maps).forEach(function(key){
   var m=app.maps[key];if(!m||!m.getSource('terrain-elevation'))return;
   try{m.setTerrain(el('terrain').checked?{source:'terrain-elevation',exaggeration:1.25}:null);}
   catch(err){app.errors.push('3D '+key+': '+String(err));}
 });
}
function reapplyStyle(map,which){
 try{
   makeDem(map);
   refreshHeight();
   if(el('territories').checked&&app.overlayData)applyTerritoryOverlay(map);
   app.ready[which]=true;
   el('loading-'+which).hidden=true;
   if(app.ready.left&&app.ready.right){
     document.body.dataset.terrainLab='ready';
     status('Both candidates ready · synchronized camera · '+regions[app.area].name);
   }
 }catch(err){
   app.errors.push(which+': '+String(err));
   status('Map layer error ('+which+'): '+err.message,true);
   el('loading-'+which).textContent='Terrain layer error: '+err.message;
 }
}
function sync(src,dst){
 if(app.syncing||app.styleReset||!app.maps[dst])return;
 var other=app.maps[dst];
 if(!other.getStyle())return;
 app.syncing=true;
 try{
  other.jumpTo({center:src.getCenter(),zoom:src.getZoom(),pitch:src.getPitch(),bearing:src.getBearing()});
 }catch(e){app.errors.push('Camera synchronization: '+String(e));}
 app.syncing=false;
}
function attach(map,which,other){
 map.on('style.load',function(){reapplyStyle(map,which);});
 map.on('move',function(){sync(map,other);});
 map.on('error',function(event){
  var message=String(event&&event.error&&event.error.message||'unknown map tile error');
  if(app.errors.length<35)app.errors.push(which+': '+message);
  if(/style\.json|load style|network error/i.test(message)){
   status(which+' style or tile server is unavailable. This lab uses external open data; please retry.',true);
  }
 });
 map.addControl(new maplibregl.NavigationControl({showZoom:true,showCompass:true}),'top-right');
}
function applyRegion(){
 var p=position();
 app.area=el('region').value;
 p=position();
 app.styleReset=true;
 app.ready.right=false;
 el('loading-right').hidden=false;
 el('loading-right').textContent='Loading regional Natural Earth image…';
 app.maps.right.setStyle(imageStyle(app.area));
 app.maps.left.jumpTo(p);
 app.maps.right.jumpTo(p);
 app.styleReset=false;
 if(el('territories').checked)updateTerritories();
}
function updatePitch(){
 var pitch=Number(el('pitch').value);
 el('pitch-value').textContent=pitch+'°';
 for(var m of Object.values(app.maps))if(m)m.easeTo({pitch:pitch,duration:0});
}
function updateShade(){
 var val=Number(el('shade').value)/100;
 el('shade-value').textContent=String(Math.round(val*100))+'%';
 for(var m of Object.values(app.maps)){
  if(m&&m.getLayer('terrain-shadows'))m.setPaintProperty('terrain-shadows','hillshade-exaggeration',val);
 }
}
function boundsFor(feature){
 var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 function scan(coords){
   if(!Array.isArray(coords))return;
   if(typeof coords[0]==='number'&&typeof coords[1]==='number'){
     var x=coords[0],y=coords[1];minX=Math.min(minX,x);maxX=Math.max(maxX,x);
     minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   }else coords.forEach(scan);
 }
 scan(feature.geometry&&feature.geometry.coordinates);
 return [minX,minY,maxX,maxY];
}
function overlap(a,b){return a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];}
function regionTerritories(){
 if(!window.ATLAS_TERRITORIES||!Array.isArray(window.ATLAS_TERRITORIES.features))return [];
 var box=app.manifest.regions[app.area].bounds;
 var pool=window.ATLAS_TERRITORIES.features.filter(function(f){
   return f.geometry&&(/Polygon/.test(f.geometry.type))&&overlap(boundsFor(f),box);
 });
 return pool.slice(0,200).map(function(f){
  return {type:'Feature',properties:{name:String(f.properties&&f.properties.name||'Indigenous territorial reference'),
    source:'Current Atlas source, no new claims'},geometry:f.geometry};
 });
}
function removeTerritoryOverlay(map){
 if(!map)return;
 ['atlas-territory-fill','atlas-territory-boundary'].forEach(function(id){
  if(map.getLayer(id))map.removeLayer(id);
 });
 if(map.getSource('atlas-territories'))map.removeSource('atlas-territories');
}
function applyTerritoryOverlay(map){
 if(!map||!map.getStyle())return;
 removeTerritoryOverlay(map);
 if(!el('territories').checked||!app.overlayData)return;
 map.addSource('atlas-territories',{type:'geojson',data:app.overlayData});
 map.addLayer({id:'atlas-territory-fill',type:'fill',source:'atlas-territories',
   paint:{'fill-color':'#d0b56e','fill-opacity':0.07}});
 map.addLayer({id:'atlas-territory-boundary',type:'line',source:'atlas-territories',
   paint:{'line-color':'#534e36','line-opacity':0.52,'line-width':1}});
}
function updateTerritories(){
 if(!el('territories').checked){
  Object.values(app.maps).forEach(removeTerritoryOverlay);
  status('Atlas territory overlay hidden · '+regions[app.area].name);return;
 }
 if(app.overlayPending){
   app.overlayPending.then(updateTerritories);return;
 }
 if(!window.ATLAS_TERRITORIES){
  status('Loading published Atlas territory geometry (read-only)…');
  app.overlayPending=new Promise(function(resolve,reject){
   var node=document.createElement('script');
   node.src='../territories-data.js';
   node.onload=resolve;node.onerror=reject;document.head.appendChild(node);
  });
  app.overlayPending.then(function(){app.overlayPending=null;updateTerritories();}).catch(function(){
   app.overlayPending=null;el('territories').checked=false;
   status('Territory reference data unavailable; map styles remain usable.',true);
  });return;
 }
 var features=regionTerritories();
 app.overlayData={type:'FeatureCollection',features:features};
 Object.values(app.maps).forEach(function(map){if(map&&map.isStyleLoaded())applyTerritoryOverlay(map);});
 status('Territory outline preview: '+features.length+' shapes from published Atlas; not authoritative borders.');
}
async function boot(){
 if(!window.maplibregl){status('MapLibre could not load from its public CDN. No atlas files were changed.',true);return;}
 try{
  var response=await fetch('assets/manifest.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Natural Earth imagery manifest has not been published yet');
  app.manifest=await response.json();
  if(!app.manifest.regions||!app.manifest.regions.guatemala)throw new Error('Incorrect Natural Earth source manifest');
  var p=position();
  app.maps.left=new maplibregl.Map({container:'map-left',
    style:'https://tiles.versatiles.org/assets/styles/natural/style.json',
    center:p.center,zoom:p.zoom,pitch:p.pitch,bearing:0,
    maxPitch:75,antialias:true});
  app.maps.right=new maplibregl.Map({container:'map-right',
    style:imageStyle(app.area),center:p.center,zoom:p.zoom,pitch:p.pitch,bearing:0,
    maxPitch:75,antialias:true});
  attach(app.maps.left,'left','right');
  attach(app.maps.right,'right','left');
  el('region').addEventListener('change',applyRegion);
  el('pitch').addEventListener('input',updatePitch);
  el('shade').addEventListener('input',updateShade);
  el('terrain').addEventListener('change',refreshHeight);
  el('territories').addEventListener('change',updateTerritories);
 }catch(err){app.errors.push(String(err));status('Terrain lab unavailable: '+err.message,true);}
}
boot();
})();