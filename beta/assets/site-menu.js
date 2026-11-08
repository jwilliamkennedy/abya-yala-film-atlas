/* The More menu behaves the same on every page: a press on More opens or closes it; a press anywhere else,
   Escape, or choosing an item closes it. */
(function(){
  if(window.__siteMenu)return;window.__siteMenu=1;
  function menus(){return document.querySelectorAll('header details.more-menu');}
  document.addEventListener('pointerdown',function(e){menus().forEach(function(d){if(d.open&&!d.contains(e.target))d.open=false;});});
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;menus().forEach(function(d){if(d.open){d.open=false;var s=d.querySelector('summary');if(s)s.focus();}});});
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('header details.more-menu>div a');if(a){var d=a.closest('details');if(d)d.open=false;}});
  /* the map's language and theme settings live at the foot of More, so the header holds only the menu (as on every page) */
  function settle(){
    var more=document.querySelector('header .more-menu>div');if(!more)return;
    var lang=document.querySelector('header .ui-lang'),theme=document.querySelector('header .palette-choice>.palette-options');
    if(!lang&&!theme)return;
    var box=more.querySelector('.more-settings');
    if(!box){var sep=document.createElement('span');sep.className='more-sep';box=document.createElement('div');box.className='more-settings';more.append(sep,box);}
    if(lang&&lang.parentNode!==box){var l=lang.querySelector('.visually-hidden');if(l){l.className='more-setting-label';l.textContent='Language';}box.append(lang);}
    if(theme&&theme.parentNode!==box){var t=document.createElement('span');t.className='more-setting-label';t.textContent='Theme';box.append(t,theme);}
  }
  function start(){settle();var h=document.querySelector('header');if(!h)return;var mo=new MutationObserver(settle);mo.observe(h,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},15000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
