/* Watch (22 Nov 2026). One player at the top, with the films nearest to the one playing beside it on wide screens
   (Related films); below it the films by filmmakers on the atlas, in two views:
   Browse: shelves you scroll sideways (newest, short and feature films, the five theme families), then countries by name;
   A–Z: every film in one index under letters (by title or filmmaker) or decades (newest first), with a strip to jump.
   Data: beta/watch-data.js, written by tools/atlas/build.py. A card plays its film in the player; a film whose host does
   not allow playing here opens there (↗). Addresses: watch.html?theme=Kinship · ?c=CAN · ?view=az · #<film id>. */
(()=>{'use strict';
const W=window.ATLAS_WATCH||{},data=W.films||[],COUNTRY=W.countries||{};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
const playable=f=>f.links.find(l=>l.embed);
const makerText=f=>f.makers.map(m=>m.name).join(', ');
const peopleText=f=>[...new Set(f.makers.map(m=>m.people).filter(Boolean))].join(', ');
const mapHref=f=>`./#view=films&maker=${encodeURIComponent(f.makers[0].id)}&film=${encodeURIComponent(f.fid)}`;
const makersHTML=f=>f.makers.map(m=>`<a href="maker/${encodeURIComponent(m.id)}.html">${esc(m.name)}</a>${m.people?` (${esc(m.people)})`:''}`).join(', ');
const FAMILIES=['Land and Environment','Sovereignty and Politics','Knowledge and Continuity','Lives and Relations','Expression and Representation'];
const params=new URLSearchParams(location.search);
const state={view:'browse',q:'',theme:params.get('theme')||'',pick:null,sort:'title',here:false,now:null};
try{const s=JSON.parse(localStorage.getItem('atlas-watch-view')||'{}');if(['maker','new','title'].includes(s.sort))state.sort=s.sort;state.here=!!s.here;}catch(e){}
const remember=()=>{try{localStorage.setItem('atlas-watch-view',JSON.stringify({sort:state.sort,here:state.here}));}catch(e){}};
const countryName=c=>COUNTRY[c]||c;
const listNames=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];

/* ---------- the player ---------- */
const frame=$('#now-frame');frame.referrerPolicy='strict-origin-when-cross-origin';
const withAutoplay=u=>u+(u.includes('?')?'&':'?')+'autoplay=1';
function play(f,{scroll=false,quiet=false,auto=false}={}){
 const l=playable(f);if(!l)return;state.now=f.fid;
 frame.src=auto?withAutoplay(l.embed):l.embed;frame.title='Player: '+f.t;
 $('#now-title').textContent=f.t+(f.y?` (${f.y})`:'');
 $('#now-by').innerHTML=makersHTML(f)+(f.fx?` · ${esc(f.fx)}`:'')+` · <a id="now-out" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(host(l.url))} ↗</a>`;
 const map=$('#now-map');map.href=mapHref(f);
 const scr=$('#now-scr');Object.assign(scr.dataset,{fid:f.fid,rid:f.makers[0].id,title:f.t,year:f.y||'',maker:makerText(f),
  page:`maker/${encodeURIComponent(f.makers[0].id)}.html#${encodeURIComponent(f.fid)}`,watch:l.url});
 window.dispatchEvent(new Event('screening-change'));
 for(const c of document.querySelectorAll('.card'))c.classList.toggle('now',c.dataset.fid===f.fid);
 renderQueue(f);
 if(scroll)$('#now').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
 if(!quiet)try{history.replaceState(null,'',location.pathname+location.search+'#'+encodeURIComponent(f.fid));}catch(e){}}
/* Share (23 Nov 2026): a link that opens this film on Watch, without the current filters. Phones get the system share sheet;
   elsewhere the link is copied and the button says so for a moment. */
function shareFilm(){const f=data.find(g=>g.fid===state.now);if(!f)return;const b=$('#now-share');
 const url=location.origin+location.pathname+'#'+encodeURIComponent(f.fid),title=f.t+(f.y?` (${f.y})`:'')+' · Indigenous Cinema Atlas';
 const said=t=>{b.textContent=t;clearTimeout(b._t);b._t=setTimeout(()=>{b.textContent='Share';},2200);};
 if(navigator.share&&matchMedia('(pointer:coarse)').matches){navigator.share({title,url}).catch(()=>{});return;}
 const fallback=()=>{const a=document.createElement('textarea');a.value=url;a.setAttribute('readonly','');a.style.cssText='position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}a.remove();said(ok?'Link copied':'Copy failed');};
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>said('Link copied'),fallback);else fallback();}
$('#now-share')?.addEventListener('click',shareFilm);
/* Related films: films that play here, nearest to the one playing first. Nearest means the same filmmaker, then the same
   people, then a shared country, then the most shared themes; among equals, films with a picture, then a fixed mix. */
function related(f){const mk=new Set(f.makers.map(m=>m.id)),pp=new Set(f.makers.map(m=>m.people).filter(Boolean)),cc=new Set(f.c||[]),th=new Set(f.th||[]),fm=new Set(f.fam||[]);
 const near=g=>(g.makers.some(m=>mk.has(m.id))?4000:0)+(g.makers.some(m=>m.people&&pp.has(m.people))?2000:0)+((g.c||[]).some(c=>cc.has(c))?1000:0)
  +(g.th||[]).filter(x=>th.has(x)).length*6+(g.fam||[]).filter(x=>fm.has(x)).length*2;
 return data.filter(g=>g.fid!==f.fid&&playable(g)).map(g=>[near(g),(g.img||ytId(playable(g).embed))?1:0,hash(f.fid+g.fid),g])
  .sort((a,b)=>b[0]-a[0]||b[1]-a[1]||a[2]-b[2]).slice(0,12).map(x=>x[3]);}
// as many rows as fit whole (64px or taller, 12px apart); they share the height, and the rest are hidden
function fitQueue(){const ol=$('#queue-list'),h=ol.clientHeight;if(!h)return;const n=Math.max(1,Math.floor((h+12)/76));
 [...ol.children].forEach((li,i)=>{li.hidden=i>=n;});ol.style.gridTemplateRows=`repeat(${n},minmax(0,1fr))`;}
function renderQueue(f){const q=$('#queue'),items=related(f);q.hidden=!items.length;
 $('#queue-list').innerHTML=items.map(g=>`<li><button type="button" class="q-item" data-queue="${esc(g.fid)}" aria-label="Play ${esc(g.t)}">`
  +`<span class="q-pic">${picture(g,false)}</span><span class="q-text"><span class="t">${esc(g.t)}${g.y?`<small>${g.y}</small>`:''}</span>`
  +`<span class="by">${esc(g.makers.map(m=>m.name+(m.people?` (${m.people})`:'')).join(', '))}</span></span></button></li>`).join('');
 watchImages($('#queue-list'));requestAnimationFrame(fitQueue);}
$('#next').onclick=()=>{const p=visible().filter(f=>playable(f)&&f.fid!==state.now);const all=p.length?p:data.filter(f=>playable(f)&&f.fid!==state.now);
 if(all.length)play(all[Math.floor(Math.random()*all.length)],{auto:true});};

/* ---------- filters ---------- */
const themeCount=new Map(),famCount=new Map();
for(const f of data){for(const t of f.th||[])themeCount.set(t,(themeCount.get(t)||0)+1);for(const x of f.fam||[])famCount.set(x,(famCount.get(x)||0)+1);}
const famOf=new Map();
const sel=$('#theme');
{const byFam=new Map(FAMILIES.map(x=>[x,[]]));byFam.set('',[]);
 // a theme's family is the family most of its films share it with
 for(const t of themeCount.keys()){const c=new Map();for(const f of data)if((f.th||[]).includes(t))for(const x of f.fam||[])c.set(x,(c.get(x)||0)+1);
  const fam=[...c].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';famOf.set(t,fam);(byFam.get(fam)||byFam.get('')).push(t);}
 let h='';for(const [fam,ts] of byFam){if(!ts.length)continue;
  h+=`<optgroup label="${esc(fam||'More themes')}">`+(fam?`<option value="fam:${esc(fam)}">All in ${esc(fam)} (${famCount.get(fam)||0})</option>`:'')
   +ts.sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${esc(t)}">${esc(t)} (${themeCount.get(t)})</option>`).join('')+'</optgroup>';}
 sel.insertAdjacentHTML('beforeend',h);}
if(state.theme&&!themeCount.has(state.theme)&&!(state.theme.startsWith('fam:')&&famCount.has(state.theme.slice(4))))state.theme='';
if(params.get('c')){const cs=params.get('c').split(',').filter(c=>COUNTRY[c]);if(cs.length)state.pick={kind:'c',keys:cs,label:listNames(cs.map(countryName))};}
if(params.get('len')==='S'||params.get('len')==='F')state.pick={kind:'len',keys:[params.get('len')],label:params.get('len')==='S'?'Short films':'Feature films'};
if(state.theme||state.pick||params.get('view')==='az')state.view='az';

const hay=new Map(data.map(f=>[f.fid,norm([f.t,f.y,makerText(f),peopleText(f),...(f.th||[]),...(f.c||[]).map(countryName),f.fx].join(' '))]));
function visible(){const q=norm(state.q).trim(),th=state.theme,p=state.pick;
 return data.filter(f=>(!state.here||playable(f))
  &&(!th||(th.startsWith('fam:')?(f.fam||[]).includes(th.slice(4)):(f.th||[]).includes(th)))
  &&(!p||(p.kind==='c'?(f.c||[]).some(c=>p.keys.includes(c)):p.keys.includes(f.len)))
  &&(!q||q.split(/\s+/).every(w=>hay.get(f.fid).includes(w))));}

/* ---------- cards ---------- */
const THREAD='<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="3"/><path d="M44 16 C66 30 50 46 62 60 C74 74 56 88 66 104" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
const ytId=e=>(e.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/)||[])[1];
const vimeoId=e=>(e.match(/player\.vimeo\.com\/video\/(\d+)/)||[])[1];
const isSaved=fid=>{try{return (window.AtlasScreening?.load()||JSON.parse(localStorage.getItem('atlas-screening-v1')||'[]')).some(x=>x.fid===fid);}catch(e){return false;}};
// a film's picture: a typographic tile (with the people's name on cards) under the image, which fades in when it loads
function picture(f,named=true){const l=playable(f),people=named?peopleText(f):'';
 const imgs=[f.img,l&&ytId(l.embed)&&`https://i.ytimg.com/vi/${ytId(l.embed)}/mqdefault.jpg`].filter(Boolean);
 const vim=!imgs.length&&l&&vimeoId(l.embed);
 return `<span class="tile" aria-hidden="true">${THREAD}${people?`<i>${esc(people)}</i>`:''}</span>`
  +`<img alt="" loading="lazy" decoding="async"${imgs.length?` src="${esc(imgs[0])}" data-next="${esc(imgs.slice(1).join(' '))}"`:''}${vim?` data-vimeo="${vim}"`:''}>`;}
function card(f){const l=playable(f),out=f.links[0];
 const face=picture(f)+`<span class="badge">${l?'▶ Play':esc(host(out.url))+' ↗'}</span>`;
 const pic=l?`<button type="button" class="pic" aria-label="Play ${esc(f.t)}">${face}</button>`
  :`<a class="pic" href="${esc(out.url)}" target="_blank" rel="noopener" aria-label="${esc(f.t)}: opens on ${esc(host(out.url))}">${face}</a>`;
 const on=isSaved(f.fid);
 return `<li class="card${f.fid===state.now?' now':''}" data-fid="${esc(f.fid)}">${pic}`
  +`<button type="button" class="save" data-card-save aria-pressed="${on}" aria-label="${on?'On your screening list':'Add to screening list'}: ${esc(f.t)}" title="${on?'On your screening list':'Add to screening list'}">${on?'✓':'＋'}</button>`
  +`<div class="meta"><p class="t">${esc(f.t)}${f.y?`<small>${f.y}</small>`:''}</p><p class="by">${makersHTML(f)}</p></div></li>`;}
// images: the atlas's own image of the film, else the video's own thumbnail; a typographic tile shows until one loads
document.addEventListener('load',e=>{if(e.target.matches?.('.card img,.q-pic img'))e.target.classList.add('on');},true);
document.addEventListener('error',e=>{const i=e.target;if(!i.matches?.('.card img,.q-pic img'))return;const n=(i.dataset.next||'').split(' ').filter(Boolean);
 i.classList.remove('on');if(n.length){i.dataset.next=n.slice(1).join(' ');i.src=n[0];}else i.removeAttribute('src');},true);
const vimeoThumb=new Map();
const vimeoIO='IntersectionObserver' in window?new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue;vimeoIO.unobserve(e.target);const img=e.target,id=img.dataset.vimeo;
 let key='vthumb:'+id,cached=null;try{cached=sessionStorage.getItem(key);}catch(x){}
 if(cached){if(cached!=='-')img.src=cached;continue;}
 if(!vimeoThumb.has(id))vimeoThumb.set(id,fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent('https://vimeo.com/'+id)}&width=640`).then(r=>r.ok?r.json():null).then(j=>j?.thumbnail_url||'').catch(()=>''));
 vimeoThumb.get(id).then(u=>{try{sessionStorage.setItem(key,u||'-');}catch(x){}if(u)img.src=u;});}},{rootMargin:'200px 400px'}):null;
const watchImages=root=>{if(vimeoIO)for(const i of root.querySelectorAll('img[data-vimeo]:not([src])'))vimeoIO.observe(i);};

/* ---------- Browse: shelves ---------- */
// order on a shelf: films that play here, with a picture, first; then a fixed mix that differs from shelf to shelf,
// so the same few films do not open every row
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
let SEED='';
const rank=f=>[playable(f)?0:1,(f.img||ytId(playable(f)?.embed||''))?0:1,hash(SEED+f.fid)];
const byRank=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;return 0;};
const ranked=(seed,a)=>{SEED=seed;return a.sort(byRank);};
function shelves(){const pool=data,out=[];
 const add=(group,id,title,items,all)=>{if(items.length>=3)out.push({group,id,title,items,all});};
 add('','newest','Newest',pool.filter(f=>f.y).sort((a,b)=>(b.y-a.y)||norm(a.t).localeCompare(norm(b.t))),{sort:'new'});
 add('','shorts','Short films',ranked('S',pool.filter(f=>f.len==='S')),{pick:{kind:'len',keys:['S'],label:'Short films'}});
 add('','features','Feature films',ranked('F',pool.filter(f=>f.len==='F')),{pick:{kind:'len',keys:['F'],label:'Feature films'}});
 for(const fam of FAMILIES)add('','fam-'+fam.replace(/\W+/g,'-').toLowerCase(),fam,ranked(fam,pool.filter(f=>(f.fam||[]).includes(fam))),{theme:'fam:'+fam});
 return out;}
const places=()=>{const cc=new Map();for(const f of data)for(const c of f.c||[])cc.set(c,(cc.get(c)||0)+1);
 return [...cc].sort((a,b)=>b[1]-a[1]||countryName(a[0]).localeCompare(countryName(b[0])));};
const MAX=24;let SHELVES=[];
function renderBrowse(){SHELVES=shelves();let h='',g=null;
 for(const [i,s] of SHELVES.entries()){if(s.group!==g){g=s.group;if(g)h+=`<p class="group-label">${esc(g)}</p>`;}
  h+=`<section class="shelf" id="${s.id}" aria-labelledby="${s.id}-h"><div class="shelf-head"><h2 id="${s.id}-h">${esc(s.title)}</h2><span class="n">${s.items.length}</span>`
   +`<button type="button" class="all" data-all="${i}">See all</button></div>`
   +`<div class="track-wrap"><button type="button" class="nudge l" aria-label="Scroll ${esc(s.title)} back" hidden>‹</button>`
   +`<ul class="track">${s.items.slice(0,MAX).map(card).join('')}${s.items.length>MAX?`<li><button type="button" class="more-tile" data-all="${i}">All ${s.items.length} →</button></li>`:''}</ul>`
   +`<button type="button" class="nudge r" aria-label="Scroll ${esc(s.title)} on">›</button></div></section>`;}
 const pl=places();if(h&&pl.length)h+=`<section class="places" aria-labelledby="places-h"><h2 id="places-h">By country</h2><ul>${pl.map(([c,n])=>`<li><button type="button" data-country="${esc(c)}">${esc(countryName(c))} <small>${n}</small></button></li>`).join('')}</ul></section>`;
 $('#browse').innerHTML=h||'<p class="empty">No film to show.</p>';
 for(const t of document.querySelectorAll('#browse .track')){const w=t.parentElement,l=w.querySelector('.nudge.l'),r=w.querySelector('.nudge.r');
  const upd=()=>{l.hidden=t.scrollLeft<8;r.hidden=t.scrollLeft+t.clientWidth>=t.scrollWidth-8;};
  t.addEventListener('scroll',upd,{passive:true});upd();
  l.onclick=()=>t.scrollBy({left:-t.clientWidth*.85,behavior:'smooth'});r.onclick=()=>t.scrollBy({left:t.clientWidth*.85,behavior:'smooth'});}
 $('#jump').className='jump';$('#jump').innerHTML='';watchImages($('#browse'));}

/* ---------- A–Z: one index ---------- */
const lead=s=>{const c=norm(s).replace(/^[^a-z0-9]+/,'').charAt(0).toUpperCase();return /[A-Z]/.test(c)?c:'#';};
const keyOf={title:f=>lead(f.t),maker:f=>lead(f.makers[0].name),new:f=>f.y?Math.floor(f.y/10)*10+'s':'Undated'};
const order={title:(a,b)=>norm(a.t).replace(/^[^a-z0-9]+/,'').localeCompare(norm(b.t).replace(/^[^a-z0-9]+/,''))||(a.y||0)-(b.y||0),
 maker:(a,b)=>norm(makerText(a)).localeCompare(norm(makerText(b)))||norm(a.t).localeCompare(norm(b.t)),
 new:(a,b)=>(b.y||0)-(a.y||0)||norm(a.t).localeCompare(norm(b.t))};
let azIO=null;
function renderAZ(){const items=visible().sort(order[state.sort]),groups=new Map();
 for(const f of items){const k=keyOf[state.sort](f);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);}
 $('#az').innerHTML=items.length?[...groups].map(([k,fs])=>`<section class="az-sec" id="az-${esc(k)}"><h2>${esc(k)}<small>${fs.length}</small></h2><ul class="grid">${fs.map(card).join('')}</ul></section>`).join('')
  :'<p class="empty">No film matches. Clear the search or the filters.</p>';
 const keys=state.sort==='new'?[...groups.keys()]:[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',...(groups.has('#')?['#']:[])];
 $('#jump').className='jump az';
 $('#jump').innerHTML=keys.map(k=>`<button type="button" data-letter="${esc(k)}"${groups.has(k)?'':' disabled'} aria-label="${groups.has(k)?'Jump to '+esc(k):esc(k)+': no films'}">${esc(k)}</button>`).join('');
 azIO?.disconnect();
 if('IntersectionObserver' in window){azIO=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){const k=e.target.id.slice(3);
  for(const b of document.querySelectorAll('#jump [data-letter]'))b.setAttribute('aria-current',String(b.dataset.letter===k));}},{rootMargin:'-140px 0px -70% 0px'});
  for(const s of document.querySelectorAll('.az-sec'))azIO.observe(s);}
 watchImages($('#az'));}

/* ---------- the page ---------- */
function render(){const az=state.view==='az';$('#tools').dataset.view=state.view;
 $('#v-browse').setAttribute('aria-pressed',String(!az));$('#v-az').setAttribute('aria-pressed',String(az));
 $('#browse').hidden=az;$('#az').hidden=!az;
 sel.value=state.theme;$('#sort').value=state.sort;$('#here').checked=state.here;
 $('#pick').innerHTML=state.pick?`<button type="button" class="chip" id="pick-x" aria-label="Remove filter: ${esc(state.pick.label)}">${esc(state.pick.label)} <span aria-hidden="true">×</span></button>`:'';
 if(az)renderAZ();else renderBrowse();
 const n=az?visible().length:null;$('#count').textContent=az?`${n} film${n===1?'':'s'}`:'';if(typeof stick==='function')requestAnimationFrame(stick);
 const u=new URL(location.href);for(const k of ['theme','c','len','view'])u.searchParams.delete(k);
 if(state.theme)u.searchParams.set('theme',state.theme);
 if(state.pick)u.searchParams.set(state.pick.kind,state.pick.keys.join(','));
 if(az&&!state.theme&&!state.pick)u.searchParams.set('view','az');
 try{history.replaceState(null,'',u.href);}catch(e){}
 window.dispatchEvent(new Event('screening-change'));}
const toTop=()=>{const t=$('#tools');if(t.getBoundingClientRect().top<0)t.scrollIntoView({block:'start'});};
const setView=v=>{if(v==='browse'){state.q='';$('#q').value='';state.theme='';state.pick=null;}state.view=v;render();toTop();};
$('#v-browse').onclick=()=>setView('browse');$('#v-az').onclick=()=>setView('az');
$('#q').addEventListener('input',e=>{state.q=e.target.value;if(state.q.trim())state.view='az';render();});
sel.onchange=()=>{state.theme=sel.value;if(state.theme)state.view='az';render();toTop();};
$('#sort').onchange=e=>{state.sort=e.target.value;state.view='az';remember();render();toTop();};
$('#here').onchange=e=>{state.here=e.target.checked;remember();render();};
document.addEventListener('click',e=>{
 const x=e.target.closest('#pick-x');if(x){state.pick=null;render();return;}
 const all=e.target.closest('[data-all]');if(all){const s=SHELVES[+all.dataset.all];if(!s)return;
  state.theme=s.all.theme||'';state.pick=s.all.pick||null;if(s.all.sort){state.sort=s.all.sort;remember();}state.view='az';render();toTop();return;}
 const pc=e.target.closest('[data-country]');if(pc){const c=pc.dataset.country;state.theme='';state.pick={kind:'c',keys:[c],label:countryName(c)};state.view='az';render();toTop();return;}
 const jl=e.target.closest('[data-letter]');if(jl){document.getElementById('az-'+jl.dataset.letter)?.scrollIntoView({block:'start'});return;}
 const sv=e.target.closest('[data-card-save]');if(sv){const f=data.find(x=>x.fid===sv.closest('.card').dataset.fid),S=window.AtlasScreening;if(!f||!S)return;
  const l=S.load(),i=l.findIndex(x=>x.fid===f.fid);
  if(i>=0)l.splice(i,1);else l.push({fid:f.fid,rid:f.makers[0].id,title:f.t,year:f.y||'',maker:makerText(f),
   page:new URL(`maker/${encodeURIComponent(f.makers[0].id)}.html#${encodeURIComponent(f.fid)}`,location.href).href,watch:f.links[0].url,added:Date.now(),note:''});
  S.save(l);return;}
 const qi=e.target.closest('[data-queue]');if(qi){const f=data.find(x=>x.fid===qi.dataset.queue);if(f)play(f,{auto:true});return;}
 const pic=e.target.closest('button.pic');if(pic){const f=data.find(x=>x.fid===pic.closest('.card').dataset.fid);if(f)play(f,{scroll:true,auto:true});}});
window.addEventListener('screening-change',()=>{for(const b of document.querySelectorAll('[data-card-save]')){const on=isSaved(b.closest('.card').dataset.fid);
 b.setAttribute('aria-pressed',String(on));b.textContent=on?'✓':'＋';const t=(on?'On your screening list':'Add to screening list');b.title=t;}});

/* on phones only the jump strip stays in view; the controls above it scroll away */
const stick=()=>{const row=$('.tools-row'),small=matchMedia('(max-width:760px)').matches,d=document.documentElement.style;
 d.setProperty('--tools-top',small?-row.offsetHeight+'px':'0px');d.setProperty('--stick',($('#tools').offsetHeight-(small?row.offsetHeight:0))+'px');};
addEventListener('resize',stick);
// the list refits whenever the player or its caption changes height (a resize, the rail opening, a longer title)
if('ResizeObserver' in window)new ResizeObserver(fitQueue).observe($('#queue'));else addEventListener('resize',fitQueue);
render();stick();
/* first film: the one named in the address (#film id), else one at random that plays here */
const asked=data.find(f=>f.fid===decodeURIComponent(location.hash.slice(1)));
if(asked&&playable(asked))play(asked,{quiet:true});
else{const p=(visible().filter(playable).length?visible():data).filter(playable);if(p.length)play(p[Math.floor(Math.random()*p.length)],{quiet:true});else $('#now').hidden=true;}
})();
