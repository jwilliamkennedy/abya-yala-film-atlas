/* Left rail (2026-11-21). One menu for every page, built from the list below, at 901px and wider.
   Below 901px nothing changes: the header menu and the phone layout stay as they are.
   The words are English here and translated by i18n-20261107.js like the rest of the interface.
   Styles: rail-20261121.css. The head snippet sets html[data-rail] before first paint so the page does not jump. */
(()=>{
if(window.__atlasRail)return;window.__atlasRail=1;
const root=document.documentElement,wide=matchMedia('(min-width:901px)');
const src=(document.currentScript&&document.currentScript.src)||'';
const HOME=src?new URL('../',src).href:new URL('./',location.href).href;
const rel=location.href.split(/[?#]/)[0].replace(HOME,'');
const onMap=rel===''||rel==='index.html';
const PAGE={'watch.html':'watch','themes.html':'themes','languages.html':'languages','timeline.html':'timeline','screening.html':'screening',
 'about.html':'about','resources.html':'about','data.html':'data','corrections.html':'correct'};

/* key, words, short word for the collapsed rail, address */
const MENU=[
 ['map','Map','Map',''],['lands','Lands','Lands',''],['constellate','Constellate','Constellate','?constellate=1'],['watch','Watch','Watch','watch.html'],
 'Indexes',
 ['themes','Themes','Themes','themes.html'],['languages','Languages','Languages','languages.html'],['timeline','Timeline','Timeline','timeline.html'],
 '',
 ['screening','Saved','Saved','screening.html'],['about','About','About','about.html'],['data','Data and CARE','Data','data.html']
];
const ICON={
 search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
 map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
 lands:'<path d="M3.5 9.5 9 4.5l6 2 .8 5-4.3 3.6-6.2-1z"/><path d="M12 13.5l4.6-2.3 4 3-1 4.6-4.8 1.7-3.6-2.8z"/>',
 constellate:'<circle cx="5" cy="17" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="15" r="2"/><path d="M6 15.3 10.9 7.7M13.6 7.3l4.2 6M7 17l10-1.6"/>',
 watch:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10.5 9.2 4.5 2.8-4.5 2.8z"/>',
 themes:'<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.2"/>',
 languages:'<path d="M4 5h16v11h-9l-4.5 4v-4H4z"/><path d="M8 9h8M8 12.3h5"/>',
 timeline:'<path d="M3 18h18M7 18v-6M12 18V8M17 18v-4"/><circle cx="7" cy="10.2" r="1.7"/><circle cx="12" cy="6.2" r="1.7"/><circle cx="17" cy="12.2" r="1.7"/>',
 screening:'<path d="M6.5 4h11v16.5l-5.5-4-5.5 4z"/>',
 about:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>',
 data:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
 data:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
 correct:'<path d="M4 20l1-4.2L15.8 5l3.2 3.2L8.2 19z"/><path d="m13.8 7 3.2 3.2"/>',
 fold:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>'
};
const MARK='<svg class="rail-mark" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="7"/><path d="M44 16 C66 30 50 46 62 60 C74 74 56 88 66 104" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><circle cx="62" cy="60" r="7" fill="currentColor"/></svg>';
const svg=k=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+ICON[k]+'</svg>';
const $=(s,r)=>(r||document).querySelector(s);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const flag={take(){try{const v=sessionStorage.getItem('atlas-rail-do');sessionStorage.removeItem('atlas-rail-do');return v}catch(e){return null}},
 set(v){try{sessionStorage.setItem('atlas-rail-do',v)}catch(e){}}};

let nav=null;const homes=new Map();
const constellating=()=>onMap&&(root.dataset.uiConstellate?root.dataset.uiConstellate==='on':new URLSearchParams(location.search).get('constellate')==='1');
const landView=()=>onMap&&!!$('.view-switch [data-view="land"][aria-pressed="true"]');
const current=()=>!onMap?(rel.startsWith('maker/')?'map':PAGE[rel]||''):constellating()?'constellate':landView()?'lands':'map';
const wanted=()=>store.get('atlas-rail')||(constellating()||innerWidth<1440?'compact':'full');

function build(){
 nav=document.createElement('nav');nav.id='atlas-rail';nav.setAttribute('aria-label','Atlas menu');
 const row=([k,full,short,href])=>'<a class="rail-item" data-rail="'+k+'" href="'+HOME+href+'" title="'+full+'">'+svg(k)+'<span class="full">'+full+'</span><span class="short">'+short+'</span>'+
  (k==='screening'?'<span class="rail-n" data-rail-n="screening"></span>':'')+'</a>';
 nav.innerHTML='<a class="rail-brand" href="'+HOME+'">'+MARK+'<span class="rail-title"><b>Indigenous<br>Cinema Atlas</b>'+
  '<span class="rail-count" hidden><span><span data-rail-n="films"></span> <span>films</span></span><span><span data-rail-n="makers"></span> <span>filmmakers</span></span></span></span></a>'+
  '<button type="button" class="rail-item rail-search" data-rail="search" title="Search">'+svg('search')+'<span class="full">Search</span><span class="short">Search</span><kbd aria-hidden="true">/</kbd></button>'+
  MENU.map(m=>typeof m==='string'?'<div class="rail-group">'+m+'</div>':row(m)).join('')+
  '<div class="rail-foot"><a class="rail-item" data-rail="correct" href="'+HOME+'corrections.html" title="Suggest a correction">'+svg('correct')+'<span class="full">Suggest a correction</span><span class="short">Correct</span></a>'+
  '<div class="rail-tools"><label class="rail-lang"><b aria-hidden="true"></b></label><button type="button" class="rail-toggle" data-rail="toggle" aria-controls="atlas-rail">'+svg('fold')+'</button></div></div>';
 nav.addEventListener('click',onClick);
 document.body.appendChild(nav);
}

function onClick(e){
 const a=e.target.closest('[data-rail]');if(!a)return;const k=a.dataset.rail,here=onMap&&!constellating();
 if(k==='toggle'){const next=root.dataset.rail==='compact'?'full':'compact';store.set('atlas-rail',next);root.dataset.rail=next;sync();dispatchEvent(new Event('resize'));return;}
 if(k==='search'){e.preventDefault();if(here){const s=$('#search');if(s){s.focus();return;}}flag.set('search');location.href=HOME;return;}
 if(k==='lands'||k==='saved'){e.preventDefault();if(here)act(k);else{flag.set(k);location.href=HOME;}return;}
 if(k==='map'&&here){e.preventDefault();if(landView()){const b=$('.view-switch [data-view="filmmakers"]');if(b)b.click();}}
}
function act(k){
 if(k==='search'){const s=$('#search');if(s)s.focus();}
 if(k==='lands'){const b=$('.view-switch [data-view="land"]');if(b)b.click();}
 if(k==='saved'){const b=$('#toggle-saved');if(b)b.click();}
 if(k==='time'){const b=$('#td-toggle');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();}
 /* arriving from the Saved page to reopen one saved map view */
 if(/^saved:\d+$/.test(k)){const b=$('[data-saved="'+k.slice(6)+'"]');if(b)b.click();}
 sync();
}

/* the language and day/night controls move into the rail while it is mounted, and back when it is not */
function adopt(el,to,before){if(!el||el.parentNode===to)return;if(!homes.has(el))homes.set(el,[el.parentNode,el.nextSibling]);to.insertBefore(el,before||null);}
function restore(){homes.forEach(([p,next],el)=>{if(p&&p.isConnected)p.insertBefore(el,next&&next.parentNode===p?next:null);});homes.clear();}
function adoptControls(){
 if(!nav||!root.dataset.rail)return;
 const tools=$('.rail-tools',nav),toggle=$('.rail-toggle',nav);
 adopt($('body>header #ui-lang'),$('.rail-lang',nav));
 adopt($('body>header .ui-theme-toggle'),tools,toggle);
 zoomHome();
}
/* the zoom buttons float at the map's top right while the rail is mounted; they go back exactly where they came from
   (the top bar on desktop, or wherever the phone layout keeps them), and only if the rail moved them */
let zoomFrom=null;
function zoomHome(){
 if(!onMap)return;const out=$('#zoom-out'),z=out&&out.parentElement,mp=$('.map-panel');if(!z||!mp)return;
 const float=!!root.dataset.rail&&!constellating();
 if(float){if(!z.classList.contains('rail-zoom')){zoomFrom=[z.parentElement,z.nextSibling];z.classList.add('rail-zoom');}if(z.parentElement!==mp)mp.appendChild(z);}
 if(!float&&z.classList.contains('rail-zoom')){z.classList.remove('rail-zoom');const [p,n]=zoomFrom||[];if(p&&p.isConnected&&p!==mp)p.insertBefore(z,n&&n.parentNode===p?n:null);zoomFrom=null;}
}

function counts(){
 if(!nav)return;let c=null;const led=$('.atlas-ledger');
 if(led){const n=[...led.querySelectorAll('b')].map(b=>b.textContent.trim()).filter(Boolean);if(n.length>=2){c=[n[0],n[1]];store.set('atlas-counts',JSON.stringify(c));}}
 if(!c){try{c=JSON.parse(store.get('atlas-counts'))}catch(e){}}
 if(!c||c.length<2)return;
 setT('[data-rail-n="films"]',c[0]);setT('[data-rail-n="makers"]',c[1]);$('.rail-count',nav).hidden=false;
}
function listCount(){
 if(!onMap)return;const rc=$('#result-count');if(!rc)return;
 const text=rc.textContent.trim().replace(/^\d{4,}/,m=>Number(m).toLocaleString(root.lang||'en'));
 const held=document.body.classList.contains('selection-held');
 document.querySelectorAll('.maker-browser-heading,.film-browser-heading').forEach(h=>{
  let s=h.querySelector('.rail-list-count');if(!s){s=document.createElement('span');s.className='rail-list-count';h.insertBefore(s,h.firstChild);}
  const show=!!text&&!held;if(s.textContent!==(show?text:''))s.textContent=show?text:'';h.classList.toggle('has-rail-count',show);});
}

function sync(){
 if(!nav)return;const cur=current(),compact=root.dataset.rail==='compact';
 nav.querySelectorAll('.rail-item[data-rail]').forEach(a=>{if(a.dataset.rail===cur)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const t=$('.rail-toggle',nav);t.setAttribute('aria-expanded',String(!compact));t.title=compact?'Expand menu':'Collapse menu';t.setAttribute('aria-label',t.title);
 setT('.rail-lang b',(root.lang||'en').slice(0,2).toUpperCase());
 const sc=$('body>header [data-screen-count]'),n=sc&&(sc.textContent.match(/\d+/)||[''])[0];setT('[data-rail-n="screening"]',n&&n!=='0'?n:'');
}

function setT(sel,v){const e=nav&&$(sel,nav);if(e&&e.textContent!==String(v))e.textContent=v;}

function mount(){
 if(!nav)build();
 root.dataset.rail=wanted();adoptControls();counts();listCount();sync();
}
function unmount(){delete root.dataset.rail;restore();zoomHome();}
function refresh(){if(wide.matches)mount();else unmount();}

function start(){
 refresh();
 wide.addEventListener('change',()=>{refresh();dispatchEvent(new Event('resize'));});
 addEventListener('resize',()=>{if(root.dataset.rail&&!store.get('atlas-rail')){const w=wanted();if(w!==root.dataset.rail){root.dataset.rail=w;sync();}}setTimeout(zoomHome,60);});
 /* controls the page adds or moves after load, and state the map changes without a new page */
 let raf=0;const later=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(!root.dataset.rail)return;adoptControls();counts();listCount();sync();});};
 const mo=new MutationObserver(later);
 const header=$('body>header');if(header)mo.observe(header,{subtree:true,childList:true,characterData:true});
 ['.map-toolbar','.view-switch','#result-count'].forEach(s=>{const e=$(s);if(e)mo.observe(e,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']});});
 mo.observe(root,{attributes:true,attributeFilter:['data-ui-constellate','lang','data-atlas-ui']});
 mo.observe(document.body,{attributes:true,attributeFilter:['class']});
 /* arriving from another page's Search, Lands or Saved */
 if(onMap){const todo=flag.take();if(todo){let tries=0;const go=()=>{if(root.dataset.atlasUi==='ready'||++tries>40){if(!constellating())act(todo);}else setTimeout(go,150);};go();}}
}

/* ===== Interface pass, 2026-11-21 (evening) ===== */
const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const typing=e=>{const t=e.target;return t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));};
/* N1 Map in the rail, when you are already on the map, goes home: clears the selection and search, shows Overview */
function goHome(){
 const q=$('#search');if(q&&q.value){const c=$('#clear-search');if(c)c.click();}
 const cc=$('#clear-context');if(cc&&!cc.hidden)cc.click();
 if(document.body.classList.contains('selection-held')){const b=$('#view-back');if(b&&!b.disabled)b.click();}
 const f=$('.view-switch [data-view="filmmakers"]');if(f&&f.getAttribute('aria-pressed')!=='true')f.click();
 setTimeout(()=>{const r=$('#zoom-reset');if(r)r.click();},120);
}
/* a link on another page can ask the map to do one thing on arrival: <a href="./" data-atlas-do="time"> */
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[data-atlas-do]');if(a)flag.set(a.dataset.atlasDo);},true);
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('#atlas-rail [data-rail="map"]');if(!a||!onMap||constellating()||landView())return;e.preventDefault();e.stopImmediatePropagation();goHome();},true);
document.addEventListener('keydown',e=>{
 if(!root.dataset.rail)return;
 /* N2 "/" on any page goes to the map's search (the map page handles its own) */
 if(e.key==='/'&&!onMap&&!typing(e)&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();flag.set('search');location.href=HOME;return;}
 /* N3 Esc leaves Link films, Draw a line, and the map's Draw */
 if(e.key==='Escape'){for(const s of ['#weave-draw-thread','#weave-trace','#map-draw-line']){const b=$(s);if(b&&b.getAttribute('aria-pressed')==='true'&&b.offsetParent){b.click();e.preventDefault();return;}}}
 /* N5 up and down arrows move through the list; Enter opens (it is a button) */
 if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target.closest&&e.target.closest('#index-list .entry-button')){
  const all=[...document.querySelectorAll('#index-list .entry-button')].filter(b=>b.offsetParent),i=all.indexOf(e.target.closest('.entry-button'));
  const n=all[i+(e.key==='ArrowDown'?1:-1)];if(n){e.preventDefault();n.focus();n.scrollIntoView({block:'nearest'});}
 }
});
/* N4 the land's caption on the map zooms to it */
function captionZoom(){
 const cap=$('#map-selection-focus'),z=$('#zoom-selection');if(!cap||!z)return;
 const can=!cap.hidden&&!z.disabled&&!!$('#map-focus-name')?.textContent.trim();cap.classList.toggle('is-zoomable',can);
 if(can){cap.setAttribute('tabindex','0');cap.setAttribute('role','button');cap.title=z.title||'Zoom to selection';}else{cap.removeAttribute('tabindex');cap.removeAttribute('role');}
 if(!cap.dataset.railZoom){cap.dataset.railZoom='1';const go=e=>{if(!cap.classList.contains('is-zoomable'))return;if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();z.click();};cap.addEventListener('click',go);cap.addEventListener('keydown',go);}
}
/* M1 counts on the tabs, from the totals the rail already shows */
function tabCounts(){
 let c=null;try{c=JSON.parse(store.get('atlas-counts'))}catch(e){}if(!c)return;
 const f=$('.view-switch [data-view="filmmakers"]'),m=$('.view-switch [data-view="films"]');
 if(f&&f.dataset.railN!==c[1])f.dataset.railN=c[1];if(m&&m.dataset.railN!==c[0])m.dataset.railN=c[0];
}
/* M2 a dot on Layers when the map differs from its usual layers */
function layersChanged(){
 const L=$('#layers');if(!L)return;const on=id=>!!$('#'+id)?.checked,w=$('#world'),strong=!!$('#territory-control [data-mode="strong"].is-on');
 const changed=!on('layer-connections')||!on('layer-cinema')||on('layer-boundaries')||(w&&w.getAttribute('aria-pressed')==='true')||strong;
 L.classList.toggle('is-changed',changed);const s=L.querySelector('summary');if(s)s.title=changed?'Layers (changed from the usual view)':'Choose what is visible on the map';
}
function pass(){if(!root.dataset.rail||!onMap)return;captionZoom();tabCounts();layersChanged();}
const passStart=()=>{pass();const mo=new MutationObserver(()=>{clearTimeout(passStart.t);passStart.t=setTimeout(pass,80);});
 ['#map-selection-focus','#layers','#zoom-selection','.view-switch'].forEach(s=>{const e=$(s);if(e)mo.observe(e,{subtree:true,attributes:true,childList:true,characterData:true});});
 document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#layers'))setTimeout(pass,60);});document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#layers,#world'))setTimeout(pass,120);});
 setTimeout(pass,1500);};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{start();passStart();},{once:true});else{start();passStart();}
})();
