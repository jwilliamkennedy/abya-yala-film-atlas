/* Optional beta discovery surface. Existing catalog, land references, themes and previews
 * remain authoritative. This experiment does not publish territory polygons or edit collections. */
(()=>{'use strict';
const root=document.documentElement, query=new URLSearchParams(location.search);
if(query.get('globe')!=='1')return;
let map=null,host=null,observer=null,frame=0,active=false,closed=false,points=[],signature='',timer=0;
const $=s=>document.querySelector(s), C=()=>window.AtlasConstellate, A=()=>window.Atlas;
const announce=t=>{const e=$('#globe-status');if(e)e.textContent=t;};
function close(){
 closed=true;clearTimeout(timer);active=false;if(frame)cancelAnimationFrame(frame);frame=0;observer?.disconnect();observer=null;
 if(map){map.remove();map=null;}host?.remove();host=null;document.body.classList.remove('atlas-globe-experiment');
 const u=new URL(location.href);u.searchParams.delete('globe');history.replaceState(history.state,'',u.href);
}
function sync(){
 if(!active||!map||!map.getSource('archive-references')||frame)return;
 frame=requestAnimationFrame(()=>{
  frame=0;if(!active||!map)return;
  const c=C(),selected=new Set(c.selectedLandIds),preview=new Set(c.previewLandIds());
  const features=points.map(p=>({...p,properties:{...p.properties,match:c.landMatchesTheme([p.id])?1:0,selected:selected.has(p.id)?1:0,preview:preview.has(p.id)?1:0}}));
  const next=features.map(f=>[f.id,f.properties.match,f.properties.selected,f.properties.preview].join(':')).join('|');
  if(signature===next)return;signature=next;map.getSource('archive-references').setData({type:'FeatureCollection',features});
 });
}
window.AtlasGlobe={get active(){return active},sync,close};
function collect(){
 const c=C(),a=A(),out=[];
 for(const land of a.lands){
  if(land.browseGroup||!c.landFilmCount(land.id))continue;
  const ref=a.landMarkerReference(land.id);if(!ref?.coordinates?.every(Number.isFinite))continue;
  const [lng,lat]=ref.coordinates;if(Math.abs(lat)>85||Math.abs(lng)>180)continue;
  out.push({type:'Feature',id:String(land.id),geometry:{type:'Point',coordinates:[lng,lat]},properties:{name:a.landDisplayName(land),count:c.landFilmCount(land.id),match:1,selected:0,preview:0}});
 }
 return out.sort((a,b)=>a.properties.name.localeCompare(b.properties.name));
}
function zoomToOverview(){if(!map)return;const el=$('#globe-surface'),d=Math.min(el.clientWidth,el.clientHeight);map.jumpTo({center:[-92,12],zoom:Math.max(0,Math.log2(Math.max(160,d)*.78*Math.PI/512)),bearing:0,pitch:0});}
function reveal(ids){if(!active||!ids.length)return;C().openLands(ids);sync();}
function markup(){
 host=document.createElement('section');host.id='atlas-rotational-globe';host.setAttribute('aria-label','Rotatable film atlas experiment');
 host.innerHTML='<div id="globe-surface"></div><div class="globe-guide"><strong>Globe · beta experiment</strong><span>Drag to rotate · zoom to explore · select a light for films</span><label for="globe-find">Find a land reference</label><select id="globe-find"><option value="">Choose a land…</option></select><div class="globe-buttons"><button type="button" id="globe-home">Americas</button><button type="button" id="globe-plus" aria-label="Zoom in">+</button><button type="button" id="globe-minus" aria-label="Zoom out">−</button></div></div><div class="globe-footer"><span>Land references, not filming locations or official boundaries. Natural Earth · existing Atlas reference index.</span><button type="button" id="globe-close">Flat workspace</button><span id="globe-status" role="status" aria-live="polite"></span></div>';
 $('.map-panel').append(host);
 const sel=$('#globe-find');for(const p of points){const o=document.createElement('option');o.value=p.id;o.textContent=p.properties.name+' ('+p.properties.count+')';sel.append(o);}
 sel.onchange=()=>{const p=points.find(v=>v.id===sel.value);if(!p||!map)return;map.easeTo({center:p.geometry.coordinates,zoom:Math.max(map.getZoom(),2.4),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:500});reveal([p.id]);};
 $('#globe-close').onclick=close;$('#globe-home').onclick=zoomToOverview;
 $('#globe-plus').onclick=()=>map?.zoomIn({duration:180});$('#globe-minus').onclick=()=>map?.zoomOut({duration:180});
}
async function boot(){
 try{
  points=collect();if(!points.length)throw Error('No mapped land references');
  const [lib,world]=await Promise.all([import(new URL('assets/maplibre/maplibre-gl.mjs',document.baseURI).href),fetch(new URL('assets/world-50m.json',document.baseURI)).then(r=>{if(!r.ok)throw Error('Geography unavailable');return r.json();})]);
  if(closed||!C()?.enabled)return;
  const ml=lib.default||lib,countries=topojson.feature(world,world.objects.countries);
  markup();document.body.classList.add('atlas-globe-experiment');
  // The map uses only the local public-domain Natural Earth base. Reference dots are
  // derived from the existing atlas coordinates, not invented centroids or a new NLD feed.
  const style={version:8,projection:{type:'globe'},sources:{earth:{type:'geojson',data:countries},'archive-references':{type:'geojson',data:{type:'FeatureCollection',features:points}}},layers:[
   {id:'ocean',type:'background',paint:{'background-color':'#17283c'}},
   {id:'earth',type:'fill',source:'earth',paint:{'fill-color':'#405e65','fill-antialias':true}},
   {id:'archive-glow',type:'circle',source:'archive-references',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,5,4,7,7,9],'circle-color':['case',['==',['get','selected'],1],'#b8d9ed',['==',['get','preview'],1],'#a8cbe5','#eae6d6'],'circle-opacity':['case',['==',['get','match'],1],.17,.025],'circle-blur':.65}},
   {id:'archive-light',type:'circle',source:'archive-references',paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2.7,4,3.8,7,5.5],'circle-color':['case',['==',['get','selected'],1],'#b8d9ed',['==',['get','preview'],1],'#a8cbe5','#eee9dc'],'circle-opacity':['case',['==',['get','match'],1],.95,.16],'circle-stroke-color':'#b9d6e8','circle-stroke-width':['case',['==',['get','selected'],1],1.5,0]}}
  ]};
  map=new ml.Map({container:$('#globe-surface'),style,center:[-92,12],zoom:1,minZoom:0,maxZoom:8,maxPitch:0,dragRotate:false,touchPitch:false,renderWorldCopies:false,attributionControl:false,fadeDuration:0});
  map.on('error',e=>{if(!active)announce('Globe loading; the flat workspace remains available.');});
  map.once('load',()=>{
   if(closed||!map)return;clearTimeout(timer);active=true;host.dataset.ready='true';zoomToOverview();sync();announce(points.length+' mapped land references');
   const canvas=map.getCanvas();canvas.setAttribute('aria-label','Interactive globe. Use the land selector for keyboard discovery.');
   map.on('mousemove',e=>{const p=e.point,hit=map.queryRenderedFeatures([[p.x-7,p.y-7],[p.x+7,p.y+7]],{layers:['archive-light']});canvas.style.cursor=hit.length?'pointer':'grab';});
   map.on('click',e=>{const p=e.point,hit=map.queryRenderedFeatures([[p.x-10,p.y-10],[p.x+10,p.y+10]],{layers:['archive-light']});reveal([...new Set(hit.map(f=>String(f.id)))]);});
   observer=new ResizeObserver(()=>map?.resize());observer.observe($('#globe-surface'));
  });
  timer=setTimeout(()=>{if(!active){close();const e=document.createElement('p');e.className='globe-fallback';e.textContent='The globe could not initialize. The existing flat workspace is available.';$('.map-panel')?.append(e);setTimeout(()=>e.remove(),9000);}},16000);
 }catch(e){console.warn('Globe experiment unavailable',e);close();const p=document.createElement('p');p.className='globe-fallback';p.textContent='The globe is unavailable on this device. The flat workspace is unchanged.';$('.map-panel')?.append(p);setTimeout(()=>p.remove(),9000);}
}
const started=Date.now();(function wait(){if(closed)return;if(C()?.enabled&&A()?.lands&&window.topojson){boot();return;}if(Date.now()-started<20000)setTimeout(wait,100);})();
})();
