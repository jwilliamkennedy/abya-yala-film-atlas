/* Interface pass, 2026-11-09 (Claude). Loaded last, on every page.
   Every page: a theme button beside the language selector (moon / sun), and the chosen theme applied before paint.
   Map page only: the list stays open (Esc closes menus, not the list); Recent, Save view, Copy link and Surprise me
   share one ⋯ menu; a selected filmmaker scrolls clear of the sticky bar; country markers and play buttons wait until
   the map is closer; thumbnails appear only once their picture has loaded; territory colour outside Abya Yala and
   Turtle Island is muted; one lettered tile replaces every "image unavailable"; plainer labels; zoom-to-land stops at 10×;
   the map dims while Constellate is open (the weave flow itself is in weave-20261109.js).
   Builds on the existing controls (same ids and handlers); no engine code is replaced. */
(function(){'use strict';
var root=document.documentElement,$=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s));};
var isMap=function(){return document.body&&document.body.classList.contains('atlas-page');};

/* ---------- theme (every page) ---------- */
function storedTheme(){try{return localStorage.getItem('atlas-reading-theme')==='night'?'night':'paper';}catch(e){return 'paper';}}
if(!window.AtlasReadingTheme)root.dataset.readingTheme=storedTheme();
function setTheme(id){
 if(window.AtlasReadingTheme&&window.AtlasReadingTheme.apply)window.AtlasReadingTheme.apply(id,true);
 else{root.dataset.readingTheme=id;try{localStorage.setItem('atlas-reading-theme',id);}catch(e){}}
 var b=$('.ui-theme-toggle');if(b){var night=id==='night';b.setAttribute('aria-pressed',String(night));b.title=night?'Switch to the day theme':'Switch to the night theme';b.setAttribute('aria-label',b.title);}
}
var MOON='<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
var SUN='<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
function headerTools(){
 var header=$('header');if(!header||$('.ui-header-tools',header))return !!header;
 var lang=$('label.ui-lang',header);if(!lang)return false;
 var box=document.createElement('div');box.className='ui-header-tools';
 var util=$('.atlas-utilities',header);if(util)header.insertBefore(box,util);else header.appendChild(box);box.appendChild(lang);
 var b=document.createElement('button');b.type='button';b.className='ui-theme-toggle';b.innerHTML=MOON+SUN;
 b.addEventListener('click',function(){setTheme((root.dataset.readingTheme==='night')?'paper':'night');});
 box.appendChild(b);setTheme(root.dataset.readingTheme==='night'?'night':'paper');
 return true;
}

/* ---------- plainer labels (English; the translation file carries the other languages) ---------- */
var RENAME={
 'Fit selection':'Zoom to selection',
 'Browse this selection':'Filmmakers here',
 'Selection held · drag to pan':'Drag to move the map',
 'Preview land · select to explore · drag to pan':'Point at a land to preview it; click to open',
 'Recorded film':'Film',
 'Browse list':'Show',
 'All entries':'All filmmakers',
 'Fit affiliations on map →':'Show these lands on the map →',
 'Map overview':'Overview'
};
function renameIn(scope){
 if(!scope||(root.lang&&root.lang!=='en'))return;
 var w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT),n;
 while((n=w.nextNode())){var p=n.parentElement;if(!p||p.closest('#atlas,#index-list .entry-copy,script,style'))continue;
  var t=n.nodeValue,k=t.trim();if(!k)continue;
  if(RENAME[k]){n.nodeValue=t.replace(k,RENAME[k]);continue;}
  if(/^All entries · [\d,]+$/.test(k))n.nodeValue=t.replace('All entries','All filmmakers');}
 $$('[title="Fit selection"],[aria-label="Fit selection"]',scope).forEach(function(e){if(e.title)e.title='Zoom to the selected land or filmmaker';});
}

/* ---------- one lettered tile for every missing picture ---------- */
var titles=null;
function filmTitle(id){
 if(!titles){titles={};try{(window.Atlas&&window.Atlas.allRecords?window.Atlas.allRecords():[]).forEach(function(r){(r.films||[]).forEach(function(f){if(f&&f.id)titles[f.id]=f.title||'';});});}catch(e){}}
 return titles[id]||'';
}
function initials(t){
 var words=String(t||'').replace(/[“”"«»()\[\]{},.:;!?¿¡\/|]/g,' ').split(/\s+/).filter(function(w){return w&&!/^(the|a|an|el|la|los|las|le|les|o|os|as|de|del|da|do|of|y|e|and)$/i.test(w);});
 if(!words.length)words=String(t||'').split(/\s+/).filter(Boolean);
 var s=words.slice(0,2).map(function(w){return Array.from(w)[0]||'';}).join('');
 return s.toLocaleUpperCase();
}
function placeholders(scope){
 $$('.map-film-fallback, .film-thumb > span, img ~ span, img ~ div, .cinema-feature [class*="fallback"], .cinema-feature [class*="unavailable"]',scope||document).forEach(function(s){
  if(s.children.length)return;
  if(s.dataset.uiPh)return;
  var txt=s.textContent.trim();var lettered=s.parentElement&&s.parentElement.classList.contains('film-thumb')&&/^\S{1,2}$/.test(txt);
  if(!lettered&&!/image unavailable|imagen no disponible|imagem indisponível|image indisponible/i.test(txt))return;
  var card=s.closest('.map-film-card,.entry,.cinema-feature,article,li');
  var title=(card&&(card.querySelector('strong,h3,h4')||{}).textContent)||'';
  var th=s.closest('[data-artwork-film]');if(th&&th.dataset.artworkFilm){var ft=filmTitle(th.dataset.artworkFilm);if(ft)title=ft;}
  var cap=card&&card.querySelector('.image-credit, small');if(!title&&cap&&/^Image: /.test(cap.textContent.trim()))title=cap.textContent.trim().slice(7);
  s.dataset.uiPh='1';s.classList.add('ui-ph');s.textContent=initials(title)||'·';s.setAttribute('aria-hidden','true');
 });
}

/* ---------- map page ---------- */
function mapPage(){
 window.AtlasFitCap=10;
 /* Esc closes menus and panels first, never the list underneath them */
 window.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  var open=$$('header details[open], .map-actions details[open], .ui-index-more[open], #constellate-mode details[open]');
  if(!open.length)return;
  open.forEach(function(d){d.open=false;});
  e.preventDefault();e.stopImmediatePropagation();
 },true);
 /* the filmmaker list stays open when nothing is selected */
 function keepList(){
  var A=window.Atlas;if(!A||!A.state||typeof A.browseMakers!=='function')return;
  var p=new URLSearchParams(location.hash.slice(1));var view=p.get('view')||'filmmakers';
  if(view!=='filmmakers'||root.dataset.uiConstellate==='on')return;
  if(['maker','land','linked','country','landCountry','q','browse','initial','film'].some(function(k){return p.has(k);}))return;
  var list=$('#index-list');if(list&&list.querySelector('.entry'))return;
  try{A.browseMakers();}catch(e){}
 }
 window.addEventListener('hashchange',function(){setTimeout(keepList,60);});
 /* ⋯ menu for the less-used list tools */
 function indexMore(){
  var row=$('#index .index-control-row');if(!row)return;
  var d=$('.ui-index-more',row);
  if(!d){d=document.createElement('details');d.className='ui-index-more';d.innerHTML='<summary aria-label="More list tools" title="More list tools">⋯</summary><div role="menu"></div>';row.appendChild(d);}
  var box=d.querySelector('div');
  ['#random-entry','#selection-tools'].forEach(function(s){var el=$(s);if(el&&el.parentElement!==box)box.appendChild(el);});
  if(d.dataset.uiWired)return;
  d.dataset.uiWired='1';
  document.addEventListener('pointerdown',function(e){if(d.open&&!d.contains(e.target))d.open=false;});
  box.addEventListener('click',function(e){if(e.target.closest('button'))setTimeout(function(){d.open=false;},0);});
 }
 /* the sticky bar's height, so a selected entry scrolls clear of it */
 function barHeight(){
  var bar=$('#index .index-command-bar');if(!bar)return;
  var set=function(){root.style.setProperty('--ui-cmdbar',Math.round(bar.getBoundingClientRect().height)+'px');};
  set();if(window.ResizeObserver)new ResizeObserver(set).observe(bar);
 }
 function clearOfBar(){
  var ix=$('#index'),bar=$('#index .index-command-bar'),sel=$('#index .entry.selected .entry-button');if(!ix||!bar||!sel)return;
  var gap=sel.getBoundingClientRect().top-bar.getBoundingClientRect().bottom;
  if(gap<8){var sc=ix.scrollHeight>ix.clientHeight?ix:(document.scrollingElement||document.documentElement);sc.scrollTop+=gap-12;}
 }

 /* Horizontal alphabet has accessible arrows, wheel scrolling and keeps selection visible. */
 function alphabetScroll(){
  ['maker','film'].forEach(function(kind){
   var nav=$('#'+kind+'-alphabet');if(!nav||nav.closest('.ui-alpha-shell'))return;
   var shell=document.createElement('div');shell.className='ui-alpha-shell';
   var prev=document.createElement('button'),next=document.createElement('button');
   prev.type=next.type='button';prev.className='ui-alpha-arrow';next.className='ui-alpha-arrow';
   prev.textContent='‹';next.textContent='›';
   prev.setAttribute('aria-label','Scroll '+(kind==='maker'?'filmmaker names':'film titles')+' toward A');
   next.setAttribute('aria-label','Scroll '+(kind==='maker'?'filmmaker names':'film titles')+' toward Z');
   nav.before(shell);shell.append(prev,nav,next);
   function update(){
    var has=nav.scrollWidth>nav.clientWidth+2;
    shell.classList.toggle('has-overflow',has);
    prev.disabled=!has||nav.scrollLeft<=1;
    next.disabled=!has||nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-2;
   }
   function move(dir){nav.scrollBy({left:dir*Math.max(110,nav.clientWidth*.72),behavior:'smooth'});}
   prev.addEventListener('click',function(){move(-1);});
   next.addEventListener('click',function(){move(1);});
   nav.addEventListener('scroll',update,{passive:true});
   nav.addEventListener('wheel',function(e){
    if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)<=Math.abs(e.deltaX)||nav.scrollWidth<=nav.clientWidth+2)return;
    var amount=e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?nav.clientWidth:1);
    if(amount<0&&nav.scrollLeft<=0||amount>0&&nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-1)return;
    if(e.cancelable)e.preventDefault();nav.scrollLeft+=amount;
   },{passive:false});
   function track(){
    var active=nav.querySelector('button[aria-pressed="true"]');
    if(active){
     var a=active.getBoundingClientRect(),n=nav.getBoundingClientRect();
     if(a.left<n.left+3)nav.scrollLeft-=n.left-a.left+9;
     else if(a.right>n.right-3)nav.scrollLeft+=a.right-n.right+9;
    }
    update();
   }
   var tracking=false;new MutationObserver(function(){if(tracking)return;tracking=true;requestAnimationFrame(function(){tracking=false;track();});}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','class']});
   if(window.ResizeObserver){var resize=new ResizeObserver(update);resize.observe(nav);resize.observe(shell);}else window.addEventListener('resize',update,{passive:true});
   requestAnimationFrame(track);
  });
 }
 /* zoom: far below 2.5× */
 function zoomState(){
  var z=$('#zoom-level');var k=z?parseFloat(String(z.textContent).replace(',','.'))||1:1;
  root.dataset.uiZoom=k<2.5?'far':'near';
 }
 /* map marks */
 /* Do not cache per-path visibility across map cameras. */
 /* longitude of a screen x, from two known points (the overlay is Web Mercator, so x is linear in longitude) */
 // One projected longitude calibration per batch, rather than two Atlas
 // projection calls for every territory path on every camera refresh.
 function longitudeFrame(){
  try{var rect=$('#atlas').getBoundingClientRect(),a=window.Atlas.screenPoint([-90,0]),b=window.Atlas.screenPoint([-89,0]),dx=b[0]-a[0];
   return dx>0?{left:rect.left,x:a[0],dx:dx}:null;}catch(e){return null;}
 }
 function outside(p,frame){
  if(!frame)return null;
  try{var r=p.getBoundingClientRect();if(!r.width)return null;
   var lon=-90+((r.left+r.right)/2-frame.left-frame.x)/frame.dx;
   if(!isFinite(lon))return null;
   lon=((lon+540)%360)-180;return lon>-25||lon<-179;}catch(e){return null;}
 }
 function marks(){
  $$('#atlas .land-word').forEach(function(g){var n=+g.dataset.linkedCount||0,tier=n>=30?'1':n>=12?'2':n>=4?'3':'4';if(g.dataset.uiTier!==tier)g.dataset.uiTier=tier;});
  $$('#atlas .land-thumb').forEach(function(g){
   var img=g.querySelector('image.color')||g.querySelector('image');var src=img&&(img.getAttribute('href')||img.getAttribute('xlink:href'))||'';
   if(g.dataset.uiSrc===src)return;g.dataset.uiSrc=src;
   if(!src){delete g.dataset.uiOk;return;}
   g.dataset.uiOk='wait';var probe=new Image();probe.onload=function(){if(g.dataset.uiSrc===src)g.dataset.uiOk='1';};probe.onerror=function(){if(g.dataset.uiSrc===src)g.dataset.uiOk='0';};probe.src=src;
  });
  var frame=longitudeFrame();
  $$('#atlas .nation-wash').forEach(function(p){
   var out=outside(p,frame);if(out==null)return;
   if(p.classList.contains('ui-outside')!==out)p.classList.toggle('ui-outside',out);
  });
 }
 /* map key: the play button */
 function keyWatch(){
  var key=$('#visual-key');if(!key||$('.ui-key-watch',key))return;
  var rows=key.querySelectorAll('.key-row, li, p');var after=rows.length?rows[rows.length-1]:null;
  var row=document.createElement('div');row.className='key-row ui-key-watch';
  row.innerHTML='<i aria-hidden="true">▶</i><span><b>Watch.</b> Films by filmmakers at this land that can be watched in full. Shown when you point at a land or zoom in.</span>';
  var dash=[].slice.call(key.querySelectorAll('*')).find(function(e){return e.children.length===0&&/^Dashed line\.$/.test(e.textContent.trim());});
  var host=dash?dash.closest('.key-row,li,div'):after;
  if(host&&host.parentNode)host.parentNode.insertBefore(row,host.nextSibling);else key.appendChild(row);
 }
 /* Constellate: the map dims while it is open */
 function constellate(){
  var mode=$('#constellate-mode');
  var on=!!(mode&&!mode.hidden&&mode.getBoundingClientRect().height>0);
  var val=on?'on':'off';
  if(root.dataset.uiConstellate!==val)root.dataset.uiConstellate=val;
  var ml=$('header .map-link');if(ml&&on===(ml.getAttribute('aria-current')==='page')){if(on)ml.removeAttribute('aria-current');else ml.setAttribute('aria-current','page');}
  var cl=$('header .constellate-link');if(cl&&on!==(cl.getAttribute('aria-current')==='page')){if(on)cl.setAttribute('aria-current','page');else cl.removeAttribute('aria-current');}
 }
 /* Run only the work a change actually requires. Previously every DOM
    mutation remeasured every SVG territory and traversed the entire page. */
 var raf=0,fullDirty=true,mapDirty=true,stateDirty=true,cameraTimer=0;
 function queueUpdate(full,map,state){
  fullDirty=fullDirty||!!full;mapDirty=mapDirty||!!map;stateDirty=stateDirty||!!state;
  if(raf)return;
  raf=requestAnimationFrame(function(){
   raf=0;
   if(mapDirty){mapDirty=false;marks();}
   if(fullDirty){fullDirty=false;placeholders();renameIn($('main'));keyWatch();}
   if(stateDirty){stateDirty=false;constellate();}
  });
 }
 function containsMapNode(n){
  return n.nodeType===1&&(n.matches?.('.land-word,.land-thumb,.nation-wash')||!!n.querySelector?.('.land-word,.land-thumb,.nation-wash'));
 }
 indexMore();alphabetScroll();barHeight();zoomState();queueUpdate(true,true,true);keepList();
 // Watch DOM structure without observing every SVG class/aria mutation.
 // The separate narrow observers only watch stateful elements themselves.
 new MutationObserver(function(records){
  var full=false,map=false,state=false;
  for(var m of records){
   var target=m.target.nodeType===1?m.target:m.target.parentElement;
   if(target?.closest?.('#atlas')){
    if([].some.call(m.addedNodes,containsMapNode)||[].some.call(m.removedNodes,containsMapNode))map=true;
   }else if(target?.closest?.('.map-toolbar,#constellate-mode'))state=true;
   else full=true;
   if(full&&map&&state)break;
  }
  if(full||map||state)queueUpdate(full,map,state||full);
 }).observe(document.body,{subtree:true,childList:true});
 new MutationObserver(function(){queueUpdate(false,false,true);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 var modeNode=$('#constellate-mode');if(modeNode)new MutationObserver(function(){queueUpdate(false,false,true);}).observe(modeNode,{attributes:true,attributeFilter:['hidden','class']});
 var zl=$('#zoom-level');if(zl)new MutationObserver(zoomState).observe(zl,{childList:true,characterData:true,subtree:true});
 window.addEventListener('atlas-camera-change',function(){
  zoomState();clearTimeout(cameraTimer);
  cameraTimer=setTimeout(function(){queueUpdate(false,true,false);},140);
 });
 document.addEventListener('click',function(e){if(e.target.closest('.entry-button,[data-adjacent-maker],[data-show-maker],[data-cross-maker]'))setTimeout(clearOfBar,450);},true);
 setTimeout(keepList,1500);
 setTimeout(function(){queueUpdate(true,true,true);},2500);
}

function start(){
 if(!headerTools()){var mo=new MutationObserver(function(){if(headerTools())mo.disconnect();});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},15000);}
 if(isMap()){var wait=function(n){if(window.Atlas&&window.Atlas.allRecords&&$('#atlas .land-word'))return mapPage();if(n<80)setTimeout(function(){wait(n+1);},250);else mapPage();};wait(0);}
 else{placeholders();var phScheduled=false;new MutationObserver(function(){if(phScheduled)return;phScheduled=true;requestAnimationFrame(function(){phScheduled=false;placeholders();});}).observe(document.body,{childList:true,subtree:true});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
