/* Flourishes (2026-11-15): opening title card, the header mark drawing itself, projector light on the selection.
   Loaded right after <body> on the map page. The head script decides the mode (data-intro / data-mark-draw). */
(()=>{
const root=document.documentElement,still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS='http://www.w3.org/2000/svg';
const MARK='<circle class="i-lens" cx="60" cy="60" r="50" fill="none" stroke-width="5"/><path class="i-meridian" d="M44 16 C66 30 50 46 62 60 C74 74 56 88 66 104" fill="none" stroke-width="6" stroke-linecap="round"/><circle class="i-dot" cx="62" cy="60" r="5.5"/>';

/* 1 + 2. Opening title card (first visit) and the header mark */
function drawHeaderMark(){if(!still)root.dataset.markDraw='1';}
if(root.dataset.intro==='1'){
 try{localStorage.setItem('atlas-intro-seen','1');}catch{}
 const title=(document.querySelector('header .brand-title')?.firstChild?.textContent||'Indigenous Cinema Atlas').trim();
 const sub=(document.querySelector('header .brand-title small')?.textContent||'Abya Yala and Turtle Island').trim();
 const el=document.createElement('div');
 el.id='atlas-intro';el.setAttribute('role','region');el.setAttribute('aria-label',title);
 el.innerHTML=`<div class="intro-inner"><svg class="intro-mark" viewBox="0 0 120 120" aria-hidden="true">${MARK}</svg><p class="intro-title"></p><p class="intro-sub"></p><p class="intro-counts" aria-live="off"><span><b>0</b><i></i></span><span><b>0</b><i></i></span></p></div><button type="button" class="intro-skip">Skip</button>`;
 el.querySelector('.intro-title').textContent=title;el.querySelector('.intro-sub').textContent=sub;
 document.body.prepend(el);
 const t0=performance.now();let gone=false,countEnd=0;
 const close=()=>{if(gone)return;gone=true;el.classList.add('leaving');setTimeout(()=>{el.remove();drawHeaderMark();},900);removeEventListener('keydown',key,true);};
 const key=e=>{if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();close();}};
 addEventListener('keydown',key,true);el.addEventListener('click',close);
 el.querySelector('.intro-skip').focus({preventScroll:true});
 // counts: read the header ledger once the data has built it, then roll up
 const roll=()=>{
  const spans=document.querySelectorAll('header .atlas-ledger span');
  if(spans.length<2){if(!gone&&performance.now()-t0<8000)return setTimeout(roll,100);return close();}
  const order=[1,0];// filmmakers first, then films
  const outs=el.querySelectorAll('.intro-counts span');
  const items=order.map((k,i)=>{const s=spans[k],b=s.querySelector('b'),n=+String(b.textContent).replace(/[^0-9]/g,'');outs[i].querySelector('i').textContent=s.textContent.replace(b.textContent,'');return{n,b:outs[i].querySelector('b')};});
  const wait=Math.max(0,1500-(performance.now()-t0)),dur=1400;
  setTimeout(()=>{
   el.classList.add('counting');const s=performance.now();
   const step=now=>{const p=Math.min(1,(now-s)/dur),e=1-Math.pow(1-p,3);for(const it of items)it.b.textContent=Math.round(it.n*e).toLocaleString('en-US');if(p<1&&!gone)requestAnimationFrame(step);};
   requestAnimationFrame(step);
   setTimeout(close,dur+1100);
  },wait);
 };
 roll();
}else if(root.dataset.markDraw==='1'&&still){delete root.dataset.markDraw;}

/* 3. Projector light: a warm pool of light under whatever is selected on the map */
function projector(){
 const svg=document.getElementById('atlas');if(!svg)return;
 let defs=svg.querySelector('defs#flourish-defs');
 if(!defs){defs=document.createElementNS(NS,'defs');defs.id='flourish-defs';defs.innerHTML='<radialGradient id="projector-light"><stop offset="0" stop-color="#fff4d2" stop-opacity=".95"/><stop offset=".38" stop-color="#f1c56a" stop-opacity=".62"/><stop offset="1" stop-color="#f1c56a" stop-opacity="0"/></radialGradient>';svg.prepend(defs);}
 let queued=false;
 const sync=()=>{queued=false;
  for(const g of svg.querySelectorAll('.cinema-anchor,.land-word')){
   const on=g.classList.contains('selected');let glow=g.querySelector(':scope>ellipse.projector-glow');
   if(!on){if(glow)glow.remove();continue;}
   if(!glow){glow=document.createElementNS(NS,'ellipse');glow.setAttribute('class','projector-glow');glow.setAttribute('fill','url(#projector-light)');glow.setAttribute('pointer-events','none');g.prepend(glow);}
   if(g.classList.contains('land-word')){const r=g.querySelector(':scope>rect');if(!r)continue;const x=+r.getAttribute('x'),y=+r.getAttribute('y'),w=+r.getAttribute('width'),h=+r.getAttribute('height');glow.setAttribute('cx',x+w/2);glow.setAttribute('cy',y+h/2);glow.setAttribute('rx',w/2+26);glow.setAttribute('ry',h/2+22);}
   else{glow.setAttribute('cx',0);glow.setAttribute('cy',0);glow.setAttribute('rx',42);glow.setAttribute('ry',42);}
  }
 };
 new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(sync);}}).observe(svg,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',projector);else projector();
})();
