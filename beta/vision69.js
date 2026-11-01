'use strict';
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
  for(const e of A.landLinks(l)){const r=A.recordById(e.record);if(!r||!A.recordPasses(r)||(A.state.scope!=='all'&&r.status!=='Map Ready'))continue;for(const f of r.films){const key=window.AtlasArtwork.workKey(f);if(seen.has(key)||!A.filmPasses(f))continue;seen.add(key);const m=A.mediaForFilm(f),src=safeImage(m?.image);if(src&&m?.sourceURL&&!used.has(src))return {r,f,m,src,land:l};}}
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
