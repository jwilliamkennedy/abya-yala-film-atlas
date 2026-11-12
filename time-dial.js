/* Time dial (Claude, 2026-11-11). Map page only.
   Drag the dial and each land lights up from the year of the earliest dated film by a filmmaker linked to it.
   Uses the atlas's own records: Atlas.lands, Atlas.landLinks(land) and each film's year. Films with no year
   recorded are left out of the dial and counted in its note. ?dial=1993 opens the map with the dial at that year. */
(function(){
 'use strict';
 var START=1960,STEP_MS=230,A,first={},landCount=0,years=[],undated=0,maxY=0,on=false,year=0,timer=null,raf=0,bar,toggle;
 var $=function(s,r){return (r||document).querySelector(s);};
 function yearOf(f){var n=parseInt(f&&f.year,10);return n>1800&&n<2100?n:0;}
 function build(){
  var seen={};
  A.allRecords().forEach(function(r){r.films.forEach(function(f){if(seen[f.id])return;seen[f.id]=1;var y=yearOf(f);if(y){years.push(y);if(y>maxY)maxY=y;}else undated++;});});
  years.sort(function(a,b){return a-b;});
  (A.lands||[]).forEach(function(l){
   var min=0;(A.landLinks(l)||[]).forEach(function(e){var r=A.recordById(e.record);if(!r)return;r.films.forEach(function(f){var y=yearOf(f);if(y&&(!min||y<min))min=y;});});
   if(min){first[l.id]=min;landCount++;}
  });
 }
 function filmsBy(y){var lo=0,hi=years.length;while(lo<hi){var m=(lo+hi)>>1;if(years[m]<=y)lo=m+1;else hi=m;}return lo;}
 function state(id){var y=first[id];return !y?'none':y>year?'dark':(year-y<=2?'new':'lit');}
 function paint(){
  raf=0;if(!on)return;
  document.querySelectorAll('#atlas .land-word').forEach(function(n){var s=state(n.dataset.connection);if(n.dataset.td!==s)n.dataset.td=s;});
  document.querySelectorAll('#atlas .land-thumb[data-land]').forEach(function(n){var s=state(n.dataset.land);if(n.dataset.td!==s)n.dataset.td=s;});
  document.querySelectorAll('#atlas .nation-wash').forEach(function(n){var s=state(n.dataset.land);if(n.dataset.td!==s)n.dataset.td=s;});
  var lit=0;for(var k in first)if(first[k]<=year)lit++;
  $('#td-year').textContent=year<=START?'Before '+(START+1):String(year);
  $('#td-count').textContent=filmsBy(year).toLocaleString()+' films · '+lit+' of '+landCount+' lands';
  var r=$('#td-range');if(+r.value!==year)r.value=year;r.setAttribute('aria-valuetext',$('#td-year').textContent+', '+$('#td-count').textContent);
 }
 function queue(){if(!raf)raf=requestAnimationFrame(paint);}
 function set(y){year=Math.max(START,Math.min(maxY,Math.round(y)));queue();}
 function stop(){clearInterval(timer);timer=null;var b=$('#td-play');if(b){b.textContent='Play';b.setAttribute('aria-pressed','false');}}
 function play(){
  if(timer){stop();return;}
  if(year>=maxY)set(START);
  var slow=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#td-play').textContent='Pause';$('#td-play').setAttribute('aria-pressed','true');
  timer=setInterval(function(){if(year>=maxY){stop();return;}set(year+(slow?5:1));},slow?700:STEP_MS);
 }
 function open(y){
  if(document.body.classList.contains('is-constellating'))return;
  on=true;document.body.classList.add('time-dial-on');bar.hidden=false;toggle.setAttribute('aria-pressed','true');set(y||maxY);
 }
 function close(){
  on=false;stop();document.body.classList.remove('time-dial-on');bar.hidden=true;toggle.setAttribute('aria-pressed','false');
  document.querySelectorAll('#atlas [data-td]').forEach(function(n){delete n.dataset.td;});
 }
 function ui(){
  var panel=$('.map-panel'),tools=$('.map-toolbar',panel);if(!panel||!tools||$('#td-bar'))return false;
  toggle=document.createElement('button');toggle.type='button';toggle.id='td-toggle';toggle.textContent='Time';toggle.setAttribute('aria-pressed','false');
  toggle.title='See when each land’s first film appears';($('.map-actions',tools)||tools).appendChild(toggle);
  bar=document.createElement('section');bar.id='td-bar';bar.hidden=true;bar.setAttribute('aria-label','Time dial');
  bar.innerHTML='<button type="button" id="td-play" aria-pressed="false">Play</button>'+
   '<div class="td-read"><strong id="td-year"></strong><small id="td-count" aria-live="polite"></small></div>'+
   '<div class="td-track"><span>'+START+'</span><input id="td-range" type="range" min="'+START+'" max="'+maxY+'" step="1" aria-label="Year"><span>'+maxY+'</span></div>'+
   '<button type="button" id="td-close" aria-label="Close the time dial">Close</button>'+
   '<p class="td-note">A land lights up in the year of the earliest dated film by a filmmaker linked to it. '+undated.toLocaleString()+' films have no year recorded yet and are not counted.</p>';
  panel.appendChild(bar);
  toggle.onclick=function(){on?close():open(START),on&&play();};
  $('#td-range').oninput=function(e){stop();set(+e.target.value);};
  $('#td-play').onclick=play;$('#td-close').onclick=close;
  new MutationObserver(function(){if(on)queue();}).observe($('#atlas'),{childList:true,subtree:true});
  new MutationObserver(function(){if(on&&document.body.classList.contains('is-constellating'))close();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',function(e){if(on&&e.key==='Escape'&&!e.defaultPrevented)close();});
  return true;
 }
 function start(){
  A=window.Atlas;if(!A||!A.ready||!$('.map-panel'))return;
  A.ready.then(function(){
   build();if(!years.length||!landCount)return;
   var n=0;(function wait(){if(ui()){var q=parseInt(new URLSearchParams(location.search).get('dial'),10);if(q)open(q);return;}if(++n<40)setTimeout(wait,250);})();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 window.AtlasTimeDial={open:open,close:close,set:set,firstYears:first};
})();
