'use strict';
(async()=>{
 const api=window.Atlas;if(!api)return;await api.ready;if(!document.querySelector('#atlas .geography'))return;
 const $=q=>document.querySelector(q);let applying=false,pending=false,pushPending=false;
 const enumValue=(v,choices,fallback)=>choices.includes(v)?v:fallback;
 function route(state){
  const p=new URLSearchParams();p.set('view',state.view);if(state.lists?.[state.view]&&state.lists[state.view]!=='all')p.set('list',state.lists[state.view]);
  for(const [field,key] of [['record','maker'],['film','film'],['land','land'],['crossLand','linked'],['country','country'],['landCountry','landCountry']])if(state[field])p.set(key,state[field]);
  if(state.plane==='relations')p.set('plane','relations');if(state.queries[state.view])p.set('q',state.queries[state.view]);
  if(state.view==='films'){if(state.filmPage)p.set('page',String(state.filmPage+1));if(state.filmLetter)p.set('letter',state.filmLetter);if(state.filmFocus)p.set('focused','1');if(state.filmSort==='year')p.set('sort','year');}
  for(const [field,key] of [['from','from'],['to','to'],['language','language'],['form','form']])if(state.filters[field])p.set(key,state.filters[field]);
  if(!state.filters.undated)p.set('undated','0');if(state.scope==='map')p.set('reviewed','1');if(state.relationshipStyle==='curves')p.set('curves','1');if(state.world)p.set('world','1');
  if(state.pilot)p.set('linkedOnly','1');if(state.unassigned)p.set('unassigned','1');if(state.branchPage)p.set('connectionsPage',String(state.branchPage+1));
  if(!state.connections)p.set('connections','0');if(!state.cinema)p.set('totals','0');if(state.boundaries)p.set('outlines','1');if(!state.worksOpen)p.set('works','0');
  return '#'+p.toString();
 }
 function parse(hash){
  const p=new URLSearchParams(hash.replace(/^#/,''));if(!p.has('view'))return null;
  const st=api.captureState();st.view=enumValue(p.get('view'),['filmmakers','films','land'],'filmmakers');st.lists={filmmakers:'all',films:'all',land:'all'};if(api.listDefinitions[st.view].some(([id])=>id===p.get('list')))st.lists[st.view]=p.get('list');st.plane=p.get('plane')==='relations'?'relations':'map';
  st.record=api.recordById(p.get('maker'))?.id||null;st.film=api.recordById(st.record)?.films.find(f=>f.id===p.get('film'))?.id||null;
  const land=value=>api.lands.some(l=>l.id===value)?value:null;
  st.land=land(p.get('land'));st.crossLand=land(p.get('linked'));if(st.crossLand)st.land=st.crossLand;
  st.country=api.countryByCode(p.get('country'))?.code||null;st.landCountry=api.countryByCode(p.get('landCountry'))?.code||null;
  st.queries={filmmakers:'',films:'',land:''};st.queries[st.view]=(p.get('q')||'').slice(0,400);
  st.filmPage=Math.max(0,Math.min(10000,Number(p.get('page'))||1)-1);st.filmLetter=/^[A-Z#]$/.test(p.get('letter'))?p.get('letter'):'';st.filmFocus=!!st.record&&p.get('focused')==='1';st.filmSort=p.get('sort')==='year'?'year':'title';
  const year=k=>/^\d{4}$/.test(p.get(k))&&Number(p.get(k))>=1900&&Number(p.get(k))<=2100?p.get(k):'';
  const option=(id,k)=>[...$(id).options].some(o=>o.value===p.get(k))?p.get(k):'';
  st.filters={from:year('from'),to:year('to'),language:option('#filter-language','language'),form:option('#filter-form','form'),undated:p.get('undated')!=='0'};
  st.scope=p.get('reviewed')==='1'&&(!st.record||api.recordById(st.record).status==='Map Ready')?'map':'all';st.relationshipStyle=p.get('curves')==='1'?'curves':'cards';st.world=p.get('world')==='1';st.pilot=p.get('linkedOnly')==='1';st.unassigned=p.get('unassigned')==='1';st.community=null;
  st.branchPage=Math.max(0,Math.min(10000,Number(p.get('connectionsPage'))||1)-1);st.connections=p.get('connections')!=='0';st.cinema=p.get('totals')!=='0';st.boundaries=p.get('outlines')==='1';st.worksOpen=p.get('works')!=='0';
  st.center=null;st.scale=null;st.returnContext=st.crossReturn=null;return st;
 }
 function controls(){
  $('#clear-search').hidden=!api.state.queries[api.state.view].trim();
  if(!$('#view-link-fallback').hidden)$('#view-link').value=location.href;
 }
 function commit(mode='push'){
  if(applying)return;const st=api.captureState(),hash=route(st);controls();
  if(hash===location.hash){history.replaceState({atlas:st},'',location.href);return;}
  try{history[mode==='replace'?'replaceState':'pushState']({atlas:st},'',location.pathname+location.search+hash);}catch{}
  controls();
 }
 function queue(mode='push'){
  if(applying)return;if(mode==='push')pushPending=true;if(pending)return;pending=true;
  Promise.resolve().then(()=>{pending=false;const write=pushPending?'push':'replace';pushPending=false;commit(write);});
 }
 function apply(st,fromURL=false){
  if(!st)return;applying=true;
  try{
   for(const [field,id] of [['connections','layer-connections'],['cinema','layer-cinema'],['boundaries','layer-boundaries']]){api.state[field]=st[field]!==undefined?!!st[field]:field!=='boundaries';$('#'+id).checked=api.state[field];}
   api.restoreStop(st);
   api.state.returnContext=st.returnContext||null;api.state.crossReturn=st.crossReturn||null;api.refresh();
   if(fromURL&&(st.record||st.land)&&st.plane==='map')api.frameSelection();
   controls();$('#view-link-fallback').hidden=true;
  }finally{applying=false;}
 }
 window.addEventListener('popstate',e=>apply(e.state?.atlas||parse(location.hash)));
 window.addEventListener('hashchange',()=>{if(!history.state?.atlas){apply(parse(location.hash),true);commit('replace');}});
 const clickSelector='.primary button,.entry-button,[data-browse-list],[data-film-facet],[data-connection],[data-country],[data-relay-country],[data-tip-land],[data-tip-maker],[data-land-relay],[data-search-view],[data-index-land],[data-land-makers],[data-cross-maker],[data-community],[data-adjacent-maker],[data-show-maker],[data-show-films],[data-reveal-works],[data-film-letter],[data-trail],[data-saved],.work-node,#plane-map,#plane-relations,#return,#back-index,#back-land,#clear-country,#clear-community,#unassigned,#pilot,#all-films,#films-prev,#films-next,#relations-prev,#relations-next,#reset-filters,#close-works,#world,#focus-selection,#ixim-map,#clear-search';
 document.addEventListener('click',e=>{if(e.target.closest(clickSelector))queue();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')queue();if(['Enter',' '].includes(e.key)&&e.target.closest('[data-connection],[data-country],.work-node'))queue();},true);
 document.addEventListener('change',e=>{if(e.target.closest('#explore-filters,#film-pages,#layers,#research'))queue();},true);
 document.addEventListener('click',e=>{if(e.target.closest('#zoom-in,#zoom-out,#zoom-reset'))queue('replace');},true);
 for(const type of ['wheel','pointerup','mouseup'])document.addEventListener(type,e=>{if(e.target.closest?.('#atlas'))queue('replace');},{capture:true,passive:true});
 document.addEventListener('input',e=>{if(e.target.id==='search')queue('replace');},true);
 $('#clear-search').onclick=()=>{const search=$('#search');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();};
 $('#copy-view-link').onclick=async()=>{
  commit('replace');const value=location.href;
  try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(value);$('#announcement').textContent='View link copied.';$('#view-link-fallback').hidden=true;}
  catch{$('#view-link-fallback').hidden=false;$('#view-link').value=value;$('#view-link').focus();$('#view-link').select();$('#announcement').textContent='Select and copy this view link.';}
 };
 $('#jump-index').onclick=()=>{$('#index').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#index').focus({preventScroll:true});};
 $('#jump-map').onclick=()=>{$('#atlas').setAttribute('tabindex','-1');$('#atlas').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#atlas').focus({preventScroll:true});};
 const inbound=parse(location.hash);if(inbound)apply(inbound,true);commit('replace');document.body.dataset.navigation='ready';
 window.AtlasNavigation={route,parse,commit,apply};
})().catch(()=>{document.querySelector('#announcement').textContent='View links are unavailable. The atlas remains browsable.';});
