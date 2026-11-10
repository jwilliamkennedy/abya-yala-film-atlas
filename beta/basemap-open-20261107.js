/* Open basemap under the atlas, 2026-11-07 (beta).
   Replaces the single stretched Natural Earth PNG with live open tiles, drawn by MapLibre GL JS
   (BSD-3, the open-source fork of the Mapbox GL library that Native Land Digital builds on):
   - land, water, rivers, forest, ice: OpenFreeMap vector tiles (OpenMapTiles schema, © OpenStreetMap contributors), free, no key;
   - relief and elevation tint: Mapterhorn open terrain tiles.
   Colours are deliberately muted so the territory washes read clearly on top.
   No basemap place names are drawn, so the atlas's own Indigenous land names stay the only names on the map.
   The d3 overlay switches to Web Mercator so it lines up with the tiles; MapLibre follows the d3 camera and never takes input.
   ?basemap=relief restores the previous Equal Earth + PNG view for comparison. */
(()=>{'use strict';
const root=document.documentElement;
const off=new URLSearchParams(location.search).get('basemap')==='relief';
const webgl=(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return false;}})();
if(off||!webgl){window.AtlasOpenBasemap={active:false};return;}
root.dataset.basemap='open';

const OSM='<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>';
const TERRAIN='<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener noreferrer">Mapterhorn terrain</a>';
const style={version:8,
 sources:{
  omt:{type:'vector',url:'https://tiles.openfreemap.org/planet'},
  dem:{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,maxzoom:12,encoding:'terrarium'}
 },
 layers:[
  {id:'land',type:'background',paint:{'background-color':'#e4e5de'}},
  {id:'elevation-tint',type:'color-relief',source:'dem',paint:{'color-relief-opacity':.92,'color-relief-color':['interpolate',['linear'],['elevation'],
    -50,'#d9ddd3',0,'#d9ddd2',150,'#dcdfd3',500,'#e1e1d5',1000,'#dfdcd0',1600,'#d2cdc2',2400,'#c2bcb4',3200,'#b5b0a9',4200,'#d7d6d3',5200,'#f6f6f5']}},
  {id:'cover-wood',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'#a4ad9e','fill-opacity':['interpolate',['linear'],['zoom'],1,.18,6,.28,10,.34]}},
  {id:'cover-grass',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'grass'],paint:{'fill-color':'#cfd3c4','fill-opacity':.22}},
  {id:'cover-wet',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'wetland'],paint:{'fill-color':'#c5cbc4','fill-opacity':.35}},
  {id:'cover-sand',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'sand'],paint:{'fill-color':'#ebe8de','fill-opacity':.5}},
  {id:'cover-ice',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'ice'],paint:{'fill-color':'#fcfcfb','fill-opacity':.9}},
  {id:'relief',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':.5,'hillshade-shadow-color':'#4b4336','hillshade-highlight-color':'#fffdf3','hillshade-accent-color':'#5a5040','hillshade-illumination-direction':315}},
  {id:'water',type:'fill',source:'omt','source-layer':'water',paint:{'fill-color':'#b3c3ca'}},
  {id:'rivers',type:'line',source:'omt','source-layer':'waterway',minzoom:4,paint:{'line-color':'#a5b6be','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],4,.35,8,.9,12,1.8]}},
  {id:'roads',type:'line',source:'omt','source-layer':'transportation',minzoom:6,filter:['in',['get','class'],['literal',['motorway','trunk','primary']]],paint:{'line-color':'#fdfcfa','line-opacity':.5,'line-width':['interpolate',['linear'],['zoom'],6,.3,10,1,14,2.2]}}
 ]};

let svg=null,host=null,map=null,ready=false,failed=false,errors=0;
function fail(){if(failed||ready)return;failed=true;root.dataset.basemapState='failed';
 const g=document.querySelector('#atlas .geography');if(g)g.setAttribute('data-geography-fallback','true');}
function sync(){
 if(!map||!window.Atlas||typeof window.Atlas.screenPoint!=='function')return;
 const r=svg.getBoundingClientRect(),w=r.width,h=r.height;if(!w||!h)return;
 let a,b;try{a=window.Atlas.screenPoint([-90,0]);b=window.Atlas.screenPoint([-89,0]);}catch(e){return;}if(!a||!b)return;
 const dx=b[0]-a[0];if(!(dx>0)||!isFinite(dx))return;
 const world=360*dx,lon=-90+(w/2-a[0])/dx,y=(a[1]-h/2)/(world/(2*Math.PI));
 const lat=Math.max(-85,Math.min(85,Math.atan(Math.sinh(y))*180/Math.PI));
 map.jumpTo({center:[((lon+540)%360)-180,lat],zoom:Math.log2(world/512)});
 // Do not expose the tile map until its camera matches the Atlas SVG.
 if(host)host.dataset.cameraSynced="true";
}
function credit(){
 const span=[...document.querySelectorAll('.map-footer span')].find(s=>/Natural Earth/.test(s.textContent));
 if(span)span.innerHTML=OSM+' · '+TERRAIN+' · Native Land Digital / MapMaker · 2023';
}
function visibility(){const g=document.querySelector('#atlas .geography');if(host)host.hidden=!!(g&&g.getAttribute('data-geography-visible')==='false');}
async function boot(){
 svg=document.getElementById('atlas');if(!svg||!svg.parentElement){fail();return;}
 host=document.createElement('div');host.id='atlas-basemap';host.setAttribute('aria-hidden','true');
 svg.parentElement.insertBefore(host,svg);credit();
 let ml;try{const lib=await import(new URL('assets/maplibre/maplibre-gl.mjs',document.baseURI).href);ml=lib.default||lib;}catch(e){fail();return;}
 // Set the actual initial palette before MapLibre paints its first frame.
 // Retain the day values for correct subsequent mode switching.
 const openingWeave=new URLSearchParams(location.search).get('constellate')==='1';
 if(root.dataset.readingTheme==='night'||root.dataset.uiConstellate==='on'||openingWeave){
  for(const [id,properties] of Object.entries(NIGHT)){
   const layer=style.layers.find(l=>l.id===id);
   if(!layer?.paint)continue;
   DAY[id]??={};
   for(const [key,value] of Object.entries(properties)){DAY[id][key]=layer.paint[key];layer.paint[key]=value;}
  }
  palette='night';root.dataset.basemapPalette='night';
 }
 try{map=new ml.Map({container:host,style,interactive:false,attributionControl:false,fadeDuration:0,renderWorldCopies:true,center:[-90,10],zoom:1.4,maxZoom:18,maxPitch:0,trackResize:false});}catch(e){fail();return;}
 map.on('load',()=>{ready=true;root.dataset.basemapState='ready';sync();applyPalette();});
 map.on('error',()=>{if(!ready&&++errors>6)fail();});
 setTimeout(()=>{if(!ready)fail();},20000);
 new ResizeObserver(()=>{map.resize();sync();}).observe(svg);
 window.addEventListener('atlas-camera-frame',sync);window.addEventListener('atlas-camera-change',sync);
 new MutationObserver(visibility).observe(svg,{subtree:true,attributes:true,attributeFilter:['data-geography-visible']});
 sync();visibility();
}
/* 2026-11-09: night palette for Starry night and while Constellate is open (ocean #070b16, land #121a2c). */
const DAY={},NIGHT={'land':{'background-color':'#243750'},'water':{'fill-color':'#101e31'},'rivers':{'line-color':'#4f6f91'},
 'cover-wood':{'fill-color':'#345365'},'cover-grass':{'fill-color':'#304c5b'},'cover-wet':{'fill-color':'#395971'},'cover-sand':{'fill-color':'#485d73'},'cover-ice':{'fill-color':'#64859b'},
 'roads':{'line-opacity':0},'elevation-tint':{'color-relief-opacity':0},'relief':{'hillshade-shadow-color':'#000000','hillshade-highlight-color':'#2a3550','hillshade-accent-color':'#0b1020','hillshade-exaggeration':.35}};
let palette='day';
function applyPalette(){
 if(!map||!ready)return;const want=(root.dataset.readingTheme==='night'||root.dataset.uiConstellate==='on'||new URLSearchParams(location.search).get('constellate')==='1')?'night':'day';if(want===palette)return;palette=want;
 for(const [id,props] of Object.entries(NIGHT)){if(!map.getLayer(id))continue;for(const [k,v] of Object.entries(props)){try{if(!(id in DAY))DAY[id]={};if(!(k in DAY[id]))DAY[id][k]=map.getPaintProperty(id,k);map.setPaintProperty(id,k,want==='night'?v:DAY[id][k]);}catch(e){}}}
 root.dataset.basemapPalette=want;
}
new MutationObserver(applyPalette).observe(root,{attributes:true,attributeFilter:['data-reading-theme','data-ui-constellate']});
window.AtlasOpenBasemap={active:true,projection:()=>d3.geoMercator(),sync,applyPalette,get map(){return map;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
