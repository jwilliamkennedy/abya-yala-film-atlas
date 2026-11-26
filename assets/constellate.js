/* Constellate — one module (consolidated 2026-11-12).
   Sections keep their original order and code; each was a separate file before, named in its banner.
   Edit here. Do not add overlay scripts that relabel or restyle Constellate from outside this file. */
'use strict';

/* ================================================================
   Embedded view
   (was constellation-embed.js)
   ================================================================ */
if(new URLSearchParams(location.search).get('constellation-embed')==='1'){
 document.body.classList.add('constellation-embedded');
 (async()=>{const app=window.Atlas;await app.ready;app.state.cinema=false;document.querySelector('#layer-cinema').checked=false;app.refresh();window.dispatchEvent(new Event('resize'));
 function receive(e){if(e.origin!==location.origin||e.source!==parent||!e.data||typeof e.data!=='object')return;if(e.data.type==='atlas-workspace-map-controls'){document.querySelector('#zoom-in')?.focus({preventScroll:true});return;}if(e.data.type==='atlas-workspace-overview'){app.resetWorkspace();app.state.cinema=false;document.querySelector('#layer-cinema').checked=false;app.refresh();return;}if(e.data.type!=='atlas-workspace-focus')return;const r=app.recordById(e.data.record);if(!r)return;if(e.data.film&&r.films.some(f=>f.id===e.data.film))app.openProfileFilm(r.id,e.data.film);else app.selectRecord(r.id);const ref=app.recordMapFocus(r.id);parent.postMessage({type:'atlas-workspace-reference',record:r.id,label:ref.label,kind:ref.kind,message:ref.message},location.origin);}
 window.addEventListener('message',receive);parent.postMessage({type:'atlas-workspace-ready'},location.origin);window.AtlasWorkspaceEmbed={receive};
 })();
}
;


;

/* ================================================================
   Published constellations (?c=slug)
   (was constellations.js)
   ================================================================ */
try{
/* Published constellations (2026-11-11).
   A constellation saved in beta/constellations/<slug>.json opens at ?c=<slug> (add &play=1 for Play).
   Files hold film IDs only; titles, filmmakers and years are read from the atlas at open time, so
   corrections to records reach published constellations. Opening one gives the reader a copy in
   their own browser, as a share link does; the published file is never changed from the page. */
(function(){
 'use strict';
 var SLUG=/^[a-z0-9][a-z0-9-]{0,79}$/,index=null,docs={},opened={};
 var base=function(){return new URL('./',location.href);};
 function urlFor(slug,mode){var u=new URL('flat.html',base());u.searchParams.set('c',slug);if(mode==='play')u.searchParams.set('play','1');return u.href;}
 function getJSON(path){return fetch(path,{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('Not found');return r.json();});}
 function loadIndex(){return index?Promise.resolve(index):getJSON('constellations/index.json').then(function(j){index=j;api.example=j.example||'';api.list=j.constellations||[];return j;});}
 function load(slug){if(!SLUG.test(slug))return Promise.reject(Error('Unknown constellation.'));return docs[slug]?Promise.resolve(docs[slug]):getJSON('constellations/'+slug+'.json').then(function(j){docs[slug]=j;return j;});}
 function ready(){return new Promise(function(done,fail){var n=0;(function wait(){if(window.AtlasConstellate&&window.AtlasCollections&&window.Atlas)return done();if(++n>200)return fail(Error('Constellate did not start.'));setTimeout(wait,150);})();});}
 function hydrate(doc){
  var A=window.Atlas,w=doc.weave||{},missing=[],items=[];
  (w.items||[]).forEach(function(x){
   var id=x.type+':'+x.record+(x.film?':'+x.film:''),r=A.recordById(x.record),f=r&&x.type==='film'?r.films.find(function(v){return v.id===x.film;}):null;
   if(!r||(x.type==='film'&&!f)){missing.push(id);return;}
   items.push({type:x.type,record:x.record,film:x.film||null,title:x.type==='film'?f.title:r.name,maker:r.name,year:f?f.year:''});
  });
  return {weave:{id:'pub-'+doc.slug,name:w.name,author:w.author,note:w.note,items:items,threads:w.threads||[],links:w.links||[],pins:w.pins||{}},missing:missing};
 }
 function content(c){return JSON.stringify([c.name,c.author,c.note,(c.threads||[]).map(function(t){return [t.name,t.description,t.items,t.notes];}),(c.links||[]).map(function(l){return [l.source,l.target,l.label,l.note,l.kind,l.sourceURL];})]);}
 function open(slug,mode){
  return ready().then(function(){return window.Atlas.ready;}).then(function(){return load(slug);}).then(function(doc){
   var S=window.AtlasCollections,C=window.AtlasConstellate,h=hydrate(doc);
   if(!h.weave.items.length)throw Error('This constellation has no films the atlas can find.');
   var fp='pub:'+slug+':'+(doc.updated||''),ids={};h.weave.items.forEach(function(x){ids[x.type+':'+x.record+(x.film?':'+x.film:'')]=1;});
   var sig=content({name:h.weave.name,author:h.weave.author,note:h.weave.note,
     threads:h.weave.threads.map(function(t){var notes={};Object.keys(t.notes||{}).forEach(function(k){if(ids[k])notes[k]=t.notes[k];});return {name:t.name,description:t.description,items:(t.items||[]).filter(function(k){return ids[k];}),notes:notes};}),
     links:h.weave.links.filter(function(l){return ids[l.source]&&ids[l.target];})});
   /* A reader who changed their copy keeps it under its own name; the short address always opens the published version. */
   /* A copy the reader never edited is simply replaced by the newer published version. */
   for(var ri=S.state.collections.length-1;ri>=0;ri--){var rc=S.state.collections[ri];if(!S.saved(rc.id)&&(rc.shareFingerprint.indexOf('pub:'+slug+':')===0||rc.id===h.weave.id)&&!rc.editedAt&&content(rc)!==sig&&S.state.collections.length>1)S.state.collections.splice(ri,1);}
   S.state.collections.forEach(function(c){if(!S.saved(c.id)&&(c.shareFingerprint===fp||c.id===h.weave.id)&&content(c)!==sig){c.shareFingerprint='';c.id='copy-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);if(!/\(my copy\)$/.test(c.name))c.name=(c.name+' (my copy)').slice(0,120);c.author='';}});
   S.importWeave(h.weave,fp);
   opened[S.current().id]={slug:slug,doc:doc,sig:sig};
   C.open();if(mode!=='play'&&mode!=='build')C.readFromStart();else C.setRead(false);C.fit('quiet');
   if(mode==='play')C.play();
   if(h.missing.length){var st=document.querySelector('#constellate-status');if(st)st.textContent=h.missing.length+' film'+(h.missing.length>1?'s':'')+' in this constellation '+(h.missing.length>1?'are':'is')+' no longer on the atlas and '+(h.missing.length>1?'were':'was')+' left out.';}
   cite();return doc;
  });
 }
 /* The published copy, unedited, is cited by its short address. An edited copy is the reader's own work and keeps the ordinary share link. */
 function published(){var S=window.AtlasCollections;if(!S)return null;var c=S.current(),o=opened[c.id];return o&&o.sig===content(c)?o:null;}
 function citation(o){var w=o.doc.weave;return (w.author?w.author+'. ':'')+'“'+w.name+'.” Indigenous Cinema Atlas: Abya Yala and Turtle Island, published constellation, '+(o.doc.updated||'')+'. '+urlFor(o.slug);}
 function cite(){
  var o=published();if(!o)return;
  var url=document.querySelector('#weave-url'),panel=document.querySelector('#weave-share-panel'),mode=document.querySelector('#weave-share-mode');
  if(url&&panel&&!panel.hidden){var want=urlFor(o.slug,mode&&mode.value==='play'?'play':'read');if(url.value!==want)url.value=want;var p=document.querySelector('#weave-citation');if(p&&p.textContent!==citation(o))p.textContent=citation(o);}
  var end=document.querySelector('#weave-play-thread'),sub=document.querySelector('#weave-play-subtitle');
  if(end&&sub&&/^constellation complete$/i.test(end.textContent.trim())&&sub.textContent!==citation(o))sub.textContent=citation(o);
 }
 var api=window.AtlasPublished={load:load,open:open,urlFor:urlFor,example:'',list:[],index:loadIndex,current:published};
 document.addEventListener('click',function(e){
  if(e.target.closest&&e.target.closest('#constellate-share,#weave-share-mode,#weave-play,#weave-play-next,#weave-play-pause'))[150,600,1400].forEach(function(t){setTimeout(cite,t);});
  var copy=e.target.closest&&e.target.closest('#weave-copy-citation');
  if(copy&&published()){e.preventDefault();e.stopImmediatePropagation();var text=citation(published());(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(function(){var st=document.querySelector('#constellate-status');if(st)st.textContent='Copied.';},function(){});}
 },true);
 document.addEventListener('change',function(e){if(e.target&&e.target.id==='weave-share-mode')[150,600].forEach(function(t){setTimeout(cite,t);});},true);
 function watchEnd(){var end=document.querySelector('#weave-play-thread');if(!end)return setTimeout(watchEnd,500);new MutationObserver(function(){setTimeout(cite,0);}).observe(end,{childList:true,characterData:true,subtree:true});}
 watchEnd();
 loadIndex().catch(function(){});
 var q=new URLSearchParams(location.search),slug=q.get('c');
 if(slug&&!location.hash.startsWith('#weave='))open(slug,q.get('play')==='1'?'play':'read').catch(function(err){ready().then(function(){window.AtlasConstellate.open();var st=document.querySelector('#constellate-status');if(st)st.textContent='Could not open that constellation: '+err.message;});});
})();
}catch(error){console.error('Constellate section failed: Published constellations (?c=slug)',error);}

/* ================================================================
   Featured constellation on the front page
   (was featured82.js)
   ================================================================ */
// Beta 82: a featured theme-weaving on the front page, opened through the atlas's own share-link format.
(async()=>{
 const A=window.Atlas;if(!A||!A.ready)return;await A.ready;
 const WEAVE={id:"1c983ffe-c000-43ba-9a9b-1cb6f9ac3ef9",payload:"zrZjbjts2GsdfheACxS4gOjpalopc5NCk00yaIEk37S5y8Yn8ZLGWSIOixvUGA-zNPsTetQ9Q7EOkT7JPsqBkj4_jcbJzMR5bPP5_H_kd9JFeoWmlVjQPPbpAuEKaf6RS0JwGPJtEZYmM-77P4qgAlkFWsIAX4zIDHmGZUY8qaJDm9IlWrcW6Biu1aokuyYUScopKdy15IhU24Dpr6zq_qwwimYOtFrBsia2M7qYVsRUSsDW0I_IN8IrUUiHhYIzElgBpK20sMQitViPy1mqzZA3MpJoSUIIYbLApDCiOpNR1rRf9hPgLNPMaWyJV_3tu9M_ILVFgDFh5hV-T2g0XWKJqkUi31EKbfl5hoLSk1IYYvJK4GFGPQmcrbWhOv9OVIi9QKRRL8lwLvaQe5QbBonhkaU5DPxyzIGB-8M6P8mSS--EoC6K_UY92c3FHt4nrJi02Lc3_vjJJKesmf3rxhvmRn-avLy5fvWNxxGTrFLAFymllW-pRu5zjqjv1qEGujRu-Hkm9oSmnJ6aQth5MheSibyTvbxobmKEj8Ha2JN_quVQzZ9wlghnkBG7rDUzdBNC2aNsHbkHWP2sfzGWt7eGqo5_nU-rRymBJczp68CdH_KEb2H7Vr_hwLeAr9_DhbZu_9k7jKkEqK9WUtXOs6y_jdWSOFbBnqxbydt1yB61gciatvTW_GNf-3u_iNZPcXQbGa92JL8N1OMWK1ouhob-ZT9aN93W8dlf9Yl57mz-CK4y3cDXQu7pTkML4GKT1wBWal9B8-m2Lxo-dIm_R6B0U4Zko3NxnAgjjfQD9xo7I9pMsf3Zx-XIt6JRkP8k2kncGrU8CKKxasDDDnISpT35CMH0geYOtbK3z61s0HtWgZEteFbppYSHVhkqQZdFpKv13t_yZRPwkG4hs9n2ERuBHKxp-mt1BI_CjfRqrQSsaP0llodrS-x0qJUs05L3kswqajd7TWrmua-SWxTEbZPtpdqbswI-2ZbsNHpOdrmUHQXSX7PRA9mrQSvbrTkHd3_aNblAKrUXyGmRdf_pNHVV-jpx0R45beFfO20ePQ-aCceAHMQsTPyjCmAfjDE80sfev3rxgfnC78tvHblicN_8K0qOnL199__yb7z3yVymAvIR5x12io8h7qOsG5t0Wv-dowAhNHqMxmkO9E3nS02cHjHWJUJywJE7TWPhBJArfP-P83K5nMMEZeq8_eHSuW9nnkzT_eO1RXZZuj8OPuVw_tpVBEFtp0vCAldK0dpOhbieM1KMCW27k3PbJL33mNk9sBZY4BeuE0n1tre4TUF0SbeRUKpcEcl33OWAD8h_OjleylYWzjjUdbvK2szO2M1OVD0MK7YSfOXVOnxpYtEQrAuRbzZ5UnZqRPkuVWvXilqPzN5DTiwamUvUJebO0FQGjOyXIj3_8a_HHf9oZjOj1zbWacI5RyjkDLjIWJ7xkE5EKFibjybiISh5DuDHQm00Cf2CfC2XRTFGh6fcNNbnSkg92KqGR9ZIICbWedrhtHulqEP359jnIV07F-jOMsjffrXpGdyzl0ss9sRvacZJEaRxkjCeILA5gzCYcSxaUY15kIgGB4w3ty62i55br0IBAUhrdEKlaKdxVMN106oopq10hZV0h1dcG7m8BFs02fa55JRX2TuduA-xnE7dH1tuDzz348ePW3N2cs18PxKWtQZb5ZJ29fPo1nyExNxnL6ISQnL5H-99__rvtFv1_VDuVqEfcQBSDBRbSVoPruU39TfTMCdbkUW01efzpd83cB_lzkGXJXzxXBLt4ITo17ZQ3WNhN3StZRxKum6ZTkg8uYmp0NyeXXd3V5CUspKhgdD-oXY47rFjLcrjLFo2Rzie5na7DmTvkHzwK3JXr73rnfv5xr6WabcUGIXxEIThL48JncZaOWZHwMRuPgxLHIuVQuuvQ6s5w_JySG8wU7ecUnTUUWNOctrtx6eYVCZI-gLl3EHf4769767XItRJE3umfPTqTSvTe0aKZG7T9XDeqf3hzOWRUw5uOtpJzmtMfWjQElNKr3jdup0h8n6fxmJViErI48yOWYZmyhIc8DaNokvDJGUQPS8RDosfqrDVGsxM9VhSfuauzKiHdTSOH9SaxegFGkHV51Xfray_v5sWU_Lzoc694wygcB2EALIzCiMXFOGAAqWAZ8DQpIgjSIjiO96A8OwS671nXMOvd4LA-kwvd-6STkUFfoSGd4ihQ9P6sx4hIBHIQ7lzOwdh7x4TlJIuimLPM52MWo5iwbCIEy7DAMh1jGKfhcUwHddsRTHth5g5MNz5s5cCL5fDmEfW8RrKoNKnlFborLe8fxHgSBiIoJmwCgWAxh5hlyDOWiCwKx6WIyqS4BcR-JbcD4v-tjm7cXQUG2_5kbJA91rZaHS0wuBWW9kKSlcOL3E1kuCd6HzzaoiuUUVxYbO5LdC_2mVRTtzWpHEx6ff0_"};
 /* 2026-11-11: the featured constellation opens from its published file (constellations/), by a short address. */
 const href=mode=>'./?c=constellations-of-indigenous-cinema'+(mode==='play'?'&play=1':'');
 const panel=document.querySelector('.map-panel');if(!panel||document.querySelector('#featured-weave'))return;
 const initiallyCollapsed=(()=>{try{return localStorage.getItem('atlas-ui-featured-collapsed')!=='false'}catch{return true}})();
 panel.insertAdjacentHTML('beforeend',`<aside id="featured-weave" class="is-collapsed" aria-label="Featured constellation">
  <button type="button" class="fw-pill"><span aria-hidden="true">✦</span> Constellate</button>
  <p class="fw-eyebrow">Featured constellation</p>
  <h2>Story, memory, land</h2>
  <ul><li><i style="--dye:#ffd35c"></i>Story-making</li><li><i style="--dye:#8fb4ff"></i>Remembrance</li><li><i style="--dye:#ff6f5a"></i>Land defense</li></ul>
  <p class="fw-actions"><a class="fw-play" href="${href('play')}">Play it <span aria-hidden="true">▸</span></a><a href="${href('read')}">Read it</a><a href="about.html">About</a></p>
  <button class="fw-close" aria-label="Hide">×</button></aside>`);
 const card=document.querySelector('#featured-weave');
 const dismissed=false;try{localStorage.removeItem('fw-hidden');}catch{}
 /* 2026-11-15: × closes the card back to the toolbar button (it no longer hides it for good). */
 card.querySelector('.fw-close').onclick=()=>{if(card.__fwSet)card.__fwSet(true);else card.classList.add('is-collapsed');};
 function update(){const busy=/(maker|film|land|community|country)=/.test(location.hash)||document.body.classList.contains('is-theme-weaving')||document.body.classList.contains('weave-playing')||document.body.classList.contains('selection-held');card.hidden=dismissed||(busy&&!card.__userOpen);}
 /* 2026-11-15: opening it from the toolbar shows it even while a filmmaker or land is selected. */
 card.addEventListener('fw-change',update);
 addEventListener('hashchange',()=>{card.__userOpen=false;update();});new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});update();
})();
;

/* ================================================================
   Toolbar: Options menu on narrow maps
   (was assets/constellate-bar.js)
   ================================================================ */
try{
/* Constellate toolbar (24 Nov 2026). One row, the same in every view and at every width:
     [+ Add ▾] [▶ Play] ......................... [↶ ↷ 🗑] [Share] [⋯] [× Exit]
   Add holds every way films come in: search, a theme, a line drawn on the map, the theme web.
   There is no Build / Read switch (reading is a view of the film list in the side panel) and no Link tool
   (the order of a thread is its links; the reason for each pair is written in the list).
   On phones the labels drop and the icons stay; nothing moves to a second row.
   All toolbar styling is the "Constellate toolbar" block at the end of constellate.css. */
(function(){
 'use strict';
 function svg(d){return '<svg class="cm-ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'+d+'</svg>';}
 var DOT='fill="currentColor" stroke="none"';
 var ICON={
  play:svg('<path d="M4.6 2.8v10.4L13 8z" '+DOT+'/>'),
  add:svg('<path d="M8 2.8v10.4M2.8 8h10.4"/>'),
  search:svg('<circle cx="7" cy="7" r="4.2"/><path d="m10.2 10.2 3.4 3.4"/>'),
  star:svg('<path d="M8 1.8 9.8 6.2 14.2 8 9.8 9.8 8 14.2 6.2 9.8 1.8 8 6.2 6.2Z"/>'),
  link:svg('<path d="M6.5 10 10 6.5M5.2 11.3l-1 1a2.8 2.8 0 0 1-4-4l3-3a2.8 2.8 0 0 1 4 0M10.8 4.7l1-1a2.8 2.8 0 0 1 4 4l-3 3a2.8 2.8 0 0 1-4 0" transform="translate(1 0) scale(.88)"/>'),
  theme:svg('<path d="M2.8 3h5.4l5 5-5.2 5.2-5.2-5V3z"/><circle cx="5.6" cy="5.8" r="1" '+DOT+'/>'),
  trace:svg('<path d="M1.6 11c1.7-3.9 3-1 4.5-3.3 1.3-2 2.4-3.9 3.9-1.6 1.2 1.9 2.5 2.6 4.4.5"/>'),
  web:svg('<circle cx="3.6" cy="4" r="1.8"/><circle cx="12.4" cy="4.9" r="1.8"/><circle cx="7.4" cy="12.4" r="1.8"/><path d="M5.4 4.2l5.2.5M4.4 5.7l2.2 4.9M11.4 6.4l-3.1 4.3"/>'),
  undo:svg('<path d="M5.6 3.4 2.6 6.4l3 3"/><path d="M2.6 6.4h7.1a3.4 3.4 0 0 1 0 6.8H7.4"/>'),
  redo:svg('<path d="m10.4 3.4 3 3-3 3"/><path d="M13.4 6.4H6.3a3.4 3.4 0 0 0 0 6.8h2.3"/>'),
  share:svg('<path d="M8 10.2V2.4M5.1 5.2 8 2.3l2.9 2.9"/><path d="M3.2 8.4v5.2h9.6V8.4"/>'),
  more:svg('<circle cx="3.2" cy="8" r="1.35" '+DOT+'/><circle cx="8" cy="8" r="1.35" '+DOT+'/><circle cx="12.8" cy="8" r="1.35" '+DOT+'/>'),
  exit:svg('<path d="m4 4 8 8M12 4l-8 8"/>'),
  clear:svg('<path d="M2.8 4.4h10.4M6.2 4.4V2.8h3.6v1.6M4.4 4.4l.7 8.8h5.8l.7-8.8"/>'),
  view:svg('<path d="M1.6 8s2.4-4.4 6.4-4.4S14.4 8 14.4 8 12 12.4 8 12.4 1.6 8 1.6 8z"/><circle cx="8" cy="8" r="2"/>'),
  read:svg('<path d="M8 4.2C6.6 3.2 4.6 2.8 2.4 3v9.4c2.2-.2 4.2.2 5.6 1.2 1.4-1 3.4-1.4 5.6-1.2V3c-2.2-.2-4.2.2-5.6 1.2z"/><path d="M8 4.2v9.4"/>')
 };
 function dress(btn,icon,text){
  if(!btn||btn.dataset.cm===text)return;btn.dataset.cm=text;
  btn.innerHTML=icon+'<span class="cm-label">'+text+'</span>';
 }
 function order(parent,els){
  var at=0;
  for(var i=0;i<els.length;i++){var e=els[i];if(!e)continue;if(parent.children[at]!==e)parent.insertBefore(e,parent.children[at]||null);at++;}
 }
 function make(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e;}
 function heading(menu,cls,text){var h=menu.querySelector('.'+cls);if(!h){h=make('small','weave-menu-heading '+cls);h.textContent=text;}return h;}
 function C(){return window.AtlasConstellate;}
 /* Opening a thread form or an idea from the menu opens the side panel at the film list first. */
 function toList(){try{C().open();C().setRead(false);C().setTab('thread');}catch(e){}}
 var placing=false;
 function place(){
  var bar=document.getElementById('constellate-mode');if(!bar||placing)return false;
  var $id=function(id){return document.getElementById(id);};
  var more=bar.querySelector('.weave-more'),menu=more&&more.querySelector('.weave-more-menu');
  var edit=$id('constellate-edit'),read=$id('constellate-read'),play=$id('weave-play'),browse=$id('weave-browse-films'),
      draw=$id('weave-draw-thread'),trace=$id('weave-trace'),web=$id('weave-theme-web-toggle'),stepper=$id('weave-stepper'),
      share=$id('constellate-share'),undo=$id('constellate-undo'),redo=$id('constellate-redo'),clear=$id('constellate-clear'),
      exit=$id('constellate-exit'),unmap=$id('weave-unmap'),newThread=$id('weave-new-thread'),idea=$id('constellate-idea'),focus=$id('weave-focus-thread');
  if(!menu||!edit||!read||!play||!browse||!draw||!share||!undo||!redo||!clear||!exit||!web)return false;
  placing=true;
  try{
   var skip=bar.querySelector('.weave-skip-to-graph');
   var title=bar.querySelector(':scope>span:not(#weave-stepper):not(.weave-tool-group):not(.cm-hold)')||bar.querySelector('.cm-hold>span:not(#weave-stepper)');
   /* kept for the engine and for shared links, never shown */
   var hold=bar.querySelector(':scope>.cm-hold')||make('div','cm-hold');/* a div: the engine writes the name into the bar's first span, which must be the name itself */hold.hidden=true;
   order(hold,[title,edit,stepper]);
   /* Add */
   var add=bar.querySelector(':scope>.cm-add');
   if(!add){
    add=make('details','cm-add');
    add.innerHTML='<summary>'+ICON.add+'<span class="cm-label">Add</span></summary><div class="cm-add-menu" role="group" aria-label="Add films"></div>';
   }
   var am=add.querySelector('.cm-add-menu');
   am.querySelector('.cm-theme-row')?.remove();
   order(am,[browse,idea,draw,newThread]);
   /* the tools that make Constellate engaging stay on the bar (24 Nov 2026): Gather, Theme web, Read */
   var tools=bar.querySelector(':scope>.cm-tools')||make('div','cm-group cm-tools');tools.setAttribute('role','group');tools.setAttribute('aria-label','Ways to gather and read');
   order(tools,[trace,web]);
   dress(browse,ICON.search,'Search films');dress(trace,ICON.trace,'Draw');dress(web,ICON.web,'Theme web');dress(read,ICON.read,'Read');
   read.title='Read';
   if(!read.dataset.cmToggle){read.dataset.cmToggle='1';read.addEventListener('click',function(e){if(read.getAttribute('aria-pressed')==='true'){e.preventDefault();e.stopImmediatePropagation();var back=document.getElementById('weave-read-back');if(back)back.click();}},true);}
   browse.title='Search films';trace.title='Draw a line to gather films';web.title='Theme web';
   /* end group */
   var end=bar.querySelector(':scope>.cm-end')||make('div','cm-group cm-end');end.setAttribute('role','group');end.setAttribute('aria-label','Constellation actions');
   var hist=bar.querySelector('.weave-tool-group')||make('span','weave-tool-group');
   order(hist,[undo,redo]);
   order(end,[hist,$id('constellate-save'),share,more,exit]);
   order(bar,[skip,hold,add,tools,play,read,end]);/* the hidden name stays the bar's first span: the engine writes to it */
   /* Options */
   var layout=heading(menu,'cm-h-layout','Map and display'),threads=heading(menu,'cm-h-threads','Threads');
   [].slice.call(menu.querySelectorAll('.weave-menu-heading')).forEach(function(h){if(h!==layout&&h!==threads)h.remove();});
   var timeline=$id('weave-timeline-toggle'),atlasT=$id('weave-atlas-toggle'),cards=$id('weave-cards-toggle'),compare=$id('weave-compare-open'),fit=$id('constellate-fit');
   order(menu,[layout,unmap,fit,timeline,atlasT,cards,threads,focus,compare,$id('constellate-new'),clear]);
   if($id('constellate-new')){$id('constellate-new').textContent='New constellation';$id('constellate-new').title='New constellation';}if(newThread&&!newThread.dataset.cm){newThread.dataset.cm='1';newThread.textContent='New thread';newThread.title='New thread';newThread.addEventListener('click',toList,true);}
   if(idea&&!idea.dataset.cmIdea){idea.dataset.cmIdea='1';idea.title='New star';idea.setAttribute('aria-label','New star');idea.addEventListener('click',toList,true);}dress(idea,ICON.star,'New star');dress(draw,ICON.link,'Link films');draw.setAttribute('aria-label',draw.getAttribute('aria-pressed')==='true'?'Done linking':'Link films');browse.setAttribute('aria-label','Search films');
   if(focus&&focus.hidden)focus.removeAttribute('hidden');
   if(unmap)dress(unmap,ICON.view,'Disappear map');
   dress(play,ICON.play,'Play');dress(undo,ICON.undo,'Undo');dress(redo,ICON.redo,'Redo');dress(share,ICON.share,'Share');dress(exit,ICON.exit,'Exit');dress(clear,ICON.clear,'Clear');
   clear.title='Clear';clear.setAttribute('aria-label','Clear');
   var summary=more.querySelector('summary');
   if(summary&&!summary.dataset.cm){summary.dataset.cm='1';summary.innerHTML=ICON.more+'<span class="cm-label">Options</span>';}
   if(summary){summary.setAttribute('aria-label','Options');summary.title='Options';}
   bar.setAttribute('aria-label','Constellate');
   play.title='Play';
   undo.title='Undo';redo.title='Redo';undo.setAttribute('aria-label','Undo');redo.setAttribute('aria-label','Redo');
   exit.title='Exit';share.title='Share';
   menu.style.removeProperty('top');
  }finally{placing=false;}
  return true;
 }
 function closeMenus(except){[].forEach.call(document.querySelectorAll('#constellate-mode details[open]'),function(d){if(d!==except)d.open=false;});}
 function start(){
  var watching=false;
  function watch(){
   var bar=document.getElementById('constellate-mode');if(!bar||watching)return;watching=true;
   // Toolbar structure is assembled once. State changes update the existing controls.
   var add=bar.querySelector('.cm-add');
   var tools=bar.querySelector('.cm-tools'),am=add.querySelector('.cm-add-menu'),browse=document.getElementById('weave-browse-films'),idea=document.getElementById('constellate-idea'),draw=document.getElementById('weave-draw-thread'),trace=document.getElementById('weave-trace'),web=document.getElementById('weave-theme-web-toggle'),thread=document.getElementById('weave-new-thread');
   // Move the existing controls, not copies, so state, keyboard access and event handlers stay intact.
   var band=-1;function adapt(){var w=bar.clientWidth;if(!w)return;var next=w>=1050?2:w>=830?1:0;if(next===band)return;band=next;add.open=false;order(am,[next?null:browse,next?null:idea,next===2?null:draw,thread]);order(tools,[next?browse:null,trace,web,next?idea:null,next===2?draw:null]);bar.dataset.tools=String(next);}
   var ro=new ResizeObserver(adapt);ro.observe(bar);adapt();
   add.addEventListener('toggle',function(){if(add.open)closeMenus(add);});
   bar.querySelector('.weave-more').addEventListener('toggle',function(e){if(e.target.open)closeMenus(e.target);});

  }
  if(place())watch();
  else{
   var observer=new MutationObserver(function(){if(place()){observer.disconnect();watch();}});
   observer.observe(document.body,{childList:true,subtree:true});
   setTimeout(function(){observer.disconnect();},20000);
  }
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var d=document.querySelector('#constellate-mode details[open]');if(d){e.preventDefault();d.open=false;var s=d.querySelector('summary');if(s)s.focus();e.stopPropagation();}},true);
  document.addEventListener('click',function(e){
   var b=e.target.closest&&e.target.closest('#constellate-mode .weave-more-menu button,#constellate-mode .cm-add-menu button');
   if(b){var d=b.closest('details');if(d)setTimeout(function(){d.open=false;},0);return;}
   [].forEach.call(document.querySelectorAll('#constellate-mode details[open]'),function(d){if(!d.contains(e.target))d.open=false;});
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
}catch(error){console.error('Constellate section failed: Toolbar: Options menu on narrow maps',error);}

/* ================================================================
   Theme web
   (was assets/constellate-theme-web.js)
   ================================================================ */
try{
/* Constellate: sourced, exploratory theme-to-film network.
 * Relationships here mean that the same film has both tags in the published atlas.
 * They are NOT claims of affinity between peoples, territories or filmmakers.
 * No coordinates are assigned to concepts; original map stays present beneath this lens.
 */
(function(){
 'use strict';
 var COLORS={
  'Land and Environment':'#33786e',
  'Sovereignty and Politics':'#b7624f',
  'Knowledge and Continuity':'#7770a3',
  'Lives and Relations':'#c08d40',
  'Expression and Representation':'#477eaa',
  'Other themes':'#75838c'
 };
 var FAMILY_MAP={
  'Land and Environment':['Land Defense','Water','Environmental Change','More-than-Human Relations','Food Sovereignty','Extractivism','Land and Territory','Environmental Justice','Territory and Place'],
  'Sovereignty and Politics':['Sovereignty and Self-Determination','Justice, Truth and Reconciliation','Resistance Movements','Governance','Borders and Colonialism','Decolonization'],
  'Knowledge and Continuity':['Linguistic Preservation','Memory and Oral History','Elders and Knowledge','Cosmology and Origin Stories','Ceremony and Spirituality','Archives, Museums and Repatriation','Intergenerational Transmission'],
  'Lives and Relations':['Kinship','Youth','Women and Gender','Health and Healing','Displacement and Migration','Urban Indigeneity'],
  'Expression and Representation':['Art, Craft and Making','Music and Performance','Self-Representation and Countering Stereotypes','Collective and Community Media','Indigenous Futurisms','Humor and Satire']
 };
 var nodeByName=new Map(),films=[],graphLinks=[],families=[],selected='',selectedPair='',activeFamily='All themes',search='',isOpen=false,view=null;
 var filmsShown=8,lastFilmView='',showAllBridges=false;
 var NS='http://www.w3.org/2000/svg';
 var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var canon=function(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();};
 var short=function(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s;};
 var controls,root,svg,aside,list,searchBox,chipRow,notice,toggle;
 function atlas(){return window.AtlasConstellate;}
 function store(){return window.AtlasCollections;}
 function family(term){
  var vocabulary=window.ATLAS_THEMES_1103&&window.ATLAS_THEMES_1103.families;
  if(vocabulary)for(var key of Object.keys(vocabulary))if(vocabulary[key].includes(term))return key;
  for(var f of Object.keys(FAMILY_MAP))if(FAMILY_MAP[f].includes(term))return f;
  return 'Other themes';
 }
 function collect(){
  var api=atlas();if(!api)return false;
  var grouped=new Map(),entries=new Map();films=[];
  for(var t of api.themeTerms()){
   var node={name:t,films:[],family:family(t),count:0};grouped.set(t,node);
   for(var x of api.themeFilms(t)){
    if(!entries.has(x.id)){var entry={x:x,tags:api.terms(x)};entries.set(x.id,entry);films.push(entry);}
    node.films.push(entries.get(x.id));
   }
  }
  var nodes=[...grouped.values()].filter(n=>n.films.length>0).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
  // The site vocabulary contains 30 themes; display all attested themes, never invent a node.
  nodeByName=new Map(nodes.map(n=>[n.name,n]));
  families=[...new Set(nodes.map(n=>n.family))].sort(function(a,b){return Object.keys(COLORS).indexOf(a)-Object.keys(COLORS).indexOf(b);});
  var ties=new Map();
  for(var f of films){
   var names=f.tags.filter(t=>nodeByName.has(t));
   for(var a=0;a<names.length;a++)for(var b=a+1;b<names.length;b++){
    var pair=[names[a],names[b]].sort(),key=pair.join('\u001f');
    if(!ties.has(key))ties.set(key,{source:pair[0],target:pair[1],count:0,films:[]});
    var l=ties.get(key);l.count++;l.films.push(f);
   }
  }
  graphLinks=[...ties.values()].sort((a,b)=>b.count-a.count);
  return nodes.length>0;
 }
 function markup(){
  var map=document.querySelector('.map-panel'),bar=document.getElementById('constellate-mode');
  if(!map||!bar)return false;
  toggle=document.createElement('button');
  toggle.type='button';toggle.id='weave-theme-web-toggle';toggle.textContent='Theme web';
  toggle.title='Browse the documented theme network, select bridges, and start a thread';
  toggle.setAttribute('aria-controls','atlas-theme-web');
  toggle.setAttribute('aria-expanded','false');
  var before=document.getElementById('constellate-read')||document.getElementById('weave-play');
  if(before&&before.parentNode===bar)bar.insertBefore(toggle,before);else bar.append(toggle);
  map.insertAdjacentHTML('beforeend',
   '<section id="atlas-theme-web" class="theme-web" hidden aria-label="Theme network within the atlas">'+
    '<div class="tw-heading"><div><p class="tw-kicker">CONSTELLATE · THEME WEB</p><h2>Follow the themes</h2><p>Each line joins two themes documented together in a film synopsis. Select a theme or a bridge to follow the films.</p></div>'+
    '<button id="tw-close" type="button" aria-label="Close theme network">×</button></div>'+
    '<div class="tw-top"><label for="tw-search">Find a theme</label><input id="tw-search" type="search" placeholder="Search themes or families…" autocomplete="off">'+
    '<button id="tw-seed" type="button">Begin with 3 themed threads</button></div>'+
    '<div id="tw-families" class="tw-families" role="group" aria-label="Theme families"></div>'+
    '<div class="tw-main"><div class="tw-graph-wrap"><div id="tw-mobile-list" class="tw-mobile-list" aria-label="Browse themes by name"></div><svg id="tw-graph" viewBox="0 0 720 550" role="group" aria-label="Interactive network of sourced themes and co-tagged films"></svg>'+
      '<p class="tw-graph-foot"><span id="tw-stat"></span> · Overview favors frequent co-tags, not cultural affinity or importance. <button type="button" id="tw-all-links" aria-pressed="false">All bridges</button> <button type="button" id="tw-reset">Reset view</button></p></div>'+ 
    '<aside id="tw-detail" class="tw-detail" aria-live="polite" aria-label="Selected theme and films"></aside></div>'+
    '<p id="tw-live" class="sr-only" role="status" aria-live="polite"></p>'+
   '</section>');
  root=document.getElementById('atlas-theme-web');svg=document.getElementById('tw-graph');aside=document.getElementById('tw-detail');
  searchBox=document.getElementById('tw-search');chipRow=document.getElementById('tw-families');notice=document.getElementById('tw-live');
  toggle.onclick=function(){show(!isOpen);};
  document.getElementById('tw-close').onclick=function(){show(false);toggle.focus({preventScroll:true});};
  document.getElementById('tw-reset').onclick=function(){activeFamily='All themes';selected='';selectedPair='';search='';searchBox.value='';draw();};
   document.getElementById('tw-all-links').onclick=function(){showAllBridges=!showAllBridges;draw();};
  document.getElementById('tw-seed').onclick=example;
  searchBox.addEventListener('input',function(){search=searchBox.value.trim();selectedPair='';draw();});
  chipRow.addEventListener('click',function(e){var b=e.target.closest('[data-family]');if(!b)return;activeFamily=b.dataset.family;selected='';selectedPair='';draw();});
  svg.addEventListener('click',function(e){
   var edge=e.target.closest('[data-bridge]'),node=e.target.closest('[data-term]');
   if(edge){selectedPair=edge.dataset.bridge;selected='';draw();return;}
   if(node){selected=node.dataset.term;selectedPair='';draw();return;}
  });
  svg.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var el=e.target.closest('[data-term],[data-bridge]');if(el){e.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  document.getElementById('tw-mobile-list').addEventListener('click',function(e){
   var b=e.target.closest('[data-mobile-term],[data-mobile-network]');if(!b)return;
   if(b.hasAttribute('data-mobile-network')){
    root.classList.toggle('tw-show-network');
    b.textContent=root.classList.contains('tw-show-network')?'List of themes':'See the network diagram';
    drawGraph();return;
   }
   selected=b.dataset.mobileTerm;selectedPair='';draw();
   if(window.matchMedia('(max-width:700px)').matches)aside.scrollIntoView({block:'start',behavior:'instant'});
  });
  aside.addEventListener('click',function(e){
   var b=e.target.closest('[data-open-term],[data-film-id],[data-start-term],[data-more-films],[data-tw-reset],[data-show-theme-map]');if(!b)return;if(b.hasAttribute('data-tw-reset')){document.getElementById('tw-reset').click();searchBox.focus({preventScroll:true});return;}
    if(b.hasAttribute('data-more-films')){filmsShown+=8;detail();return;}
   if(b.hasAttribute('data-show-theme-map')){var edge=selectedPair&&graphLinks.find(l=>l.source+'\u001f'+l.target===selectedPair);var ts=edge?[edge.source,edge.target]:selected?[selected]:[];if(ts.length){show(false);atlas().showThemeLens(ts);}return;}
   if(b.dataset.openTerm){selected=b.dataset.openTerm;selectedPair='';search='';searchBox.value='';activeFamily='All themes';draw();return;}
   if(b.dataset.startTerm){
    show(false);atlas().themeThread(b.dataset.startTerm);
    notice.textContent='Started a theme thread from published film tags.';
    return;
   }
   if(b.dataset.filmId){
    var entry=films.find(f=>f.x.id===b.dataset.filmId);
    if(!entry)return;
    show(false);atlas().showPreview(entry.x,{from:'theme'});
   }
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen){show(false);toggle.focus();}});
  document.addEventListener('click',function(e){if(e.target.closest('#constellate-exit')&&isOpen)show(false);});
  return true;
 }
 function visibleNodes(){
  var needle=canon(search),list=[...nodeByName.values()];
  return list.filter(n=>(activeFamily==='All themes'||n.family===activeFamily)&&(!needle||canon(n.name).includes(needle)||canon(n.family).includes(needle)));
 }
 function draw(){
  if(!isOpen)return;
  var nodes=visibleNodes(),names=new Set(nodes.map(n=>n.name)),edges=graphLinks.filter(l=>names.has(l.source)&&names.has(l.target));
  var caption=nodes.length+' matching themes · '+films.length+' tagged films · '+graphLinks.length+' sourced co-tag bridges';
   var linksButton=document.getElementById('tw-all-links');
   var applicable=selectedPair?1:selected?edges.filter(l=>l.source===selected||l.target===selected).length:edges.length;linksButton.hidden=selectedPair||applicable<=(selected?55:(activeFamily==='All themes'&&!search?28:55));
   linksButton.textContent=showAllBridges?'Show strongest bridges':'Show all '+applicable+' bridges';
   linksButton.setAttribute('aria-pressed',String(showAllBridges));
  document.getElementById('tw-stat').textContent=caption;
  chipRow.innerHTML=['All themes'].concat(families).map(f=>'<button type="button" data-family="'+esc(f)+'" aria-pressed="'+(f===activeFamily)+'"><i style="background:'+esc(COLORS[f]||'#667e8b')+'"></i>'+esc(f)+(f==='All themes'?'':' <small>'+[...nodeByName.values()].filter(x=>x.family===f).length+'</small>')+'</button>').join('');
  var mobile=document.getElementById('tw-mobile-list');
  mobile.innerHTML='<div class="tw-mobile-guide"><strong>Explore '+nodes.length+' themes</strong><button type="button" data-mobile-network>'+(root.classList.contains('tw-show-network')?'List of themes':'See the network diagram')+'</button></div>'+
   '<div class="tw-mobile-grid">'+nodes.map(function(n){return '<button type="button" data-mobile-term="'+esc(n.name)+'" aria-pressed="'+(selected===n.name)+'"><i style="background:'+esc(COLORS[n.family]||'#75838c')+'"></i><span>'+esc(n.name)+'</span><small>'+n.films.length+' films</small></button>';}).join('')+'</div>';
  drawGraph(nodes,edges);detail();if(!nodes.length){aside.innerHTML='<p class="tw-kicker">NO MATCHES</p><h3>No themes found</h3><p>Try a theme family (such as Knowledge), a shorter term, or reset the view.</p><button type="button" data-tw-reset>Clear theme search</button>';}
 }
 function drawGraph(provided,providedEdges){
  if(!isOpen)return;
  var nodes=provided||visibleNodes(),names=new Set(nodes.map(n=>n.name)),edges=providedEdges||graphLinks.filter(l=>names.has(l.source)&&names.has(l.target));
  var bounds=svg.getBoundingClientRect(),w=Math.max(620,Math.round(bounds.width||720)),h=Math.max(440,Math.round(bounds.height||550));
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  // Stable thematic-family lanes preserve legible labels at all 30 nodes.
  // The network is a diagram of co-tags, not a geographic or semantic distance map.
  var orders=Object.keys(COLORS).filter(f=>nodes.some(n=>n.family===f));
   var tallestFamily=Math.max(0,...orders.map(f=>nodes.filter(n=>n.family===f).length));
   if(activeFamily==='All themes'&&!search&&orders.length>1){h=Math.max(h,120+tallestFamily*74);svg.setAttribute('viewBox','0 0 '+w+' '+h);}
   // Keep spacing in screen pixels; scaling a taller viewBox into a fixed-height
   // SVG would shrink the labels and restore their overlap.
   var expanded=h>Math.max(440,Math.round(bounds.height||550))&&window.matchMedia('(min-width:701px)').matches;
   svg.style.flex=expanded?'0 0 auto':'';
   svg.style.height=expanded?h+'px':'';
   svg.parentElement.style.overflowY=expanded?'auto':'';
  var laneMode=orders.length>1&&activeFamily==='All themes'&&!search;
  var placed=[],familyHeaders='';
  if(laneMode){
   var gap=w/orders.length;
   orders.forEach(function(f,col){
    var group=nodes.filter(n=>n.family===f).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
    var step=Math.max(74,(h-100)/Math.max(1,group.length));
    familyHeaders+='<text class="tw-family-head" x="'+(gap*(col+.5)).toFixed(1)+'" y="24" text-anchor="middle">'+esc(({'Land and Environment':'LAND','Sovereignty and Politics':'SOVEREIGNTY','Knowledge and Continuity':'KNOWLEDGE','Lives and Relations':'RELATIONS','Expression and Representation':'EXPRESSION'})[f]||short(f,15))+'</text>';
    group.forEach(function(n,row){placed.push({id:n.name,node:n,r:Math.min(22,6+Math.sqrt(n.films.length)*1.4),x:gap*(col+.5),y:65+step*(row+.5)});});
   });
  }else{
   var cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(nodes.length*1.5))));var rows=Math.max(1,Math.ceil(nodes.length/cols));
   nodes.forEach(function(n,i){placed.push({id:n.name,node:n,r:Math.min(23,7+Math.sqrt(n.films.length)*1.5),x:w*(i%cols+.5)/cols,y:65+(h-135)*(Math.floor(i/cols)+.5)/rows});});
  }
  var byId=new Map(placed.map(x=>[x.id,x]));
  var related=new Set();
  if(selected){for(var e of edges)if(e.source===selected)related.add(e.target);else if(e.target===selected)related.add(e.source);}
  var dimTheme=function(n){return selected&&n!==selected&&!related.has(n);};
  var scoped=selectedPair?edges.filter(function(l){return l.source+String.fromCharCode(31)+l.target===selectedPair;}):selected?edges.filter(function(l){return l.source===selected||l.target===selected;}):edges;
   var ranked=scoped.slice().sort(function(a,b){var pa=selected&&(a.source===selected||a.target===selected)?1000:0,pb=selected&&(b.source===selected||b.target===selected)?1000:0;return pb-pa||b.count-a.count;});
   // The overview is intentionally legible: 28 strongest co-tag bridges, not a hairball.
   // Theme/family selection expands the relevant connections; All bridges is opt-in.
   var limit=showAllBridges?scoped.length:(selected?Math.min(55,scoped.length):(activeFamily==='All themes'&&!search?28:55));
   var shown=ranked.slice(0,limit);
   if(selectedPair){
    var chosenBridge=edges.find(function(l){return l.source+'\u001f'+l.target===selectedPair;});
    if(chosenBridge&&!shown.includes(chosenBridge)){if(shown.length)shown.pop();shown.unshift(chosenBridge);}
   }
   var edgeLines=shown.map(function(l){
   var a=byId.get(l.source),b=byId.get(l.target);
   if(!a||!b)return '';
   var highlighted=selectedPair===(l.source+'\u001f'+l.target)||!!selected&&(l.source===selected||l.target===selected);
   var faded=(!!selected&&!highlighted)||(!!selectedPair&&!highlighted);
   return '<g class="tw-bridge" role="button" tabindex="0" aria-label="'+esc(l.source+' and '+l.target+', '+l.count+' films with both themes')+'" data-bridge="'+esc(l.source+'\u001f'+l.target)+'">'+
    '<line class="tw-edge'+(highlighted?' is-related':'')+(faded?' is-faded':'')+'" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke-width="'+Math.min(6,0.7+Math.sqrt(l.count)*.65).toFixed(1)+'"/>'+
    '<line class="tw-edge-hit" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="transparent" stroke-width="16"/>'+
    '<title>'+esc(l.source+' + '+l.target+' · '+l.count+' film'+(l.count===1?'':'s'))+'</title></g>';
  }).join('');
  var dots=placed.map(function(n){
   var active=n.id===selected,fade=dimTheme(n.id),c=COLORS[n.node.family]||COLORS['Other themes'];
   return '<g class="tw-node'+(active?' is-chosen':'')+(fade?' is-faded':'')+'" data-term="'+esc(n.id)+'" role="button" tabindex="0" aria-label="'+esc(n.id+', '+n.node.films.length+' tagged films')+'" transform="translate('+n.x.toFixed(1)+','+n.y.toFixed(1)+')">'+
     '<circle class="tw-ring" r="'+(n.r+6)+'"/><circle class="tw-dot" r="'+n.r+'" fill="'+c+'"/><text class="tw-count" dy="4" text-anchor="middle">'+n.node.films.length+'</text>'+
     '<text class="tw-node-label" y="'+(n.r+17)+'" text-anchor="middle">'+esc(short(n.id,20))+'</text>'+
     '<title>'+esc(n.id+' · '+n.node.films.length+' films')+'</title></g>';
  }).join('');
  svg.innerHTML='<g class="tw-family-headings">'+familyHeaders+'</g><g>'+edgeLines+dots+'</g>';
 }
 function detail(){
  var viewKey=selectedPair?'bridge:'+selectedPair:selected?'theme:'+selected:'home';
  if(viewKey!==lastFilmView){lastFilmView=viewKey;filmsShown=8;}
  var entry=nodeByName.get(selected),edge=selectedPair&&graphLinks.find(l=>l.source+'\u001f'+l.target===selectedPair);
  if(edge){
   var both=edge.films;
   aside.innerHTML='<p class="tw-kicker">DOCUMENTED BRIDGE</p><h3>'+esc(edge.source)+' <span class="tw-and">×</span> '+esc(edge.target)+'</h3>'+
    '<p class="tw-claim">Both tags occur on the same '+both.length+' film'+(both.length===1?'':'s')+'. This is a cataloguing bridge, not an assertion that the communities or makers are culturally identical.</p>'+
    '<div class="tw-actions"><button type="button" class="tw-primary" data-show-theme-map>Show on map</button><button type="button" data-open-term="'+esc(edge.source)+'">Explore first theme</button><button type="button" data-open-term="'+esc(edge.target)+'">Explore second</button></div>'+renderFilms(both);
  }else if(entry){
   var rel=graphLinks.filter(l=>l.source===entry.name||l.target===entry.name).sort((a,b)=>b.count-a.count).slice(0,12);
   aside.innerHTML='<p class="tw-kicker">'+esc(entry.family)+'</p><h3>'+esc(entry.name)+'</h3><p class="tw-claim">'+entry.films.length+' film'+(entry.films.length===1?'':'s')+' have this theme in the atlas. The tags originate in film descriptions; see each film’s synopsis source for the evidence.</p>'+
    '<div class="tw-actions"><button class="tw-primary" type="button" data-show-theme-map>Show on map</button><button type="button" data-start-term="'+esc(entry.name)+'">Start with 6 films</button></div>'+
    (rel.length?'<h4>Bridges to other themes</h4><div class="tw-neighbors">'+rel.map(l=>{var term=l.source===entry.name?l.target:l.source;return '<button type="button" data-open-term="'+esc(term)+'">'+esc(term)+' <small>'+l.count+' shared film'+(l.count===1?'':'s')+'</small></button>';}).join('')+'</div>':'')+
    '<h4>Films tagged '+esc(entry.name)+'</h4>'+renderFilms(entry.films);
  }else{
   aside.innerHTML='<p class="tw-kicker">HOW TO READ THIS WEB</p><h3>Films connect the themes.</h3>'+
    '<p class="tw-claim">Choose any circle to see its films, or choose a line to see films carrying both themes. Colors group themes for navigation; the network is not a ranking of peoples, places or cultures.</p>'+
    '<h4>Start with a question</h4><div class="tw-neighbors">'+
    [...nodeByName.values()].sort((a,b)=>b.films.length-a.films.length).slice(0,8).map(n=>'<button data-open-term="'+esc(n.name)+'">'+esc(n.name)+' <small>'+n.films.length+' films</small></button>').join('')+'</div>'+
    '<p class="tw-source-note">The underlying map retains sourced land references. Theme nodes have no invented geographical coordinates. Readers can build, annotate, export, and share their own film constellations.</p>';
  }
 }
 function renderFilms(arr){
  var api=atlas(),seen=new Set(),unique=[];
  for(var item of arr){if(seen.has(item.x.id))continue;seen.add(item.x.id);unique.push(item);if(unique.length===filmsShown)break;}
  var total=new Set(arr.map(e=>e.x.id)).size;
  return '<div class="tw-films">'+unique.map(function(item){
   var x=item.x,f=window.Atlas&&window.Atlas.recordById&&window.Atlas.recordById(x.record)?.films.find(g=>g.id===x.film);
   var source=f&&f.themeSource;try{if(new URL(source).protocol!=='https:')source='';}catch{source='';}
   return '<article class="tw-film"><div class="tw-film-art">'+api.thumb(x)+'</div>'+ 
    '<div class="tw-film-copy"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small>'+
    (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Synopsis source ↗</a>':'<span class="tw-no-source">Atlas theme tag</span>')+'</div>'+
    '<button type="button" data-film-id="'+esc(x.id)+'" aria-label="Explore '+esc(x.title)+'">Explore</button></article>';
  }).join('')+'</div>'+(total>unique.length?'<div class="tw-more-actions"><span class="tw-more-count">Showing '+unique.length+' of '+total+' films</span><button type="button" data-more-films>Show next '+Math.min(8,total-unique.length)+' films</button></div>':'');
 }
 function example(){
  var api=atlas(),s=store();if(!api||!s)return;
  if(s.state.collections.length>=50){notice.textContent='Export or remove an old constellation before creating a new one.';return;}
  var all=[...nodeByName.values()];
  var candidates=[
   'Land Defense','Justice, Truth and Reconciliation','Linguistic Preservation',
   'Kinship','Art, Craft and Making','More-than-Human Relations',
   'Memory and Oral History','Health and Healing','Women and Gender','Music and Performance'
  ];
  var chosen=[];
  for(var name of candidates){var node=nodeByName.get(name);if(node&&node.films.length>=4)chosen.push(node);if(chosen.length>=3)break;}
  if(chosen.length<3){
   for(var node of all.sort((a,b)=>b.films.length-a.films.length))if(!chosen.some(x=>x.name===node.name)&&node.films.length>=4)chosen.push(node);
  }
  chosen=chosen.slice(0,3);
  if(chosen.length<2){notice.textContent='More documented theme tags are needed before a sample can be built.';return;}
  if(!s.create('Across themes · a sourced film constellation')){notice.textContent='Could not create a new constellation.';return;}
  var c=s.current();c.note='An example for visual research. Each colored thread follows a theme assigned from a published film synopsis. Shared films cross between threads. Co-tagging is evidence of a catalog relationship, not evidence of cultural similarity, collaboration or a filmmaker endorsement. Read the film sources, then revise and annotate these paths. This starting selection is intentionally small; add new films and threads as your question develops.';
  var usedIds=new Set(),seenMakers=new Set(),colors=['star-bluewhite','star-blue','star-yellow','star-red','star-orange','star-white'];
  chosen.forEach(function(node,i){
   var t=i?s.createThread(node.name,'Sourced from the published film synopsis; interpret each transition rather than assuming affinity.',colors[i%colors.length]):c.threads[0].id;
   var thread=c.threads.find(x=>x.id===t);
   thread.name=node.name;thread.description='Films tagged '+node.name+'. Co-membership in a theme is a documented catalog relation, not a claim about culture or kinship.';thread.color=colors[i%colors.length];
   var ranked=node.films.slice().sort(function(a,b){
    var aa=(api.sourceImage(a.x)?1:0)+Math.min(4,a.tags.length)*.35;
    var bb=(api.sourceImage(b.x)?1:0)+Math.min(4,b.tags.length)*.35;
    return bb-aa||(a.x.year||9999)-(b.x.year||9999);
   });
   var picks=[],local=new Set();
   for(var f of ranked){if(local.has(f.x.record)||f.x.type!=='film')continue;local.add(f.x.record);picks.push(f);if(picks.length===4)break;}
   for(var f of picks){var clean=s.item(f.x);if(!clean)continue;if(!c.items.some(x=>x.id===clean.id))c.items.push(clean);if(!thread.items.includes(clean.id))thread.items.push(clean.id);usedIds.add(clean.id);seenMakers.add(clean.record);}
  });
  c.activeThread=c.threads[0].id;c.selectedItem=null;s.save();
  show(false);api.open();api.fit();
  notice.textContent='Created '+chosen.length+' sourced theme threads with '+usedIds.size+' films across '+seenMakers.size+' filmmaker records.';
 }
 function show(on){
  if(on&&!atlas()?.enabled)atlas()?.open({dock:false});if(on&&atlas()?.tracing)atlas().stopTrace();
  isOpen=!!on;
  root.hidden=!isOpen;
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-pressed',String(isOpen));
  document.body.classList.toggle('is-theme-web-open',isOpen);
  if(isOpen){draw();searchBox.focus({preventScroll:true});}
 }
 var resizeFrame=0;window.addEventListener('resize',function(){if(!isOpen||resizeFrame)return;resizeFrame=requestAnimationFrame(function(){resizeFrame=0;if(isOpen)drawGraph();});},{passive:true});
 function init(){
  var tries=0;
  var timer=setInterval(function(){
   tries++;
   if(atlas()?.catalog&&store()&&document.getElementById('constellate-mode')){
    clearInterval(timer);
    if(collect()&&markup()){window.AtlasThemeWeb={close:()=>show(false),open:()=>show(true)};var query=new URLSearchParams(location.search);if(query.get('theme-web')==='1'){atlas().open();show(true);}}
   }else if(tries>70)clearInterval(timer);
  },200);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
}catch(error){console.error('Constellate section failed: Theme web',error);}

/* ================================================================
   Stages, start card, guide box, suggestions, legend
   (was assets/weave-20261109.js)
   ================================================================ */
try{
/* Constellate: a clearer way into weaving, 2026-11-09.
   Three stages, set on <html data-weave-stage>:
   - start: the weave is empty. One card on the map offers three ways in (a theme, a film, the example), plus the
     theme web and any saved weaves. The side panel and the building tools wait until something is on the map.
   - build: a guide at the top of the panel says where you are (add films, link them, read and share), in plain words,
     with the next useful action. The toolbar shows building tools only while building.
   - read / play: building tools step aside.
   Uses the existing Constellate API (window.AtlasConstellate, window.AtlasCollections) and its buttons; no engine code
   is replaced. Clear weave stays in the toolbar, behind the existing confirmation and Undo. */
(function(){'use strict';
var root=document.documentElement,$=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s));};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var norm=function(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();};
var C=function(){return window.AtlasConstellate;},S=function(){return window.AtlasCollections;};
var showWelcome=false,keepBuild=false;
window.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(document.documentElement.dataset.weaveStage!=='start'||document.body.classList.contains('is-theme-web-open'))return;var t=e.target;if(t&&t.closest&&t.closest('input,select,textarea')&&t.value)return;var b=document.querySelector('#weave-start [data-ws-close]');if(b){e.preventDefault();e.stopImmediatePropagation();b.click();}},true);/* once you have been in Build, emptying the constellation (Clear, Undo, deleting films) keeps you there */
document.addEventListener('click',function(e){if(e.target.closest('.constellate-link'))showWelcome=true;},true);

function on(){var c=C();return !!(c&&c.enabled&&document.body.classList.contains('is-constellating'));}
function current(){try{return S().current();}catch(e){return null;}}
function thread(){try{return S().activeThread();}catch(e){return null;}}
function reading(){var b=$('#constellate-read');return !!(b&&b.getAttribute('aria-pressed')==='true');}
function stage(){
 if(!on()){showWelcome=false;keepBuild=false;return '';}
 var c=current();if(!c)return '';
 if(c.items.length)keepBuild=true;
 if(C().playing)return 'play';
 if(reading())return 'read';
 if(C().tracing)return 'build';
 /* 24 Nov 2026: no start screen; Constellate opens on the map */keepBuild=true;return 'build';
}

/* ---------- the start card ---------- */
function themes(){
 return $$('#weave-theme-start option').map(function(o){var m=/^(.*) \((\d+)\)$/.exec(o.textContent.trim());return m?{name:m[1],n:+m[2]}:null;}).filter(Boolean).sort(function(a,b){return b.n-a.n;});
}
function films(){
 var seen={},out=[];(C().catalog||[]).forEach(function(x){if(x.type!=='film'||seen[x.film+'|'+x.title])return;seen[x.film+'|'+x.title]=1;out.push(x);});return out;
}
var FILMS=null;
function search(q){
 q=norm(q).trim();if(q.length<2)return [];
 FILMS=FILMS||films();
 var hits=[];for(var i=0;i<FILMS.length&&hits.length<40;i++){var x=FILMS[i],t=norm(x.title),m=norm(x.maker);if(t.indexOf(q)>=0||m.indexOf(q)>=0)hits.push([t.indexOf(q)===0?0:t.indexOf(q)>=0?1:2,x]);}
 return hits.sort(function(a,b){return a[0]-b[0];}).slice(0,6).map(function(h){return h[1];});
}
function weavesSaved(){try{return (S().state.collections||[]).filter(function(w){return S().saved(w.id)&&w.items&&w.items.length;});}catch(e){return [];}}
function buildStart(){
 var host=$('#atlas')&&$('#atlas').parentElement;if(!host||$('#weave-start'))return;
 var top=themes().slice(0,6),all=themes().sort(function(a,b){return a.name.localeCompare(b.name);});
 var sec=document.createElement('section');sec.id='weave-start';sec.setAttribute('aria-labelledby','weave-start-title');
 sec.innerHTML=
  '<button type="button" class="ws-close" data-ws-close aria-label="Close this start screen" title="Close (Esc)">×</button>'+
  '<p class="ws-kicker">Constellate</p>'+
  '<h2 id="weave-start-title">How can films encounter each other?</h2>'+
  '<div class="ws-paths">'+
   '<section class="ws-path"><h3>Start from a theme</h3><p>Every film shares the theme, from its published synopsis.</p>'+
    '<div class="ws-chips">'+top.map(function(t){return '<button type="button" data-ws-theme="'+esc(t.name)+'">'+esc(t.name)+' <small>'+t.n+'</small></button>';}).join('')+'</div>'+ 
    '<label class="ws-sr" for="ws-theme-all">All themes</label><select id="ws-theme-all"><option value="">All 30 themes…</option>'+all.map(function(t){return '<option value="'+esc(t.name)+'">'+esc(t.name)+' ('+t.n+')</option>';}).join('')+'</select></section>'+
   '<section class="ws-path"><h3>Start from a film</h3><p>Films that share a theme with it are suggested next.</p>'+
    '<label class="ws-sr" for="ws-film-q">Search a film or filmmaker</label><input id="ws-film-q" type="search" autocomplete="off" placeholder="Search a film or filmmaker…">'+
    '<ul id="ws-film-results" class="ws-results" aria-live="polite"></ul></section>'+
   '<section class="ws-path"><h3>Gather along a line</h3><p>Draw a line across the map. The lands it crosses give their films, in the order it crosses them.</p>'+
    '<button type="button" class="ws-primary" data-ws-trace>Draw a line</button></section>'+
  '</div>'+
  '<div class="ws-examples"><span>Examples</span><button type="button" data-ws-example>Story, memory, land</button><span class="ws-example-more"></span><button type="button" class="ws-link" data-ws-web>Theme web →</button></div>'+
  '<div class="ws-current" hidden><button type="button" data-ws-continue>Continue this constellation</button><small class="ws-current-name"></small></div>'+ 
  '<div class="ws-saved" hidden><label for="ws-saved-select">Open a saved constellation</label><select id="ws-saved-select"></select></div>';
 host.appendChild(sec);
 
 sec.addEventListener('click',function(e){
  var t=e.target.closest('[data-ws-theme]');if(t){showWelcome=false;C().themeThread(t.dataset.wsTheme);settle();return;}
  if(e.target.closest('[data-ws-example]')){showWelcome=false;var P=window.AtlasPublished,old=function(){var b=$('#weave-example');if(b)b.click();settle();};if(P&&P.example){P.open(P.example,'read').then(settle,old);}else old();return;}
  var sm=e.target.closest('[data-ws-sample]');if(sm){showWelcome=false;var P3=window.AtlasPublished;if(P3)P3.open(sm.dataset.wsSample,'read').then(settle,settle);return;}
  if(e.target.closest('[data-ws-close]')){showWelcome=false;keepBuild=true;settle();return;}
  if(e.target.closest('[data-ws-continue]')){showWelcome=false;settle();return;}
  if(e.target.closest('[data-ws-trace]')){showWelcome=false;C().trace();settle();return;}
  if(e.target.closest('[data-ws-web]')){var w=$('#weave-theme-web-toggle');if(w)w.click();return;}
  var f=e.target.closest('[data-ws-film]');if(f){var x=(FILMS||films()).find(function(v){return v.id===f.dataset.wsFilm;});if(x){showWelcome=false;C().add(x);C().setTab('thread');settle();}}
 });
 $('#ws-theme-all',sec).addEventListener('change',function(e){var v=e.target.value;e.target.value='';if(v){showWelcome=false;C().themeThread(v);settle();}});
 var q=$('#ws-film-q',sec),list=$('#ws-film-results',sec);
 q.addEventListener('input',function(){var hits=search(q.value);
  list.innerHTML=hits.map(function(x){return '<li><button type="button" data-ws-film="'+esc(x.id)+'"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small></button></li>';}).join('')||(q.value.trim().length>1?'<li class="ws-none">No film or filmmaker matches.</li>':'');});
 q.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=list.querySelector('[data-ws-film]');if(b){e.preventDefault();b.click();}}});
 var tq=null,tr=null;
 if(tq)tq.addEventListener('input',function(){
  var needle=norm(tq.value).trim(),found=needle?all.filter(function(t){return norm(t.name).includes(needle);}).slice(0,12):[];
  tr.innerHTML=found.map(function(t){return '<li><button type="button" data-ws-theme="'+esc(t.name)+'"><strong>'+esc(t.name)+'</strong><small>'+t.n+' films</small></button></li>';}).join('')||(needle?'<li class="ws-none">No matching themes.</li>':'');
 });
 if(tq)tq.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=tr.querySelector('[data-ws-theme]');if(b){e.preventDefault();b.click();}}});
 $('#ws-saved-select',sec).addEventListener('change',function(e){var v=e.target.value;if(!v)return;showWelcome=false;var sel=$('#constellate-collection');if(sel){sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));}settle();});
}
function savedList(){
 var box=$('#weave-start .ws-saved');if(!box)return;var c=current(),ws=weavesSaved().filter(function(w){return !c||w.id!==c.id;});
 var old=$('#weave-start .ws-current');if(old){var oh=!(c&&c.items.length);if(old.hidden!==oh)old.hidden=oh;var label=$('.ws-current-name',old);if(label&&c&&label.textContent!==c.name)label.textContent=c.name;}
 if(box.hidden!==!ws.length)box.hidden=!ws.length;if(!ws.length)return;
 var sel=$('#ws-saved-select',box);if(!sel)return;
  var html='<option value="">Choose a constellation…</option>'+ws.map(function(w){return '<option value="'+esc(w.id)+'">'+esc(w.name)+' · '+w.items.length+' film'+(w.items.length===1?'':'s')+'</option>';}).join('');
  if(sel.innerHTML!==html){var previous=sel.value;sel.innerHTML=html;if(previous&&[].some.call(sel.options,function(o){return o.value===previous;}))sel.value=previous;}
}

/* ---------- labels ---------- */
/* ---------- 2026-11-11: suggestions never offer a film that is already on the thread ---------- */
var chip=function(v,n){v=String(v||'');return v.length>n?v.slice(0,n-1).replace(/\s+$/,'')+'…':v;};
var tkey=function(x){return norm(x.title).replace(/[^a-z0-9]+/g,' ').trim()+'|'+(x.year||'');};
var yr=function(x){var n=parseInt(x&&x.year,10);return n>1800&&n<2100?n:null;};
/* ---------- 2026-11-11: a new thread never repeats a colour already in use ---------- */
/* ---------- 2026-11-11: legend for the two kinds of line; phone cue for the selected film ---------- */
function legendNote(){
 var host=$('#weave-legend');if(!host||$('#weave-line-key'))return;
 var p=document.createElement('p');p.id='weave-line-key';
 p.innerHTML='<span class="wk wk-solid" aria-hidden="true"></span>Solid line: sourced connection. <span class="wk wk-dream" aria-hidden="true"></span>Dotted line: interpretation.';
 host.after(p);
}
function phoneCue(){
 var ctx=$('#constellate-context'),small=window.matchMedia('(max-width:700px)').matches,cue=$('#weave-phone-cue');
 var show=small&&root.dataset.weaveStage==='build'&&ctx&&!ctx.hidden&&ctx.getBoundingClientRect().top>innerHeight-64;
 if(!show){if(cue)cue.hidden=true;return;}
 if(!cue){cue=document.createElement('button');cue.type='button';cue.id='weave-phone-cue';document.body.appendChild(cue);
  cue.addEventListener('click',function(){var k=$('#constellate-context');if(k)k.scrollIntoView({block:'start',behavior:'smooth'});});}
 var h=$('#constellate-context h3'),r=ctx.getBoundingClientRect();
 cue.textContent=(h?chip(h.textContent,30):'Selected film')+' · details ↓';
 cue.hidden=r.top<window.innerHeight-80&&r.bottom>0;
}
/* 2026-11-11: the example is the published, hand-written constellation, not an automatic pick */
function examplePreview(){
 var P=window.AtlasPublished,sec=$('#weave-start');if(!P||!P.example||!sec||sec.dataset.wsPublished)return;
 var e=(P.list||[]).filter(function(x){return x.slug===P.example;})[0];if(!e)return;
 sec.dataset.wsPublished='1';
 /* 24 Nov 2026: no featured pair above the three ways in */
 var main=$('[data-ws-example]',sec),box=$('.ws-example-more',sec);
 if(main)main.textContent=e.name;
 var more=(P.list||[]).filter(function(x){return x.slug!==P.example;});
 if(box)box.innerHTML=more.map(function(m){return '<button type="button" data-ws-sample="'+esc(m.slug)+'">'+esc(m.name)+'</button>';}).join('');
}
function labels(){
 var b=$('#weave-browse-films');if(b&&b.textContent.trim()==='Find films'){b.textContent='Add films';b.title='Search the atlas and add films to the active thread';}
 var cl=$('#constellate-clear');if(cl&&cl.textContent.trim()==='Clear weave'){cl.textContent='Clear';}
 $$('#weave-suggest [data-weave-follow]').forEach(function(b){if(/^Follow/.test(b.textContent.trim()))b.textContent='Add next';});
 var sh=$('#weave-suggest h3, #weave-suggest strong');if(sh&&/^Follow another film$/.test(sh.textContent.trim()))sh.textContent='Films that could come next';
 $$('#weave-suggest p').forEach(function(pp){if(pp.textContent.trim()==='Documented connections through shared synopsis themes. Choose a film to move there.')pp.textContent='Each shares a theme with this film in its published synopsis. Add next puts it on the thread.';});
 var h=$('#weave-empty-hint h2');if(h&&h.textContent!=='How can films encounter each other?')h.textContent='How can films encounter each other?';
}

/* ---------- run ---------- */
var last='';
function settle(){if(!tick.raf)tick.raf=requestAnimationFrame(function(){tick.raf=0;tick();});}
function tick(){
 var st=stage();
 /* tick() runs after every class/hidden change on the page, so it must write only what has changed: an unconditional write here re-triggers it on every frame. */
 if((root.dataset.weaveStage||'')!==st){if(st)root.dataset.weaveStage=st;else delete root.dataset.weaveStage;}
 var web=$('#atlas-theme-web'),webOn=!!(web&&!web.hidden);if((root.dataset.weaveWeb==='1')!==webOn){if(webOn)root.dataset.weaveWeb='1';else delete root.dataset.weaveWeb;}
 if(!st)return;
 if(!$('#weave-start')){buildStart();labels();}try{examplePreview();}catch(e){}try{legendNote();phoneCue();}catch(e){}
 if(st==='start'){savedList();}
 if(st==='start'&&last!=='start'){var qn=$('#ws-film-q');if(qn&&window.innerWidth>760)setTimeout(function(){try{var current=document.activeElement;if(!current||current===document.body||current===document.documentElement||current===qn)qn.focus({preventScroll:true});}catch(e){}},300);}
 last=st;
}
window.addEventListener('scroll',function(){try{phoneCue();}catch(e){}},{passive:true});
function start(){
 if(!window.AtlasConstellate||!window.AtlasCollections){if((start.attempts=(start.attempts||0)+1)<=100)setTimeout(start,300);return;}
 tick();
 try{S().subscribe(function(){settle();});}catch(e){}
 if(new URLSearchParams(location.search).get('trace')==='1')setTimeout(function(){try{C().trace();}catch(e){}},700);
 var stageObserver=new MutationObserver(settle);stageObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
 for(var id of ['#constellate-read','#constellate-context','#weave-player']){var el=$(id);if(el)stageObserver.observe(el,{attributes:true,attributeFilter:['aria-pressed','hidden']});}
 window.addEventListener('resize',settle,{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
}catch(error){console.error('Constellate section failed: Stages, start card, guide box, suggestions, legend',error);}

/* ================================================================
   Map page: "Make a constellation from this land" beside Land details & sources (13 Nov 2026).
   ================================================================ */
try{(function(){
 'use strict';
 function add(){
  var box=document.querySelector('#index .reading-context-actions');if(!box)return;
  var src=box.querySelector('[data-reading-context-land]'),id=src&&src.getAttribute('data-reading-context-land'),C=window.AtlasConstellate;
  var btn=box.querySelector('[data-land-thread]');
  var n=id&&C&&C.landFilmCount?C.landFilmCount(id):0;
  if(!n){if(btn)btn.remove();return;}
  if(!btn){btn=document.createElement('button');btn.type='button';btn.setAttribute('data-land-thread','');btn.className='land-thread';box.appendChild(btn);}
  if(btn.dataset.land!==id){btn.dataset.land=id;btn.textContent='Make a constellation from this land →';btn.title='Open Constellate with this land’s films ('+n+(n===1?' film':' films')+' in the atlas)';}
 }
 document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-land-thread]');if(!b)return;e.preventDefault();try{window.AtlasConstellate.landThread(b.dataset.land);}catch(err){console.error(err);}});
 function drawButton(){
  var bar=document.querySelector('.map-panel .map-toolbar .map-actions')||document.querySelector('.map-panel .map-toolbar');if(!bar||document.getElementById('map-draw-line'))return !!bar;
  var b=document.createElement('button');b.type='button';b.id='map-draw-line';b.setAttribute('aria-pressed','false');b.textContent='Constellate';
  b.title='Draw a line across the map to gather the films along it: the lands it crosses are listed in order, and can become a thread';
  b.addEventListener('click',function(){var C=window.AtlasConstellate;if(!C)return;if(C.tracing)C.stopTrace();else C.trace({browse:true});});
  bar.appendChild(b);return true;
 }
 function start(){var idx=document.getElementById('index');if(!idx)return;new MutationObserver(function(){add();}).observe(idx,{childList:true,subtree:true});add();
  if(!drawButton()){var o=new MutationObserver(function(){if(drawButton())o.disconnect();});o.observe(document.body,{childList:true,subtree:true});setTimeout(function(){o.disconnect();},20000);}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();}catch(error){console.error('Constellate section failed: land thread',error);}

/* ================================================================
   Side panel header (13 Nov 2026): the constellation itself heads the panel.
   [constellation ▾] [+] [Details] [?] [×]; the word "Constellate" stays for screen readers.
   ================================================================ */
try{(function(){
 'use strict';
 function tidy(){
  var h=document.querySelector('#constellate-popup .constellate-heading'),col=document.querySelector('#constellate-popup .constellate-collection');
  if(!h||!col)return false;
  if(col.parentElement!==h)h.insertBefore(col,document.getElementById('constellate-how')||document.getElementById('constellate-close'));
  h.classList.add('cp-tidy');
  var ws=document.getElementById('weave-settings');if(ws&&!ws.querySelector(':scope>.cp-pop')){var pop=document.createElement('div');pop.className='cp-pop';[].slice.call(ws.children).forEach(function(c){if(c.tagName!=='SUMMARY')pop.appendChild(c);});ws.appendChild(pop);}
  var nb=document.getElementById('constellate-new');
  if(nb&&!nb.dataset.cp){nb.dataset.cp='1';nb.innerHTML='<span aria-hidden="true">+</span><span class="sr-only">New constellation</span>';nb.title='Start a new constellation';}
  var ds=document.querySelector('#weave-settings>summary');
  if(ds&&!ds.dataset.cp){ds.dataset.cp='1';ds.innerHTML='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.8 2.6l2.6 2.6-7.6 7.6H3.2v-2.6z"/></svg><span class="sr-only">Details</span>';ds.title='Details: title, author, introduction, import, delete';}
  var hs=document.querySelector('#constellate-how>summary');
  if(hs&&!hs.dataset.cp){hs.dataset.cp='1';hs.innerHTML='<span aria-hidden="true">?</span><span class="sr-only">Help</span>';hs.title='How Constellate works';}
  return true;
 }
 function start(){if(tidy())return;var o=new MutationObserver(function(){if(tidy())o.disconnect();});o.observe(document.body,{childList:true,subtree:true});setTimeout(function(){o.disconnect();},20000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();}catch(error){console.error('Constellate section failed: panel header',error);}
