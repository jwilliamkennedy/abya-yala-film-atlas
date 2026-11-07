/* Indigenous Cinema Atlas beta: ID-preserving relation bridge.
   Only existing Atlas land and filmmaker joins are used; never infer identity from point-in-polygon. */
(function(){
'use strict';
var el=function(id){return document.getElementById(id);};
var base=window.ATLAS_NAMES_DATA&&window.ATLAS_NAMES_DATA.records||[];
var supplementary=[].concat(
 (window.ATLAS_RESEARCH_ADDITIONS&&window.ATLAS_RESEARCH_ADDITIONS.lands)||[],
 (window.ATLAS_SOUTH_AMERICA_50&&window.ATLAS_SOUTH_AMERICA_50.lands)||[],
 (window.ATLAS_SOUTH_AMERICA_50_BATCH2&&window.ATLAS_SOUTH_AMERICA_50_BATCH2.lands)||[]
);
var names=base.concat(supplementary),nameById=new Map(names.map(function(r){return [r.id,r];}));
var sourceMatches=window.AtlasMapLabelLayout&&window.AtlasMapLabelLayout.sourceMatches;
var polygons=window.ATLAS_TERRITORIES&&window.ATLAS_TERRITORIES.features||[];
var groups=new Map(),landBySource=new Map(),sourcesByLand=new Map();
var edges=window.ATLAS_LAND_CROSSINDEX&&window.ATLAS_LAND_CROSSINDEX.edges||[];
var edgesByLand=new Map(),recordsById=new Map(),archiveReady=false;
var selectedLand=null,selectedSource=null,map=null,query='',maxResults=14;
var explicitRegion={ 'NAME-001':'americas', 'NAME-087':'ixim', 'NAME-124':'wallmapu'};
var landIndexCount={groups:0,matchedGroups:0,ambiguousGroups:0,sourced:0,provisional:0,missingRecords:0};
function normalize(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘ʻʼ]/g,"'").toLocaleLowerCase();}
function title(r){return r&&r.name||r&&r.director||r&&r.id||'Unnamed entry';}
function button(label,className){var b=document.createElement('button');b.type='button';b.textContent=label;if(className)b.className=className;return b;}
function link(label,url){var a=document.createElement('a');a.href=url;a.textContent=label;return a;}
function cleanURL(value){
 try{var u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch(e){return null;}
}
function stateLabel(status){return status==='sourced'?'Sourced affiliation reference':'Provisional catalog match';}
for(var f of polygons){
 if(!f||!f.properties||!f.geometry)continue;
 var source=String(f.properties.name||'Unnamed mapped reference');
 if(!groups.has(source))groups.set(source,{id:String(f.id),source:source,features:[]});
 groups.get(source).features.push(f);
}
for(var n of names){
 for(var g of groups.values()){
  if(sourceMatches&&sourceMatches(n.name,g.source)){
   if(!g.candidates)g.candidates=[];
   g.candidates.push(n);
  }
 }
}
// Mirror existing Atlas canonicalization: last matching indexed name owns a same-titled geometry.
// Keep all alternative matches explicit rather than quietly claiming they are synonyms.
for(var g of groups.values()){
 var matches=g.candidates||[];
 var chosen=matches.length?matches[matches.length-1]:null;
 var id=chosen?chosen.id:'LAND-'+g.id;
 var mapped={id:id,source:g.source,featureId:g.id,
   name:chosen?chosen.name:g.source,record:chosen,alternatives:matches,features:g.features};
 landBySource.set(g.source,mapped);
 if(!sourcesByLand.has(id))sourcesByLand.set(id,[]);
 sourcesByLand.get(id).push(mapped);
 if(matches.length>1)landIndexCount.ambiguousGroups++;
 if(matches.length)landIndexCount.matchedGroups++;
}
landIndexCount.groups=groups.size;
for(var e of edges){
 if(!e||!e.land||!e.record)continue;
 if(!edgesByLand.has(e.land))edgesByLand.set(e.land,[]);
 edgesByLand.get(e.land).push(e);
 if(e.status==='sourced')landIndexCount.sourced++;
 else landIndexCount.provisional++;
}
function identifyGeometry(source,id){
 var g=landBySource.get(source);
 if(!g)return {id:'LAND-'+String(id),label:'',source:source};
 return {id:g.id,label:g.record?g.name:'',source:g.source,
  matchType:g.record?'Exact/source-name relay':'Mapped source name (no linked autonym)'};
}
function chip(label,kind){var s=document.createElement('span');s.textContent=label;s.className='relation-chip '+(kind||'');return s;}
function empty(container){container.replaceChildren();}
function line(container,label,text){var p=document.createElement('p');var strong=document.createElement('strong');strong.textContent=label;p.append(strong,document.createTextNode(text));container.appendChild(p);}
function officialEntryURL(id){return '../#view=filmmakers&maker='+encodeURIComponent(id);}
function atlasLandURL(id){return '../#view=land&land='+encodeURIComponent(id);}
function sourceLinks(container,record){
 if(!record)return;
 var urls=[];
 if(record.sourceURL)urls.push(record.sourceURL);
 if(Array.isArray(record.sources))for(var s of record.sources)if(s&&s.url)urls.push(s.url);
 var first=urls.map(cleanURL).find(Boolean);
 if(first)container.append(link('Source ↗',first));
}
function linksForLand(id){
 var list=edgesByLand.get(id)||[],map=new Map();
 for(var e of list){
  var key=e.record;
  if(!map.has(key)||e.status==='sourced'&&map.get(key).status!=='sourced')map.set(key,e);
 }
 return Array.from(map.values()).sort(function(a,b){
  return Number(b.status==='sourced')-Number(a.status==='sourced')||
   title(recordsById.get(a.record)).localeCompare(title(recordsById.get(b.record)));
 });
}
function renderRecords(root,id){
 var matches=linksForLand(id),sourced=matches.filter(function(e){return e.status==='sourced';}),
   provisional=matches.filter(function(e){return e.status!=='sourced';});
 var head=document.createElement('h3');head.textContent='Connected filmmakers · '+matches.length;root.appendChild(head);
 if(!matches.length){
  line(root,'No indexed connection. ','The presence of a mapped territory does not establish any filmmaker affiliation.');return;
 }
 [sourced,provisional].forEach(function(bucket,section){
  if(!bucket.length)return;
  var h=document.createElement('h4');h.textContent=section?'Provisional connections ('+bucket.length+')':'Sourced connections ('+bucket.length+')';root.appendChild(h);
  var list=document.createElement('ul');list.className='maker-links';
  for(var e of bucket.slice(0,section?8:12)){
   var r=recordsById.get(e.record),item=document.createElement('li');
   if(r){item.appendChild(link(title(r),officialEntryURL(e.record)));}
   else {item.appendChild(chip('Record '+e.record+' · not loaded','pending'));landIndexCount.missingRecords++;}
   if(r&&r.films&&r.films.length){
     var films=document.createElement('small');films.textContent=r.films.slice(0,2).map(function(f){return f.title;}).filter(Boolean).join(' · ');
     item.appendChild(films);
   }
   var status=document.createElement('small');status.textContent=stateLabel(e.status)+' · '+String(e.basis||'No basis supplied');item.appendChild(status);
   var source=cleanURL(e.source);
   if(source)item.appendChild(link('Evidence ↗',source));
   list.appendChild(item);
  }
  root.appendChild(list);
  if(bucket.length>(section?8:12)){
    var rest=document.createElement('p');rest.className='relation-overflow';
    rest.textContent=(bucket.length-(section?8:12))+' additional '+(section?'provisional':'sourced')+' connections are available through the atlas index.';
    root.appendChild(rest);
  }
 });
 var c=document.createElement('p');c.className='relation-note';
 c.textContent='Sourced describes the documented affiliation link, not residence or a legal claim over this area. Provisional connections remain unverified matches.';
 root.appendChild(c);
}
function renderDetail(id,sourceName,allowFly){
 var r=nameById.get(id),source=sourceName?landBySource.get(sourceName):null;
 var linked=sourcesByLand.get(id)||[];
 if(!r&&!source){
  // Named source regions may lack an autonym, but can still be indexed by LAND-id.
  source=Array.from(landBySource.values()).find(function(g){return g.id===id;})||null;
 }
 if(!r&&!source)return false;
 selectedLand=id;selectedSource=source&&source.source||null;
 el('selection').hidden=false;
 el('selection-heading').textContent=r?r.name:source.name;
 var list=el('selection-list'),note=el('selection-note');empty(list);
 var reference=document.createElement('li');reference.textContent=r?'Name record · '+r.id:'Mapped reference · '+id;list.appendChild(reference);
 if(r){var region=document.createElement('li');region.textContent=r.region||r.usage||'Atlas index';list.appendChild(region);}
 if(source){list.appendChild(document.createElement('li')).textContent='2023 polygon · '+source.featureId;}
 var body=el('selection-relations');empty(body);
 if(r){
  line(body,'Usage. ',String(r.usage||'Not specified.'));
  line(body,'Context. ',String(r.context||'Not specified.'));
  line(body,'Name verification. ',String(r.verification||'Refer to the named source; spelling/usage not independently confirmed.'));
  var sourceURL=cleanURL(r.sourceURL);
  if(sourceURL)body.appendChild(link('Name source ↗',sourceURL));
 }
 if(source){
   if(source.alternatives.length>1){
     line(body,'Ambiguous source-name alignment. ','This source spelling matched multiple index names: '+
      source.alternatives.map(function(x){return x.name+' ['+x.id+']';}).join('; ')+'. No synonymy is asserted.');
   }
   line(body,'Geographic basis. ','Archived 2023 polygon, not a sovereign or exclusive boundary.');
 }else if(!linked.length){
   line(body,'Geographic basis. ','No geometry is attached to this name in the Atlas. Do not infer a polygon from a country or nearby filmmaker.');
 }
 var a=link('Open this exact land index ↗',atlasLandURL(id));a.className='land-index-link';body.appendChild(a);
 renderRecords(body,id);
 if(allowFly)focusLand(id);
 if(map&&map.getLayer('atlas-selected-land')){
   map.setFilter('atlas-selected-land',['==',['get','atlas_land_id'],id]);
 }
 return true;
}
function selectLands(sourceNames,total){
 if(!sourceNames||!sourceNames.length)return false;
 var names=sourceNames.filter(function(n){return landBySource.has(n);});
 if(!names.length)return false;
 var links=el('overlap-links');empty(links);
 var h=document.createElement('strong');h.textContent='At this point · '+total+' overlapping polygon references';links.appendChild(h);
 for(var name of names){
   var group=landBySource.get(name);
   var b=button(group.name,'overlap-choice');
   b.onclick=(function(g){return function(){renderDetail(g.id,g.source,false);};})(group);
   links.appendChild(b);
 }
 renderDetail(landBySource.get(names[0]).id,names[0],false);
 return true;
}
function boundsFor(features){
 var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 function scan(c){
   if(!Array.isArray(c))return;
   if(typeof c[0]==='number'&&typeof c[1]==='number'){
    if(Number.isFinite(c[0])&&Number.isFinite(c[1])){
     minX=Math.min(c[0],minX);maxX=Math.max(c[0],maxX);
     minY=Math.min(c[1],minY);maxY=Math.max(c[1],maxY);
    }
   }else c.forEach(scan);
 }
 features.forEach(function(f){scan(f.geometry&&f.geometry.coordinates);});
 return [minX,minY,maxX,maxY];
}
function focusLand(id){
 var refs=sourcesByLand.get(id)||[],features=refs.flatMap(function(r){return r.features;});
 if(features.length){
  var b=boundsFor(features);
  if(b.every(Number.isFinite)&&b[2]-b[0]<145&&b[3]-b[1]<105){
   var prefersReduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:85,maxZoom:5.5,duration:prefersReduce?0:950});
   statusSmall('Map fitted to the source polygon reference; not to a filmmaker’s location.');return;
  }
 }
 if(explicitRegion[id]){
   el('region').value=explicitRegion[id];el('region').dispatchEvent(new Event('change'));
   statusSmall('Regional camera only. No territorial geometry is inferred for this name.');return;
 }
 statusSmall('This name has no safe, indexed map extent; camera retained. Browse its documentary relationships instead.');
}
function statusSmall(s){el('relation-status').textContent=s;}
function searchNames(){
 var results=el('autonym-results'),value=normalize(el('autonym-search').value.trim());empty(results);
 var sorted=names.filter(function(n){
  return !value||normalize([n.name,(n.aliases||[]).join(' '),n.region,n.context,n.usage].join(' ')).includes(value);
 }).sort(function(a,b){
   var x=normalize(a.name),y=normalize(b.name),prefixA=value&&x.startsWith(value)?0:1,prefixB=value&&y.startsWith(value)?0:1;
   return prefixA-prefixB||a.name.localeCompare(b.name);
 });
 el('autonym-count').textContent=sorted.length+' matched index names';
 for(var n of sorted.slice(0,maxResults)){
  var b=button(n.name,'autonym-choice');
  var meta=document.createElement('small');meta.textContent=(n.region||'Index')+' · '+n.id;
  b.appendChild(meta);b.onclick=(function(r){return function(){chooseName(r.id);};})(n);
  results.appendChild(b);
 }
 if(!sorted.length)results.appendChild(chip('No matching name in this index','pending'));
}
function chooseName(id){
 var n=nameById.get(id);if(!n)return;
 var field=el('autonym-search');field.value=n.name;
 searchNames();el('autonym-results').hidden=true;
 empty(el('overlap-links'));
 renderDetail(id,null,true);
 statusSmall('Selected name '+n.id+' · follow documented links, not spatial proximity.');
}
function closePanel(){
 el('selection').hidden=true;selectedLand=null;selectedSource=null;
 empty(el('overlap-links'));
 if(map&&map.getLayer('atlas-selected-land'))map.setFilter('atlas-selected-land',['==',['get','atlas_land_id'],'']);
}
function initializeOnMap(m){
 map=m;
 if(!map.getSource('atlas-land-geometry'))return;
 map.addLayer({id:'atlas-selected-land',type:'line',source:'atlas-land-geometry',
  filter:['==',['get','atlas_land_id'],''],
  paint:{'line-color':'#fff2b0','line-width':3,'line-opacity':0.95}});
 map.addLayer({id:'atlas-autonym-symbols',type:'symbol',source:'atlas-land-geometry',
  layout:{visibility:el('name-toggle').checked?'visible':'none',
   'text-field':['get','atlas_autonym'],'text-size':['interpolate',['linear'],['zoom'],1,10,4,12,8,14],
   'text-font':['Open Sans Regular','Arial Unicode MS Regular'],
   'text-max-width':10,'text-allow-overlap':false,'text-padding':6},
  paint:{'text-color':'#fff5e4','text-halo-color':'#163c45','text-halo-width':1.8,'text-halo-blur':0.4}});
 var count=landIndexCount.matchedGroups;
 el('relation-status').textContent=count+' mapped source titles correspond to indexed name records. The remaining names stay searchable without invented geometry.';
 window.AtlasGlobeRelations.testSummary=function(){return {
  names:names.length,sourceGroups:groups.size,matchedSourceNames:count,
  ambiguousSourceNames:landIndexCount.ambiguousGroups,edges:edges.length,
  sourced:landIndexCount.sourced,provisional:landIndexCount.provisional,
  recordCount:recordsById.size,loadedRecords:archiveReady,
  selectedLand:selectedLand,selectedSource:selectedSource};};
}
async function loadRecords(){
 try{
  var [c,a]=await Promise.all([fetch('../assets/catalog-records.json'),fetch('../assets/archive.json')]);
  if(!c.ok||!a.ok)throw new Error('Catalog records unavailable.');
  var catalog=await c.json(),metadata=await a.json();
  var additive=[].concat(
   window.ATLAS_REBUILD_SUPPLEMENT&&window.ATLAS_REBUILD_SUPPLEMENT.records||[],
   window.ATLAS_RESEARCH_ADDITIONS&&window.ATLAS_RESEARCH_ADDITIONS.records||[],
   window.ATLAS_SOUTH_AMERICA_50&&window.ATLAS_SOUTH_AMERICA_50.records||[],
   window.ATLAS_SOUTH_AMERICA_50_BATCH2&&window.ATLAS_SOUTH_AMERICA_50_BATCH2.records||[],
   window.ATLAS_PILOT_CATALOG&&window.ATLAS_PILOT_CATALOG.records||[]
  );
  var byId=new Map(catalog.map(function(r){return [r.id,r];}));
  additive.forEach(function(r){if(!byId.has(r.id))byId.set(r.id,r);});
  var records=Array.from(byId.values()),countries=metadata.countries||[];
  // Same canonical October/November runtime film update as the beta, including folds and exclusions.
  if(window.AtlasUpdate1031)window.AtlasUpdate1031.apply(records,countries);
  recordsById=new Map(records.map(function(r){return [r.id,r];}));
  archiveReady=true;
  if(selectedLand)renderDetail(selectedLand,selectedSource,false);
  statusSmall(el('relation-status').textContent+' · '+records.length+' current record IDs loaded.');
 }catch(err){statusSmall('Names and sourced/provisional joins loaded, but filmmaker titles could not be loaded: '+err.message);}
}
function init(){
 var field=el('autonym-search');
 if(!field)return;
 field.addEventListener('input',function(){el('autonym-results').hidden=false;searchNames();});
 field.addEventListener('focus',function(){el('autonym-results').hidden=false;searchNames();});
 field.addEventListener('keydown',function(e){
  if(e.key==='Escape')el('autonym-results').hidden=true;
  if(e.key==='Enter'){
   var first=el('autonym-results').querySelector('button');if(first){first.click();e.preventDefault();}
  }
 });
 el('autonym-results').addEventListener('click',function(e){if(e.target.closest('button'))el('autonym-results').hidden=true;});
 el('name-toggle').addEventListener('change',function(e){
  if(map&&map.getLayer('atlas-autonym-symbols'))map.setLayoutProperty('atlas-autonym-symbols','visibility',e.target.checked?'visible':'none');
 });
 el('clear-selection').addEventListener('click',closePanel);
 searchNames();
 loadRecords();
}
window.AtlasGlobeRelations={identifyGeometry:identifyGeometry,selectLands:selectLands,
 renderDetail:renderDetail,chooseName:chooseName,testSummary:function(){return {names:names.length,edges:edges.length,sourceGroups:groups.size};}};
window.addEventListener('atlas-globe-layers-ready',function(e){initializeOnMap(e.detail.map);});
init();
})();