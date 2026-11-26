/* ==== collect-atlas.js ==== */
try{(function(){
'use strict';
(async()=>{const app=window.Atlas,store=window.AtlasCollections;if(!app||!store)return;await app.ready;const list=document.querySelector('#index-list');
 function selected(){const r=app.recordById(app.state.record);if(!r)return null;const f=r.films.find(f=>f.id===app.state.film);return store.item({type:f?'film':'maker',record:r.id,film:f?.id,title:f?.title||r.name,maker:r.name,year:f?.year||'',image:f&&app.mediaForFilm(f)?.image});}
 function update(){const dossier=list.querySelector('.profile-dossier'),x=selected();if(!dossier||!x)return;let button=dossier.querySelector('[data-collect-current]');if(!button){button=document.createElement('button');button.className='collect-current';button.dataset.collectCurrent='';dossier.querySelector('.dossier-topline').after(button);}const label=window.AtlasConstellate?.enabled?'Add to weave':'Add to a Constellate thread…';if(button.textContent!==label)button.textContent=label;button.title='Choose a thread for this '+(x.type==='film'?'film':'filmmaker');button.onclick=()=>window.AtlasConstellate?.enabled?window.AtlasConstellate.add(x):window.AtlasConstellate?.showPicker(x,button);
  const film=x.film&&app.recordById(x.record)?.films.find(f=>f.id===x.film);if(film?.themes?.length&&!dossier.querySelector('.weave-panel-tags')){const tags=document.createElement('p');tags.className='weave-panel-tags';for(const t of film.themes){const span=document.createElement('span');span.textContent=t.indigenousTerm?(t.indigenousTerm+(t.gloss?' · '+t.gloss:'')):t.term;span.title=t.source==='curator'?'Curator tag · open for review':'Community-supplied term';tags.append(span);}dossier.querySelector('.film-facts')?.after(tags);}}
 let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;update();});}).observe(list,{childList:true,subtree:true});store.subscribe(update);update();
})().catch(e=>console.error('Add to thread could not initialize',e));

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== polish.js ==== */
try{(function(){
'use strict';
(async()=>{
 const a=window.Atlas;await a.ready;const $=s=>document.querySelector(s);
 const tools=document.createElement('div');tools.className='polish-tools';tools.innerHTML='<button id="contact-view" aria-pressed="false">Contact sheet</button>';$('#index-list').before(tools);
 let grid=false;$('#contact-view').onclick=()=>{grid=!grid;update();};
 function update(){const show=a.state.view==='films'&&!a.state.film;tools.hidden=!show;$('#contact-view').hidden=!show;$('#contact-view').setAttribute('aria-pressed',String(grid));$('#index-list').classList.toggle('contact-view',grid&&show);}
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;update();});}).observe($('#index-list'),{childList:true});
 update();
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}

/* ==== reading-theme.js ==== */
try{(function(){
'use strict';
(()=>{const themes={paper:{name:'Sage & cochineal',paper:'#eceef0',ink:'#1c2730',muted:'#56636d',accent:'#3f5466',wash:'#e3e5e8',line:'#c6ccd1'},night:{name:'Starry night',paper:'#0f1830',ink:'#f2e8cf',muted:'#b9c1d6',accent:'#e08a6e',wash:'#1c2b48',line:'#33456a'}};let active='paper';try{if(themes[localStorage.getItem('atlas-reading-theme')])active=localStorage.getItem('atlas-reading-theme');}catch{}
 try{if(localStorage.getItem('atlas-palette-pass')!=='88'){active='paper';localStorage.setItem('atlas-reading-theme','paper');localStorage.setItem('atlas-palette-pass','88');}}catch{}
 function apply(id,persist=false){if(!themes[id])return;active=id;const t=themes[id];document.documentElement.dataset.readingTheme=id;for(const k of ['paper','ink','muted','accent','wash','line'])document.documentElement.style.setProperty('--reading-'+k,t[k]);document.querySelectorAll('[data-reading-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.readingThemeChoice===id)));if(persist)try{localStorage.setItem('atlas-reading-theme',id);}catch{}const label=document.querySelector('#palette-choice-label');if(label)label.textContent=t.name;}
 apply(active);
 function init(){const target=document.querySelector('.atlas-utilities')||document.querySelector('header');if(!target)return;const panel=document.createElement('details');panel.className='palette-choice';panel.innerHTML='<summary>Theme <span id="palette-choice-label"></span></summary><div class="palette-options" aria-label="Compare text palettes">'+Object.entries(themes).map(([id,t])=>`<button data-reading-theme-choice="${id}" aria-pressed="${id===active}"><i style="background:${t.paper};color:${t.ink};border-color:${t.accent}">Aa</i>${t.name}</button>`).join('')+'</div>';target.append(panel);panel.querySelectorAll('button').forEach(b=>b.onclick=()=>apply(b.dataset.readingThemeChoice,true));document.addEventListener('pointerdown',e=>{if(panel.open&&!panel.contains(e.target))panel.open=false;},{capture:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.open){e.preventDefault();e.stopImmediatePropagation();panel.open=false;panel.querySelector('summary').focus();}},{capture:true});apply(active);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();window.addEventListener('storage',e=>{if(e.key==='atlas-reading-theme'&&themes[e.newValue])apply(e.newValue);});window.AtlasReadingTheme={themes,apply,get active(){return active}};
})();

}).call(window);}catch(e){setTimeout(function(){throw e;});}
