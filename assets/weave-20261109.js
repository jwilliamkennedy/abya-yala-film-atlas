/* Constellate: a clearer way into weaving, 2026-11-09 (Claude).
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
var showWelcome=false;
document.addEventListener('click',function(e){if(e.target.closest('.constellate-link'))showWelcome=true;},true);

function on(){var c=C();return !!(c&&c.enabled&&document.body.classList.contains('is-constellating'));}
function current(){try{return S().current();}catch(e){return null;}}
function thread(){try{return S().activeThread();}catch(e){return null;}}
function reading(){var b=$('#constellate-read');return !!(b&&b.getAttribute('aria-pressed')==='true');}
function stage(){
 if(!on()){showWelcome=false;return '';}
 var c=current();if(!c)return '';
 if(C().playing)return 'play';
 if(reading())return 'read';
 return showWelcome||!c.items.length?'start':'build';
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
function weavesSaved(){try{return (S().state.collections||[]).filter(function(w){return w.items&&w.items.length;});}catch(e){return [];}}
function buildStart(){
 var host=$('#atlas')&&$('#atlas').parentElement;if(!host||$('#weave-start'))return;
 var top=themes().slice(0,6),all=themes().sort(function(a,b){return a.name.localeCompare(b.name);});
 var sec=document.createElement('section');sec.id='weave-start';sec.setAttribute('aria-labelledby','weave-start-title');
 sec.innerHTML=
  '<p class="ws-kicker">Constellate</p>'+
  '<h2 id="weave-start-title">How can films encounter each other?</h2>'+
  '<p class="ws-lede">Connect films into threads through what they share: a theme, a land, a question. Each thread runs across the map from film to film, to read, play and share.</p>'+
  '<ol class="ws-how" aria-label="How constellation building works"><li><b>1</b> Add films</li><li><b>2</b> Link them, and say why</li><li><b>3</b> Read, play or share</li></ol>'+
  '<div class="ws-paths">'+
   '<section class="ws-path"><h3>Start from a theme</h3><p>Every film on the thread shares the theme, taken from its published synopsis.</p>'+
    '<label class="ws-sr" for="ws-theme-q">Search themes</label><input id="ws-theme-q" type="search" autocomplete="off" placeholder="Search themes…">'+
    '<ul class="ws-results" id="ws-theme-results" aria-live="polite"></ul>'+
    '<p class="ws-popular-label">Popular themes</p>'+
    '<div class="ws-chips">'+top.map(function(t){return '<button type="button" data-ws-theme="'+esc(t.name)+'">'+esc(t.name)+' <small>'+t.n+'</small></button>';}).join('')+'</div>'+ 
    '<label class="ws-sr" for="ws-theme-all">All themes</label><select id="ws-theme-all"><option value="">All 30 themes…</option>'+all.map(function(t){return '<option value="'+esc(t.name)+'">'+esc(t.name)+' ('+t.n+')</option>';}).join('')+'</select></section>'+
   '<section class="ws-path"><h3>Start from a film</h3><p>Choose one film. Films that share a documented theme with it are suggested next.</p>'+
    '<label class="ws-sr" for="ws-film-q">Search a film or filmmaker</label><input id="ws-film-q" type="search" autocomplete="off" placeholder="Search a film or filmmaker…">'+
    '<ul id="ws-film-results" class="ws-results" aria-live="polite"></ul></section>'+
   '<section class="ws-path"><h3>See an example</h3><p>Three films that share a theme, already connected, to read and change.</p><div class="ws-example-films"></div><p class="ws-example-label"></p>'+
    '<button type="button" class="ws-primary" data-ws-example>Open the example</button>'+
    '<button type="button" class="ws-link" data-ws-web>Or explore the theme web →</button></section>'+
  '</div>'+
  '<div class="ws-current" hidden><button type="button" data-ws-continue>Continue this constellation</button><small class="ws-current-name"></small></div>'+ 
  '<div class="ws-saved" hidden><label for="ws-saved-select">Open a saved constellation</label><select id="ws-saved-select"></select></div>';
 host.appendChild(sec);
 var src=$('#weave-intro-films'),lab=$('#weave-intro-label');if(src){$('.ws-example-films',sec).innerHTML=src.innerHTML;}if(lab)$('.ws-example-label',sec).textContent=lab.textContent;
 sec.addEventListener('click',function(e){
  var t=e.target.closest('[data-ws-theme]');if(t){showWelcome=false;C().themeThread(t.dataset.wsTheme);settle();return;}
  if(e.target.closest('[data-ws-example]')){showWelcome=false;var b=$('#weave-example');if(b)b.click();settle();return;}
  if(e.target.closest('[data-ws-continue]')){showWelcome=false;settle();return;}
  if(e.target.closest('[data-ws-web]')){var w=$('#weave-theme-web-toggle');if(w)w.click();return;}
  var f=e.target.closest('[data-ws-film]');if(f){var x=(FILMS||films()).find(function(v){return v.id===f.dataset.wsFilm;});if(x){showWelcome=false;C().add(x);var tab=$('#weave-tab-thread');if(tab)tab.click();settle();}}
 });
 $('#ws-theme-all',sec).addEventListener('change',function(e){var v=e.target.value;e.target.value='';if(v){showWelcome=false;C().themeThread(v);settle();}});
 var q=$('#ws-film-q',sec),list=$('#ws-film-results',sec);
 q.addEventListener('input',function(){var hits=search(q.value);
  list.innerHTML=hits.map(function(x){return '<li><button type="button" data-ws-film="'+esc(x.id)+'"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small></button></li>';}).join('')||(q.value.trim().length>1?'<li class="ws-none">No film or filmmaker matches.</li>':'');});
 q.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=list.querySelector('[data-ws-film]');if(b){e.preventDefault();b.click();}}});
 var tq=$('#ws-theme-q',sec),tr=$('#ws-theme-results',sec);
 tq.addEventListener('input',function(){
  var needle=norm(tq.value).trim(),found=needle?all.filter(function(t){return norm(t.name).includes(needle);}).slice(0,12):[];
  tr.innerHTML=found.map(function(t){return '<li><button type="button" data-ws-theme="'+esc(t.name)+'"><strong>'+esc(t.name)+'</strong><small>'+t.n+' films</small></button></li>';}).join('')||(needle?'<li class="ws-none">No matching themes.</li>':'');
 });
 tq.addEventListener('keydown',function(e){if(e.key==='Enter'){var b=tr.querySelector('[data-ws-theme]');if(b){e.preventDefault();b.click();}}});
 $('#ws-saved-select',sec).addEventListener('change',function(e){var v=e.target.value;if(!v)return;showWelcome=false;var sel=$('#constellate-collection');if(sel){sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));}settle();});
}
function savedList(){
 var box=$('#weave-start .ws-saved');if(!box)return;var c=current(),ws=weavesSaved().filter(function(w){return !c||w.id!==c.id;});
 var old=$('#weave-start .ws-current');if(old){old.hidden=!(c&&c.items.length);var label=$('.ws-current-name',old);if(label&&c)label.textContent=c.name;}
 box.hidden=!ws.length;if(!ws.length)return;
 var sel=$('#ws-saved-select',box);if(!sel)return;
  var html='<option value="">Choose a constellation…</option>'+ws.map(function(w){return '<option value="'+esc(w.id)+'">'+esc(w.name)+' · '+w.items.length+' film'+(w.items.length===1?'':'s')+'</option>';}).join('');
  if(sel.innerHTML!==html){var previous=sel.value;sel.innerHTML=html;if(previous&&[].some.call(sel.options,function(o){return o.value===previous;}))sel.value=previous;}
}

/* ---------- the guide at the top of the panel ---------- */
function buildGuide(){
 var pop=$('#constellate-popup'),head=pop&&$('.constellate-heading',pop);if(!head||$('#weave-guide'))return;
 var g=document.createElement('section');g.id='weave-guide';g.setAttribute('aria-live','polite');
 g.innerHTML='<ol class="wg-steps" aria-label="Constellation steps"><li data-step="add">Add films</li><li data-step="link">Link them</li><li data-step="share">Read and share</li></ol><p class="wg-text"></p><div class="wg-actions"></div>';
 head.after(g);
 g.addEventListener('click',function(e){var a=e.target.closest('[data-wg]');if(!a)return;var k=a.dataset.wg;
  if(k==='add'){var t=$('#weave-tab-add');if(t)t.click();var s=$('#constellate-search');if(s)setTimeout(function(){s.focus();},60);}
  else if(k==='suggest'){var tt=$('#weave-tab-thread');if(tt)tt.click();var sg=$('#weave-suggest');if(sg)sg.scrollIntoView({block:'nearest'});}
  else if(k==='draw'){var d=$('#weave-draw-thread');if(d)d.click();}
  else if(k==='read'){var r=$('#constellate-read');if(r)r.click();}
  else if(k==='play'){var p=$('#weave-play');if(p)p.click();}
  else if(k==='connect'){try{C().startLink();}catch(err){}}
  else if(k==='build'){var b=$('#constellate-edit');if(b)b.click();}
  else if(k==='share'){var sh=$('#constellate-share');if(sh)sh.click();}
  settle();});
}
function q(s){return '“'+s+'”';}
function guide(st){
 var g=$('#weave-guide');if(!g)return;var c=current(),t=thread();if(!c||!t)return;
 var n=t.items.length,total=c.items.length,threads=c.threads.filter(function(x){return x.items.length;}).length,links=(c.links||[]).length;
 var step='add',text='',acts=[];
 var drawing=$('#weave-draw-thread')&&$('#weave-draw-thread').getAttribute('aria-pressed')==='true';
 if(st==='read'){step='share';text='Reading “'+c.name+'”: '+threads+' thread'+(threads===1?'':'s')+', '+total+' film'+(total===1?'':'s')+'.';acts=[['play','Play on the map'],['share','Share'],['build','Back to building']];}
 else if(drawing){step='link';text='Click films on the map in the order the thread should run. Choose Done drawing to finish.';acts=[['draw','Done drawing']];}
 else if(n===0){step='add';text=total?('Add films to “'+t.name+'”: search, or use Draw thread to click films already on the map.'):'Add the first film: search, or click a film on the map.';acts=[['add','Add films'],total?['draw','Draw thread']:null];}
 else if(n===1){step='add';text='Add a second film. Films that share a documented theme with this one are listed below.';acts=[['suggest','See films that could come next'],['add','Search films']];}
 else{step='link';text='“'+t.name+'” runs through '+n+' films. Connect two films to say how they meet: answers, echoes, shares land, or your own words.';acts=[['connect','Connect two films'],['read','Read the constellation'],['add','Add films']];}
 $$('.wg-steps li',g).forEach(function(li){var order=['add','link','share'];var k=li.dataset.step===step?'is-now':(order.indexOf(li.dataset.step)<order.indexOf(step)?'is-done':'');if(li.className!==k)li.className=k;});
 var tx=$('.wg-text',g);if(tx.textContent!==text)tx.textContent=text;
 var html=acts.filter(Boolean).map(function(a,i){return '<button type="button" data-wg="'+a[0]+'" class="'+(i===0?'wg-primary':'')+'">'+a[1]+'</button>';}).join('');
 var ab=$('.wg-actions',g);if(ab.dataset.html!==html){ab.dataset.html=html;ab.innerHTML=html;}
}

/* ---------- labels ---------- */
function labels(){
 var b=$('#weave-browse-films');if(b&&b.textContent.trim()==='Find films'){b.textContent='Add films';b.title='Search the atlas and add films to the active thread';}
 var tab=$('#weave-tab-add');if(tab&&tab.textContent.trim()==='Browse films')tab.textContent='Add films';
 var cl=$('#constellate-clear');if(cl&&cl.textContent.trim()==='Clear weave'){cl.textContent='Clear';}
 $$('#weave-suggest [data-weave-follow]').forEach(function(b){if(/^Follow/.test(b.textContent.trim()))b.textContent='Add next';});
 var sh=$('#weave-suggest h3, #weave-suggest strong');if(sh&&/^Follow another film$/.test(sh.textContent.trim()))sh.textContent='Films that could come next';
 $$('#weave-suggest p').forEach(function(pp){if(pp.textContent.trim()==='Documented connections through shared synopsis themes. Choose a film to move there.')pp.textContent='Each shares a theme with this film in its published synopsis. Add next puts it on the thread.';});
 var h=$('#weave-empty-hint h2');if(h&&h.textContent!=='How can films encounter each other?')h.textContent='How can films encounter each other?';
}

/* ---------- run ---------- */
var last='',lastLen=-1;
function settle(){setTimeout(tick,80);setTimeout(tick,500);}
function tick(){
 var st=stage();
 if(st)root.dataset.weaveStage=st;else delete root.dataset.weaveStage;
 var web=$('#atlas-theme-web');if(web&&!web.hidden)root.dataset.weaveWeb='1';else delete root.dataset.weaveWeb;
 if(!st)return;
 buildStart();buildGuide();labels();
 if(st==='start'){savedList();}
 guide(st);
 if(st==='build'){var th=thread(),len=th?th.items.length:0;if(len>=2&&lastLen<2){setTimeout(function(){if(root.dataset.weaveStage==='build'){try{C().fit();}catch(e){}}},350);}lastLen=len;}else lastLen=-1;
 if(st==='start'&&last!=='start'){var qn=$('#ws-film-q');if(qn&&window.innerWidth>760)setTimeout(function(){try{qn.focus({preventScroll:true});}catch(e){}},300);}
 last=st;
}
function start(){
 if(!window.AtlasConstellate||!window.AtlasCollections){if((start.attempts=(start.attempts||0)+1)<=100)setTimeout(start,300);return;}
 tick();
 try{S().subscribe(function(){settle();});}catch(e){}
 var sg=$('#weave-suggest');if(sg)new MutationObserver(function(){labels();}).observe(sg,{childList:true,subtree:true});
 new MutationObserver(function(){if(!tick.raf)tick.raf=requestAnimationFrame(function(){tick.raf=0;tick();});}).observe(document.body,{attributes:true,attributeFilter:['class','aria-pressed','hidden'],subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
