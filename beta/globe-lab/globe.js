/* Indigenous Cinema Atlas · rotating physical globe experiment.
   Separate from production atlas. References existing archival geometries only. */
(function(){
'use strict';
var el=function(id){return document.getElementById(id);};
var colors=['#ef866c','#f6bd60','#69c4ba','#728fdf','#ad8ee2','#cbe178',
 '#e9a6c1','#6fbbdc','#c6a071','#91ce9a','#e69b62','#ada6dc'];
var settings={projection:'globe',territories:true,relief:true,coast:true,anchors:false,terrain:false,spinning:false};
var map=null,errors=[],territoryCount=0,loaded={territory:false,coast:false},spinFrame=0,lastFrame=0;
var geometryIndex=[],mapInitialized=false,embedded=new URLSearchParams(location.search).get('embed')==='1';
function notifyHost(type,detail){
 if(!embedded||window.parent===window)return;
 window.parent.postMessage(Object.assign({source:'atlas-globe',type:type},detail||{}),location.origin);
}
function normalizeGeometry(geometry){
 var g=structuredClone(geometry);
 if(!window.d3||!d3.geoArea)return g;
 var polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
 polygons.forEach(function(rings){
  if(!rings.length)return;
  if(d3.geoArea({type:'Polygon',coordinates:[rings[0]]})>2*Math.PI)rings[0].reverse();
  rings.slice(1).forEach(function(h){if(d3.geoArea({type:'Polygon',coordinates:[h]})<2*Math.PI)h.reverse();});
 });
 return g;
}
function hitTerritories(lnglat){
 if(!window.d3||!d3.geoContains)return [];
 var point=[lnglat.lng,lnglat.lat],seen=new Set(),results=[];
 for(var f of geometryIndex){
  if(point[1]<f.minLat||point[1]>f.maxLat||!d3.geoContains(f.feature,point))continue;
  var name=f.feature.properties.name;
  if(!seen.has(name)){seen.add(name);results.push(name);}
 }
 return results;
}
function queryAllLayers(event){
 if(!settings.territories)return;
 if(settings.anchors&&map.getLayer('atlas-country-index-points')&&
    map.queryRenderedFeatures(event.point,{layers:['atlas-country-index-points']}).length)return;
 var all=hitTerritories(event.lngLat);
 if(all.length)selectLands(all,all.length);
}

var places={
 americas:{center:[-96,15],zoom:1.58,pitch:0,label:'Abya Yala & Turtle Island'},
 ixim:{center:[-91,15.2],zoom:6.35,pitch:28,label:'Ixim Ulew / Guatemala'},
 oaxaca:{center:[-96.5,17],zoom:6.6,pitch:30,label:'Oaxaca'},
 turtle:{center:[-101,46],zoom:3.15,pitch:0,label:'Turtle Island'},
 wallmapu:{center:[-71.5,-39],zoom:5.2,pitch:28,label:'Wallmapu'},
 andes:{center:[-72,-13],zoom:5.2,pitch:28,label:'Andes'},
 pacific:{center:[-166,-9],zoom:1.2,pitch:0,label:'Pacific'}
};
function status(message,isError){el('status').textContent=message;el('status').dataset.error=isError?'true':'false';}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rgb(name){return colors[hash(name)%colors.length];}
function validFeature(f){return f&&f.geometry&&/Polygon/.test(f.geometry.type)&&f.properties;}
function atlasTerritories(){
 var features=window.ATLAS_TERRITORIES&&window.ATLAS_TERRITORIES.features;
 if(!Array.isArray(features))throw new Error('The 2023 territory reference layer is unavailable.');
 return {type:'FeatureCollection',features:features.filter(validFeature).map(function(f,i){
  var name=String(f.properties.name||'Unlabeled land reference');
  var match=window.AtlasGlobeRelations&&window.AtlasGlobeRelations.identifyGeometry(name,f.id)||{id:'LAND-'+f.id,label:''};
  return {type:'Feature',id:i,properties:{name:name,atlas_color:rgb(name),atlas_source:'Native Land Digital / MapMaker · 2023 snapshot',atlas_feature_id:String(f.id),atlas_land_id:match.id,atlas_autonym:match.label||''},geometry:normalizeGeometry(f.geometry)};
 })};
}
function readData(){
 if(!map)return;
 try{
  var territory=atlasTerritories();territoryCount=territory.features.length;
  geometryIndex=territory.features.map(function(f){
    var b=d3.geoBounds(f);return {feature:f,minLat:b[0][1],maxLat:b[1][1]};
  });
  if(!map.getSource('atlas-land-geometry'))map.addSource('atlas-land-geometry',{type:'geojson',data:territory});
  var labelLayer=(map.getStyle().layers||[]).find(function(l){return l.type==='symbol';});
  var before=map.getLayer('atlas-physical-hillshade')?'atlas-physical-hillshade':labelLayer&&labelLayer.id;
  map.addLayer({id:'atlas-land-fill',type:'fill',source:'atlas-land-geometry',
   layout:{visibility:settings.territories?'visible':'none'},
   paint:{'fill-color':['get','atlas_color'],'fill-opacity':[
    'interpolate',['linear'],['zoom'],0,0.40,3,0.34,7,0.25,12,0.18
   ],'fill-antialias':true}},before);
  map.addLayer({id:'atlas-land-lines',type:'line',source:'atlas-land-geometry',
   layout:{visibility:settings.territories?'visible':'none'},
   paint:{'line-color':['get','atlas_color'],'line-opacity':0.37,'line-width':[
    'interpolate',['linear'],['zoom'],0,0.30,5,0.75,9,1.1
   ]}},before);
  map.on('mouseenter','atlas-land-fill',function(){map.getCanvas().style.cursor='pointer';});
  map.on('mouseleave','atlas-land-fill',function(){map.getCanvas().style.cursor='grab';});
  // Search all geometries on the sphere: no filled polygon can block underlying names.
  if(!mapInitialized){map.on('click',queryAllLayers);mapInitialized=true;}
  loaded.territory=true;
  window.dispatchEvent(new CustomEvent('atlas-globe-layers-ready',{detail:{map:map}}));
  status('Rotating globe ready · '+territoryCount.toLocaleString()+' land-reference shapes · drag to turn Earth.');
  notifyHost('ready',{territories:territoryCount});
 }catch(err){errors.push(String(err));status('Geographic background loaded; land-reference layer failed: '+err.message,true);}
 loadCoastlines();
 loadCountryAnchors();
}
function selectLands(names,total){
 if(window.AtlasGlobeRelations&&window.AtlasGlobeRelations.selectLands(names,total))return;
 el('selection').hidden=false;
 el('selection-heading').textContent=total>1?total+' overlapping references':names[0];
 el('selection-list').replaceChildren();
 names.forEach(function(name){
   var line=document.createElement('li');line.textContent=name;el('selection-list').appendChild(line);
 });
 el('selection-note').textContent='Names are from the atlas 2023 snapshot, not official boundaries. An overlap is not a claim of exclusive ownership.';
}
async function loadCoastlines(){
 try{
  var response=await fetch('../assets/world-50m.json');
  if(!response.ok)throw new Error('Missing 50m coastlines');
  var t=await response.json();
  if(!window.topojson||!map.getStyle())throw new Error('TopoJSON client unavailable');
  var coast=topojson.mesh(t,t.objects.countries,function(a,b){return a===b;});
  map.addSource('atlas-coasts',{type:'geojson',data:{type:'Feature',properties:{},geometry:coast}});
  var firstLabel=(map.getStyle().layers||[]).find(function(l){return l.type==='symbol';});
  map.addLayer({id:'atlas-coast-lines',type:'line',source:'atlas-coasts',
   layout:{visibility:settings.coast?'visible':'none'},
   paint:{'line-color':'#274f58','line-width':[
    'interpolate',['linear'],['zoom'],0,0.6,5,1.0,9,1.2
   ],'line-opacity':0.56}},firstLabel&&firstLabel.id);
  loaded.coast=true;
 }catch(err){errors.push(String(err));}
}
async function loadCountryAnchors(){
 try{
  var data;
  if(window.ATLAS_FLAT&&window.ATLAS_FLAT.countries)data={countries:window.ATLAS_FLAT.countries}; /* flat beta */
  else{var response=await fetch('../assets/archive.json');if(!response.ok)return;data=await response.json();}
  var countries=(data.countries||[]).filter(function(c){return c.coordinates&&c.coverage&&/represented/i.test(c.coverage);});
  var features=countries.map(function(c){return {type:'Feature',properties:{name:c.name,code:c.code},geometry:{type:'Point',coordinates:c.coordinates}};});
  map.addSource('atlas-country-index',{type:'geojson',data:{type:'FeatureCollection',features:features}});
  map.addLayer({id:'atlas-country-index-points',type:'circle',source:'atlas-country-index',
   layout:{visibility:settings.anchors?'visible':'none'},
   paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3,4,5,7,7],
    'circle-color':'#f6e5bd','circle-stroke-color':'#314e56','circle-stroke-width':1.5,'circle-opacity':0.95}});
  map.on('click','atlas-country-index-points',function(e){
   if(!e.features||!e.features.length)return;
   var f=e.features[0],name=f.properties.name;
   notifyHost('country',{code:f.properties.code});
   el('selection').hidden=false;el('selection-heading').textContent=name+' · country index';
   el('selection-list').replaceChildren();
   el('selection-note').textContent='A country-level catalog reference, not the location or residence of a filmmaker. Return to the atlas to examine current film records.';
  });
 }catch(err){errors.push(String(err));}
}
function layerVisibility(id,flag){
 if(map&&map.getLayer(id))map.setLayoutProperty(id,'visibility',flag?'visible':'none');
}
function toggleLand(){settings.territories=el('land-toggle').checked;
 layerVisibility('atlas-land-fill',settings.territories);layerVisibility('atlas-land-lines',settings.territories);
}
function toggleCoast(){settings.coast=el('coast-toggle').checked;layerVisibility('atlas-coast-lines',settings.coast);}
function toggleAnchors(){settings.anchors=el('anchor-toggle').checked;layerVisibility('atlas-country-index-points',settings.anchors);}
function toggleRelief(){settings.relief=el('relief-toggle').checked;layerVisibility('atlas-physical-hillshade',settings.relief);}
function toggleTerrain(){
 settings.terrain=el('terrain-toggle').checked;
 if(!map||!map.getSource('atlas-elevation'))return;
 try{map.setTerrain(settings.terrain?{source:'atlas-elevation',exaggeration:1.3}:null);}
 catch(err){settings.terrain=false;el('terrain-toggle').checked=false;status('Raised terrain is unavailable here; hillshading remains active.',true);}
}
function useProjection(type){
 if(!map)return;
 settings.projection=type;map.setProjection({type:type});
 el('globe-mode').setAttribute('aria-pressed',String(type==='globe'));
 el('flat-mode').setAttribute('aria-pressed',String(type==='mercator'));
 el('map-help').textContent=type==='globe'?'Drag to rotate Earth · scroll to approach mountains':'Drag to shift the world · scroll to zoom into physical geography';
 if(type==='mercator'){stopSpin();map.easeTo({pitch:0,duration:650});}
 else if(map.getPitch()>60)map.easeTo({pitch:45,duration:450});
}
function stopSpin(){
 settings.spinning=false;
 if(spinFrame)cancelAnimationFrame(spinFrame);
 spinFrame=0;
 el('spin-toggle').textContent='Rotate slowly';
 el('spin-toggle').setAttribute('aria-pressed','false');
}
function spin(t){
 if(!settings.spinning||!map)return;
 if(lastFrame){var delta=Math.min(70,t-lastFrame);var center=map.getCenter();map.setCenter([center.lng+delta*0.0025,center.lat]);}
 lastFrame=t;spinFrame=requestAnimationFrame(spin);
}
function spinToggle(){
 if(settings.spinning){stopSpin();return;}
 if(settings.projection!=='globe')useProjection('globe');
 settings.spinning=true;lastFrame=0;
 el('spin-toggle').textContent='Stop rotation';el('spin-toggle').setAttribute('aria-pressed','true');
 spinFrame=requestAnimationFrame(spin);
}
function focusPlace(id){
 var p=places[id]||places.americas;
 stopSpin();
 map.flyTo({center:p.center,zoom:p.zoom,pitch:p.pitch,bearing:0,speed:1.2,curve:1.2,maxDuration:1850,
   essential:!window.matchMedia('(prefers-reduced-motion: reduce)').matches});
 el('region-label').textContent=p.label;
}
function addHillshade(){
 try{
  map.addSource('atlas-elevation',{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
   tileSize:512,maxzoom:12,encoding:'terrarium',
   attribution:'<a href="https://mapterhorn.com/attribution">© Mapterhorn elevation</a>'});
  var style=map.getStyle(),firstLabel=(style.layers||[]).find(function(l){return l.type==='symbol';});
  map.addLayer({id:'atlas-physical-hillshade',type:'hillshade',source:'atlas-elevation',
   layout:{visibility:settings.relief?'visible':'none'},
   paint:{'hillshade-exaggeration':0.62,
    'hillshade-shadow-color':'#3a4541','hillshade-highlight-color':'#fcf4d9',
    'hillshade-accent-color':'#6f7b6a'}},firstLabel&&firstLabel.id);
 }catch(err){errors.push(String(err));el('relief-toggle').checked=false;settings.relief=false;}
}
function setupInteractions(){
 el('globe-mode').onclick=function(){useProjection('globe');};
 el('flat-mode').onclick=function(){useProjection('mercator');};
 el('spin-toggle').onclick=spinToggle;
 el('region').onchange=function(e){focusPlace(e.target.value);};
 el('land-toggle').onchange=toggleLand;
 el('coast-toggle').onchange=toggleCoast;
 el('anchor-toggle').onchange=toggleAnchors;
 el('relief-toggle').onchange=toggleRelief;
 el('terrain-toggle').onchange=toggleTerrain;
 el('clear-selection').onclick=function(){
  if(window.AtlasGlobeRelations&&window.AtlasGlobeRelations.closePanel)window.AtlasGlobeRelations.closePanel();
  else el('selection').hidden=true;
 };
 el('zoom-plus').onclick=function(){map.easeTo({zoom:Math.min(map.getMaxZoom(),map.getZoom()+0.75),duration:260});};
 el('zoom-minus').onclick=function(){map.easeTo({zoom:Math.max(map.getMinZoom(),map.getZoom()-0.75),duration:260});};
 el('zoom-overview').onclick=function(){focusPlace('americas');};
 el('zoom-selected').onclick=function(){window.AtlasGlobeRelations&&window.AtlasGlobeRelations.fitSelection&&window.AtlasGlobeRelations.fitSelection();};
 el('compact-globe').onclick=function(){useProjection('globe');};
 el('compact-flat').onclick=function(){useProjection('mercator');};
 el('compact-region').onchange=function(e){if(e.target.value){focusPlace(e.target.value);e.target.value='';}};
 document.addEventListener('visibilitychange',function(){if(document.hidden)stopSpin();});
}
function launch(){
 if(embedded)document.body.classList.add('embedded');
 setupInteractions();
 if(!window.maplibregl){status('MapLibre could not load. The main atlas has not been changed.',true);return;}
 try{
  map=new maplibregl.Map({container:'globe-map',
   style:'https://tiles.versatiles.org/assets/styles/natural/style.json',
   center:places.americas.center,zoom:places.americas.zoom,pitch:0,bearing:0,
   minZoom:0.75,maxPitch:70,maxZoom:16,antialias:true,renderWorldCopies:false,
   attributionControl:true});
  window.AtlasGlobeTest={getStatus:function(){return {projection:settings.projection,
   territories:territoryCount,loaded:loaded,errors:errors.slice(),center:map.getCenter(),zoom:map.getZoom()};}};
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:!embedded}),'top-right');
  map.scrollZoom.setWheelZoomRate(1/680);
  map.scrollZoom.setZoomRate(1/135);
  map.doubleClickZoom.enable();
  map.touchZoomRotate.enable();
  window.addEventListener('message',function(e){
   if(e.origin!==location.origin||!e.data||e.data.source!=='atlas-beta-parent')return;
   var d=e.data;
   if(d.type==='land'&&window.AtlasGlobeRelations){
    if(d.id){
      window.AtlasGlobeRelations.renderDetail(d.id,null,false);
      window.AtlasGlobeRelations.fitSelection();
    }else window.AtlasGlobeRelations.closePanel();
   }
   if(d.type==='maker'&&window.AtlasGlobeRelations)window.AtlasGlobeRelations.highlightMaker(d.id||null);
   if(d.type==='layers'){
    var l=d.layers||{};
    if(typeof l.territories==='boolean'){el('land-toggle').checked=l.territories;toggleLand();}
    if(typeof l.relief==='boolean'){el('relief-toggle').checked=l.relief;toggleRelief();}
    if(typeof l.anchors==='boolean'){el('anchor-toggle').checked=l.anchors;toggleAnchors();}
    if(typeof l.boundaries==='boolean'){settings.boundaries=l.boundaries;
      if(map.getLayer('atlas-land-lines'))map.setPaintProperty('atlas-land-lines','line-opacity',l.boundaries?0.86:0.37);
    }
    if(typeof l.names==='boolean'){
      el('name-toggle').checked=l.names;el('name-toggle').dispatchEvent(new Event('change'));
    }
   }
  });
  map.on('style.load',function(){
   map.setProjection({type:'globe'});
   addHillshade();
   readData();
   el('initial-loading').hidden=true;
  });
  map.on('dragstart',stopSpin);
  map.on('error',function(e){
   var msg=String(e&&e.error&&e.error.message||'Map tile unavailable');
   if(errors.length<18)errors.push(msg);
   if(/style\.json|failed to fetch/i.test(msg))status('The public map style or elevation tiles could not load. Please retry.',true);
  });
 }catch(err){errors.push(String(err));status('Globe could not be initialized: '+err.message,true);}
}
launch();
})();