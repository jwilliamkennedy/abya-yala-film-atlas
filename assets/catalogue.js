'use strict';
// Both map entry points use the same territory geometry and recorded credit associations.
window.AtlasCatalogue=(()=>{
const safe=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const names=[...window.ATLAS_NAMES_DATA.records,...(window.ATLAS_RESEARCH_ADDITIONS?.lands||[]),...(window.ATLAS_SOUTH_AMERICA_50?.lands||[]),...(window.ATLAS_SOUTH_AMERICA_50_BATCH2?.lands||[])],territories=structuredClone(window.ATLAS_TERRITORIES.features),groupMap=new Map(),byFeature=new Map();
for(const f of territories){for(const rings of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates){if(d3.geoArea({type:'Polygon',coordinates:[rings[0]]})>2*Math.PI)rings[0].reverse();for(const h of rings.slice(1))if(d3.geoArea({type:'Polygon',coordinates:[h]})<2*Math.PI)h.reverse();}f.bounds=d3.geoBounds(f);let g=groupMap.get(f.properties.name);if(!g){g={id:String(f.id),name:f.properties.name,features:[]};groupMap.set(g.name,g);}g.features.push(f);byFeature.set(String(f.id),g);}
const groups=[...groupMap.values()],lands=[],usedGroups=new Set(),groupToLand=new Map();
// Exact spelling matches share one interface entry. No film affiliation is inferred.
// NAME-074 is Jennifer Wickham's already-sourced Wet'suwet'en affiliation. Native Land
// maps the same nation as “Wet’suwet’en Yintikh” (territory source ID 36103).
// Join that existing polygon to the existing land ID; do not create a proxy pin.
const hawaiiRelay=window.AtlasHawaiiRelay;
// Source qualifiers are geographic distinctions, not just alternate spellings.
// Keep the source's named subterritories separate instead of pooling them.
const qualifiedSourceIds=new Map([
 ['NAME-015',new Set(['33550'])], // Dënéndeh; not Dënësųłinë́ Nëné or Acho Dene Koe
 ['NAME-063',new Set(['36317'])], // supplied context explicitly says Western Shoshone
 ['NAME-161',new Set(['33417'])], // Matsés (Mayoruna), not the distinct Matis source
 ['NAME-153',new Set(['36000'])]  // general Guarani source; specific subgroups below
]);
for(const n of names){if(hawaiiRelay?.aliases.includes(n.id))continue;const matches=groups.filter(g=>qualifiedSourceIds.has(n.id)?qualifiedSourceIds.get(n.id).has(g.id):(window.AtlasMapLabelLayout.sourceMatches(n.name,g.name)||
  (n.id==='NAME-074'&&g.id==='36103')||(n.id===hawaiiRelay?.canonical&&g.id===hawaiiRelay.sourceId)));const item={id:n.id,name:n.name,aliases:[...new Set([...(n.aliases||[]),...matches.map(g=>g.name),...(n.id===hawaiiRelay?.canonical?hawaiiRelay.labels:[])])],supplied:n,groups:matches};lands.push(item);for(const g of matches){usedGroups.add(g.id);groupToLand.set(g.id,item);}}
for(const g of groups)if(!usedGroups.has(g.id)){const item={id:'LAND-'+g.id,name:g.name,aliases:[],supplied:null,groups:[g]};lands.push(item);groupToLand.set(g.id,item);}
// Preserve source feature IDs and attach explicit, previously unplaced names to
// their verified existing reference, without copying or combining polygons.
for(const g of groups)for(const f of g.features)if(groupToLand.has(g.id))groupToLand.set(String(f.id),groupToLand.get(g.id));
const aliasLandIds=new Map();
for(const [id,sourceId,sourceName] of window.AtlasLandAliasRelays||[]){
 const alias=lands.find(l=>l.id===id),target=groupToLand.get(sourceId);
 if(!alias||alias.groups.length||!target||alias===target||!target.groups.some(g=>g.features.some(f=>String(f.id)===sourceId&&f.properties.name===sourceName)))continue;
 target.aliases=[...new Set([...target.aliases,alias.name,...alias.aliases])];
 (target.relatedNames||=[]).push({id:alias.id,name:alias.name,context:alias.supplied?.context||'',usage:alias.supplied?.usage||''});
 aliasLandIds.set(id,target.id);lands.splice(lands.indexOf(alias),1);
}
// A browsing group uses existing community references; no combined territorial boundary is created.
const mayaMemberIds=new Set(['NAME-088','NAME-089','NAME-090','NAME-091','NAME-093','NAME-094','NAME-095','LAND-35926','LAND-35828','LAND-36628','LAND-35963']);
const mayaMembers=lands.filter(l=>mayaMemberIds.has(l.id));
const mayaGroup={id:'GROUP-MAYA',name:'Maya',aliases:['Maya communities',...mayaMembers.flatMap(l=>[l.name,...l.aliases])],supplied:null,browseGroup:true,members:mayaMembers.map(l=>l.id),groups:[...new Map(mayaMembers.flatMap(l=>l.groups).map(g=>[g.id,g])).values()]};
lands.push(mayaGroup);
lands.sort((a,b)=>a.name.localeCompare(b.name));
const canonicalLandId=id=>hawaiiRelay?.aliases.includes(id)?hawaiiRelay.canonical:aliasLandIds.get(id)||(typeof id==='string'&&id.startsWith('LAND-')?(groupToLand.get(id.slice(5))?.id||id):id);
// Beta 90: indexed lookup (was a scan of every land on every call, which froze theme-weaving).
let landIndex=new Map(),landIndexOf=null,landIndexLen=-1;const landById=id=>{if(landIndexOf!==lands||landIndexLen!==lands.length){landIndex=new Map();for(const l of lands)if(!landIndex.has(l.id))landIndex.set(l.id,l);landIndexOf=lands;landIndexLen=lands.length;}return landIndex.get(canonicalLandId(id));};

// Display aliases only: source names, distinct references and affiliation edges stay intact.
const shortLandNames=new Map([
 ["Ben ‘Zaa/Binnizá/Mén Diiste/Bene Xhon (Zapoteco)","Binnizá"],
 ["Iximulew","Ixim Ulew"],
 ["Wallmapu (Mapuche)","Wallmapu"],
 ["Tekohá (Guarani)","Tekohá"],
 ["Shiwinna (Zuni)","Shiwinna"],
 ["Magüta/Ticuna","Magüta"],
 ["Batsil Winik’ Otik (Tzotzil)","Batsil Winik’ Otik"],
 ["Winik Atel (Tzeltal)","Winik Atel"],
 ["Winaq Qo’ (Mam)","Winaq Qo’"],
 ["Kogui/Kaggabba","Kogui"],
 ["Kalina/Kariña","Kariña"]
]);
function landDisplayName(l){const name=l?.name||'';return /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(name)?name:shortLandNames.get(name)||name;}

// Repair a homonym collision: source 36469 is Maya in Australia, not the Maya peoples of the Americas.
// These relays use only the specific affiliation already recorded on each edge; status and evidence stay unchanged.
const mayaAffiliationRelays=[[/k['’]?iche/i,'LAND-36164'],[/kaqchikel/i,'LAND-36187'],[/poqomchi/i,'LAND-35828'],[/tsotsil|tzotzil/i,'LAND-36628'],[/tseltal|tzeltal/i,'LAND-35963'],[/\bmam\b/i,'LAND-35926'],[/q['’]?eqchi/i,'LAND-36036']];
const guaraniAffiliationRelays=[
 [/\bkaiowa\b|\bpai\s+tavytera\b/i,'LAND-33460'],
 [/\b(?:nhande[wv]a|nande[wv]a|ava[\s-]+guarani)\b/i,'LAND-33458'],
 [/\bmbya\b/i,'LAND-33387']
];
function repairedLandEdges(e){
 const land=canonicalLandId(e.land);
 if(land==='NAME-153'){
  // Match only the already-recorded affiliation; an unspecified Guarani
  // association retains the general source, not either subgroup's polygon.
  const basis=String(e.basis||'').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const targets=guaraniAffiliationRelays.filter(([pattern])=>pattern.test(basis)).map(([,id])=>canonicalLandId(id)).filter(id=>landById(id)?.groups.length);
  if(targets.length)return [...new Set(targets)].map(land=>({...e,land,navigationCorrection:'Specific Guarani affiliation matched to its named source territory'}));
 }
 if(e.land!=='LAND-36469')return [{...e,land}];
 const targets=mayaAffiliationRelays.filter(([pattern])=>pattern.test(e.basis||'')).map(([,id])=>canonicalLandId(id));
 return targets.map(land=>({...e,land,navigationCorrection:'Maya homonym repaired from the recorded specific affiliation'}));
}
for(const [pattern,id] of mayaAffiliationRelays){const l=landById(id);if(l){l.aliases.push('Maya '+l.name);if(/Mam/.test(l.groups[0]?.name||''))l.aliases.push('Maya Mam');if(/Tzotzil/.test(l.name))l.aliases.push('Maya Tsotsil');if(/Tzeltal/.test(l.name))l.aliases.push('Maya Tseltal');}}
const crossEdges=[...new Map((window.ATLAS_LAND_CROSSINDEX?.edges||[]).flatMap(repairedLandEdges).filter(e=>!(window.AtlasCatalogAudit61?.edgeExclusions||[]).some(x=>x.record===e.record&&x.land===e.land)).sort((a,b)=>Number(a.status==='sourced')-Number(b.status==='sourced')).map(e=>[e.land+'|'+e.record,e])).values()],edgesByLand=new Map(),edgesByRecord=new Map();
for(const e of crossEdges){if(!edgesByLand.has(e.land))edgesByLand.set(e.land,[]);edgesByLand.get(e.land).push(e);if(!edgesByRecord.has(e.record))edgesByRecord.set(e.record,[]);edgesByRecord.get(e.record).push(e);}
const landLinks=l=>{const id=canonicalLandId(typeof l==='string'?l:l.id),item=landById(id);if(!item?.browseGroup)return edgesByLand.get(id)||[];return [...new Map(item.members.flatMap(id=>edgesByLand.get(id)||[]).sort((a,b)=>Number(a.status==='sourced')-Number(b.status==='sourced')).map(e=>[e.record,e])).values()];};

function mediaForFilm(f){return window.ATLAS_PROFILE_MEDIA?.[f.id]||null;}

function viewingRoutes(f){
 const m=mediaForFilm(f),items=[...(safe(f.watchURL)?[{url:f.watchURL,title:'Open viewing page',context:f.creditNote&&/access code|rental|donation/i.test(f.creditNote)?'Check the provider page for access conditions.':''}]:[]),...(window.ATLAS_FILM_EXPLORATION?.[f.id]?.links||[]),...(m?.viewing||[])],seen=new Set();
 return items.filter(l=>{const url=safe(l.url);if(!url||seen.has(url))return false;seen.add(url);return true;});
}

function recordLandReferences(id){return (edgesByRecord.get(id)||[]).map(e=>({id:e.land,name:landDisplayName(landById(e.land)),status:e.status,basis:e.basis,source:e.source||'',mapped:!!landById(e.land)?.groups.length})).filter(e=>e.name).sort((a,b)=>Number(b.status==='sourced')-Number(a.status==='sourced')||Number(/wallmapu/i.test(b.name))-Number(/wallmapu/i.test(a.name)));}

const records=window.ATLAS_FLAT?.records||[],byRecord=new Map(records.map(r=>[r.id,r]));
return {territories,byFeature,groupToLand,mayaMemberIds,mayaMembers,lands,canonicalLandId,landById,landDisplayName,edgesByRecord,edgesByLand,landLinks,recordLandReferences,mediaForFilm,viewingRoutes,allRecords:()=>records,recordById:id=>byRecord.get(id)};
})();
