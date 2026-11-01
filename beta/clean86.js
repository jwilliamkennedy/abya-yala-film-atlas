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
 function pagers(){for(const n of document.querySelectorAll('#index .profile-pager')){const t=n.textContent.replace(/\s+/g,' ');n.classList.toggle('is-single',/\b1\s*\/\s*1\b/.test(t));}}
 const list=document.querySelector('#index');if(list)new MutationObserver(pagers).observe(list,{childList:true,subtree:true});pagers();
})();
// Constellate notices fade after a few seconds instead of sitting over the map controls.
(function fade(){const n=document.querySelector('#weave-notice');if(!n)return setTimeout(fade,800);let t=null;new MutationObserver(()=>{if(n.hidden||!n.textContent)return;clearTimeout(t);t=setTimeout(()=>{n.hidden=true;},4500);}).observe(n,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});})();
