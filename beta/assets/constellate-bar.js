/* Constellate navigation: drawing and clearing stay primary. Tools move into
   Options when the map is narrow; Clear never enters the dropdown. */
(function(){
 'use strict';
 var compact=window.matchMedia('(max-width:1150px)');
 var phone=window.matchMedia('(max-width:760px)');
 function place(){
  var bar=document.getElementById('constellate-mode');if(!bar)return false;
  var more=bar.querySelector('.weave-more'),menu=more&&more.querySelector('.weave-more-menu');
  var draw=document.getElementById('weave-draw-thread'),clear=document.getElementById('constellate-clear');
  var unmap=document.getElementById('weave-unmap'),edit=document.getElementById('constellate-edit');
  var play=document.getElementById('weave-play'),share=document.getElementById('constellate-share');
  var undo=document.getElementById('constellate-undo'),redo=document.getElementById('constellate-redo'),group=bar.querySelector('.weave-tool-group');
  if(!menu||!more||!draw||!clear||!edit||!play||!share||!undo||!redo||!group)return false;
  if(compact.matches){
   /* Make the most important actions visible: Draw, Find films, Read, Clear, Options, Exit. */
   for(var button of [redo,undo,share,play,edit]){
    if(button.parentNode!==menu)menu.prepend(button);
   }
   undo.textContent='Undo';redo.textContent='Redo';
  }else{
   if(undo.parentNode!==group||redo.parentNode!==group)group.append(undo,redo);
   undo.textContent='↶';redo.textContent='↷';
   if(edit.parentNode!==bar||edit.nextElementSibling!==draw)bar.insertBefore(edit,draw);
   if(play.parentNode!==bar)bar.insertBefore(play,clear);
   if(share.parentNode!==bar)bar.insertBefore(share,clear);
  }
  if(unmap&&unmap.parentNode!==menu){
   var fit=document.getElementById('constellate-fit');menu.insertBefore(unmap,fit||menu.firstChild);
  }
  if(clear.parentNode!==bar||clear.nextElementSibling!==more)bar.insertBefore(clear,more);
  /* Position is relative to .weave-more; its CSS owns top in all viewports. */
  menu.style.removeProperty('top');
  return true;
 }
 function start(){
  if(!place()){
   var observer=new MutationObserver(function(){if(place())observer.disconnect();});
   observer.observe(document.body,{childList:true,subtree:true});
   setTimeout(function(){observer.disconnect();},20000);
  }
  for(var q of [compact,phone]){
   if(q.addEventListener)q.addEventListener('change',place);else q.addListener(place);
  }
  document.addEventListener('toggle',function(e){
   if(e.target?.classList?.contains('weave-more')&&e.target.open)place();
  },true);
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var d=document.querySelector('#constellate-mode .weave-more');if(d&&d.open){d.open=false;var summary=d.querySelector('summary');if(summary)summary.focus();}});
  document.addEventListener('click',function(e){
   var b=e.target.closest&&e.target.closest('#constellate-mode .weave-more-menu button');
   if(b){var d=b.closest('details');if(d)setTimeout(function(){d.open=false;},0);}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
