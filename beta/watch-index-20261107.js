/* Watch index v2 — progressive enhancement of the existing Claude-styled film list.
   Keeps the original NFB/player markup as non-script fallback, and preserves existing
   curated Atlas IDs while adding official Wapikoni full-film research credits.
   A sourced film credit does not establish an Indigenous national affiliation. */
(()=>{'use strict';
const feed=window.ATLAS_WATCH_RESEARCH;
const sourceView=document.querySelector('.view[data-view="source"]');
const main=document.querySelector('main'),tools=document.querySelector('.tools');
const q=document.querySelector('#q'),count=document.querySelector('#count');
if(!feed?.films?.length||!sourceView||!main||!tools||!q||!count)return;
const qs=s=>document.querySelector(s);
const all=s=>[...document.querySelectorAll(s)];
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const txt=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const aLink=(label,url)=>{const a=txt('a','',label);a.href=url||'#';if(url?.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer';}return a;};
const ownOriginal=[];
for(const grp of sourceView.querySelectorAll('section.grp')){
 const head=grp.querySelector('h2');
 const provider=head?.firstChild?.textContent.trim()||head?.textContent.trim()||'Other platforms';
 for(const li of grp.querySelectorAll('ol > li')){
  const anchor=li.querySelector('a.t'),save=li.querySelector('[data-screen]');
  if(!anchor)continue;
  const title=anchor.textContent.trim();
  const makers=[...li.querySelectorAll('.by a[href]')].map(el=>({name:el.textContent.trim(),href:el.getAttribute('href')})).filter(x=>x.name);
  const nations=[...li.querySelectorAll('.by .ppl')].map(el=>el.textContent.trim()).filter(Boolean);
  const yearRaw=save?.dataset.year||li.querySelector('.meta')?.textContent.match(/\b(?:19|20)\d\d\b/)?.[0]||'';
  const year=/^(?:19|20)\d\d$/.test(yearRaw)?Number(yearRaw):null;
  const embed=li.querySelector('.play')?.dataset.embed||'';
  ownOriginal.push({
   id:save?.dataset.fid||'ATLAS-WATCH-'+li.dataset.i,
   title,year,makerLinks:makers,people:makers.map(m=>m.name),nations:[...new Set(nations)],
   provider,embed,href:anchor.href,credit:anchor.href,watch:anchor.href,
   index:'atlas',regionNote:'',catalogYear:false,
   access:[...li.querySelectorAll('.tag')].some(x=>/Free in Canada/i.test(x.textContent))?'ca':'public',
   screen:save?{
    fid:save.dataset.fid,rid:save.dataset.rid,title:save.dataset.title,
    maker:save.dataset.maker,year:save.dataset.year,page:save.dataset.page,watch:save.dataset.watch
   }:null
  });
 }
}
const research=[];
const valid=u=>/^https:\/\/player\.vimeo\.com\/video\/\d+(?:\?h=[a-f0-9]+)?$/.test(u)||/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/.test(u);
const taken=new Set(ownOriginal.map(f=>f.embed).filter(Boolean));
for(const d of feed.films){
 if(!d?.t||!d?.p?.length||!valid(d.e)||taken.has(d.e))continue;
 taken.add(d.e);
 const nations=[...new Set((d.n||[]).map(n=>n.nation).filter(Boolean))];
 const page=d.u?.startsWith('https://evenementswapikoni.ca/')?d.u:d.c;
 const target=d.s?.startsWith('https://')?d.s:d.e;
 research.push({
  id:d.id,title:d.t,year:Number.isInteger(d.y)?d.y:null,
  people:d.p,nations,provider:'Wapikoni',embed:d.e,
  href:page,credit:d.c||page,watch:target,
  index:'research',makerLinks:[],regionNote:'Wapikoni collection (Canada)',
  catalogYear:true,access:'public',
  screen:{fid:d.id,rid:'RESEARCH-WAPIKONI',title:d.t,maker:d.p.join(', '),year:String(d.y||''),page:page,watch:target}
 });
}
const films=[...ownOriginal,...research];
if(!ownOriginal.length||!research.length)return;
const sourceNames=[...new Set(films.map(f=>f.provider))].sort((a,b)=>a.localeCompare(b));
const nationNames=[...new Set(films.flatMap(f=>f.nations))].sort((a,b)=>a.localeCompare(b));
const years=[...new Set(films.map(f=>f.year?Math.floor(f.year/10)*10:null).filter(x=>x!==null))].sort((a,b)=>b-a);
for(const f of films){
 f.search=norm([f.title,...f.people,...f.nations,f.year||'',f.provider,f.regionNote,
  f.index==='atlas'?'atlas indexed mapped':'research film archive',
  f.access==='ca'?'free in canada regional restriction':'watch film'].join(' '));
}
// Respect the existing visual language: no posters without a film-specific display licence,
// no extra bright cards, and no standalone search competing with the page's primary search.
const style=txt('style');style.textContent=[
 'body.watch-unified .view,body.watch-unified #empty{display:none!important}',
 '.watch-facets{display:flex;align-items:flex-end;flex-wrap:wrap;gap:8px 12px;margin:12px 0 4px;padding-bottom:14px;border-bottom:1px solid var(--line)}',
 '.watch-facets label{display:flex;flex:1 1 134px;flex-direction:column;gap:3px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}',
 '.watch-facets select{max-width:100%;width:100%;min-height:34px;font:400 13px var(--sans);padding:6px 28px 6px 9px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:4px;text-transform:none;letter-spacing:0}',
 '.watch-facets .clear{font:13px var(--sans);cursor:pointer;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--accent);padding:8px 2px;align-self:flex-end}',
 '.watch-index-caption{font-size:13px;color:var(--muted);margin:12px 0 0;line-height:1.55}',
 '.watch-index-caption strong{font-weight:600;color:var(--ink)}',
 '#watch-results section.grp{margin-top:24px}',
 '#watch-results section.grp:first-child{margin-top:0}',
 '#watch-results section.grp h2{display:flex;align-items:baseline;gap:9px}',
 '#watch-results li{scroll-margin-top:145px}',
 '#watch-results li .by{margin-top:3px}',
 '#watch-results .source-links{display:inline-flex;flex-wrap:wrap;gap:12px;margin:7px 0 0 10px;font-size:13px}',
 '#watch-results .source-links a{border-bottom:1px solid var(--line)}',
 '#watch-results .source-links a:hover{border-color:var(--accent)}',
 '#watch-results .meta{font-size:13px;color:var(--muted)}',
 '#watch-results .row .t{min-width:0;overflow-wrap:anywhere}',
 '#watch-results .pending{margin-left:8px;color:var(--muted);font-size:12px}',
 '#watch-results .index-status{border:1px solid var(--line);border-radius:999px;padding:1px 7px;margin-left:8px;font-size:11px;white-space:nowrap}',
 '#watch-results .index-status.research{color:var(--muted)}',
 '#watch-results .load-more{font:14px var(--sans);cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:9px 20px;margin:24px auto 4px;display:block}',
 '#watch-results .load-more:hover{border-color:var(--accent)}',
 '#watch-results .load-more[hidden]{display:none}',
 '#watch-results .no-results{color:var(--muted);font-size:15px;margin:22px 0}',
 '.watch-note{color:var(--muted);font-size:13px;margin:10px 0 22px}',
 '@media(max-width:650px){.tools{position:static}.watch-facets label{flex-basis:calc(50% - 12px)}#watch-results .source-links{display:flex;margin-left:0}.row{flex-direction:column;gap:0}#watch-results li .meta{white-space:normal}}'
].join('\n');
document.head.append(style);
const facets=txt('div','watch-facets');
facets.setAttribute('role','group');facets.setAttribute('aria-label','Refine film index');
const selects={};
const filter=(key,label,options)=>{
 const wrap=txt('label','',label),sel=document.createElement('select');
 sel.dataset.filter=key;sel.setAttribute('aria-label',label);
 for(const [value,text] of options){const opt=document.createElement('option');opt.value=value;opt.textContent=text;sel.append(opt);}
 wrap.append(sel);facets.append(wrap);selects[key]=sel;
 return sel;
};
filter('source','Source',[['','All platforms'],...sourceNames.map(n=>[n,n])]);
filter('people','People / nation',[['','All documented peoples'],['__pending__','Affiliation not yet verified'],...nationNames.map(n=>[n,n])]);
filter('index','Atlas relation',[['','All film credits'],['atlas','On the atlas'],['research','Research films']]);
filter('access','Viewing access',[['','All viewing links'],['embed','Playable on this page'],['external','Source only'],['ca','Canada-restricted']]);
filter('decade','Period',[['','All catalog years'],...years.map(y=>[String(y),y+'s']),['unknown','Year not recorded']]);
filter('sort','Order',[['recent','Newest first'],['oldest','Oldest first'],['film','Film title A–Z'],['maker','Filmmaker A–Z']]);
const clear=txt('button','clear','Clear filters');clear.type='button';facets.append(clear);
tools.insertAdjacentElement('afterend',facets);
const description=txt('p','watch-index-caption');
facets.insertAdjacentElement('afterend',description);
const result=txt('div','');result.id='watch-results';
description.insertAdjacentElement('afterend',result);
const pagination=txt('button','load-more','Load more films');pagination.type='button';
const empty=txt('p','no-results','No matching films. Try a different title, filmmaker, nation, source, or period.');
const overview=txt('p','watch-note','Film titles and directors are source-linked. Wapikoni catalog years are not necessarily production years; person-specific Indigenous affiliation is displayed only where independently sourced. Films without an atlas match remain research records.');
result.append(empty,pagination,overview);
const searchParams=new URLSearchParams(location.search);
const allowed=['q','source','people','index','access','decade','sort','view'];
q.value=searchParams.get('q')||q.value||'';
for(const k of Object.keys(selects)){const wanted=searchParams.get(k)||'';if([...selects[k].options].some(o=>o.value===wanted))selects[k].value=wanted;}
const tabs=all('.seg button');
let view=['source','people','maker'].includes(searchParams.get('view'))?searchParams.get('view'):'source';
for(const b of tabs){b.setAttribute('aria-pressed',String(b.dataset.view===view));}
let limit=48;
const makerLabel=f=>f.people[0]||'Unattributed';
const decade=f=>f.year===null?'unknown':String(Math.floor(f.year/10)*10);
const groups=f=>{
 if(view==='source')return [f.provider];
 if(view==='maker'){const s=norm(makerLabel(f));return [s?.[0]?.toUpperCase()||'#'];}
 return f.nations.length?f.nations:['Affiliation not yet independently verified'];
};
const cmp=(a,b)=>{
 switch(selects.sort.value){
  case 'oldest':return (a.year??9999)-(b.year??9999)||a.title.localeCompare(b.title);
  case 'film':return a.title.localeCompare(b.title)||((b.year??0)-(a.year??0));
  case 'maker':return makerLabel(a).localeCompare(makerLabel(b))||a.title.localeCompare(b.title);
  default:return (b.year??-9999)-(a.year??-9999)||a.title.localeCompare(b.title);
 }
};
const persist=()=>{
 const u=new URLSearchParams(location.search);
 for(const k of allowed)u.delete(k);
 const vals={q:q.value.trim(),view,source:selects.source.value,people:selects.people.value,
  index:selects.index.value,access:selects.access.value,decade:selects.decade.value,sort:selects.sort.value};
 for(const [k,v] of Object.entries(vals))if(v&&(k!=='sort'||v!=='recent')&&(k!=='view'||v!=='source'))u.set(k,v);
 const path=location.pathname+(u.toString()?'?'+u.toString():'')+location.hash;
 history.replaceState(null,'',path);
};
const addMakerText=(parent,f)=>{
 f.people.forEach((name,i)=>{
  if(i)parent.append(document.createTextNode(', '));
  const linked=f.makerLinks.find(x=>x.name===name);
  if(linked?.href)parent.append(aLink(name,linked.href));
  else parent.append(document.createTextNode(name));
 });
 if(f.nations.length){
  const nations=txt('span','ppl',' · '+f.nations.join(' / '));
  parent.append(nations);
 }
 const status=txt('span','index-status '+f.index,f.index==='atlas'?'Atlas':'Research');
 status.title=f.index==='atlas'?'Film credited to a filmmaker indexed on the atlas':'Direct film credit in source; map relationship not yet established';
 parent.append(status);
 if(f.access==='ca')parent.append(txt('span','tag','Free in Canada'));
};
const createRow=f=>{
 const li=txt('li');li.dataset.fid=f.id;
 const row=txt('div','row');
 const title=aLink(f.title,f.href);title.className='t';row.append(title);
 const metadata=(f.year?f.year+(f.catalogYear?' (catalog)':''):'Year not recorded')+' · '+f.provider;
 row.append(txt('span','meta',metadata));li.append(row);
 const by=txt('span','by');addMakerText(by,f);li.append(by);
 const buttons=txt('div','watch-buttons');
 if(f.embed){
  const b=txt('button','play','▶ Play here');b.type='button';b.dataset.embed=f.embed;b.dataset.title=f.title;
  b.setAttribute('aria-label','Play '+f.title+' on this page');
  buttons.append(b);
 }
 const sb=txt('button','scr','＋ Screening list');sb.type='button';
 if(f.screen){
  sb.setAttribute('data-screen','');
  for(const [k,v] of Object.entries(f.screen))if(v!==null&&v!==undefined)sb.dataset[k]=v;
  buttons.append(sb);
 }
 const links=txt('span','source-links');
 links.append(aLink('Open film',f.watch||f.href));
 if(f.credit&&f.credit!==f.watch)links.append(aLink('Credits / source',f.credit));
 buttons.append(links);
 li.append(buttons,txt('div','slot'));
 return li;
};
let current=[];
const render=()=>{
 const query=norm(q.value),tokens=query?query.split(' ').filter(Boolean):[];
 current=films.filter(f=>{
  if(selects.source.value&&f.provider!==selects.source.value)return false;
  if(selects.people.value==='__pending__'&&f.nations.length)return false;
  if(selects.people.value&&selects.people.value!=='__pending__'&&!f.nations.includes(selects.people.value))return false;
  if(selects.index.value&&f.index!==selects.index.value)return false;
  if(selects.access.value==='embed'&&!f.embed)return false;
  if(selects.access.value==='external'&&f.embed)return false;
  if(selects.access.value==='ca'&&f.access!=='ca')return false;
  if(selects.decade.value&&decade(f)!==selects.decade.value)return false;
  return tokens.every(t=>f.search.includes(t));
 }).sort(cmp);
 count.textContent=current.length+' '+(current.length===1?'film':'films');
 const playable=current.filter(f=>!!f.embed).length;
 description.replaceChildren();
 const strong=txt('strong','',String(current.length)+' films');description.append(strong);
 description.append(document.createTextNode(' · '+playable+' playable here · '+current.filter(f=>f.index==='atlas').length+' atlas-indexed · '+current.filter(f=>f.index==='research').length+' research credits'));
 const shown=current.slice(0,limit),map=new Map(),totalGroups=new Map();
 for(const f of current)for(const g of groups(f))totalGroups.set(g,(totalGroups.get(g)||0)+1);
 for(const f of shown)for(const g of groups(f)){if(!map.has(g))map.set(g,[]);map.get(g).push(f);}
 const keys=[...map.keys()];
 if(view==='source')keys.sort((a,b)=>(a==='Wapikoni'?-1:b==='Wapikoni'?1:a.localeCompare(b)));
 else if(view==='people')keys.sort((a,b)=>(a.startsWith('Affiliation not')?1:b.startsWith('Affiliation not')?-1:a.localeCompare(b)));
 else keys.sort((a,b)=>a.localeCompare(b));
 result.querySelectorAll('section.grp').forEach(s=>s.remove());
 for(const key of keys){
  const section=txt('section','grp'),h=txt('h2','',key);
  h.append(txt('small','',map.get(key).length+' shown / '+totalGroups.get(key)+' matches'));
  const list=txt('ol');
  for(const f of map.get(key))list.append(createRow(f));
  section.append(h,list);
  result.insertBefore(section,empty);
 }
 empty.hidden=current.length>0;
 pagination.hidden=limit>=current.length;
 pagination.textContent='Show more films · '+Math.min(48,Math.max(0,current.length-limit))+' next';
 persist();
 if(window.AtlasScreening)window.dispatchEvent(new Event('screening-change'));
};
q.placeholder='Search films, filmmakers, peoples, catalog years…';
q.setAttribute('aria-label','Search every film by title, filmmaker, Indigenous people, source, or year');
q.addEventListener('input',()=>{limit=48;render();});
for(const sel of Object.values(selects))sel.addEventListener('change',()=>{limit=48;render();});
for(const b of tabs)b.addEventListener('click',()=>{view=b.dataset.view;limit=48;render();});
clear.addEventListener('click',()=>{
 q.value='';for(const [k,sel] of Object.entries(selects))sel.value=k==='sort'?'recent':'';
 view='source';for(const b of tabs)b.setAttribute('aria-pressed',String(b.dataset.view===view));
 limit=48;render();q.focus();
});
pagination.addEventListener('click',()=>{limit+=48;render();});
document.body.classList.add('watch-unified');
const lede=qs('.lede'),note=qs('main > p.note');
if(lede)lede.textContent=films.length+' source-linked films · '+films.filter(x=>x.index==='atlas').length+' atlas entries and '+research.length+' Wapikoni research films.';
if(note)note.textContent='Search films, filmmakers, and documented Indigenous peoples; group the results by source, people, or filmmaker. Watch on this page or open the film at its source. Availability may vary by region.';
const playable=films.filter(f=>f.embed&&f.access!=='ca');
const tracks=new Map();
for(const f of playable){const arr=tracks.get(f.provider)||[];arr.push(f);tracks.set(f.provider,arr);}
const trackOrder=[...tracks.keys()].sort();
const featured=[];
let moreItems=true;
while(moreItems){
 moreItems=false;
 for(const key of trackOrder){const arr=tracks.get(key);if(arr.length){featured.push(arr.shift());moreItems=true;}}
}
const nowFrame=qs('#now-frame'),nowTitle=qs('#now-title'),nowBy=qs('#now-by'),next=qs('#next');
if(nowFrame&&nowTitle&&nowBy&&next&&featured.length){
 let index=Math.floor(Date.now()/86400000)%featured.length;
 const show=()=>{
  const film=featured[index];nowFrame.src=film.embed;nowFrame.title='Now showing: '+film.title;
  nowTitle.textContent=film.title+(film.year?' ('+film.year+')':'');
  nowBy.replaceChildren();
  addMakerText(nowBy,film);
  nowBy.append(document.createTextNode(' · '),aLink('Film source',film.credit||film.href));
 };
 next.onclick=()=>{index=(index+1)%featured.length;show();};show();
}
render();
})();