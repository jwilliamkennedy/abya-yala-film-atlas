'use strict';
// Beta 71: a quiet ledger of totals in the header, and a film image beside each major land name.
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

 // Land images: for every named land with linked filmmakers, choose one film image at random per visit.
 const pick=new Map(),pools=new Map(),dark=new Set();
 // Same-origin images can be checked: skip near-black crops so every land shows a legible picture.
 function checkDark(src,cb){try{if(new URL(src,location.href).origin!==location.origin)return;const i=new Image();i.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=12;const ctx=c.getContext('2d'),w=i.naturalWidth,h=i.naturalHeight,m=Math.min(w,h);ctx.drawImage(i,(w-m)/2,(h-m)/2,m,m,0,0,12,12);const d=ctx.getImageData(0,0,12,12).data;let sum=0;for(let k=0;k<d.length;k+=4)sum+=.2126*d[k]+.7152*d[k+1]+.0722*d[k+2];if(sum/(d.length/4)<34)cb();}catch{}};i.src=src;}catch{}}
 function repick(id){const pool=(pools.get(id)||[]).filter(c=>!dark.has(c.src));const c=pool.length?pool[Math.floor(Math.random()*pool.length)]:null;pick.set(id,c);return c;}
 function imageFor(id){
  if(pick.has(id))return pick.get(id);
  let choice=null;
  try{
   const l=A.landById(id),edges=l?A.landLinks(l):[],pool=[];
   for(const e of edges){const r=A.recordById(e.record);if(!r)continue;for(const f of r.films||[]){const m=A.mediaForFilm(f);if(m&&m.image)pool.push({src:m.image,title:f.title,maker:r.name});}}
   pools.set(id,pool);if(pool.length)choice=pool[Math.floor(Math.random()*pool.length)];
  }catch{}
  pick.set(id,choice);return choice;
 }
 const NS='http://www.w3.org/2000/svg';
 function ensureClip(svg){if(svg.querySelector('#land-thumb-clip'))return;const defs=svg.querySelector('defs')||svg.insertBefore(document.createElementNS(NS,'defs'),svg.firstChild);defs.insertAdjacentHTML('beforeend','<clipPath id="land-thumb-clip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath><radialGradient id="land-thumb-glow"><stop offset="55%" stop-color="#f3dfa6" stop-opacity=".45"/><stop offset="100%" stop-color="#f3dfa6" stop-opacity="0"/></radialGradient>');}
 function decorate(){
  const k=zoomK(),placed=[],seen=new Set();
  const tf=g=>{const m=(g.getAttribute('transform')||'').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)/);return m?[+m[1],+m[2]]:[0,0];};
  const words=[...document.querySelectorAll('g.land-word')];if(!words.length)return;
  // One layer for every circle, drawn beneath all land names: names always stay readable, and no circle has to be hidden.
  const parent=words[0].parentNode;let layer=parent.querySelector(':scope > g#land-thumb-layer');
  if(!layer){ensureClip(parent.ownerSVGElement);layer=document.createElementNS(NS,'g');layer.id='land-thumb-layer';}
  if(parent.firstChild!==layer)parent.insertBefore(layer,parent.firstChild);
  document.querySelectorAll('g.land-word > g.land-thumb').forEach(t=>t.remove());
  const hit=box=>placed.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y);
  for(const g of words){
   const d=g.__data__;if(!d||!d.id)continue;
   const map=d.voice?.map||12,count=d.voice?.count||0,major=map>=20||count>=5;
   // More lands earn a circle as you zoom in: major lands always, then any land with two filmmakers, then every land with a film image.
   if(!(major||(k>=1.6&&(count>=2||map>=18))||(k>=3&&count>=1)))continue;
   const c=imageFor(d.id);if(!c)continue;
   const base=major?Math.min(44,Math.max(30,map*1.35)):Math.min(32,Math.max(24,map*1.25));
   let size=Math.round(Math.min(major?84:58,base*Math.pow(Math.max(1,k),.45)));
   const [gx,gy]=tf(g);let x,y;
   try{const bb=g.querySelector('.land-word-label').getBBox(),dot=g.querySelector('.land-reference-dot'),left=Math.min(bb.x,dot?+dot.getAttribute('cx')-4:bb.x),mid=bb.y+bb.height/2;
    const tries=[];if(size>50)tries.push([size,bb.x+Math.min(bb.width,160)*.18-size/2,bb.y-size-2]);
    tries.push([size,left-6-size,mid-size/2],[size,bb.x+bb.width+6,mid-size/2]);
    const s0=Math.round(base);tries.push([s0,left-6-s0,mid-s0/2],[s0,bb.x+bb.width+6,mid-s0/2]);
    let chosen=null;for(const [sz,tx,ty] of tries){const box={x:gx+tx,y:gy+ty,w:sz,h:sz};if(!hit(box)){chosen=[sz,tx,ty];break;}}
    if(!chosen){const s1=Math.max(20,Math.round(s0*.7));chosen=[s1,left-5-s1,mid-s1/2];}
    [size,x,y]=chosen;placed.push({x:gx+x,y:gy+y,w:size,h:size});
   }catch{continue;}
   seen.add(d.id);
   let t=layer.querySelector(`g.land-thumb[data-land="${CSS.escape(d.id)}"]`);
   if(!t){t=document.createElementNS(NS,'g');t.setAttribute('class','land-thumb');t.dataset.land=d.id;t.setAttribute('role','presentation');
    t.innerHTML=`<circle class="land-thumb-halo"/><image preserveAspectRatio="xMidYMid slice" clip-path="url(#land-thumb-clip)"/><circle class="land-thumb-ring"/><title></title>`;
    layer.appendChild(t);
    t.addEventListener('click',e=>{e.stopPropagation();const w=[...document.querySelectorAll('g.land-word')].find(w=>w.__data__?.id===t.dataset.land);w?.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    t.addEventListener('pointerenter',()=>{const w=[...document.querySelectorAll('g.land-word')].find(w=>w.__data__?.id===t.dataset.land);w?.dispatchEvent(new PointerEvent('pointerenter'));});
    const img=t.querySelector('image');const id=d.id;img.addEventListener('error',()=>{dark.add(img.getAttribute('href'));if(!repick(id))t.remove();schedule();});img.addEventListener('load',()=>{const src=img.getAttribute('href');checkDark(src,()=>{dark.add(src);if(repick(id))schedule();});});}
   const ax=gx+x,ay=gy+y,cx=ax+size/2,cy=ay+size/2,img=t.querySelector('image');
   if(img.getAttribute('href')!==c.src){img.setAttribute('href',c.src);img.style.animation='none';void img.getBoundingClientRect();img.style.animation='';}
   img.setAttribute('x',ax);img.setAttribute('y',ay);img.setAttribute('width',size);img.setAttribute('height',size);
   const halo=t.querySelector('.land-thumb-halo');halo.setAttribute('cx',cx);halo.setAttribute('cy',cy);halo.setAttribute('r',size*.78);halo.setAttribute('fill','url(#land-thumb-glow)');
   const ring=t.querySelector('.land-thumb-ring');ring.setAttribute('cx',cx);ring.setAttribute('cy',cy);ring.setAttribute('r',size/2);
   t.querySelector('title').textContent=c.title+' · '+c.maker;
   t.style.opacity=g.style.opacity||'';
  }
  layer.querySelectorAll('g.land-thumb').forEach(t=>{if(!seen.has(t.dataset.land))t.remove();});
 }
 function zoomK(){try{return A.captureState().zoom||1;}catch{return 1;}}
 // Each new zoom level reshuffles the images, so the map shows different films every time.
 let lastK=zoomK(),settle=null;
 function watchZoom(){const k=zoomK();if(Math.abs(Math.log(k/lastK))<Math.log(1.25))return;clearTimeout(settle);settle=setTimeout(()=>{lastK=zoomK();pick.clear();schedule();},380);}
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;watchZoom();decorate();});};
 const host=document.querySelector('#atlas')||document.querySelector('.map-panel');
 if(host)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('land-thumb')&&n.id!=='land-thumb-layer'&&!n.closest?.('#land-thumb-layer')))||muts.some(m=>m.type==='attributes'&&m.target.classList?.contains('land-word')))schedule();}).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['transform']});
 decorate();
})();
