/* Screening list: films a teacher or viewer gathers across the atlas, kept in this browser. */
(()=>{'use strict';const KEY='atlas-screening-v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return [];}};
const save=l=>{try{localStorage.setItem(KEY,JSON.stringify(l));}catch(e){}window.dispatchEvent(new Event('screening-change'));};
const has=id=>load().some(x=>x.fid===id);
const toggle=item=>{const l=load(),i=l.findIndex(x=>x.fid===item.fid);if(i>=0)l.splice(i,1);else l.push({...item,added:Date.now(),note:''});save(l);};
const paint=()=>{const n=load().length;for(const b of document.querySelectorAll('[data-screen]')){const on=has(b.dataset.fid);b.setAttribute('aria-pressed',String(on));b.textContent=on?'✓ On your screening list':'＋ Screening list';}
 for(const c of document.querySelectorAll('[data-screen-count]'))c.textContent=n?`Screening list (${n})`:'Screening list';};
document.addEventListener('click',e=>{const b=e.target.closest('[data-screen]');if(!b)return;e.preventDefault();
 toggle({fid:b.dataset.fid,rid:b.dataset.rid,title:b.dataset.title,year:b.dataset.year||'',maker:b.dataset.maker,page:new URL(b.dataset.page,location.href).href,watch:b.dataset.watch||''});paint();});
window.addEventListener('screening-change',paint);window.addEventListener('storage',e=>{if(e.key===KEY)paint();});
window.AtlasScreening={load,save};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();})();
