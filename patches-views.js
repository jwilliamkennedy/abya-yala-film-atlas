/* patches-views.js: Time dial and view refinements (formerly four files, in this order).
   Each section is one former file, run in its own scope, in the original order; an error in one section is
   reported and the next still runs, as with separate files. Edit the section; there is no other copy. */

/* ==== time-dial.js ==== */
try{(function(){
/* Time dial (2026-11-11). Map page only.
   Drag the dial and each land lights up from the year of the earliest dated film by a filmmaker linked to it.
   Uses the atlas's own records: Atlas.lands, Atlas.landLinks(land) and each film's year. Films with no year
   recorded are left out of the dial and counted in its note. ?dial=1993 opens the map with the dial at that year. */
(function(){
 'use strict';
 var START=1960,STEP_MS=230,A,first={},landCount=0,years=[],undated=0,maxY=0,on=false,year=0,timer=null,raf=0,bar,toggle;
 var $=function(s,r){return (r||document).querySelector(s);};
 function yearOf(f){var n=parseInt(f&&f.year,10);return n>1800&&n<2100?n:0;}
 function build(){
  var seen={};
  A.allRecords().forEach(function(r){r.films.forEach(function(f){if(seen[f.id])return;seen[f.id]=1;var y=yearOf(f);if(y){years.push(y);if(y>maxY)maxY=y;}else undated++;});});
  years.sort(function(a,b){return a-b;});
  (A.lands||[]).forEach(function(l){
   var min=0;(A.landLinks(l)||[]).forEach(function(e){var r=A.recordById(e.record);if(!r)return;r.films.forEach(function(f){var y=yearOf(f);if(y&&(!min||y<min))min=y;});});
   if(min){first[l.id]=min;landCount++;}
  });
 }
 function filmsBy(y){var lo=0,hi=years.length;while(lo<hi){var m=(lo+hi)>>1;if(years[m]<=y)lo=m+1;else hi=m;}return lo;}
 function state(id){var y=first[id];return !y?'none':y>year?'dark':(year-y<=2?'new':'lit');}
 function paint(){
  raf=0;if(!on)return;
  document.querySelectorAll('#atlas .land-word').forEach(function(n){var s=state(n.dataset.connection);if(n.dataset.td!==s)n.dataset.td=s;});
  document.querySelectorAll('#atlas .land-thumb[data-land]').forEach(function(n){var s=state(n.dataset.land);if(n.dataset.td!==s)n.dataset.td=s;});
  document.querySelectorAll('#atlas .nation-wash').forEach(function(n){var s=state(n.dataset.land);if(n.dataset.td!==s)n.dataset.td=s;});
  var lit=0;for(var k in first)if(first[k]<=year)lit++;
  $('#td-year').textContent=year<=START?'Before '+(START+1):String(year);
  $('#td-count').textContent=filmsBy(year).toLocaleString()+' films · '+lit+' of '+landCount+' lands';
  var r=$('#td-range');if(+r.value!==year)r.value=year;r.setAttribute('aria-valuetext',$('#td-year').textContent+', '+$('#td-count').textContent);
 }
 function queue(){if(!raf)raf=requestAnimationFrame(paint);}
 function set(y){year=Math.max(START,Math.min(maxY,Math.round(y)));queue();}
 function stop(){clearInterval(timer);timer=null;var b=$('#td-play');if(b){b.textContent='Play';b.setAttribute('aria-pressed','false');}}
 function play(){
  if(timer){stop();return;}
  if(year>=maxY)set(START);
  var slow=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#td-play').textContent='Pause';$('#td-play').setAttribute('aria-pressed','true');
  timer=setInterval(function(){if(year>=maxY){stop();return;}set(year+(slow?5:1));},slow?700:STEP_MS);
 }
 function open(y){
  if(document.body.classList.contains('is-constellating'))return;
  on=true;document.body.classList.add('time-dial-on');bar.hidden=false;toggle.setAttribute('aria-pressed','true');set(y||maxY);
 }
 function close(){
  on=false;stop();document.body.classList.remove('time-dial-on');bar.hidden=true;toggle.setAttribute('aria-pressed','false');
  document.querySelectorAll('#atlas [data-td]').forEach(function(n){delete n.dataset.td;});
 }
 function ui(){
  var panel=$('.map-panel'),tools=$('.map-toolbar',panel);if(!panel||!tools||$('#td-bar'))return false;
  toggle=document.createElement('button');toggle.type='button';toggle.id='td-toggle';toggle.textContent='Time';toggle.setAttribute('aria-pressed','false');
  toggle.title='See when each land’s first film appears';($('.map-actions',tools)||tools).appendChild(toggle);
  bar=document.createElement('section');bar.id='td-bar';bar.hidden=true;bar.setAttribute('aria-label','Time dial');
  bar.innerHTML='<button type="button" id="td-play" aria-pressed="false">Play</button>'+
   '<div class="td-read"><strong id="td-year"></strong><small id="td-count" aria-live="polite"></small></div>'+
   '<div class="td-track"><span>'+START+'</span><input id="td-range" type="range" min="'+START+'" max="'+maxY+'" step="1" aria-label="Year"><span>'+maxY+'</span></div>'+
   '<button type="button" id="td-close" aria-label="Close the time dial">Close</button>'+
   '<p class="td-note">A land lights up in the year of the earliest dated film by a filmmaker linked to it. '+undated.toLocaleString()+' films have no year recorded yet and are not counted.</p>';
  panel.appendChild(bar);
  toggle.onclick=function(){on?close():open(START),on&&play();};
  $('#td-range').oninput=function(e){stop();set(+e.target.value);};
  $('#td-play').onclick=play;$('#td-close').onclick=close;
  new MutationObserver(function(){if(on)queue();}).observe($('#atlas'),{childList:true,subtree:true});
  new MutationObserver(function(){if(on&&document.body.classList.contains('is-constellating'))close();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',function(e){if(on&&e.key==='Escape'&&!e.defaultPrevented)close();});
  return true;
 }
 function start(){
  A=window.Atlas;if(!A||!A.ready||!$('.map-panel'))return;
  A.ready.then(function(){
   build();if(!years.length||!landCount)return;
   var n=0;(function wait(){if(ui()){var q=parseInt(new URLSearchParams(location.search).get('dial'),10);if(q)open(q);return;}if(++n<40)setTimeout(wait,250);})();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 window.AtlasTimeDial={open:open,close:close,set:set,firstYears:first};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== vision69.js ==== */
try{(function(){
'use strict';
window.ATLAS_ON_MAP=window.ATLAS_ON_MAP||new Set(['Map Ready']);
(async()=>{
 const A=window.Atlas;if(!A)return;await A.ready;
 const $=s=>document.querySelector(s),map=$('.map-panel'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 $('#search-shortcut-hint').after($('#maker-browser'));
 const browse=document.createElement('button');browse.id='atlas-browse';browse.textContent='A–Z';browse.title='Browse filmmakers A–Z';browse.setAttribute('aria-controls','index');browse.onclick=()=>A.browseMakers();$('.atlas-utilities').prepend(browse);
 const peek=document.createElement('section');peek.id='film-peek69';peek.hidden=true;peek.setAttribute('aria-label','Film preview');map.append(peek);
 const layer=document.createElement('div');layer.id='zoom-films69';layer.setAttribute('aria-label','Films in this map view');map.append(layer);
 let hoverTimer,leaveTimer,updateTimer,pinned=false,current=null;
 const safeImage=raw=>{if(!raw)return '';try{const u=new URL(raw,location.href);return u.protocol==='https:'||u.origin===location.origin?u.href:'';}catch{return '';}};
 function filmForLand(id,used=new Set()){
  const l=A.landById(id);if(!l)return null;const seen=new Set();
  for(const e of A.landLinks(l)){const r=A.recordById(e.record);if(!r||!A.recordPasses(r)||(A.state.scope!=='all'&&!window.ATLAS_ON_MAP.has(r.status)))continue;for(const f of r.films){const key=window.AtlasArtwork.workKey(f);if(seen.has(key)||!A.filmPasses(f))continue;seen.add(key);const m=A.mediaForFilm(f),src=safeImage(m?.image);if(src&&m?.sourceURL&&!used.has(src))return {r,f,m,src,land:l};}}
  return null;
 }
 function hide(){clearTimeout(hoverTimer);clearTimeout(leaveTimer);peek.hidden=true;pinned=false;current=null;}
 function scheduleHide(){clearTimeout(leaveTimer);if(!pinned)leaveTimer=setTimeout(hide,220);}
 function openFilm(item){pinned=true;A.openProfileFilm(item.r.id,item.f.id);}
 function show(item,anchor={}){
  if(!item)return;current=item;const b=map.getBoundingClientRect(),width=Math.min(252,b.width-24),x=anchor.x??b.width/2,y=anchor.y??b.height/2;
  peek.style.width=width+'px';peek.style.left=Math.max(12,Math.min(b.width-width-12,x+20))+'px';peek.style.top=Math.max(98,Math.min(b.height-295,y-80))+'px';
  peek.innerHTML=`<button class="peek-close69" aria-label="Close film preview">×</button><button class="peek-film69"><span class="peek-image69"><img src="${esc(item.src)}" alt="Publicity image for ${esc(item.f.title)}"><span hidden>Image unavailable</span></span><strong>${esc(item.f.title)}</strong><small>${esc(item.r.name)}${item.f.year?' · '+esc(item.f.year):''}</small><span class="peek-land69">${esc(A.landDisplayName(item.land))}</span></button>`;
  peek.querySelector('.peek-close69').onclick=hide;peek.querySelector('.peek-film69').onclick=()=>openFilm(item);const img=peek.querySelector('img');img.onerror=()=>{img.hidden=true;img.nextElementSibling.hidden=false;};peek.hidden=false;
 }
 function previewLand(id,anchor){if(pinned||A.selectionIsHeld()||window.innerWidth<=680||window.AtlasConstellate?.enabled)return;clearTimeout(hoverTimer);clearTimeout(leaveTimer);hoverTimer=setTimeout(()=>{if(A.selectionIsHeld())return;const item=filmForLand(id);if(item)show(item,anchor);else hide();},160);}
 function update(){
  clearTimeout(updateTimer);layer.replaceChildren();const k=A.captureState().zoom;document.body.dataset.mapDetail=k>=3?'films':'lands';
  if(k<3||A.selectionIsHeld()||window.AtlasConstellate?.enabled)return;
  const b=map.getBoundingClientRect(),used=new Set(),boxes=[],labelBoxes=[...document.querySelectorAll('#atlas .land-word')].map(n=>n.__data__).filter(Boolean).map(p=>({x:p.x-p.labelWidth/2-8,y:p.y-p.voice.map*(p.lines.length-.15)-6,w:p.labelWidth+16,h:p.voice.map*(p.lines.length+.25)+12})),nodes=[...document.querySelectorAll('#atlas .land-word,#atlas .land-reference-bubble')].filter(n=>n.__data__?.voice.count>0).sort((a,b)=>b.__data__.voice.count-a.__data__.voice.count);
  for(const n of nodes){if(boxes.length>=2)break;const raw=n.__data__,p=n.dataset.landBubble?{...raw,x:raw.anchorX,y:raw.anchorY}:raw;if(!p)continue;const item=filmForLand(n.dataset.connection||n.dataset.landBubble,used);if(!item)continue;const width=window.innerWidth<=680?128:156,height=window.innerWidth<=680?110:126,places=[[p.x-width/2,p.y+16],[p.x+p.labelWidth/2+14,p.y-height/2],[p.x-p.labelWidth/2-width-14,p.y-height/2],[p.x-width/2,p.y-height-p.voice.map-16]],position=places.find(([x,y])=>x>=12&&x+width<=b.width-12&&y>=120&&y+height<=b.height-90&&!labelBoxes.some(q=>x<q.x+q.w&&x+width>q.x&&y<q.y+q.h&&y+height>q.y)&&!boxes.some(q=>x<q.x+width+12&&x+width+12>q.x&&y<q.y+height&&y+height>q.y));if(!position)continue;const[x,y]=position;
   const button=document.createElement('button');button.className='zoom-film69';button.dataset.film=item.f.id;button.dataset.maker=item.r.id;button.dataset.land=item.land.id;button.style.cssText=`left:${x}px;top:${y}px;width:${width}px`;button.innerHTML=`<img src="${esc(item.src)}" alt=""><strong>${esc(item.f.title)}</strong><small>${esc(item.r.name)}</small>`;button.setAttribute('aria-label','Open '+item.f.title+' by '+item.r.name+' · '+A.landDisplayName(item.land));button.title=A.landDisplayName(item.land)+' · '+item.f.title+' · '+item.r.name;button.onclick=()=>openFilm(item);button.onpointerenter=e=>{if(e.pointerType!=='touch')previewLand(item.land.id,{x:x+width,y});};button.onpointerleave=scheduleHide;button.querySelector('img').onerror=()=>button.remove();const leader=document.createElementNS('http://www.w3.org/2000/svg','svg');leader.setAttribute('class','zoom-leader69');leader.setAttribute('viewBox',`0 0 ${b.width} ${b.height}`);leader.setAttribute('aria-hidden','true');const line=document.createElementNS(leader.namespaceURI,'path');line.setAttribute('d',`M${p.x},${p.y+3} L${x+width/2},${y}`);leader.append(line);layer.prepend(leader);layer.append(button);boxes.push({x,y});used.add(item.src);
  }
 }
 peek.onpointerenter=()=>clearTimeout(leaveTimer);peek.onpointerleave=scheduleHide;peek.addEventListener('focusin',()=>clearTimeout(leaveTimer));peek.addEventListener('focusout',e=>{if(!peek.contains(e.relatedTarget))scheduleHide();});
 document.addEventListener('pointerdown',e=>{if(!peek.hidden&&!peek.contains(e.target))hide();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!peek.hidden){hide();e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('atlas-camera-frame',()=>{hide();layer.replaceChildren();});window.addEventListener('atlas-camera-change',()=>{clearTimeout(updateTimer);updateTimer=setTimeout(update,80);});window.addEventListener('resize',()=>{hide();update();});
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(A.selectionIsHeld())hide();update();});}).observe($('#index-list'),{childList:true});
 window.AtlasVision69={previewLand,scheduleHide,hide,update,filmForLand};update();
})().catch(e=>console.error('Map film previews could not initialize',e));

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== ledger71.js ==== */
try{(function(){
'use strict';
// Beta 79: a quiet ledger of totals in the header, and breathing film posters beside the land names.
(async()=>{
 const A=window.Atlas;if(!A||!A.ready)return;await A.ready;
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const fmt=n=>n.toLocaleString('en-US');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');

 // Ledger: distinct films (co-directed works counted once), filmmakers and collectives, countries.
 const R=A.allRecords(),works=new Set(),peoples=new Set();
 for(const r of R){if(window.ATLAS_ON_MAP.has(r.status))try{for(const e of A.recordLandReferences(r.id))if(e.mapped)peoples.add(e.id);}catch{}for(const f of r.films||[]){const t=norm(f.title).split(' = ')[0];if(t)works.add(t+'|'+(f.year||''));}}
 // 2026-11-09: the film total is the Films list's own count (one row per work, co-directed films once).
 let filmTotal=works.size;try{const W=window.AtlasArtwork;if(W&&W.groupCredits)filmTotal=W.groupCredits(R.flatMap(r=>(r.films||[]).map(f=>({r,f}))),null,null).length;}catch{}
 const nav=document.querySelector('header nav.primary');
 if(nav&&!document.querySelector('.atlas-ledger')){
  nav.insertAdjacentHTML('afterend',`<p class="atlas-ledger" aria-label="${fmt(filmTotal)} films by ${fmt(R.length)} filmmakers and collectives"><span><b>${fmt(filmTotal)}</b> films</span><span><b>${fmt(R.length)}</b> filmmakers</span></p>`);
 }

 // Posters: each land with linked filmmakers shows one of their film images, chosen at random.
 const pick=new Map(),pools=new Map(),dark=new Set();
 // Same-origin images can be checked: skip near-black crops so every land shows a legible picture.
 function checkDark(src,cb){try{if(new URL(src,location.href).origin!==location.origin)return;const i=new Image();i.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=12;const ctx=c.getContext('2d'),w=i.naturalWidth,h=i.naturalHeight,m=Math.min(w,h);ctx.drawImage(i,(w-m)/2,(h-m)/2,m,m,0,0,12,12);const d=ctx.getImageData(0,0,12,12).data;let sum=0;for(let k=0;k<d.length;k+=4)sum+=.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];if(sum/(d.length/4)<34)cb();}catch{}};i.src=src;}catch{}}
 function poolFor(id){
  if(pools.has(id))return pools.get(id);const pool=[];
  try{const l=A.landById(id),edges=l?A.landLinks(l):[],seenSrc=new Set();
   for(const e of edges){const r=A.recordById(e.record);if(!r)continue;for(const f of r.films||[]){const m=A.mediaForFilm(f);if(m&&m.image&&!seenSrc.has(m.image)){seenSrc.add(m.image);pool.push({src:m.image,title:f.title,maker:r.name});}}}}catch{}
  pools.set(id,pool);return pool;
 }
 const usable=id=>poolFor(id).filter(c=>!dark.has(c.src));
 function repick(id,avoid){const p=usable(id),q=p.length>1&&avoid?p.filter(c=>c.src!==avoid):p;const c=q.length?q[Math.floor(Math.random()*q.length)]:null;pick.set(id,c);return c;}
 // Each visit shows a different film from the last visit wherever a land has more than one.
 let last={};try{last=JSON.parse(localStorage.getItem('atlas-last-posters')||'{}')||{};}catch{}
 const remember=()=>{try{const o={};for(const [k,v] of pick)if(v)o[k]=v.src;localStorage.setItem('atlas-last-posters',JSON.stringify(o));}catch{}};
 addEventListener('pagehide',remember);document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();});
 const imageFor=id=>pick.has(id)&&pick.get(id)&&!dark.has(pick.get(id).src)?pick.get(id):repick(id,pick.has(id)?undefined:last[id]);

 const NS='http://www.w3.org/2000/svg';
 // Duotone at rest (deep indigo to warm cream), full colour when you engage with the land.
 function ensureDefs(svg){if(svg.querySelector('#land-thumb-clip'))return;const defs=svg.querySelector('defs')||svg.insertBefore(document.createElementNS(NS,'defs'),svg.firstChild);
  defs.insertAdjacentHTML('beforeend','<clipPath id="land-thumb-clip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath><radialGradient id="land-thumb-glow"><stop offset="55%" stop-color="#f3dfa6" stop-opacity=".38"/><stop offset="100%" stop-color="#f3dfa6" stop-opacity="0"/></radialGradient><filter id="land-duotone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues=".09 .96"/><feFuncG type="table" tableValues=".11 .89"/><feFuncB type="table" tableValues=".2 .72"/></feComponentTransfer></filter>');}
 const tf=g=>{const m=(g.getAttribute('transform')||'').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)/);return m?[+m[1],+m[2]]:[0,0];};
 const wordFor=id=>[...document.querySelectorAll('g.land-word')].find(w=>w.__data__?.id===id);
 function setImage(t,c){const small=String(c.src||'').replace('assets/film-images/','assets/film-thumbs/');t.querySelectorAll('image').forEach(i=>{if(i.getAttribute('href')!==small)i.setAttribute('href',small);});t.querySelector('title').textContent=c.title+' · '+c.maker;t.dataset.src=c.src;}

 function decorate(){
  const k=zoomK(),placed=[],seen=new Set();
  const words=[...document.querySelectorAll('g.land-word')];if(!words.length)return;
  // One layer beneath all land names: names always stay readable.
  const parent=words[0].parentNode;let layer=parent.querySelector(':scope > g#land-thumb-layer');
  if(!layer){ensureDefs(parent.ownerSVGElement);layer=document.createElementNS(NS,'g');layer.id='land-thumb-layer';}
  if(parent.firstChild!==layer)parent.insertBefore(layer,parent.firstChild);
  // Overview shows only the lands with the most filmmakers; more appear as you zoom in.
  const eligible=words.filter(g=>{const d=g.__data__;if(!d?.id||+(g.style.opacity||1)<.35||!usable(d.id).length)return false;const map=d.voice?.map||12,count=d.voice?.count||0;
   return k<1.35?true:k<2.2?(count>=2||map>=18):count>=1;}).sort((a,b)=>(b.__data__.voice?.count||0)-(a.__data__.voice?.count||0));
  const shown=k<1.35?eligible.slice(0,6):eligible;
  // One size for every circle at a given zoom.
  const size=Math.round(Math.min(64,34*Math.pow(Math.max(1,k),.4)));
  const hit=box=>placed.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y);
  for(const g of shown){
   const d=g.__data__,[gx,gy]=tf(g);let x,y;
   // Always to the left of the name, centred on it.
   try{const bb=g.querySelector('.land-word-label').getBBox(),dot=g.querySelector('.land-reference-dot'),left=Math.min(bb.x,dot?+dot.getAttribute('cx')-4:bb.x);x=left-8-size;y=bb.y+bb.height/2-size/2;}catch{continue;}
   const box={x:gx+x-2,y:gy+y-2,w:size+4,h:size+4};if(hit(box))continue;placed.push(box);
   const c=imageFor(d.id);if(!c)continue;
   seen.add(d.id);
   let t=layer.querySelector(`g.land-thumb[data-land="${CSS.escape(d.id)}"]`);
   if(!t){t=document.createElementNS(NS,'g');t.setAttribute('class','land-thumb');t.dataset.land=d.id;t.setAttribute('role','presentation');
    t.innerHTML=`<circle class="land-thumb-halo" fill="url(#land-thumb-glow)"/><image class="duo" preserveAspectRatio="xMidYMid slice" clip-path="url(#land-thumb-clip)" filter="url(#land-duotone)"/><image class="color" preserveAspectRatio="xMidYMid slice" clip-path="url(#land-thumb-clip)"/><circle class="land-thumb-ring"/><title></title>`;
    layer.appendChild(t);
    t.addEventListener('click',e=>{e.stopPropagation();wordFor(t.dataset.land)?.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    t.addEventListener('pointerenter',()=>{t.classList.add('awake');wordFor(t.dataset.land)?.dispatchEvent(new PointerEvent('pointerenter'));});
    t.addEventListener('pointerleave',()=>{t.classList.remove('awake');wordFor(t.dataset.land)?.dispatchEvent(new PointerEvent('pointerleave'));});
    const id=d.id,duo=t.querySelector('image.duo');
    duo.addEventListener('error',()=>{dark.add(duo.getAttribute('href'));const n=repick(id);if(n)setImage(t,n);else t.remove();});
    duo.addEventListener('load',()=>{const src=duo.getAttribute('href');checkDark(src,()=>{dark.add(src);const n=repick(id);if(n)setImage(t,n);});});
   }
   if(t.dataset.src!==c.src)setImage(t,c);
   // the land name wakes its poster too
   if(!g.dataset.thumbWired){g.dataset.thumbWired='1';g.addEventListener('pointerenter',()=>layer.querySelector(`g.land-thumb[data-land="${CSS.escape(g.__data__?.id||'')}"]`)?.classList.add('awake'));g.addEventListener('pointerleave',()=>layer.querySelector(`g.land-thumb[data-land="${CSS.escape(g.__data__?.id||'')}"]`)?.classList.remove('awake'));}
   const ax=gx+x,ay=gy+y,cx=ax+size/2,cy=ay+size/2;
   t.querySelectorAll('image').forEach(i=>{i.setAttribute('x',ax);i.setAttribute('y',ay);i.setAttribute('width',size);i.setAttribute('height',size);});
   const halo=t.querySelector('.land-thumb-halo');halo.setAttribute('cx',cx);halo.setAttribute('cy',cy);halo.setAttribute('r',size*.74);
   const ring=t.querySelector('.land-thumb-ring');ring.setAttribute('cx',cx);ring.setAttribute('cy',cy);ring.setAttribute('r',size/2);
   t.classList.toggle('selected',g.classList.contains('selected'));
  }
  layer.querySelectorAll('g.land-thumb').forEach(t=>{if(!seen.has(t.dataset.land))t.remove();});
 }

 // Breathing: every few seconds one poster softly crossfades to another film from the same land.
 let breathing=null;
 function breathe(){
  if(motion.matches||document.hidden)return;
  const ts=[...document.querySelectorAll('#land-thumb-layer g.land-thumb:not(.awake):not(.fading)')].filter(t=>usable(t.dataset.land).length>1);
  if(!ts.length)return;const t=ts[Math.floor(Math.random()*ts.length)],next=repick(t.dataset.land,t.dataset.src);if(!next)return;
  t.classList.add('fading');setTimeout(()=>{setImage(t,next);requestAnimationFrame(()=>t.classList.remove('fading'));},900);
 }
 function startBreathing(){clearInterval(breathing);if(!motion.matches)breathing=setInterval(breathe,3400);}
 motion.addEventListener?.('change',startBreathing);startBreathing();

 function zoomK(){try{return A.captureState().zoom||1;}catch{return 1;}}
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});};
 const host=document.querySelector('#atlas')||document.querySelector('.map-panel');
 if(host)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('land-thumb')&&n.id!=='land-thumb-layer'&&!n.closest?.('#land-thumb-layer')))||muts.some(m=>m.type==='attributes'&&m.target.classList?.contains('land-word')))schedule();}).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['transform','class']});
 decorate();
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== clean86.js ==== */
try{(function(){
'use strict';
// Beta 86: About in the header, a featured card that never covers the map controls, and a quieter selection panel.
(async()=>{
 const A=window.Atlas;if(!A||!A.ready)return;await A.ready;
 // About sits with the main sections, after Constellate.
 const nav=document.querySelector('header nav.primary');
 if(nav&&!nav.querySelector('.about-link')){const c=nav.querySelector('.constellate-link');const a=document.createElement('a');a.href='about.html';a.className='about-link';a.textContent='About';(c||nav.lastElementChild).after(a);}
 // The featured weave card rests just above the zoom and Surprise controls.
 function place(){const card=document.querySelector('#featured-weave'),zoom=document.querySelector('.map-panel .zoom'),panel=document.querySelector('.map-panel');if(!card||!zoom||!panel||card.hidden)return;const p=panel.getBoundingClientRect(),z=zoom.getBoundingClientRect();if(!z.height)return;card.style.bottom=Math.max(12,Math.round(p.bottom-z.top+10))+'px';card.style.left=Math.max(12,Math.round(z.left-p.left))+'px';}
 addEventListener('resize',place);new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']});addEventListener('hashchange',()=>requestAnimationFrame(place));place();setTimeout(place,600);
 // A pager reading "1 / 1" has nowhere to go.
 function pagers(){for(const n of document.querySelectorAll('#index .profile-pager')){const bs=[...n.querySelectorAll('button')],counter=[...n.querySelectorAll('*')].find(e=>!e.children.length&&/^\s*\d+\s*\/\s*\d+\s*$/.test(e.textContent));n.classList.toggle('is-single',(bs.length&&bs.every(b=>b.disabled))||(!!counter&&/^\s*1\s*\/\s*1\s*$/.test(counter.textContent)));}
  // While a selection is held, the trail above already leads back; hide the extra back links.
  for(const el of document.querySelectorAll('#index .index-header button,#index .index-header a,#index .index-command-bar>button,#index .index-command-bar>a'))el.classList.toggle('trail-duplicate',/^←\s*(Land index|Back to )/.test(el.textContent.trim()));}
 const list=document.querySelector('#index');if(list)new MutationObserver(pagers).observe(list,{childList:true,subtree:true});pagers();
})();
// Constellate notices fade after a few seconds instead of sitting over the map controls.
(function fade(){const n=document.querySelector('#weave-notice');if(!n)return setTimeout(fade,800);let t=null;new MutationObserver(()=>{if(n.hidden||!n.textContent)return;clearTimeout(t);t=setTimeout(()=>{n.hidden=true;},4500);}).observe(n,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});})();
// Floating film boxes close when you click away from them or press Escape.
(function dismiss(){
 const map=document.querySelector('.map-panel'),dock=document.querySelector('#map-films'),peek=document.querySelector('#film-peek69');
 if(!map||!dock)return setTimeout(dismiss,800);
 const closePeek=()=>{const p=document.querySelector('#film-peek69');if(p&&!p.hidden)p.querySelector('.peek-close69')?.click();};
 const closeDock=()=>{if(!dock.hidden)dock.classList.add('is-dismissed');};
 // a new selection brings the films panel back
 new MutationObserver(()=>dock.classList.remove('is-dismissed')).observe(dock,{attributes:true,attributeFilter:['data-stamp']});
 document.addEventListener('pointerdown',e=>{const t=e.target;
  if(!t.closest('#film-peek69'))closePeek();
  if(!t.closest('.map-panel')||t.closest('#map-films,g.land-word,g.land-thumb,.zoom,#featured-weave,button,a,details,[role="button"],.map-marker,circle[class*="marker"]'))return;
  closeDock();},true);
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||document.body.classList.contains('is-theme-weaving'))return;closePeek();closeDock();});
})();
// Clearer map tool names, and S opens a surprise.
(function names(){const c=document.querySelector('#country-drawer>summary'),w=document.querySelector('#world');if(!c||!w)return setTimeout(names,800);
 for(const n of c.childNodes)if(n.nodeType===3&&/Country totals/.test(n.textContent))n.textContent=n.textContent.replace('Country totals','Countries');
 const fix=()=>{if(/^World$/.test(w.textContent.trim()))w.textContent='Whole world';};fix();new MutationObserver(fix).observe(w,{childList:true,characterData:true,subtree:true});})();
document.addEventListener('keydown',e=>{if(e.key!=='s'&&e.key!=='S')return;if(e.metaKey||e.ctrlKey||e.altKey)return;const t=e.target;if(t.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(document.body.classList.contains('is-theme-weaving'))return;const b=document.querySelector('#random-entry');if(b&&!b.disabled){e.preventDefault();b.click();}});
// Map tool menus (Countries, Layers, Map key) close when you click elsewhere.
document.addEventListener('pointerdown',e=>{for(const d of document.querySelectorAll('.map-actions details[open]'))if(!d.contains(e.target))d.open=false;},true);
// The weave player shows its place as a row of small stars.
(function dots(){const prog=document.querySelector('#weave-play-progress');if(!prog)return setTimeout(dots,800);
 const row=document.createElement('span');row.className='weave-dots';row.setAttribute('aria-hidden','true');prog.after(row);
 const draw=()=>{const m=prog.textContent.match(/(\d+)\s*\/\s*(\d+)/);if(!m){row.innerHTML='';return;}const i=+m[1],n=Math.min(+m[2],24);row.innerHTML=Array.from({length:n},(_,k)=>`<i class="${k+1===i?'on':k+1<i?'past':''}"></i>`).join('');};
 new MutationObserver(draw).observe(prog,{childList:true,characterData:true,subtree:true});draw();})();
// Every filmmaker and film card ends with a way to suggest a correction.
(function fixLinks(){const list=document.querySelector('#index');if(!list)return setTimeout(fixLinks,800);
 const add=()=>{if(document.querySelector('#selection-summary .sel-links'))return;for(const d of document.querySelectorAll('#index .entry-detail.maker-dossier,#index .entry-detail.film-dossier')){if(d.querySelector('.suggest-fix'))continue;const art=d.closest('article');const title=d.querySelector('.film-dossier-title')?.textContent||art?.querySelector('h2,h3,strong')?.textContent||'';const rec=(d.parentElement?.id||'').replace(/^entry-detail-/,'');const u=new URL('corrections.html',location.href);u.searchParams.set('about',title.trim());u.searchParams.set('record',decodeURIComponent(rec));u.searchParams.set('page',location.href.split('#')[0]+location.hash);const a=document.createElement('a');a.className='suggest-fix';a.href=u.pathname.split('/').pop()+u.search;a.textContent='Suggest a correction →';d.append(a);}};
 new MutationObserver(add).observe(list,{childList:true,subtree:true});add();})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== index-panel.js (2026-11-15) ==== */
try{(function(){
'use strict';
// Drag the index panel's left edge to make it wider or narrower (desktop). The width is remembered in this browser;
// double-click the edge to reset. Arrow keys move it too, when the edge has focus.
const KEY='atlas-index-width', MIN=320, root=document.documentElement;
const main=document.querySelector('body.atlas-page main'), index=document.getElementById('index');
if(main&&index&&!main.querySelector('.index-resizer')){
  const max=()=>Math.max(MIN,Math.min(900,Math.round(innerWidth*0.7)));
  const h=document.createElement('div');
  const set=w=>{w=Math.round(Math.max(MIN,Math.min(max(),w)));root.style.setProperty('--index-w',w+'px');h.setAttribute('aria-valuenow',String(w));return w;};
  const save=w=>{try{localStorage.setItem(KEY,String(Math.round(w)));}catch(e){}};
  const relayout=()=>window.dispatchEvent(new Event('resize'));
  h.className='index-resizer'; h.tabIndex=0; h.title='Drag to resize · double-click to reset';
  h.setAttribute('role','separator'); h.setAttribute('aria-orientation','vertical'); h.setAttribute('aria-valuemin',String(MIN));
  h.setAttribute('aria-label','Resize the index panel');
  main.appendChild(h);
  h.setAttribute('aria-valuemax',String(max()));h.setAttribute('aria-valuenow',String(Math.round(index.getBoundingClientRect().width)||440));
  try{const w=+localStorage.getItem(KEY); if(w) set(w);}catch(e){}
  let id=null,x0=0,w0=0;
  h.addEventListener('pointerdown',e=>{if(e.button!==0)return;id=e.pointerId;h.setPointerCapture(id);x0=e.clientX;w0=index.getBoundingClientRect().width;h.classList.add('dragging');root.classList.add('index-resizing');e.preventDefault();});
  h.addEventListener('pointermove',e=>{if(id===e.pointerId)set(w0+(x0-e.clientX));});
  const end=()=>{if(id===null)return;id=null;h.classList.remove('dragging');root.classList.remove('index-resizing');save(index.getBoundingClientRect().width);relayout();};
  h.addEventListener('pointerup',end); h.addEventListener('pointercancel',end);
  h.addEventListener('dblclick',()=>{root.style.removeProperty('--index-w');try{localStorage.removeItem(KEY);}catch(e){}relayout();});
  h.addEventListener('keydown',e=>{const step=e.shiftKey?80:24,w=index.getBoundingClientRect().width;
    if(e.key==='ArrowLeft')save(set(w+step));else if(e.key==='ArrowRight')save(set(w-step));else return;e.preventDefault();relayout();});
  addEventListener('resize',()=>{const v=parseInt(root.style.getPropertyValue('--index-w'),10);if(v&&v>max())set(max());});
}
// A film list that fits on one page needs no A–Z letters or pager (unless a letter is the reason it is short).
const tidy=()=>{const s=document.getElementById('film-browser'),pg=document.getElementById('films-page-select');if(!s||!pg)return;
  const lettered=[...s.querySelectorAll('[data-film-letter]')].some(b=>b.getAttribute('aria-pressed')==='true'&&b.dataset.filmLetter!=='');
  s.classList.toggle('single-page',pg.options.length<=1&&!lettered);};
if(index){new MutationObserver(tidy).observe(index,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']});tidy();}
}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== pinch-zoom.js (2026-11-15) ==== */
try{(function(){
'use strict';
// Pinch to zoom the map everywhere on the map panel, never the page.
// · Chrome/Firefox/Edge send a trackpad pinch as ctrl+wheel: over the map's own controls and cards it used to
//   zoom the whole page; it is now handed to the map.
// · Safari (Mac trackpad, and iPhone/iPad when the pinch starts on a control) sends gesture events instead of
//   ctrl+wheel: they used to zoom the page; they now zoom the map about the pinch centre.
// Touch pinches that start on the map itself are already handled by the map (d3) and are left alone.
const panel=document.querySelector('.map-panel'),atlas=document.getElementById('atlas');
if(!panel||!atlas)return;
const forward=(x,y,deltaY)=>atlas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:x,clientY:y,deltaY,deltaMode:0,ctrlKey:true}));
panel.addEventListener('wheel',e=>{
  if(!e.ctrlKey||atlas.contains(e.target)||!e.isTrusted)return;
  e.preventDefault();e.stopImmediatePropagation();forward(e.clientX,e.clientY,e.deltaY);
},{passive:false,capture:true});
let touches=0,last=1;
document.addEventListener('touchstart',e=>{touches=e.touches.length;},{capture:true,passive:true});
document.addEventListener('touchend',e=>{touches=e.touches.length;},{capture:true,passive:true});
document.addEventListener('touchcancel',e=>{touches=e.touches.length;},{capture:true,passive:true});
const inPanel=e=>panel.contains(e.target);
const handledByMap=()=>touches>=2;// touch pinches: the map's own handler, or the relay below
// A two-finger pinch that starts on a control or card over the map (outside the map's own surface) is relayed to the map.
const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);let relay=null;
panel.addEventListener('touchstart',e=>{if(e.touches.length===2&&!atlas.contains(e.target)){relay={d:dist(e.touches[0],e.touches[1])};}},{passive:true});
panel.addEventListener('touchmove',e=>{if(!relay||e.touches.length!==2)return;e.preventDefault();
  const [a,b]=e.touches,d=dist(a,b),ratio=d/(relay.d||d);relay.d=d;if(!isFinite(ratio)||ratio<=0||Math.abs(ratio-1)<.002)return;
  forward((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2,-Math.log2(ratio)/.018);},{passive:false});
const relayEnd=e=>{if(e.touches.length<2)relay=null;};
panel.addEventListener('touchend',relayEnd,{passive:true});panel.addEventListener('touchcancel',relayEnd,{passive:true});
panel.addEventListener('gesturestart',e=>{if(!inPanel(e))return;e.preventDefault();last=e.scale||1;},{passive:false});
panel.addEventListener('gesturechange',e=>{
  if(!inPanel(e))return;e.preventDefault();if(handledByMap(e)){last=e.scale||1;return;}
  const s=e.scale||1,ratio=s/(last||1);last=s;if(!isFinite(ratio)||ratio<=0||Math.abs(ratio-1)<.001)return;
  // the map turns ctrl+wheel into zoom as 2^(-deltaY*0.018): solve for the deltaY that gives this ratio
  const r=atlas.getBoundingClientRect(),x=e.clientX||r.left+r.width/2,y=e.clientY||r.top+r.height/2;
  forward(x,y,-Math.log2(ratio)/.018);
},{passive:false});
panel.addEventListener('gestureend',e=>{if(inPanel(e))e.preventDefault();last=1;},{passive:false});
}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== minimal-pass.js (2026-11-15) ==== */
try{(function(){
'use strict';
// One map toolbar: a Constellations button joins the toolbar and opens the featured-constellation card.
const addProxy=(tries)=>{const actions=document.querySelector('.map-toolbar .map-actions'),weave=document.getElementById('featured-weave');
if(!actions||!weave){if(tries<60)setTimeout(()=>addProxy(tries+1),250);return;}
if(!actions.querySelector('.fw-proxy')){
  const pill=weave.querySelector('.fw-pill');
  const b=document.createElement('button');b.type='button';b.className='fw-proxy';b.innerHTML='<span aria-hidden="true">✦</span> Constellations';
  const sync=()=>b.setAttribute('aria-expanded',String(!weave.classList.contains('is-collapsed')));
  b.addEventListener('click',()=>{(weave.querySelector('.fw-pill')||pill)?.click();setTimeout(sync,50);});
  new MutationObserver(sync).observe(weave,{attributes:true,attributeFilter:['class']});sync();
  actions.appendChild(b);
}};
addProxy(0);
// Index rows: a picture that fails to load leaves no initials box; the picture's film moves into the tooltip.
const index=document.getElementById('index');
if(index){
  index.addEventListener('error',e=>{const t=e.target;if(t.tagName==='IMG'){const th=t.closest('.film-thumb');if(th)th.classList.add('no-art');}},true);
  const tidy=()=>{for(const c of index.querySelectorAll('.entry .maker-thumbnail-caption:not([data-moved])')){c.dataset.moved='1';const btn=c.closest('.entry-button');if(btn&&!btn.title)btn.title=c.textContent.trim();}};
  new MutationObserver(tidy).observe(index,{subtree:true,childList:true});tidy();
}
}).call(window);}catch(e){setTimeout(function(){throw e;});}
