'use strict';
(async()=>{
 const a=window.Atlas;await a.ready;const $=s=>document.querySelector(s);
 const tools=document.createElement('div');tools.className='polish-tools';tools.innerHTML='<button id="contact-view" aria-pressed="false">Contact sheet</button>';$('#index-list').before(tools);
 let grid=false;$('#contact-view').onclick=()=>{grid=!grid;update();};
 function update(){const show=a.state.view==='films'&&!a.state.film;tools.hidden=!show;$('#contact-view').hidden=!show;$('#contact-view').setAttribute('aria-pressed',String(grid));$('#index-list').classList.toggle('contact-view',grid&&show);}
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;update();});}).observe($('#index-list'),{childList:true});
 update();
})();
