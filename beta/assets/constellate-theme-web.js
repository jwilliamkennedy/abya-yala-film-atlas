/* Constellate: sourced, exploratory theme-to-film network.
 * Relationships here mean that the same film has both tags in the published atlas.
 * They are NOT claims of affinity between peoples, territories or filmmakers.
 * No coordinates are assigned to concepts; original map stays present beneath this lens.
 */
(function(){
 'use strict';
 var COLORS={
  'Land and Environment':'#33786e',
  'Sovereignty and Politics':'#b7624f',
  'Knowledge and Continuity':'#7770a3',
  'Lives and Relations':'#c08d40',
  'Expression and Representation':'#477eaa',
  'Other themes':'#75838c'
 };
 var FAMILY_MAP={
  'Land and Environment':['Land Defense','Water','Environmental Change','More-than-Human Relations','Food Sovereignty','Extractivism','Land and Territory','Environmental Justice','Territory and Place'],
  'Sovereignty and Politics':['Sovereignty and Self-Determination','Justice, Truth and Reconciliation','Resistance Movements','Governance','Borders and Colonialism','Decolonization'],
  'Knowledge and Continuity':['Linguistic Preservation','Memory and Oral History','Elders and Knowledge','Cosmology and Origin Stories','Ceremony and Spirituality','Archives, Museums and Repatriation','Intergenerational Transmission'],
  'Lives and Relations':['Kinship','Youth','Women and Gender','Health and Healing','Displacement and Migration','Urban Indigeneity'],
  'Expression and Representation':['Art, Craft and Making','Music and Performance','Self-Representation and Countering Stereotypes','Collective and Community Media','Indigenous Futurisms','Humor and Satire']
 };
 var nodeByName=new Map(),films=[],graphLinks=[],families=[],selected='',selectedPair='',activeFamily='All themes',search='',isOpen=false,view=null;
 var filmsShown=20,lastFilmView='',showAllBridges=false;
 var NS='http://www.w3.org/2000/svg';
 var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var canon=function(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();};
 var short=function(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s;};
 var controls,root,svg,aside,list,searchBox,chipRow,notice,toggle;
 function atlas(){return window.AtlasConstellate;}
 function store(){return window.AtlasCollections;}
 function family(term){
  var vocabulary=window.ATLAS_THEMES_1103&&window.ATLAS_THEMES_1103.families;
  if(vocabulary)for(var key of Object.keys(vocabulary))if(vocabulary[key].includes(term))return key;
  for(var f of Object.keys(FAMILY_MAP))if(FAMILY_MAP[f].includes(term))return f;
  return 'Other themes';
 }
 function collect(){
  var api=atlas();if(!api)return false;
  var grouped=new Map();
  for(var x of api.catalog){
   if(x.type!=='film')continue;
   var tags=[...new Set(api.tags(x).filter(t=>t&&typeof t.term==='string').map(t=>t.term.trim()).filter(Boolean))];
   if(!tags.length)continue;
   var entry={x:x,tags:tags};
   films.push(entry);
   for(var t of tags){
    if(!grouped.has(t))grouped.set(t,{name:t,films:[],family:family(t),count:0});
    grouped.get(t).films.push(entry);
   }
  }
  var nodes=[...grouped.values()].filter(n=>n.films.length>0).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
  // The site vocabulary contains 30 themes; display all attested themes, never invent a node.
  nodeByName=new Map(nodes.map(n=>[n.name,n]));
  families=[...new Set(nodes.map(n=>n.family))].sort(function(a,b){return Object.keys(COLORS).indexOf(a)-Object.keys(COLORS).indexOf(b);});
  var ties=new Map();
  for(var f of films){
   var names=f.tags.filter(t=>nodeByName.has(t)).slice(0,18);
   for(var a=0;a<names.length;a++)for(var b=a+1;b<names.length;b++){
    var pair=[names[a],names[b]].sort(),key=pair.join('\u001f');
    if(!ties.has(key))ties.set(key,{source:pair[0],target:pair[1],count:0,films:[]});
    var l=ties.get(key);l.count++;l.films.push(f);
   }
  }
  graphLinks=[...ties.values()].sort((a,b)=>b.count-a.count);
  return nodes.length>0;
 }
 function markup(){
  var map=document.querySelector('.map-panel'),bar=document.getElementById('constellate-mode');
  if(!map||!bar)return false;
  toggle=document.createElement('button');
  toggle.type='button';toggle.id='weave-theme-web-toggle';toggle.textContent='Theme web';
  toggle.title='Browse the documented theme network, select bridges, and start a thread';
  toggle.setAttribute('aria-controls','atlas-theme-web');
  toggle.setAttribute('aria-expanded','false');
  var before=document.getElementById('constellate-read')||document.getElementById('weave-play');
  bar.insertBefore(toggle,before);
  map.insertAdjacentHTML('beforeend',
   '<section id="atlas-theme-web" class="theme-web" hidden aria-label="Theme network within the atlas">'+
    '<div class="tw-heading"><div><p class="tw-kicker">CONSTELLATE / RELATIONAL INDEX</p><h2>Follow the themes</h2><p>Each line joins two themes documented together in a film synopsis. Select a theme or a bridge to follow the films.</p></div>'+
    '<button id="tw-close" type="button" aria-label="Close theme network">×</button></div>'+
    '<div class="tw-top"><label for="tw-search">Find a theme</label><input id="tw-search" type="search" placeholder="Search themes…" autocomplete="off">'+
    '<button id="tw-seed" type="button">Explore a woven example</button></div>'+
    '<div id="tw-families" class="tw-families" role="group" aria-label="Theme families"></div>'+
    '<div class="tw-main"><div class="tw-graph-wrap"><div id="tw-mobile-list" class="tw-mobile-list" aria-label="Browse themes by name"></div><svg id="tw-graph" viewBox="0 0 720 550" role="group" aria-label="Interactive network of sourced themes and co-tagged films"></svg>'+
      '<p class="tw-graph-foot"><span id="tw-stat"></span> · Lines indicate co-tags, not cultural similarity. <button type="button" id="tw-all-links" aria-pressed="false">All bridges</button> <button type="button" id="tw-reset">Reset view</button></p></div>'+ 
    '<aside id="tw-detail" class="tw-detail" aria-live="polite" aria-label="Selected theme and films"></aside></div>'+
    '<p id="tw-live" class="sr-only" role="status" aria-live="polite"></p>'+
   '</section>');
  root=document.getElementById('atlas-theme-web');svg=document.getElementById('tw-graph');aside=document.getElementById('tw-detail');
  searchBox=document.getElementById('tw-search');chipRow=document.getElementById('tw-families');notice=document.getElementById('tw-live');
  toggle.onclick=function(){show(!isOpen);};
  document.getElementById('tw-close').onclick=function(){show(false);toggle.focus();};
  document.getElementById('tw-reset').onclick=function(){activeFamily='All themes';selected='';selectedPair='';search='';searchBox.value='';draw();};
   document.getElementById('tw-all-links').onclick=function(){showAllBridges=!showAllBridges;draw();};
  document.getElementById('tw-seed').onclick=example;
  searchBox.addEventListener('input',function(){search=searchBox.value.trim();selectedPair='';draw();});
  chipRow.addEventListener('click',function(e){var b=e.target.closest('[data-family]');if(!b)return;activeFamily=b.dataset.family;selected='';selectedPair='';draw();});
  svg.addEventListener('click',function(e){
   var edge=e.target.closest('[data-bridge]'),node=e.target.closest('[data-term]');
   if(edge){selectedPair=edge.dataset.bridge;selected='';detail();drawGraph();return;}
   if(node){selected=node.dataset.term;selectedPair='';detail();drawGraph();return;}
  });
  svg.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var el=e.target.closest('[data-term],[data-bridge]');if(el){e.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  document.getElementById('tw-mobile-list').addEventListener('click',function(e){
   var b=e.target.closest('[data-mobile-term],[data-mobile-network]');if(!b)return;
   if(b.hasAttribute('data-mobile-network')){
    root.classList.toggle('tw-show-network');
    b.textContent=root.classList.contains('tw-show-network')?'List of themes':'See the network diagram';
    drawGraph();return;
   }
   selected=b.dataset.mobileTerm;selectedPair='';drawGraph();detail();
   if(window.matchMedia('(max-width:700px)').matches)aside.scrollIntoView({block:'start',behavior:'instant'});
  });
  aside.addEventListener('click',function(e){
   var b=e.target.closest('[data-open-term],[data-film-id],[data-start-term],[data-more-films]');if(!b)return;
    if(b.hasAttribute('data-more-films')){filmsShown+=20;detail();return;}
   if(b.dataset.openTerm){selected=b.dataset.openTerm;selectedPair='';search='';searchBox.value='';activeFamily='All themes';draw();return;}
   if(b.dataset.startTerm){
    show(false);atlas().themeThread(b.dataset.startTerm);
    notice.textContent='Started a theme thread from published film tags.';
    return;
   }
   if(b.dataset.filmId){
    var entry=films.find(f=>f.x.id===b.dataset.filmId);
    if(!entry)return;
    show(false);atlas().open();atlas().followFilm(entry.x);
   }
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen){show(false);toggle.focus();}});
  document.addEventListener('click',function(e){if(e.target.closest('#constellate-exit')&&isOpen)show(false);});
  return true;
 }
 function visibleNodes(){
  var needle=canon(search),list=[...nodeByName.values()];
  return list.filter(n=>(activeFamily==='All themes'||n.family===activeFamily)&&(!needle||canon(n.name).includes(needle)));
 }
 function draw(){
  if(!isOpen)return;
  var nodes=visibleNodes(),names=new Set(nodes.map(n=>n.name)),edges=graphLinks.filter(l=>names.has(l.source)&&names.has(l.target));
  var caption=films.length+' tagged films · '+nodeByName.size+' attested themes · '+graphLinks.length+' documented co-tag bridges';
   var linksButton=document.getElementById('tw-all-links');
   linksButton.hidden=edges.length<=100;
   linksButton.textContent=showAllBridges?'Show strongest bridges':'Show all '+edges.length+' bridges';
   linksButton.setAttribute('aria-pressed',String(showAllBridges));
  document.getElementById('tw-stat').textContent=caption;
  chipRow.innerHTML=['All themes'].concat(families).map(f=>'<button type="button" data-family="'+esc(f)+'" aria-pressed="'+(f===activeFamily)+'"><i style="background:'+esc(COLORS[f]||'#667e8b')+'"></i>'+esc(f)+(f==='All themes'?'':' <small>'+[...nodeByName.values()].filter(x=>x.family===f).length+'</small>')+'</button>').join('');
  var mobile=document.getElementById('tw-mobile-list');
  mobile.innerHTML='<div class="tw-mobile-guide"><strong>Explore '+nodes.length+' themes</strong><button type="button" data-mobile-network>'+(root.classList.contains('tw-show-network')?'List of themes':'See the network diagram')+'</button></div>'+
   '<div class="tw-mobile-grid">'+nodes.map(function(n){return '<button type="button" data-mobile-term="'+esc(n.name)+'" aria-pressed="'+(selected===n.name)+'"><i style="background:'+esc(COLORS[n.family]||'#75838c')+'"></i><span>'+esc(n.name)+'</span><small>'+n.films.length+' films</small></button>';}).join('')+'</div>';
  drawGraph(nodes,edges);detail();
 }
 function drawGraph(provided,providedEdges){
  if(!isOpen)return;
  var nodes=provided||visibleNodes(),names=new Set(nodes.map(n=>n.name)),edges=providedEdges||graphLinks.filter(l=>names.has(l.source)&&names.has(l.target));
  var bounds=svg.getBoundingClientRect(),w=Math.max(620,Math.round(bounds.width||720)),h=Math.max(440,Math.round(bounds.height||550));
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  // Stable thematic-family lanes preserve legible labels at all 30 nodes.
  // The network is a diagram of co-tags, not a geographic or semantic distance map.
  var orders=Object.keys(COLORS).filter(f=>nodes.some(n=>n.family===f));
  var laneMode=orders.length>1&&activeFamily==='All themes'&&!search;
  var placed=[],familyHeaders='';
  if(laneMode){
   var gap=w/orders.length;
   orders.forEach(function(f,col){
    var group=nodes.filter(n=>n.family===f).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
    var step=(h-100)/Math.max(7,group.length);
    familyHeaders+='<text class="tw-family-head" x="'+(gap*(col+.5)).toFixed(1)+'" y="24" text-anchor="middle">'+esc(({'Land and Environment':'LAND','Sovereignty and Politics':'SOVEREIGNTY','Knowledge and Continuity':'KNOWLEDGE','Lives and Relations':'RELATIONS','Expression and Representation':'EXPRESSION'})[f]||short(f,15))+'</text>';
    group.forEach(function(n,row){placed.push({id:n.name,node:n,r:Math.min(22,6+Math.sqrt(n.films.length)*1.4),x:gap*(col+.5),y:65+step*(row+.5)});});
   });
  }else{
   var cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(nodes.length*1.5))));var rows=Math.max(1,Math.ceil(nodes.length/cols));
   nodes.forEach(function(n,i){placed.push({id:n.name,node:n,r:Math.min(23,7+Math.sqrt(n.films.length)*1.5),x:w*(i%cols+.5)/cols,y:65+(h-135)*(Math.floor(i/cols)+.5)/rows});});
  }
  var byId=new Map(placed.map(x=>[x.id,x]));
  var related=new Set();
  if(selected){for(var e of edges)if(e.source===selected)related.add(e.target);else if(e.target===selected)related.add(e.source);}
  var dimTheme=function(n){return selected&&n!==selected&&!related.has(n);};
  var edgeLines=edges.slice().sort(function(a,b){var pa=selected&&(a.source===selected||a.target===selected)?1000:0,pb=selected&&(b.source===selected||b.target===selected)?1000:0;return pb-pa||b.count-a.count;}).slice(0,showAllBridges?edges.length:100).map(function(l){
   var a=byId.get(l.source),b=byId.get(l.target);
   if(!a||!b)return '';
   var highlighted=selectedPair===(l.source+'\u001f'+l.target)||!!selected&&(l.source===selected||l.target===selected);
   var faded=(!!selected&&!highlighted)||(!!selectedPair&&!highlighted);
   return '<g class="tw-bridge" role="button" tabindex="0" aria-label="'+esc(l.source+' and '+l.target+', '+l.count+' films with both themes')+'" data-bridge="'+esc(l.source+'\u001f'+l.target)+'">'+
    '<line class="tw-edge'+(highlighted?' is-related':'')+(faded?' is-faded':'')+'" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke-width="'+Math.min(6,0.7+Math.sqrt(l.count)*.65).toFixed(1)+'"/>'+
    '<line class="tw-edge-hit" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="transparent" stroke-width="16"/>'+
    '<title>'+esc(l.source+' + '+l.target+' · '+l.count+' film'+(l.count===1?'':'s'))+'</title></g>';
  }).join('');
  var dots=placed.map(function(n){
   var active=n.id===selected,fade=dimTheme(n.id),c=COLORS[n.node.family]||COLORS['Other themes'];
   return '<g class="tw-node'+(active?' is-chosen':'')+(fade?' is-faded':'')+'" data-term="'+esc(n.id)+'" role="button" tabindex="0" aria-label="'+esc(n.id+', '+n.node.films.length+' tagged films')+'" transform="translate('+n.x.toFixed(1)+','+n.y.toFixed(1)+')">'+
     '<circle class="tw-ring" r="'+(n.r+6)+'"/><circle class="tw-dot" r="'+n.r+'" fill="'+c+'"/><text class="tw-count" dy="4" text-anchor="middle">'+n.node.films.length+'</text>'+
     '<text class="tw-node-label" y="'+(n.r+17)+'" text-anchor="middle">'+esc(short(n.id,20))+'</text>'+
     '<title>'+esc(n.id+' · '+n.node.films.length+' films')+'</title></g>';
  }).join('');
  svg.innerHTML='<g class="tw-family-headings">'+familyHeaders+'</g><g>'+edgeLines+dots+'</g>';
 }
 function detail(){
  var viewKey=selectedPair?'bridge:'+selectedPair:selected?'theme:'+selected:'home';
  if(viewKey!==lastFilmView){lastFilmView=viewKey;filmsShown=20;}
  var entry=nodeByName.get(selected),edge=selectedPair&&graphLinks.find(l=>l.source+'\u001f'+l.target===selectedPair);
  if(edge){
   var both=edge.films;
   aside.innerHTML='<p class="tw-kicker">DOCUMENTED BRIDGE</p><h3>'+esc(edge.source)+' <span class="tw-and">×</span> '+esc(edge.target)+'</h3>'+
    '<p class="tw-claim">Both tags occur on the same '+both.length+' film'+(both.length===1?'':'s')+'. This is a cataloguing bridge, not an assertion that the communities or makers are culturally identical.</p>'+
    '<div class="tw-actions"><button type="button" data-open-term="'+esc(edge.source)+'">Explore first theme</button><button type="button" data-open-term="'+esc(edge.target)+'">Explore second</button></div>'+renderFilms(both);
  }else if(entry){
   var rel=graphLinks.filter(l=>l.source===entry.name||l.target===entry.name).slice(0,12);
   aside.innerHTML='<p class="tw-kicker">'+esc(entry.family)+'</p><h3>'+esc(entry.name)+'</h3><p class="tw-claim">'+entry.films.length+' film'+(entry.films.length===1?'':'s')+' have this theme in the atlas. The tags originate in film descriptions; see each film’s synopsis source for the evidence.</p>'+
    '<div class="tw-actions"><button class="tw-primary" type="button" data-start-term="'+esc(entry.name)+'">Create a '+esc(short(entry.name,24))+' thread</button></div>'+
    (rel.length?'<h4>Bridges to other themes</h4><div class="tw-neighbors">'+rel.map(l=>{var term=l.source===entry.name?l.target:l.source;return '<button type="button" data-open-term="'+esc(term)+'">'+esc(term)+' <small>'+l.count+' shared film'+(l.count===1?'':'s')+'</small></button>';}).join('')+'</div>':'')+
    '<h4>Films tagged '+esc(entry.name)+'</h4>'+renderFilms(entry.films);
  }else{
   aside.innerHTML='<p class="tw-kicker">HOW TO READ THIS WEB</p><h3>Films connect the themes.</h3>'+
    '<p class="tw-claim">Choose any circle to discover films, or choose a line to see films carrying both themes. Colors group themes for navigation; the network is not a ranking of peoples, places or cultures.</p>'+
    '<h4>Start with a question</h4><div class="tw-neighbors">'+
    [...nodeByName.values()].sort((a,b)=>b.films.length-a.films.length).slice(0,8).map(n=>'<button data-open-term="'+esc(n.name)+'">'+esc(n.name)+' <small>'+n.films.length+' films</small></button>').join('')+'</div>'+
    '<p class="tw-source-note">The underlying map retains sourced land references. Theme nodes have no invented geographical coordinates. Readers can build, annotate, export, and share their own film constellations.</p>';
  }
 }
 function renderFilms(arr){
  var api=atlas(),seen=new Set(),unique=[];
  for(var item of arr){if(seen.has(item.x.id))continue;seen.add(item.x.id);unique.push(item);if(unique.length===filmsShown)break;}
  var total=new Set(arr.map(e=>e.x.id)).size;
  return '<div class="tw-films">'+unique.map(function(item){
   var x=item.x,image=api.sourceImage(x),f=window.Atlas&&window.Atlas.recordById&&window.Atlas.recordById(x.record)?.films.find(g=>g.id===x.film);
    var initials=String(x.title||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>Array.from(w)[0]||'').join('').toUpperCase()||'·';
   var source=f&&f.themeSource;
   return '<article class="tw-film"><div class="tw-film-art">'+(image?'<img loading="lazy" src="'+esc(image)+'" alt="" onerror="this.hidden=true;this.parentElement.classList.add(\'no-art\')">':'')+'<span aria-hidden="true">'+esc(initials)+'</span></div>'+ 
    '<div class="tw-film-copy"><strong>'+esc(x.title)+'</strong><small>'+esc([x.maker,x.year].filter(Boolean).join(' · '))+'</small>'+
    (source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Synopsis source ↗</a>':'<span class="tw-no-source">Atlas theme tag</span>')+'</div>'+
    '<button type="button" data-film-id="'+esc(x.id)+'" aria-label="Follow '+esc(x.title)+' in your weave">Follow →</button></article>';
  }).join('')+'</div>'+(total>unique.length?'<div class="tw-more-actions"><span class="tw-more-count">Showing '+unique.length+' of '+total+' films</span><button type="button" data-more-films>Show next '+Math.min(20,total-unique.length)+' films</button></div>':'');
 }
 function example(){
  var api=atlas(),s=store();if(!api||!s)return;
  if(s.state.collections.length>=50){notice.textContent='Export or remove an old weave before creating a new one.';return;}
  var all=[...nodeByName.values()];
  var candidates=[
   'Land Defense','Justice, Truth and Reconciliation','Linguistic Preservation',
   'Kinship','Art, Craft and Making','More-than-Human Relations',
   'Memory and Oral History','Health and Healing','Women and Gender','Music and Performance'
  ];
  var chosen=[];
  for(var name of candidates){var node=nodeByName.get(name);if(node&&node.films.length>=4)chosen.push(node);if(chosen.length>=6)break;}
  if(chosen.length<4){
   for(var node of all.sort((a,b)=>b.films.length-a.films.length))if(!chosen.some(x=>x.name===node.name)&&node.films.length>=4)chosen.push(node);
  }
  chosen=chosen.slice(0,6);
  if(chosen.length<2){notice.textContent='More documented theme tags are needed before a sample can be built.';return;}
  if(!s.create('Across themes · a sourced film constellation')){notice.textContent='Could not create a new weave.';return;}
  var c=s.current();c.note='An example for visual research. Each colored thread follows a theme assigned from a published film synopsis. Shared films cross between threads. Co-tagging is evidence of a catalog relationship, not evidence of cultural similarity, collaboration or a filmmaker endorsement. Read the film sources, then revise and annotate these paths.';
  var usedIds=new Set(),seenMakers=new Set(),colors=['star-bluewhite','star-blue','star-yellow','star-red','star-orange','star-white'];
  chosen.forEach(function(node,i){
   var t=i?s.createThread(node.name,'Sourced from the published film synopsis; interpret each transition rather than assuming affinity.',colors[i%colors.length]):c.threads[0].id;
   var thread=c.threads.find(x=>x.id===t);
   thread.name=node.name;thread.description='Films tagged '+node.name+'. Co-membership in a theme is a documented catalog relation, not a claim about culture or kinship.';thread.color=colors[i%colors.length];
   var ranked=node.films.slice().sort(function(a,b){
    var aa=(api.sourceImage(a.x)?1:0)+Math.min(4,a.tags.length)*.35;
    var bb=(api.sourceImage(b.x)?1:0)+Math.min(4,b.tags.length)*.35;
    return bb-aa||(a.x.year||9999)-(b.x.year||9999);
   });
   var picks=[],local=new Set();
   for(var f of ranked){if(local.has(f.x.record)||f.x.type!=='film')continue;local.add(f.x.record);picks.push(f);if(picks.length===8)break;}
   for(var f of picks){var clean=s.item(f.x);if(!clean)continue;if(!c.items.some(x=>x.id===clean.id))c.items.push(clean);if(!thread.items.includes(clean.id))thread.items.push(clean.id);usedIds.add(clean.id);seenMakers.add(clean.record);}
  });
  c.activeThread=c.threads[0].id;c.selectedItem=null;s.save();
  show(false);api.open();api.fit();
  notice.textContent='Created '+chosen.length+' sourced theme threads with '+usedIds.size+' films across '+seenMakers.size+' filmmaker records.';
 }
 function show(on){
  if(on&&!atlas()?.enabled)atlas()?.open();
  isOpen=!!on;
  root.hidden=!isOpen;
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-pressed',String(isOpen));
  document.body.classList.toggle('is-theme-web-open',isOpen);
  if(isOpen){draw();searchBox.focus({preventScroll:true});}
 }
 window.addEventListener('resize',function(){if(isOpen)drawGraph();});
 function init(){
  var tries=0;
  var timer=setInterval(function(){
   tries++;
   if(atlas()?.catalog&&store()&&document.getElementById('constellate-mode')){
    clearInterval(timer);
    if(collect()&&markup()){var query=new URLSearchParams(location.search);var firstVisit=query.get('constellate')==='1'&&!store().current().items.length&&!query.has('weave')&&!location.hash.includes('weave=');if(query.get('theme-web')==='1'||firstVisit){atlas().open();show(true);}}
   }else if(tries>70)clearInterval(timer);
  },200);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
