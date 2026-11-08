/* Beta interface pass, 2026-11-07 (Claude).
   Territories: stronger washes with Off / Soft / Strong + strength, and an outline for the territory under the pointer or the land selected.
   Menus: one map toolbar, drawers docked under it, one close rule (Esc, click outside or ×), Countries find/sort/regions,
   a visual map key, visible filter chips, a collapsible featured card and single-key shortcuts.
   Builds on the existing controls (same ids and handlers); no engine code is replaced. */
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],root=document.documentElement;
root.dataset.ui='1107';
const store={get(k,d){try{const v=localStorage.getItem('atlas-ui-'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('atlas-ui-'+k,JSON.stringify(v));}catch(e){}}};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const fire=(el,type)=>el&&el.dispatchEvent(new Event(type,{bubbles:true}));
const el=(tag,attrs={},html='')=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(html)e.innerHTML=html;return e;};
const atlas=()=>window.Atlas&&typeof window.Atlas.allRecords==='function'?window.Atlas:null;
function whenReady(fn,tries=0){if(atlas()&&$('#country-rail')&&$('#layers')&&$('#atlas .land-shading'))return fn();if(tries<120)setTimeout(()=>whenReady(fn,tries+1),250);}

/* 1. One map toolbar: the zoom group joins the top bar on wide screens. */
function toolbar(){
 const bar=$('.map-toolbar'),zoom=$('.map-panel .zoom'),actions=bar&&bar.querySelector('.map-actions');if(!bar||!zoom||!actions)return;
 const home={parent:zoom.parentElement,next:zoom.nextSibling};
 const place=()=>{const wide=innerWidth>760;root.dataset.uiBar=wide?'one':'split';
  if(wide&&zoom.parentElement!==bar)bar.insertBefore(zoom,actions);
  else if(!wide&&zoom.parentElement===bar)home.parent.insertBefore(zoom,home.next&&home.next.parentElement===home.parent?home.next:null);};
 place();addEventListener('resize',place);
}

/* 2. One close rule: every drawer gets a × in its corner; the separate header button goes. */
function closeRule(){
 for(const b of $$('.map-panel-close,#close-filters')){if(b.dataset.uiX)continue;b.dataset.uiX='1';b.setAttribute('aria-label','Close');b.title='Close (Esc)';if(b.id!=='close-filters')b.textContent='×';}
}

/* 3. Countries: find, order, regions, hide the not-yet-indexed. */
function countries(){
 const rail=$('#country-rail');if(!rail||$('#country-tools'))return;
 const box=el('div',{id:'country-tools'},`<input type="search" id="country-filter" placeholder="Find a country" aria-label="Find a country" autocomplete="off">
  <div class="country-tools-row"><label>Order <select id="country-sort"><option value="films">Most films</option><option value="filmmakers">Most filmmakers</option><option value="name">A–Z</option><option value="region">By region</option></select></label>
  <label class="country-empty"><input type="checkbox" id="country-show-empty"> Include not yet indexed</label></div><p id="country-none" hidden>No country matches.</p>`);
 rail.parentElement.insertBefore(box,rail);
 const sort=$('#country-sort'),filter=$('#country-filter'),empty=$('#country-show-empty');
 sort.value=store.get('country-sort','films');empty.checked=store.get('country-empty',false);
 const name=b=>b.querySelector('span')?.textContent||'',region=b=>atlas()?.countryByCode?.(b.dataset.relayCountry)?.region||'Other';
 const order={name:(a,b)=>name(a).localeCompare(name(b)),films:(a,b)=>(+b.dataset.films- +a.dataset.films)||name(a).localeCompare(name(b)),
  filmmakers:(a,b)=>(+b.dataset.filmmakers- +a.dataset.filmmakers)||name(a).localeCompare(name(b)),region:(a,b)=>region(a).localeCompare(region(b))||(+b.dataset.films- +a.dataset.films)||name(a).localeCompare(name(b))};
 const apply=()=>{
  rail.querySelectorAll('.country-group').forEach(h=>h.remove());
  const q=norm(filter.value),items=[...rail.querySelectorAll('button[data-relay-country]')].sort(order[sort.value]||order.films);
  let last=null,shown=0;
  for(const b of items){b.dataset.uiSorted='1';
   const hide=(q&&!norm(name(b)).includes(q))||(!q&&!empty.checked&&+b.dataset.filmmakers===0&&b.getAttribute('aria-pressed')!=='true');
   b.hidden=hide;
   if(sort.value==='region'&&!hide&&region(b)!==last){last=region(b);rail.appendChild(el('p',{class:'country-group'},last));}
   rail.appendChild(b);if(!hide)shown++;}
  $('#country-none').hidden=shown>0;
 };
 new MutationObserver(()=>{if([...rail.querySelectorAll('button[data-relay-country]')].some(b=>!b.dataset.uiSorted))apply();}).observe(rail,{childList:true});
 filter.addEventListener('input',apply);
 filter.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();rail.querySelector('button[data-relay-country]:not([hidden])')?.click();}});
 sort.addEventListener('change',()=>{store.set('country-sort',sort.value);apply();});
 empty.addEventListener('change',()=>{store.set('country-empty',empty.checked);apply();});
 $('#country-drawer')?.addEventListener('toggle',e=>{if(e.target.open&&innerWidth>760)setTimeout(()=>filter.focus({preventScroll:true}),30);});
 apply();
}

/* 4. Layers: one Territories control; clearer names. */
const PRESET={soft:20,strong:36};
function setStrength(v){root.style.setProperty('--territory-wash',String(v/100));}
function layers(){
 const shading=$('#layer-shading'),bounds=$('#layer-boundaries'),geo=$('#layer-geography');if(!shading||$('#territory-control'))return;
 const relabel=(input,text)=>{const l=input?.closest('label');if(!l)return;for(const n of [...l.childNodes])if(n.nodeType===3)n.remove();l.append(' '+text);};
 relabel(geo,'Basemap');relabel(bounds,'Outline every territory');relabel($('#layer-cinema'),'Country markers');
 const shadingLabel=shading.closest('label');shadingLabel.hidden=true;
 const box=el('fieldset',{id:'territory-control'},`<legend>Territories</legend>
  <div class="territory-modes" role="radiogroup" aria-label="Territory colour">
   <button type="button" role="radio" data-mode="off">Off</button><button type="button" role="radio" data-mode="soft">Soft</button><button type="button" role="radio" data-mode="strong">Strong</button></div>
  <label class="territory-strength">Strength <input id="territory-strength" type="range" min="8" max="60" step="1"></label>
  <p class="territory-note">Native Land Digital / MapMaker references, not definitive boundaries.</p>`);
 shadingLabel.before(box);
 const range=$('#territory-strength');
 const show=mode=>{for(const b of box.querySelectorAll('[data-mode]')){const on=b.dataset.mode===mode;b.setAttribute('aria-checked',String(on));b.classList.toggle('is-on',on);}range.disabled=mode==='off';};
 const setMode=(mode,save=true)=>{
  const want=mode!=='off';if(shading.checked!==want){shading.checked=want;fire(shading,'change');}
  if(mode in PRESET){range.value=PRESET[mode];setStrength(PRESET[mode]);}
  show(mode);if(save){store.set('territories',mode);store.set('territory-strength',+range.value);}
 };
 box.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
 range.addEventListener('input',()=>{const v=+range.value;setStrength(v);if(!shading.checked){shading.checked=true;fire(shading,'change');}
  show(v===PRESET.soft?'soft':v===PRESET.strong?'strong':'custom');store.set('territories','custom');store.set('territory-strength',v);});
 shading.addEventListener('change',()=>{if(!shading.checked)show('off');});
 const mode=store.get('territories','strong'),v=store.get('territory-strength',PRESET.strong);
 range.value=v;setStrength(v);
 if(mode==='off')setMode('off',false);else{if(!shading.checked){shading.checked=true;fire(shading,'change');}show(mode);}
}

/* 5. Map key: a visual key first, the full notes folded below. */
function mapKey(){
 const panel=$('#map-info > div');if(!panel||$('#visual-key'))return;
 const notes=el('details',{class:'key-notes'},'<summary>Full notes</summary>');
 for(const n of [...panel.childNodes]){if(n.nodeType===1&&n.classList.contains('map-panel-close'))continue;notes.appendChild(n);}
 const sw=(svg)=>`<svg viewBox="0 0 40 22" width="40" height="22" aria-hidden="true">${svg}</svg>`;
 const rows=[
  [sw('<text x="1" y="17" font-family="Atlas Serif, Georgia, serif" font-size="17" fill="#182028">A</text><text x="17" y="17" font-family="Atlas Serif, Georgia, serif" font-size="10" fill="#182028">a</text><circle cx="33" cy="12" r="3.5" fill="#d59fa6" stroke="#f6f4e8" stroke-width="1.2"/>'),'<b>Land names.</b> Larger names have more linked filmmakers. Indigenous scripts are kept. Point to preview; select to open.'],
  [sw('<rect x="3" y="3" width="34" height="16" rx="2" fill="#94cbb0" fill-opacity=".36" stroke="#5b8a74" stroke-opacity=".75"/>'),'<b>Territory.</b> Native Land Digital / MapMaker reference (2023), not a definitive boundary. Strength is in Layers.'],
  [sw('<rect x="3" y="3" width="34" height="16" rx="2" fill="#94cbb0" fill-opacity=".36" stroke="#2f5547" stroke-width="2"/>'),'<b>Outlined territory.</b> The one under your pointer, or the land you selected.'],
  [sw('<circle cx="20" cy="11" r="9" fill="#5b5148"/><circle cx="20" cy="11" r="9" fill="none" stroke="#e9d9ad" stroke-opacity=".8"/>'),'<b>Picture at a land.</b> A still or portrait for a linked filmmaker.'],
  [sw('<path d="M8 17 L28 6" stroke="#c44934" stroke-opacity=".6"/><circle cx="8" cy="17" r="4.5" fill="#e4c16d" stroke="#fff7de" stroke-width="1.5"/>'),'<b>Country marker.</b> Opens that country’s filmmakers and films. Counts don’t establish identity, citizenship or residence.'],
  [sw('<path d="M3 11 H37" stroke="#9c3b26" stroke-width="1.6"/>'),'<b>Solid line.</b> Affiliation with a source.'],
  [sw('<path d="M3 11 H37" stroke="#9c3b26" stroke-width="1.4" stroke-dasharray="4 5"/>'),'<b>Dashed line.</b> Catalog match awaiting review.']];
 const key=el('div',{id:'visual-key'},`<strong class="key-title">Map key</strong><ul>${rows.map(([s,t])=>`<li>${s}<span>${t}</span></li>`).join('')}</ul>
  <p class="key-shortcuts"><kbd>/</kbd> search · <kbd>C</kbd> countries · <kbd>L</kbd> layers · <kbd>K</kbd> key · <kbd>W</kbd> whole world · <kbd>S</kbd> surprise · <kbd>Esc</kbd> close</p>`);
 panel.prepend(key);key.after(notes);
}

/* 6. Index panel: say what search covers; show active filters as chips. */
function indexPanel(){
 const search=$('#search');if(search){search.placeholder='Search filmmakers, films, lands…';search.setAttribute('aria-label','Search filmmakers, films and lands');}
 const row=$('#toggle-filters')?.parentElement;if(!row||$('#filter-chips'))return;
 const chips=el('div',{id:'filter-chips','aria-live':'polite'});row.after(chips);
 const val=id=>$('#'+id);
 const label=sel=>sel.options[sel.selectedIndex]?.text||sel.value;
 const render=()=>{const list=[];
  const f=val('year-from'),t=val('year-to'),u=val('include-undated'),lang=val('filter-language'),form=val('filter-form'),res=val('research');
  if(f?.value)list.push(['From '+f.value,()=>{f.value='';fire(f,'input');}]);
  if(t?.value)list.push(['To '+t.value,()=>{t.value='';fire(t,'input');}]);
  if(lang?.value)list.push([label(lang),()=>{lang.value='';fire(lang,'change');}]);
  if(form?.value)list.push([label(form),()=>{form.value='';fire(form,'change');}]);
  if(u&&!u.checked)list.push(['Dated works only',()=>{u.checked=true;fire(u,'change');}]);
  if(res&&!res.checked)list.push(['Research candidates hidden',()=>{res.checked=true;fire(res,'change');}]);
  chips.replaceChildren(...list.map(([text,clear])=>{const b=el('button',{type:'button',class:'filter-chip','aria-label':'Remove filter: '+text},`${text}<span aria-hidden="true">×</span>`);b.onclick=()=>{clear();setTimeout(render,0);};return b;}));
  chips.hidden=!list.length;};
 document.addEventListener('input',e=>{if(e.target.closest?.('#index-tools'))render();});
 document.addEventListener('change',e=>{if(e.target.closest?.('#index-tools'))render();});
 $('#reset-filters')?.addEventListener('click',()=>setTimeout(render,0));
 render();
}

/* 7. Featured theme-weaving card starts as a small pill. */
function featured(){
 const card=$('#featured-weave');if(!card){setTimeout(featured,800);return;}
 const setup=()=>{if(card.querySelector('.fw-pill'))return;
  const pill=el('button',{type:'button',class:'fw-pill','aria-expanded':'false'},'<span aria-hidden="true">✦</span> Constellations');
  const min=el('button',{type:'button',class:'fw-min','aria-label':'Minimize','title':'Minimize'},'–');
  pill.onclick=()=>set(false);min.onclick=()=>set(true);card.prepend(pill);card.append(min);
  set(store.get('featured-collapsed',true),false);};
 const set=(collapsed,save=true)=>{card.classList.toggle('is-collapsed',collapsed);card.querySelector('.fw-pill')?.setAttribute('aria-expanded',String(!collapsed));if(save)store.set('featured-collapsed',collapsed);};
 setup();new MutationObserver(setup).observe(card,{childList:true});
}

/* 8. Single-key shortcuts (not while typing). "/" search, Esc and S already exist. */
function shortcuts(){
 const open=id=>{const d=$('#'+id),s=d?.querySelector('summary');if(!s)return;s.click();if(d.open)setTimeout(()=>(d.querySelector('input,select,button:not(.map-panel-close)')||s).focus({preventScroll:true}),40);};
 document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.defaultPrevented)return;
  if(e.target.closest?.('input,textarea,select,[contenteditable="true"],dialog'))return;
  if(document.body.classList.contains('constellate-open')||$('#constellate-popup:not([hidden])'))return;
  const k=e.key.toLowerCase();
  if(k==='c'){e.preventDefault();open('country-drawer');}
  else if(k==='l'){e.preventDefault();open('layers');}
  else if(k==='k'){e.preventDefault();open('map-info');}
  else if(k==='w'){e.preventDefault();$('#world')?.click();}
 });
 for(const [sel,key] of [['#country-drawer>summary','C'],['#layers>summary','L'],['#map-info>summary','K'],['#world','W']]){const n=$(sel);if(n){n.setAttribute('aria-keyshortcuts',key);n.title=(n.title?n.title+' ':'')+'('+key+')';}}
}

/* 9. Territory outline: under the pointer, and for the selected land. */
function territoryFocus(){
 const svg=$('#atlas');if(!svg)return;
 const NS='http://www.w3.org/2000/svg';let layer=null,cache=null,raf=0,hoverLand=null,lastEvent=null;
 const tint=()=>svg.querySelector('.land-shading');
 const ensure=()=>{const t=tint();if(!t)return null;if(!layer||!layer.isConnected){layer=document.createElementNS(NS,'g');layer.setAttribute('class','territory-focus');layer.setAttribute('pointer-events','none');t.after(layer);}return t;};
 const items=()=>{const t=ensure();if(!t||getComputedStyle(t).display==='none')return [];const ps=t.querySelectorAll('path.nation-wash');
  const sig=ps.length+'|'+(ps[0]?.getAttribute('d')||'').slice(0,48);
  if(!cache||cache.sig!==sig){cache={sig,list:[...ps].map(p=>{let b;try{b=p.getBBox();}catch(e){b={x:0,y:0,width:0,height:0};}return {p,b,a:b.width*b.height};})};}
  return cache.list;};
 const selected=()=>{const s=atlas()?.state;const st=typeof s==='function'?s():s;return st?(st.crossLand||st.land||null):null;};
 const draw=()=>{const t=ensure();if(!t)return;const want=new Map();
  const sel=selected();
  for(const {p} of items()){const id=p.getAttribute('data-land');if(id&&(id===hoverLand||id===sel))want.set(p,id===sel?'is-selected':'is-hover');}
  layer.replaceChildren(...[...want].map(([p,cls])=>{const c=document.createElementNS(NS,'path');c.setAttribute('d',p.getAttribute('d'));c.setAttribute('class','territory-focus-shape '+cls);c.setAttribute('stroke',p.getAttribute('stroke')||'#2f5547');c.setAttribute('fill',p.getAttribute('fill')||'none');return c;}));};
 const hit=e=>{const t=ensure();if(!t)return null;const m=t.getScreenCTM();if(!m)return null;const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());
  let best=null;for(const it of items()){const b=it.b;if(pt.x<b.x||pt.x>b.x+b.width||pt.y<b.y||pt.y>b.y+b.height)continue;if(best&&it.a>=best.a)continue;
   try{if(it.p.isPointInFill(pt))best=it;}catch(err){}}
  return best?best.p.getAttribute('data-land'):null;};
 svg.addEventListener('pointermove',e=>{if(e.buttons)return;lastEvent=e;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const id=hit(lastEvent);if(id!==hoverLand){hoverLand=id;draw();}});});
 svg.addEventListener('pointerleave',()=>{if(hoverLand){hoverLand=null;draw();}});
 const later=()=>setTimeout(draw,60);
 addEventListener('atlas-camera-change',later);document.addEventListener('click',later);document.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key==='Escape')later();});
 const t=tint();if(t)new MutationObserver(()=>{cache=null;later();}).observe(t,{childList:true,attributes:true,attributeFilter:['d','style']});
 draw();
}

whenReady(()=>{
 for(const step of [toolbar,closeRule,countries,layers,mapKey,indexPanel,featured,shortcuts,territoryFocus]){try{step();}catch(err){console.warn('UI pass step failed:',step.name,err);}}
 setTimeout(closeRule,1500);
});
})();
