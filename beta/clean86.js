'use strict';
// Beta 86: About in the header, a featured card that never covers the map controls, and a quieter selection panel.
(async()=>{
 const A=window.Atlas;if(!A||!A.ready)return;await A.ready;
 // About sits with the main sections, after Constellate.
 const nav=document.querySelector('header nav.primary');
 if(nav&&!nav.querySelector('.about-link')){const c=nav.querySelector('.constellate-link');const a=document.createElement('a');a.href='about.html';a.className='about-link';a.textContent='About';(c||nav.lastElementChild).after(a);}
 // The featured weave card rests just above the zoom and Surprise controls.
 function place(){const card=document.querySelector('#featured-weave'),zoom=document.querySelector('.map-panel .zoom'),panel=document.querySelector('.map-panel');if(!card||!zoom||!panel||card.hidden)return;const p=panel.getBoundingClientRect(),z=zoom.getBoundingClientRect();if(!z.height)return;card.style.bottom=Math.max(12,Math.round(p.bottom-z.top+10))+'px';card.style.left=Math.max(12,Math.round(z.left-p.left))+'px';}
 addEventListener('resize',place);new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']});addEventListener('hashchange',()=>requestAnimationFrame(place));place();setTimeout(place,600);
 // A pager reading "1 / 1" has nowhere to go.
 function pagers(){for(const n of document.querySelectorAll('#index .profile-pager')){const bs=[...n.querySelectorAll('button')],counter=[...n.querySelectorAll('*')].find(e=>!e.children.length&&/^\s*\d+\s*\/\s*\d+\s*$/.test(e.textContent));n.classList.toggle('is-single',(bs.length&&bs.every(b=>b.disabled))||(!!counter&&/^\s*1\s*\/\s*1\s*$/.test(counter.textContent)));}
  // While a selection is held, the trail above already leads back; hide the extra back links.
  for(const el of document.querySelectorAll('#index .index-header button,#index .index-header a,#index .index-command-bar>button,#index .index-command-bar>a'))el.classList.toggle('trail-duplicate',/^←\s*(Land index|Back to )/.test(el.textContent.trim()));}
 const list=document.querySelector('#index');if(list)new MutationObserver(pagers).observe(list,{childList:true,subtree:true});pagers();
})();
// Constellate notices fade after a few seconds instead of sitting over the map controls.
(function fade(){const n=document.querySelector('#weave-notice');if(!n)return setTimeout(fade,800);let t=null;new MutationObserver(()=>{if(n.hidden||!n.textContent)return;clearTimeout(t);t=setTimeout(()=>{n.hidden=true;},4500);}).observe(n,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});})();
// Floating film boxes close when you click away from them or press Escape.
(function dismiss(){
 const map=document.querySelector('.map-panel'),dock=document.querySelector('#map-films'),peek=document.querySelector('#film-peek69');
 if(!map||!dock)return setTimeout(dismiss,800);
 const closePeek=()=>{const p=document.querySelector('#film-peek69');if(p&&!p.hidden)p.querySelector('.peek-close69')?.click();};
 const closeDock=()=>{if(!dock.hidden)dock.classList.add('is-dismissed');};
 // a new selection brings the films panel back
 new MutationObserver(()=>dock.classList.remove('is-dismissed')).observe(dock,{attributes:true,attributeFilter:['data-stamp']});
 document.addEventListener('pointerdown',e=>{const t=e.target;
  if(!t.closest('#film-peek69'))closePeek();
  if(!t.closest('.map-panel')||t.closest('#map-films,g.land-word,g.land-thumb,.zoom,#featured-weave,button,a,details,[role="button"],.map-marker,circle[class*="marker"]'))return;
  closeDock();},true);
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||document.body.classList.contains('is-theme-weaving'))return;closePeek();closeDock();});
})();
// Clearer map tool names, and S opens a surprise.
(function names(){const c=document.querySelector('#country-drawer>summary'),w=document.querySelector('#world');if(!c||!w)return setTimeout(names,800);
 for(const n of c.childNodes)if(n.nodeType===3&&/Country totals/.test(n.textContent))n.textContent=n.textContent.replace('Country totals','Countries');
 const fix=()=>{if(/^World$/.test(w.textContent.trim()))w.textContent='Whole world';};fix();new MutationObserver(fix).observe(w,{childList:true,characterData:true,subtree:true});})();
document.addEventListener('keydown',e=>{if(e.key!=='s'&&e.key!=='S')return;if(e.metaKey||e.ctrlKey||e.altKey)return;const t=e.target;if(t.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(document.body.classList.contains('is-theme-weaving'))return;const b=document.querySelector('#random-entry');if(b&&!b.disabled){e.preventDefault();b.click();}});
// Map tool menus (Countries, Layers, Map key) close when you click elsewhere.
document.addEventListener('pointerdown',e=>{for(const d of document.querySelectorAll('.map-actions details[open]'))if(!d.contains(e.target))d.open=false;},true);
// The weave player shows its place as a row of small stars.
(function dots(){const prog=document.querySelector('#weave-play-progress');if(!prog)return setTimeout(dots,800);
 const row=document.createElement('span');row.className='weave-dots';row.setAttribute('aria-hidden','true');prog.after(row);
 const draw=()=>{const m=prog.textContent.match(/(\d+)\s*\/\s*(\d+)/);if(!m){row.innerHTML='';return;}const i=+m[1],n=Math.min(+m[2],24);row.innerHTML=Array.from({length:n},(_,k)=>`<i class="${k+1===i?'on':k+1<i?'past':''}"></i>`).join('');};
 new MutationObserver(draw).observe(prog,{childList:true,characterData:true,subtree:true});draw();})();
// Every filmmaker and film card ends with a way to suggest a correction.
(function fixLinks(){const list=document.querySelector('#index');if(!list)return setTimeout(fixLinks,800);
 const add=()=>{if(document.querySelector('#selection-summary .sel-links'))return;for(const d of document.querySelectorAll('#index .entry-detail.maker-dossier,#index .entry-detail.film-dossier')){if(d.querySelector('.suggest-fix'))continue;const art=d.closest('article');const title=d.querySelector('.film-dossier-title')?.textContent||art?.querySelector('h2,h3,strong')?.textContent||'';const rec=(d.parentElement?.id||'').replace(/^entry-detail-/,'');const u=new URL('corrections.html',location.href);u.searchParams.set('about',title.trim());u.searchParams.set('record',decodeURIComponent(rec));u.searchParams.set('page',location.href.split('#')[0]+location.hash);const a=document.createElement('a');a.className='suggest-fix';a.href=u.pathname.split('/').pop()+u.search;a.textContent='Suggest a correction →';d.append(a);}};
 new MutationObserver(add).observe(list,{childList:true,subtree:true});add();})();
