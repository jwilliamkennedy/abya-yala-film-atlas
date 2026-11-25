/* Globe discovery, 24 November 2026.
 * A single spherical camera and local canvas: no Mercator follower, external tiles,
 * new territory downloads or duplicate land datasets. All land shapes are the
 * existing Atlas's normalized 2023 reference geometry, not official boundaries.
 */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('globe')!=='1')return;
const $=s=>document.querySelector(s),C=()=>window.AtlasConstellate,A=()=>window.Atlas;
const DEG=180/Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=v=>((v+180)%360+360)%360-180;
let active=false,closed=false,host=null,canvas=null,ctx=null,ro=null,raf=0,settleTimer=0;
let W=0,H=0,dpr=1,zoom=1,center=[-91,12],proj=null,path=null,earth=null,landArea=0;
let records=[],points=[],byId=new Map(),near=[],inside=[],focusIds=[],focusKey='',previewLimit=3,settled=false;
let pointers=new Map(),gesture=null,dragged=false,previousFocus=null;
const sphere={type:'Sphere'};
function camera(){return {center:[...center],zoom,projection:'globe',renderer:'orthographic-canvas'};}
function renderSoon(){if(!active||raf)return;raf=requestAnimationFrame(()=>{raf=0;draw();});}
function sync(){if(!active)return;renderSoon();if(!pointers.size)scheduleSettle(75);}
window.AtlasGlobe={get active(){return active},get camera(){return active?camera():null},get pointCount(){return points.length},get geometryCount(){return records.length},get landArea(){return landArea},get focus(){return {ids:[...focusIds],inside:inside.map(r=>r.id),settled};},sync,close};
function close(){
 closed=true;active=false;clearTimeout(settleTimer);if(raf)cancelAnimationFrame(raf);raf=0;ro?.disconnect();
 host?.remove();host=null;document.body.classList.remove('atlas-globe-experiment');
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
  const r={id:l.id,name:A().landDisplayName(l),shapes,count:C().landFilmCount(l.id)};
  records.push(r);byId.set(r.id,r);
  if(!r.count)continue;
  const ref=A().landMarkerReference(l.id),coord=ref?.coordinates;
  if(!coord?.every(Number.isFinite)||Math.abs(coord[0])>180||Math.abs(coord[1])>90)continue;
  // Existing reference coordinates are checked against the exact linked polygons.
  if(!fs.some(f=>d3.geoContains(f,coord)))continue;
  points.push({...r,coord});
 }
 records.sort((a,b)=>a.name.localeCompare(b.name));points.sort((a,b)=>a.name.localeCompare(b.name));
}
function resize(){
 const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
 const w=b.width,h=b.height,ratio=Math.min(window.devicePixelRatio||1,2);
 if(w===W&&h===H&&ratio===dpr)return;
 W=w;H=h;dpr=ratio;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);renderSoon();scheduleSettle(100);
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
 for(const p of points){if(!visible(p.coord))continue;const xy=proj(p.coord);if(!xy?.every(Number.isFinite)||xy[0]<-10||xy[1]<-10||xy[0]>W+10||xy[1]>H+10)continue;
  out.push({p,xy,match:c.landMatchesTheme([p.id]),distance:Math.hypot(xy[0]-W/2,xy[1]-H/2)});
 }
 return out;
}
function draw(){
 if(!W||!H)return;updateProjection();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#101b29';ctx.fillRect(0,0,W,H);
 const r=radius(),ocean=ctx.createRadialGradient(W/2-r*.25,H/2-r*.3,0,W/2,H/2,r);
 ocean.addColorStop(0,'#386176');ocean.addColorStop(.76,'#294858');ocean.addColorStop(1,'#1c3446');
 shape(sphere,ocean,null);shape(earth,'#69877b','#91a69a',.35);
 // Render only the exact existing reference shapes currently under the aperture
 // or selected by the visitor. No arbitrary territory outlines or country proxies.
 const chosen=new Set([...focusIds,...C().selectedLandIds,...C().previewLandIds()]);
 for(const id of chosen){const rec=byId.get(id);if(!rec)continue;const on=C().landMatchesTheme([id]);
  for(const f of rec.shapes)shape(f.feature,on?'rgba(193,211,157,.24)':'rgba(160,177,178,.11)',on?'rgba(226,239,189,.67)':'rgba(174,190,194,.42)',.9);
 }
 shape(sphere,null,'rgba(190,212,220,.40)',.8);
 const ps=screenPoints();near=ps.filter(v=>v.match&&v.distance<=aperture()).sort((a,b)=>a.distance-b.distance||a.p.name.localeCompare(b.p.name));
 const selected=new Set(C().selectedLandIds),preview=new Set(C().previewLandIds());
 for(const {p,xy,match} of ps){
  const chosen=focusIds.includes(p.id)||selected.has(p.id)||preview.has(p.id),rr=chosen?3.6:2.1;
  ctx.beginPath();ctx.arc(xy[0],xy[1],rr+3.4,0,2*Math.PI);ctx.fillStyle=match?(chosen?'rgba(220,238,198,.26)':'rgba(212,232,189,.10)'):'rgba(214,228,221,.025)';ctx.fill();
  ctx.beginPath();ctx.arc(xy[0],xy[1],rr,0,2*Math.PI);ctx.fillStyle=match?(chosen?'#f4f1cc':'#d9e8cf'):'rgba(208,222,219,.22)';ctx.fill();
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
 const p=center;
 return records.filter(rec=>rec.shapes.some(s=>includesBounds(s.bounds,p)&&d3.geoContains(s.feature,p)));
}
function matchingFilms(id){return C().landCatalogFilms(id);}
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
 const heading=el('div','globe-encounter-heading');heading.append(el('strong',null,primary.name),el('small',null,matchingFilms(primary.id).length+' matching films'));panel.append(heading);
 if(chosen.length>1){const choices=el('div','globe-choices');for(const r of chosen){const b=button(r.name+' · '+matchingFilms(r.id).length,()=>{C().openLand(r.id);sync();});choices.append(b);}panel.append(choices);}
 const films=matchingFilms(primary.id);if(films.length){
  const list=el('div','globe-film-strip');for(const film of films.slice(0,previewLimit)){
   const b=button('',()=>{C().showPreview(film,{land:primary.id});sync();},'globe-film');
   const art=el('span','globe-film-art');art.innerHTML=C().thumb(film);
   const copy=el('span','globe-film-copy');copy.append(el('strong',null,film.title),el('small',null,[film.maker,film.year].filter(Boolean).join(' · ')));b.append(art,copy);list.append(b);
  }panel.append(list);
  panel.append(button('Explore all '+films.length+' films',()=>{C().openLand(primary.id);sync();},'globe-more'));
 }else{panel.append(el('p','globe-empty',primary.count?'No films match the current theme selection.':'No linked films in the Atlas yet.'));}
 status.textContent=chosen.length+' land reference'+(chosen.length===1?'':'s')+' in focus';
}
function settle(){
 if(!active||!W||!H||pointers.size)return;settled=true;updateProjection();inside=underFocus();
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
 settled=false;inside=[];focusIds=[];focusKey='';host.classList.add('is-moving');$('#globe-encounter').setAttribute('aria-busy','true');renderSoon();scheduleSettle();
}
function finishMove(){host.classList.remove('is-moving');$('#globe-encounter').setAttribute('aria-busy','false');scheduleSettle(140);}
function setCamera(c,z=zoom){center=[wrap(c[0]),clamp(c[1],-89.9,89.9)];zoom=clamp(z,.8,25);movement();finishMove();}
function midpoint(){const ps=[...pointers.values()];if(!ps.length)return null;return ps.length===1?{x:ps[0].x,y:ps[0].y,d:0}:{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2,d:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)};}
function wire(){
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=midpoint();dragged=pointers.size>1;clearTimeout(settleTimer);canvas.classList.add('grabbing');});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const m=midpoint(),g=gesture;gesture=m;if(!m||!g)return;
  const dx=m.x-g.x,dy=m.y-g.y;if(Math.abs(dx)+Math.abs(dy)>1||Math.abs(m.d-g.d)>1)dragged=true;if(!dragged)return;
  if(m.d&&g.d)zoom=clamp(zoom*m.d/g.d,.8,25);
  const scale=DEG/radius(),cos=Math.max(.35,Math.cos(center[1]/DEG));
  center=[wrap(center[0]-dx*scale/cos),clamp(center[1]+dy*scale,-89.9,89.9)];movement();
 });
 function end(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);gesture=midpoint();if(pointers.size)return;canvas.classList.remove('grabbing');
  if(!dragged&&e.type==='pointerup'){const b=canvas.getBoundingClientRect(),xy=[e.clientX-b.left,e.clientY-b.top];const found=screenPoints().filter(v=>v.match&&Math.hypot(v.xy[0]-xy[0],v.xy[1]-xy[1])<14).sort((a,b)=>Math.hypot(a.xy[0]-xy[0],a.xy[1]-xy[1])-Math.hypot(b.xy[0]-xy[0],b.xy[1]-xy[1]));if(found.length){setCamera(found[0].p.coord,zoom);return;}}
  finishMove();
 }
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();setCamera(center,zoom*Math.exp(-clamp(e.deltaY*(e.deltaMode===1?16:1),-350,350)*.0025));},{passive:false});
 canvas.addEventListener('keydown',e=>{const k=e.key,step=12/Math.sqrt(zoom);if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home','Enter'].includes(k))return;e.preventDefault();e.stopPropagation();if(k==='Enter'){if(focusIds.length)C().openLands(focusIds);return;}if(k==='Home'){setCamera([-91,12],1);return;}if(k==='+'||k==='='){setCamera(center,zoom*1.4);return;}if(k==='-'){setCamera(center,zoom/1.4);return;}setCamera([center[0]+(k==='ArrowRight'?step:k==='ArrowLeft'?-step:0),center[1]+(k==='ArrowUp'?step:k==='ArrowDown'?-step:0)]);});
}
function markup(){
 host=el('section');host.id='atlas-rotational-globe';host.setAttribute('aria-label','Rotatable cinema atlas');
 host.innerHTML='<canvas id="globe-surface" tabindex="0" aria-label="Rotate the globe using arrow keys, plus and minus to zoom, Enter to explore the focused lands"></canvas><div id="globe-aperture" aria-hidden="true"></div><div class="globe-instructions">Drag to rotate · zoom to explore</div><div class="globe-guide"><label for="globe-find" class="sr-only">Find a land reference</label><select id="globe-find"><option value="">Find a land…</option></select><div class="globe-buttons"><button type="button" id="globe-home">Americas</button><button type="button" id="globe-plus" aria-label="Zoom in">+</button><button type="button" id="globe-minus" aria-label="Zoom out">−</button></div></div><section id="globe-encounter" aria-label="Cinema at the focal point"></section><div class="globe-footer"><span><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · Existing 2023 Atlas references: <a href="https://native-land.ca/" target="_blank" rel="noopener">Native Land Digital</a> / <a href="https://education.nationalgeographic.org/resource/mapmaker-indigenous-territories/" target="_blank" rel="noopener">MapMaker</a>. Reference shapes, not official boundaries or filming locations.</span><button type="button" id="globe-close">Flat workspace</button><span id="globe-status" class="sr-only" role="status" aria-live="polite"></span></div>';
 $('.map-panel').append(host);canvas=$('#globe-surface');ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
 const sel=$('#globe-find');for(const p of points){const o=el('option',null,p.name+' ('+p.count+')');o.value=p.id;sel.append(o);}
 sel.onchange=()=>{const p=points.find(v=>v.id===sel.value);if(p)setCamera(p.coord,Math.max(zoom,2.2));};
 $('#globe-home').onclick=()=>{sel.value='';setCamera([-91,12],1);};
 $('#globe-plus').onclick=()=>setCamera(center,zoom*1.4);$('#globe-minus').onclick=()=>setCamera(center,zoom/1.4);$('#globe-close').onclick=close;
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
  active=true;document.body.classList.add('atlas-globe-experiment');host.dataset.ready='true';
  ro=new ResizeObserver(resize);ro.observe(canvas);resize();draw();settle();
 }catch(e){fallback(e);}
}
const started=Date.now();(function wait(){if(closed)return;if(C()?.enabled&&A()?.lands&&window.topojson&&window.d3){boot();return;}if(Date.now()-started<20000)setTimeout(wait,100);})();
})();
