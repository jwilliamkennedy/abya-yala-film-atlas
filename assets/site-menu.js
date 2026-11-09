/* The More menu behaves the same on every page: a press on More opens or closes it; a press anywhere else,
   Escape, or choosing an item closes it. */
(function(){
  if(window.__siteMenu)return;window.__siteMenu=1;
  function menus(){return document.querySelectorAll('header details.more-menu');}
  document.addEventListener('pointerdown',function(e){menus().forEach(function(d){if(d.open&&!d.contains(e.target))d.open=false;});});
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;menus().forEach(function(d){if(d.open){d.open=false;var s=d.querySelector('summary');if(s)s.focus();}});});
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('header details.more-menu>div a');if(a){var d=a.closest('details');if(d)d.open=false;}});
  /* the map's theme setting lives at the foot of More; the language selector stays at the top right of the header */
  function settle(){
    var more=document.querySelector('header .more-menu>div');if(!more)return;
    var lang=null,theme=document.querySelector('header .palette-choice>.palette-options');
    if(!lang&&!theme)return;
    var box=more.querySelector('.more-settings');
    if(!box){var sep=document.createElement('span');sep.className='more-sep';box=document.createElement('div');box.className='more-settings';more.append(sep,box);}
    if(lang&&lang.parentNode!==box){var l=lang.querySelector('.visually-hidden');if(l){l.className='more-setting-label';l.textContent='Language';}box.append(lang);}
    if(theme&&theme.parentNode!==box){var t=document.createElement('span');t.className='more-setting-label';t.textContent='Theme';box.append(t,theme);}
  }
  function start(){settle();var h=document.querySelector('header');if(!h)return;var mo=new MutationObserver(settle);mo.observe(h,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},15000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* phones: the language selector shows its code (EN) and the full names when opened */
(function(){
  var phone=window.matchMedia('(max-width:760px)');
  function full(sel){[].forEach.call(sel.options,function(o){if(o.dataset.full)o.textContent=o.dataset.full;});}
  function compact(sel){[].forEach.call(sel.options,function(o){if(!o.dataset.full)o.dataset.full=o.textContent;o.textContent=phone.matches?o.value.toUpperCase():o.dataset.full;});}
  function wire(){var sel=document.getElementById('ui-lang');if(!sel||sel.dataset.compact)return !!sel;sel.dataset.compact='1';
    compact(sel);sel.addEventListener('focus',function(){full(sel);});sel.addEventListener('mousedown',function(){full(sel);});
    sel.addEventListener('blur',function(){compact(sel);});sel.addEventListener('change',function(){setTimeout(function(){compact(sel);sel.blur();},0);});
    (phone.addEventListener?phone.addEventListener('change',function(){compact(sel);}):0);return true;}
  function start(){if(wire())return;var mo=new MutationObserver(function(){if(wire())mo.disconnect();});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},15000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
