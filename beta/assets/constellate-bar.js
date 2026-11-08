/* Constellate strip: Clear lives at the foot of ⋯ (it empties the whole weave, so it stays out of the row);
   on phones Disappear map moves into ⋯ too, and back to the row on wider screens. */
(function(){
  var phone=window.matchMedia('(max-width:760px)');
  function place(){
    var bar=document.getElementById('constellate-mode');if(!bar)return false;
    var menu=bar.querySelector('.weave-more-menu'),clear=document.getElementById('constellate-clear'),unmap=document.getElementById('weave-unmap'),more=bar.querySelector('.weave-more');
    if(!menu||!more)return false;
    if(clear&&clear.parentNode!==menu)menu.append(clear);
    if(unmap){if(phone.matches&&unmap.parentNode!==menu)menu.prepend(unmap);
      else if(!phone.matches&&unmap.parentNode===menu){var g=bar.querySelector('.weave-tool-group');bar.insertBefore(unmap,g||more);}}
    var m=bar.querySelector('.weave-more-menu');
    if(phone.matches&&m){var r=bar.getBoundingClientRect();m.style.top=(r.bottom+6)+'px';}
    return true;
  }
  function start(){
    if(!place()){var mo=new MutationObserver(function(){if(place())mo.disconnect();});mo.observe(document.body,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},20000);}
    (phone.addEventListener?phone.addEventListener('change',place):phone.addListener(place));
    document.addEventListener('toggle',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('weave-more')&&e.target.open)place();},true);
    /* choosing a tool closes ⋯ */
    document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#constellate-mode .weave-more-menu button');if(b){var d=b.closest('details');if(d)setTimeout(function(){d.open=false;},0);}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
