/* Published constellations (Claude, 2026-11-11).
   A constellation saved in beta/constellations/<slug>.json opens at ?c=<slug> (add &play=1 for Play).
   Files hold film IDs only; titles, filmmakers and years are read from the atlas at open time, so
   corrections to records reach published constellations. Opening one gives the reader a copy in
   their own browser, as a share link does; the published file is never changed from the page. */
(function(){
 'use strict';
 var SLUG=/^[a-z0-9][a-z0-9-]{0,79}$/,index=null,docs={},opened={};
 var base=function(){return new URL('./',location.href);};
 function urlFor(slug,mode){var u=base();u.searchParams.set('c',slug);if(mode==='play')u.searchParams.set('play','1');return u.href;}
 function getJSON(path){return fetch(path,{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('Not found');return r.json();});}
 function loadIndex(){return index?Promise.resolve(index):getJSON('constellations/index.json').then(function(j){index=j;api.example=j.example||'';api.list=j.constellations||[];return j;});}
 function load(slug){if(!SLUG.test(slug))return Promise.reject(Error('Unknown constellation.'));return docs[slug]?Promise.resolve(docs[slug]):getJSON('constellations/'+slug+'.json').then(function(j){docs[slug]=j;return j;});}
 function ready(){return new Promise(function(done,fail){var n=0;(function wait(){if(window.AtlasConstellate&&window.AtlasCollections&&window.Atlas)return done();if(++n>200)return fail(Error('Constellate did not start.'));setTimeout(wait,150);})();});}
 function hydrate(doc){
  var A=window.Atlas,w=doc.weave||{},missing=[],items=[];
  (w.items||[]).forEach(function(x){
   var id=x.type+':'+x.record+(x.film?':'+x.film:''),r=A.recordById(x.record),f=r&&x.type==='film'?r.films.find(function(v){return v.id===x.film;}):null;
   if(!r||(x.type==='film'&&!f)){missing.push(id);return;}
   items.push({type:x.type,record:x.record,film:x.film||null,title:x.type==='film'?f.title:r.name,maker:r.name,year:f?f.year:''});
  });
  return {weave:{id:'pub-'+doc.slug,name:w.name,author:w.author,note:w.note,items:items,threads:w.threads||[],links:w.links||[]},missing:missing};
 }
 function content(c){return JSON.stringify([c.name,c.author,c.note,(c.threads||[]).map(function(t){return [t.name,t.description,t.items,t.notes];}),(c.links||[]).map(function(l){return [l.source,l.target,l.label,l.note,l.kind,l.sourceURL];})]);}
 function open(slug,mode){
  return ready().then(function(){return window.Atlas.ready;}).then(function(){return load(slug);}).then(function(doc){
   var S=window.AtlasCollections,C=window.AtlasConstellate,h=hydrate(doc);
   if(!h.weave.items.length)throw Error('This constellation has no films the atlas can find.');
   var fp='pub:'+slug+':'+(doc.updated||''),ids={};h.weave.items.forEach(function(x){ids[x.type+':'+x.record+(x.film?':'+x.film:'')]=1;});
   var sig=content({name:h.weave.name,author:h.weave.author,note:h.weave.note,
     threads:h.weave.threads.map(function(t){var notes={};Object.keys(t.notes||{}).forEach(function(k){if(ids[k])notes[k]=t.notes[k];});return {name:t.name,description:t.description,items:(t.items||[]).filter(function(k){return ids[k];}),notes:notes};}),
     links:h.weave.links.filter(function(l){return ids[l.source]&&ids[l.target];})});
   /* A reader who changed their copy keeps it under its own name; the short address always opens the published version. */
   S.state.collections.forEach(function(c){if((c.shareFingerprint===fp||c.id===h.weave.id)&&content(c)!==sig){c.shareFingerprint='';c.id='copy-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);if(!/\(my copy\)$/.test(c.name))c.name=(c.name+' (my copy)').slice(0,120);}});
   S.importWeave(h.weave,fp);
   opened[S.current().id]={slug:slug,doc:doc,sig:sig};
   C.open();C.setRead(mode!=='play'&&mode!=='build');C.fit('quiet');
   if(mode==='play')C.play();
   if(h.missing.length){var st=document.querySelector('#constellate-status');if(st)st.textContent=h.missing.length+' film'+(h.missing.length>1?'s':'')+' in this constellation '+(h.missing.length>1?'are':'is')+' no longer on the atlas and '+(h.missing.length>1?'were':'was')+' left out.';}
   cite();return doc;
  });
 }
 /* The published copy, unedited, is cited by its short address. An edited copy is the reader's own work and keeps the ordinary share link. */
 function published(){var S=window.AtlasCollections;if(!S)return null;var c=S.current(),o=opened[c.id];return o&&o.sig===content(c)?o:null;}
 function citation(o){var w=o.doc.weave;return (w.author?w.author+'. ':'')+'“'+w.name+'.” Indigenous Cinema Atlas: Abya Yala and Turtle Island, published constellation, '+(o.doc.updated||'')+'. '+urlFor(o.slug);}
 function cite(){
  var o=published();if(!o)return;
  var url=document.querySelector('#weave-url'),panel=document.querySelector('#weave-share-panel'),mode=document.querySelector('#weave-share-mode');
  if(url&&panel&&!panel.hidden){var want=urlFor(o.slug,mode&&mode.value==='play'?'play':'read');if(url.value!==want)url.value=want;var p=document.querySelector('#weave-citation');if(p&&p.textContent!==citation(o))p.textContent=citation(o);}
  var end=document.querySelector('#weave-play-thread'),sub=document.querySelector('#weave-play-subtitle');
  if(end&&sub&&/^constellation complete$/i.test(end.textContent.trim())&&sub.textContent!==citation(o))sub.textContent=citation(o);
 }
 var api=window.AtlasPublished={open:open,urlFor:urlFor,example:'',list:[],index:loadIndex,current:published};
 document.addEventListener('click',function(e){
  if(e.target.closest&&e.target.closest('#constellate-share,#weave-share-mode,#weave-play,#weave-play-next,#weave-play-pause'))[150,600,1400].forEach(function(t){setTimeout(cite,t);});
  var copy=e.target.closest&&e.target.closest('#weave-copy-citation');
  if(copy&&published()){e.preventDefault();e.stopImmediatePropagation();var text=citation(published());(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(function(){var st=document.querySelector('#constellate-status');if(st)st.textContent='Copied.';},function(){});}
 },true);
 document.addEventListener('change',function(e){if(e.target&&e.target.id==='weave-share-mode')[150,600].forEach(function(t){setTimeout(cite,t);});},true);
 function watchEnd(){var end=document.querySelector('#weave-play-thread');if(!end)return setTimeout(watchEnd,500);new MutationObserver(function(){setTimeout(cite,0);}).observe(end,{childList:true,characterData:true,subtree:true});}
 watchEnd();
 loadIndex().catch(function(){});
 var q=new URLSearchParams(location.search),slug=q.get('c');
 if(slug&&!location.hash.startsWith('#weave='))open(slug,q.get('play')==='1'?'play':'read').catch(function(err){ready().then(function(){window.AtlasConstellate.open();var st=document.querySelector('#constellate-status');if(st)st.textContent='Could not open that constellation: '+err.message;});});
})();
