'use strict';
// Beta 79: a quiet ledger of totals in the header, and breathing film posters beside the land names.
(async()=>{
 const A=window.Atlas;if(!A||!A.ready)return;await A.ready;
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const fmt=n=>n.toLocaleString('en-US');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');

 // Ledger: distinct films (co-directed works counted once), filmmakers and collectives, countries.
 const R=A.allRecords(),works=new Set(),countries=new Set();
 for(const r of R){for(const c of r.countryCodes||[r.country])if(c)countries.add(c);for(const f of r.films||[]){const t=norm(f.title).split(' = ')[0];if(t)works.add(t+'|'+(f.year||''));}}
 const nav=document.querySelector('header nav.primary');
 if(nav&&!document.querySelector('.atlas-ledger')){
  nav.insertAdjacentHTML('afterend',`<p class="atlas-ledger" aria-label="${fmt(works.size)} films by ${fmt(R.length)} filmmakers and collectives in ${countries.size} countries and territories"><span><b>${fmt(works.size)}</b> films</span><span><b>${fmt(R.length)}</b> filmmakers</span><span class="ledger-countries"><b>${countries.size}</b> countries</span></p>`);
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
 const imageFor=id=>pick.has(id)&&pick.get(id)&&!dark.has(pick.get(id).src)?pick.get(id):repick(id);

 const NS='http://www.w3.org/2000/svg';
 // Duotone at rest (deep indigo to warm cream), full colour when you engage with the land.
 function ensureDefs(svg){if(svg.querySelector('#land-thumb-clip'))return;const defs=svg.querySelector('defs')||svg.insertBefore(document.createElementNS(NS,'defs'),svg.firstChild);
  defs.insertAdjacentHTML('beforeend','<clipPath id="land-thumb-clip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath><radialGradient id="land-thumb-glow"><stop offset="55%" stop-color="#f3dfa6" stop-opacity=".38"/><stop offset="100%" stop-color="#f3dfa6" stop-opacity="0"/></radialGradient><filter id="land-duotone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues=".09 .96"/><feFuncG type="table" tableValues=".11 .89"/><feFuncB type="table" tableValues=".2 .72"/></feComponentTransfer></filter>');}
 const tf=g=>{const m=(g.getAttribute('transform')||'').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)/);return m?[+m[1],+m[2]]:[0,0];};
 const wordFor=id=>[...document.querySelectorAll('g.land-word')].find(w=>w.__data__?.id===id);
 function setImage(t,c){t.querySelectorAll('image').forEach(i=>{if(i.getAttribute('href')!==c.src)i.setAttribute('href',c.src);});t.querySelector('title').textContent=c.title+' · '+c.maker;t.dataset.src=c.src;}

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
