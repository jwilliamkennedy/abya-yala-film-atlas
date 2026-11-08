/* Watch (8 Nov 2026): one player at the top and one list of films by filmmakers on the atlas (beta/watch-data.js, written by
   tools/atlas/build.py from the Published sheet). ▶ plays a film in the player; films whose host does not allow it open there (↗).
   Filter by theme (watch.html?theme=Kinship), search, order. watch.html#<film id> opens with that film in the player.
   Each film links to its place on the map. */
(()=>{'use strict';
const data=(window.ATLAS_WATCH&&window.ATLAS_WATCH.films)||[];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
const playable=f=>f.links.find(l=>l.embed);
const makerText=f=>f.makers.map(m=>m.name).join(', ');
const peopleText=f=>[...new Set(f.makers.map(m=>m.people).filter(Boolean))].join('; ');
const mapHref=f=>`./#view=films&maker=${encodeURIComponent(f.makers[0].id)}&film=${encodeURIComponent(f.fid)}`;
const makers=f=>f.makers.map(m=>`<a class="in" href="maker/${encodeURIComponent(m.id)}.html">${esc(m.name)}</a>`).join(', ');
const params=new URLSearchParams(location.search);
const state={q:'',theme:params.get('theme')||'',sort:'maker',here:false,now:null};
try{const s=JSON.parse(localStorage.getItem('atlas-watch-view')||'{}');state.sort=['maker','new','title'].includes(s.sort)?s.sort:'maker';state.here=!!s.here;}catch(e){}
const remember=()=>{try{localStorage.setItem('atlas-watch-view',JSON.stringify({sort:state.sort,here:state.here}));}catch(e){}};

/* the player */
const frame=$('#now-frame');
const play=(f,scroll,quiet)=>{const l=playable(f);if(!l)return;state.now=f.fid;
 frame.src=l.embed;frame.title='Player: '+f.t;
 $('#now-title').textContent=f.t+(f.y?' ('+f.y+')':'');
 $('#now-by').innerHTML=makers(f)+(peopleText(f)?` · ${esc(peopleText(f))}`:'')+` · <a class="in" href="${mapHref(f)}">On the map</a> · <a class="out" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(host(l.url))} ↗</a>`;
 $('#now-note').textContent=l.note||'';
 for(const li of document.querySelectorAll('#list>li'))li.classList.toggle('now',li.dataset.fid===f.fid);
 if(scroll)$('#now').scrollIntoView({behavior:'smooth',block:'start'});
 if(!quiet)try{history.replaceState(null,'',location.pathname+location.search+'#'+encodeURIComponent(f.fid));}catch(e){}};
const pool=()=>visible().filter(playable);
$('#next').onclick=()=>{const p=pool().filter(f=>f.fid!==state.now);const all=p.length?p:data.filter(f=>playable(f)&&f.fid!==state.now);if(all.length)play(all[Math.floor(Math.random()*all.length)],false);};

/* themes */
const themeCount=new Map();for(const f of data)for(const t of f.th||[])themeCount.set(t,(themeCount.get(t)||0)+1);
const sel=$('#theme');
sel.insertAdjacentHTML('beforeend',[...themeCount].sort((a,b)=>a[0].localeCompare(b[0])).map(([t,n])=>`<option value="${esc(t)}">${esc(t)} (${n})</option>`).join(''));
if(state.theme&&!themeCount.has(state.theme))state.theme='';
sel.value=state.theme;

/* the list */
const visible=()=>{const q=norm(state.q).trim();
 return data.filter(f=>(!state.here||playable(f))&&(!state.theme||(f.th||[]).includes(state.theme))
  &&(!q||norm([f.t,f.y,makerText(f),peopleText(f),...(f.th||[])].join(' ')).includes(q)));};
const order={maker:f=>norm(makerText(f))+'|'+norm(f.t),new:f=>String(9999-(f.y||0)).padStart(4,'0')+norm(f.t),title:f=>norm(f.t)};
const row=f=>{const l=playable(f),out=f.links[0];
 return `<li data-fid="${esc(f.fid)}"${f.fid===state.now?' class="now"':''}>
  ${l?`<button type="button" class="pl" aria-label="Play ${esc(f.t)}">▶</button>`:`<a class="pl off" href="${esc(out.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(f.t)} on ${esc(host(out.url))}" title="Opens on ${esc(host(out.url))}">↗</a>`}
  <div><p class="ft">${esc(f.t)}${f.y?`<small>${f.y}</small>`:''}</p>
  <p class="fb">${makers(f)}${peopleText(f)?` · ${esc(peopleText(f))}`:''}</p>
  <div class="fl"><a class="in" href="${mapHref(f)}">On the map</a>${f.links.map(x=>`<a class="out" href="${esc(x.url)}" target="_blank" rel="noopener"${x.note?` title="${esc(x.note)}"`:''}>${esc(host(x.url))} ↗</a>`).join('')}
   ${(f.th||[]).length?`<span class="ttag">${f.th.map(esc).join(' · ')}</span>`:''}
   <button type="button" class="scr" data-screen data-fid="${esc(f.fid)}" data-rid="${esc(f.makers[0].id)}" data-title="${esc(f.t)}" data-year="${f.y||''}" data-maker="${esc(makerText(f))}" data-page="maker/${encodeURIComponent(f.makers[0].id)}.html#${encodeURIComponent(f.fid)}" data-watch="${esc(out.url)}">＋ Screening list</button></div></div></li>`;};
const render=()=>{const items=visible().sort((a,b)=>order[state.sort](a)<order[state.sort](b)?-1:1);
 $('#list').innerHTML=items.map(row).join('')||'<li class="empty">No film matches. Clear the search or the theme.</li>';
 $('#count').textContent=items.length===data.length?'':`${items.length} of ${data.length}`;
 $('#here').checked=state.here;$('#sort').value=state.sort;
 const u=new URL(location.href);if(state.theme)u.searchParams.set('theme',state.theme);else u.searchParams.delete('theme');try{history.replaceState(null,'',u.href);}catch(e){}
 window.dispatchEvent(new Event('screening-change'));};
$('#list').addEventListener('click',e=>{const b=e.target.closest('button.pl');if(!b)return;const f=data.find(x=>x.fid===b.closest('li').dataset.fid);if(f)play(f,true);});
$('#q').addEventListener('input',e=>{state.q=e.target.value;render();});
sel.onchange=()=>{state.theme=sel.value;render();};
$('#sort').onchange=e=>{state.sort=e.target.value;remember();render();};
$('#here').onchange=e=>{state.here=e.target.checked;remember();render();};
$('#total').textContent=data.length;$('#playable').textContent=data.filter(playable).length;
render();
/* first film: the one named in the address (#film id), else one at random from the list */
const asked=data.find(f=>f.fid===decodeURIComponent(location.hash.slice(1)));
if(asked&&playable(asked))play(asked,false);else{const p=pool().length?pool():data.filter(playable);if(p.length)play(p[Math.floor(Math.random()*p.length)],false,true);else $('#now').hidden=true;}
})();
