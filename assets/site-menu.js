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
    var label=more.querySelector('a[href$="data.html"]');if(label&&label.textContent.trim()==='Data and downloads')label.textContent='Data, Reuse, and CARE';
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

/* About, Data and CARE, and Resources read as one About: the same three tabs at the top of each page (22 Nov 2026). */
(function(){
  var pages=[['about.html','About'],['data.html','Data and CARE'],['resources.html','Resources']];
  var here=location.pathname.split('/').pop()||'index.html';
  if(!pages.some(function(p){return p[0]===here;}))return;
  function start(){
    var main=document.querySelector('main');if(!main||document.querySelector('.about-tabs'))return;
    var nav=document.createElement('nav');nav.className='about-tabs';nav.setAttribute('aria-label','About the atlas');
    nav.innerHTML=pages.map(function(p){return '<a href="'+p[0]+'"'+(p[0]===here?' aria-current="page"':'')+'>'+p[1]+'</a>';}).join('');
    /* About and Resources already carried a two-link strip; the three tabs take its place */
    var old=main.querySelector('nav.eyebrow.pair');if(old)old.replaceWith(nav);else main.insertBefore(nav,main.firstChild);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Phones (760px and narrower), 23 Nov 2026: the header is one slim row with a Menu button. Menu opens the page
   list (the header's own nav, opened out) with the language and day/night choices moved to its foot. */
(function(){
  if(window.__phoneMenu)return;window.__phoneMenu=1;
  var mq=window.matchMedia('(max-width:760px)'),root=document.documentElement;
  function header(){return document.querySelector('body>header');}
  function nav(){var h=header();return h&&h.querySelector(':scope>nav.primary');}
  function btn(){var h=header();return h&&h.querySelector('.phone-menu-btn');}
  function setOpen(open){
    if(open&&!mq.matches)open=false;
    if(open)root.dataset.phoneMenu='open';else delete root.dataset.phoneMenu;
    var b=btn();if(b){b.setAttribute('aria-expanded',String(open));b.querySelector('.t').textContent=open?b.dataset.close:b.dataset.open;}
    var m=nav()&&nav().querySelector('details.more-menu');if(m&&mq.matches)m.open=open;
  }
  // the language and day/night choices live in the menu on phones and go back to the header on wider screens
  function placeTools(){
    var h=header(),n=nav(),tools=h&&h.querySelector('.ui-header-tools');if(!h||!n||!tools)return false;
    if(mq.matches){if(tools.parentElement!==n){tools.__home=tools.__home||{parent:tools.parentElement,next:tools.nextSibling};n.appendChild(tools);}}
    else if(tools.__home&&tools.parentElement===n){var home=tools.__home;home.parent.insertBefore(tools,home.next&&home.next.parentElement===home.parent?home.next:null);}
    return true;
  }
  function setup(){
    var h=header(),n=nav();if(!h||!n)return;
    n.id=n.id||'site-nav';
    if(!btn()){
      var b=document.createElement('button');b.type='button';b.className='phone-menu-btn';
      b.setAttribute('aria-controls',n.id);b.setAttribute('aria-expanded','false');
      b.dataset.open='Menu';b.dataset.close='Close';
      b.innerHTML='<span class="bars" aria-hidden="true"></span><span class="t">Menu</span>';
      h.appendChild(b);
      b.addEventListener('click',function(){setOpen(root.dataset.phoneMenu!=='open');});
    }
    var tries=0;(function again(){if(!placeTools()&&tries++<20)setTimeout(again,250);})();
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&root.dataset.phoneMenu==='open'){setOpen(false);var b=btn();if(b)b.focus();}});
  document.addEventListener('click',function(e){if(root.dataset.phoneMenu!=='open')return;var n=nav();if(e.target.closest&&e.target.closest('a[href]')&&n&&n.contains(e.target))setOpen(false);});
  mq.addEventListener('change',function(){setOpen(false);placeTools();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
