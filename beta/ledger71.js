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
  document.querySelectorAll('g.land-word').forEach(g=>{
   const d=g.__data__;if(!d||!d.id)return;
   const big=(d.voice&&d.voice.map>=20)||(d.voice&&d.voice.count>=5);
   let t=g.querySelector(':scope > g.land-thumb');
   if(!big){if(t)t.remove();return;}
   const c=imageFor(d.id);if(!c){if(t)t.remove();return;}
   const size=Math.round(Math.min(44,Math.max(30,(d.voice.map||20)*1.35))),lines=(d.lines&&d.lines.length)||1;
   const x=-(d.labelWidth||80)/2-14-size,y=-(d.voice.map||20)*(lines-.15)/2-size/2+2;
   if(!t){ensureClip(g.ownerSVGElement);t=document.createElementNS(NS,'g');t.setAttribute('class','land-thumb');t.setAttribute('aria-hidden','true');
    t.innerHTML=`<circle class="land-thumb-halo"/><image preserveAspectRatio="xMidYMid slice" clip-path="url(#land-thumb-clip)"/><circle class="land-thumb-ring"/><title></title>`;
    g.insertBefore(t,g.firstChild);
    const img=t.querySelector('image');img.addEventListener('error',()=>{dark.add(img.getAttribute('href'));if(!repick(d.id))t.remove();schedule();});img.addEventListener('load',()=>{const src=img.getAttribute('href');checkDark(src,()=>{dark.add(src);if(repick(d.id))schedule();});});}
   const img=t.querySelector('image');if(img.getAttribute('href')!==c.src)img.setAttribute('href',c.src);
   img.setAttribute('x',x);img.setAttribute('y',y);img.setAttribute('width',size);img.setAttribute('height',size);
   const cx=x+size/2,cy=y+size/2;
   const halo=t.querySelector('.land-thumb-halo');halo.setAttribute('cx',cx);halo.setAttribute('cy',cy);halo.setAttribute('r',size*.78);halo.setAttribute('fill','url(#land-thumb-glow)');
   const ring=t.querySelector('.land-thumb-ring');ring.setAttribute('cx',cx);ring.setAttribute('cy',cy);ring.setAttribute('r',size/2);
   t.querySelector('title').textContent=c.title+' · '+c.maker;
  });
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});};
 const host=document.querySelector('#atlas')||document.querySelector('.map-panel');
 if(host)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('land-thumb')&&!n.closest?.('.land-thumb')))||muts.some(m=>m.type==='attributes'&&m.target.classList?.contains('land-word')))schedule();}).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['transform']});
 decorate();
})();
