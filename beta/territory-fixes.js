/* Territory corrections, moved unchanged from landlinks-1031-data.js (1 Nov 2026 Nahua review) so the flat beta keeps them.
   Removes a duplicate Nahua polygon, tidies two Native Land spellings, keeps Nahuát (El Salvador) separate,
   and adds a broad "Nahua" land joining the Mexican Nahua polygons. Runs right after territories-data.js. */
'use strict';
(()=>{const T=window.ATLAS_TERRITORIES;if(!T||!Array.isArray(T.features))return;T.features=T.features.filter(f=>!(String(f.id)==='32548'&&f.properties&&f.properties.name==='Nahua'));const rename={'33889':['Nahua','Nahuát'],'35908':['Nahua ( Morelos, Puebla, Tlaxcala, Veracruz, Hidalgo, San Luis Potosi, Oaxaca)','Nahua (Morelos, Puebla, Tlaxcala, Veracruz, Hidalgo, San Luis Potosí, Oaxaca)'],'35940':['Nahua (Michoacan)','Nahua (Michoacán)']};for(const f of T.features){const n=rename[String(f.id)];if(n&&f.properties&&f.properties.name===n[0])f.properties.name=n[1];}const broad=new Set(['36587','35989','35940','35908','36336','36407','36658']);for(const f of T.features.filter(f=>broad.has(String(f.id))))T.features.push({type:'Feature',id:'NAHUA-'+f.id,properties:{...f.properties,name:'Nahua',broadOf:String(f.id)},geometry:structuredClone(f.geometry)});})();

/* Hawaiʻi: the supplied catalogue name and the old Native Land export use
   different names for the same geographic reference. Keep the original source
   geometry and name; associate the explicitly published identity, not a
   filmmaker's residence or filming location. */
(()=> {
 const W=window,T=W.ATLAS_TERRITORIES,idx=W.ATLAS_LAND_CROSSINDEX,records=W.ATLAS_FLAT?.records;
 const source=T?.features?.find(f=>String(f.id)==='35877'&&f.properties?.name==='Nā moku ʻehā');
 if(!source||!idx||!Array.isArray(records))return;
 const canonical='NAME-165',aliases=new Set(['NAME-166','NAME-167','LAND-35877']);
 const affiliation=/\b(?:native\s+hawaiian|k[aā]naka[\s-]+(?:maoli|hawaiian|[ʻ‘’']?[oō]iwi))\b/iu;
 const validSource=s=>typeof s?.url==='string'&&/^https?:\/\/[^\s;]+$/i.test(s.url);
 const relays={
  canonical,sourceId:'35877',
  aliases:[...aliases],
  labels:['Ka Pae ʻĀina','Kānaka Maoli','Kanaka Maoli','Native Hawaiian','Nā moku ʻehā'],
  sourceURL:'https://native-land.ca/listings/territories/kanaka-maoli'
 };
 W.AtlasHawaiiRelay=Object.freeze(relays);
 const existing=idx.edges||[];
 // The old crossindex linked Puhipau's collective Nā Maka o ka ʻĀina to the
 // unrelated Maká people of South America by a substring. Remove only that edge.
 const edges=existing.filter(e=>!(e.record==='NEW-c2f1143331bb'&&e.land==='LAND-33208'&&e.match==='maka'))
  .map(e=>aliases.has(e.land)?{...e,land:canonical}:e);
 const linked=new Set(edges.filter(e=>e.land===canonical).map(e=>e.record));
 for(const rec of records){
  if(linked.has(rec.id)||rec.unverified)continue;
  const basis=[rec.nation,rec.community].find(v=>typeof v==='string'&&affiliation.test(v));
  if(!basis)continue;
  const sources=(rec.sources||[]).filter(validSource),evidence=sources.find(s=>affiliation.test(s.evidence||''))||
   sources.find(s=>/affiliation|biograph|identity|profile|artist|program|festival/i.test(s.type||''));
  if(!evidence)continue;
  edges.push({record:rec.id,land:canonical,basis,match:basis.match(affiliation)[0],status:'provisional',
   source:evidence.url,method:'Explicit published Indigenous affiliation linked to an existing source-map territory; not a residence or film location.',
   navigationCorrection:'Hawaiʻi source-name relay (Native Land source 35877).'});
  linked.add(rec.id);
 }
 idx.edges=edges;
})();
