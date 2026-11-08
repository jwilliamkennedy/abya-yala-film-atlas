/* Watch, rebuilt 8 Nov 2026 from the Published sheet (beta/watch-data.js, written by tools/atlas/build.py).
   Only films by filmmakers on the atlas. One list; group it by filmmaker, people or year; play here when the host
   allows it, otherwise open the film where it lives (↗). */
(()=>{'use strict';
const data=(window.ATLAS_WATCH&&window.ATLAS_WATCH.films)||[];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
const playable=f=>f.links.find(l=>l.embed);
const makerText=f=>f.makers.map(m=>m.name).join(', ');
const peopleText=f=>[...new Set(f.makers.map(m=>m.people).filter(Boolean))].join('; ');
const state={q:'',group:'maker',here:false};
try{const s=JSON.parse(localStorage.getItem('atlas-watch-view')||'{}');Object.assign(state,{group:s.group||'maker',here:!!s.here});}catch(e){}
const remember=()=>{try{localStorage.setItem('atlas-watch-view',JSON.stringify({group:state.group,here:state.here}));}catch(e){}};

/* now showing */
const nowFrame=$('#now-frame'),nowTitle=$('#now-title'),nowBy=$('#now-by');
const showNow=()=>{const pool=data.filter(playable);if(!pool.length){$('#now').hidden=true;return;}
 const f=pool[Math.floor(Math.random()*pool.length)],l=playable(f);
 nowFrame.src=l.embed;nowFrame.title='Player: '+f.t;
 nowTitle.textContent=f.t+(f.y?' ('+f.y+')':'');
 nowBy.innerHTML=f.makers.map(m=>`<a class="in" href="maker/${encodeURIComponent(m.id)}.html">${esc(m.name)}</a>`).join(', ')+
  (peopleText(f)?` · ${esc(peopleText(f))}`:'')+` · <a class="out" href="${esc(l.url)}" target="_blank" rel="noopener">Watch · ${esc(host(l.url))} ↗</a>`;};
$('#next').onclick=showNow;

/* list */
const list=$('#list'),count=$('#count');
const groupKey=f=>state.group==='year'?(f.y?String(Math.floor(f.y/10)*10)+'s':'Year not recorded')
 :state.group==='people'?(peopleText(f)||'People not recorded')
 :(norm(f.makers[0].name).match(/[a-z]/)||['#'])[0].toUpperCase();
const sortKey=f=>state.group==='year'?[-(f.y||0),norm(f.t)].join('|'):norm(makerText(f))+'|'+norm(f.t);
const row=f=>{const l=playable(f),out=f.links[0];
 return `<li data-fid="${esc(f.fid)}"><div class="row"><span class="t">${esc(f.t)}</span><span class="meta">${f.y||''}</span></div>
  <span class="by">${f.makers.map(m=>`<a class="in" href="maker/${encodeURIComponent(m.id)}.html" title="This filmmaker on the atlas">${esc(m.name)}</a>`).join(', ')}${peopleText(f)?` <span class="ppl">· ${esc(peopleText(f))}</span>`:''}</span>
  <div class="acts">${l?`<button type="button" class="play" data-embed="${esc(l.embed)}" aria-expanded="false">▶ Play here</button>`:''}
   ${f.links.map(x=>`<a class="out" href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.note||x.label)}">Watch · ${esc(host(x.url))} ↗</a>`).join('')}
   <button type="button" class="scr" data-screen data-fid="${esc(f.fid)}" data-rid="${esc(f.makers[0].id)}" data-title="${esc(f.t)}" data-year="${f.y||''}" data-maker="${esc(makerText(f))}" data-page="maker/${encodeURIComponent(f.makers[0].id)}.html#${encodeURIComponent(f.fid)}" data-watch="${esc(out.url)}">＋ Screening list</button></div>
  <div class="slot"></div></li>`;};
const render=()=>{const q=norm(state.q).trim();
 let items=data.filter(f=>(!state.here||playable(f))&&(!q||norm([f.t,f.y,makerText(f),peopleText(f),...f.links.map(l=>l.label+' '+host(l.url))].join(' ')).includes(q)));
 items.sort((a,b)=>sortKey(a)<sortKey(b)?-1:1);
 const groups=new Map();for(const f of items){const k=groupKey(f);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);}
 const keys=[...groups.keys()].sort((a,b)=>state.group==='year'?(b.localeCompare(a)):a.localeCompare(b,undefined,{sensitivity:'base'}));
 list.innerHTML=keys.map(k=>`<h2>${esc(k)} <small>${groups.get(k).length}</small></h2><ol>${groups.get(k).map(row).join('')}</ol>`).join('')||'<p class="empty">No film matches. Clear the search or show films that open elsewhere.</p>';
 count.textContent=`${items.length} of ${data.length} films`;
 for(const b of document.querySelectorAll('.seg button'))b.setAttribute('aria-pressed',String(b.dataset.group===state.group));
 $('#here').checked=state.here;
 window.dispatchEvent(new Event('screening-change'));};
list.addEventListener('click',e=>{const b=e.target.closest('.play');if(!b)return;const slot=b.closest('li').querySelector('.slot');
 const open=b.getAttribute('aria-expanded')==='true';
 if(open){slot.innerHTML='';b.setAttribute('aria-expanded','false');b.textContent='▶ Play here';return;}
 slot.innerHTML=`<div class="frame"><iframe src="${esc(b.dataset.embed)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="Player"></iframe></div>`;
 b.setAttribute('aria-expanded','true');b.textContent='■ Close player';});
$('#q').addEventListener('input',e=>{state.q=e.target.value;render();});
for(const b of document.querySelectorAll('.seg button'))b.onclick=()=>{state.group=b.dataset.group;remember();render();};
$('#here').onchange=e=>{state.here=e.target.checked;remember();render();};
$('#total').textContent=data.length;$('#playable').textContent=data.filter(playable).length;
showNow();render();
})();
