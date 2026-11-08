'use strict';
// 31 October 2026 update: Research Master 724 refresh, new records, merges and enrichments.
// Runs after the site's own review layers, so their corrections stay in force.
// Statuses shown on the default map layer: reviewed records plus discoveries with a sourced directing credit.
// 'Review pending', 'Candidate' and 'Verification needed' stay in the research layer.
window.ATLAS_ON_MAP=new Set(['Map Ready','Discovery · credit supported','Discovery · directing credit sourced']);
window.AtlasUpdate1031=(()=>{
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const GUF={code:'GUF',name:'French Guiana',region:'South America',coordinates:[-53.1,3.9],iso:'254',scope:'Territorial entry point',coverage:'Source-supported country association',note:'Country navigation reference, not a filmmaker location.',leads:[]};
 const stats={updated:0,filmsAdded:0,added:0,merged:0,patched:0};
 function addFilms(r,films){
  r.films=r.films||[];const have=new Set(r.films.map(f=>norm(f.title)));
  for(const f of films||[]){const k=norm(f.title);if(!k||have.has(k))continue;have.add(k);
   r.films.push({id:f.id||(r.id+'-W1031-'+(r.films.length+1)),medium:null,languages:null,notes:null,review:false,...f});stats.filmsAdded++;}
  r.filmCount=String(r.films.length);
 }
 function addSources(r,sources){r.sources=r.sources||[];const have=new Set(r.sources.map(s=>s.url));for(const s of sources||[]){if(s&&s.url&&!have.has(s.url)){have.add(s.url);r.sources.push(s);}}}
 function addAliases(r,aliases){r.aliases=r.aliases||[];const names=new Set([norm(r.director||r.name),...r.aliases.map(a=>norm(typeof a==='string'?a:a.name))]);for(const a of aliases||[]){const k=norm(typeof a==='string'?a:a.name);if(k&&!names.has(k)){names.add(k);r.aliases.push(a);}}}
 function setCountry(r,code,names){if(!code||!names.has(code))return;r.country=code;r.countryCodes=[code];r.countryName=names.get(code);}
 function apply(records,countries){
  const d=window.ATLAS_UPDATE_1031;if(!d)return stats;
  if(!countries.some(c=>c.code==='GUF'))countries.push(GUF);
  const names=new Map(countries.map(c=>[c.code,c.name]));
  const byId=new Map(records.map(r=>[r.id,r]));
  for(const [id,u] of Object.entries(d.updates)){const r=byId.get(id);if(!r)continue;
   addFilms(r,u.films);addSources(r,u.sources);addAliases(r,u.aliases);
   if(u.status)r.status=u.status;
   if(u.country&&!r.country)setCountry(r,u.country,names);
   stats.updated++;}
  for(const n of d.records){if(byId.has(n.id))continue;const r=JSON.parse(JSON.stringify(n));
   if(r.country&&!names.has(r.country))r.country=null;
   if(r.country)r.countryName=names.get(r.country);
   r.countryCodes=r.country?[r.country]:[];records.push(r);byId.set(r.id,r);stats.added++;}
  for(const m of d.merges){const r=byId.get(m.into);if(!r)continue;addFilms(r,m.films);addSources(r,m.sources);addAliases(r,m.aliases);
   r.mergedFrom=[...(r.mergedFrom||[]),{id:m.from,why:m.why,on:d.date}];stats.merged++;}
  for(const p of d.patches){const r=byId.get(p.id);if(!r)continue;
   if(p.set)Object.assign(r,p.set);
   if(p.country&&(!r.country||p.set))setCountry(r,p.country,names);
   if(p.titles)for(const f of r.films||[])if(p.titles[f.title])f.title=p.titles[f.title];
   if(p.dropFilms){const gone=new Set(p.dropFilms);r.films=(r.films||[]).filter(f=>!gone.has(f.title));r.filmCount=String(r.films.length);}
   addAliases(r,p.aliases);addFilms(r,p.films);
   for(const f of p.films||[])addSources(r,[{url:f.sourceURL,type:'Screen credit',evidence:f.credit,authority:'Source retained',checkedOn:d.date}]);
   if(p.filmYears)for(const f of r.films){for(const [t,y] of Object.entries(p.filmYears))if(norm(f.title).startsWith(norm(t))&&!f.year)f.year=y;}
   if(p.note)r.auditNote=[r.auditNote,p.note].filter(Boolean).join(' ');
   stats.patched++;}
  // Beta 95: spelling-variant duplicates fold into the earlier record and leave the list.
  for(const m of (d.folds||[])){const into=byId.get(m.into),from=byId.get(m.from);if(!into||!from)continue;addSources(into,from.sources);addAliases(into,[from.name,...(from.aliases||[])]);into.mergedFrom=[...(into.mergedFrom||[]),{id:m.from,why:m.why,on:'2026-11-01'}];const k=records.indexOf(from);if(k>=0)records.splice(k,1);byId.delete(m.from);stats.merged++;}
  // Beta 126: records removed because the filmmaker is not Indigenous; they leave every list and count.
  for(const x of (d.removals||[])){const r=byId.get(x.id);if(!r)continue;const k=records.indexOf(r);if(k>=0)records.splice(k,1);byId.delete(x.id);stats.removed=(stats.removed||0)+1;}
  for(const r of records)if(r.country==='GRL')r.countryName=names.get('GRL')||'Kalaallit Nunaat / Greenland';
  // Apply the November 5 filmography batch only after all other source layers and folds.
  // Matched existing filmmaker IDs retain their existing Indigenous biographical records and land links.
  const next=window.ATLAS_NEXT25_20261105;
  if(next&&Array.isArray(next.credits)){
   const result={submitted:next.credits.length,addedCredits:0,duplicateCredits:0,unmatched:[],items:[]};
   for(const c of next.credits){
    const r=records.find(x=>x.id===c.record);
    if(!r){result.unmatched.push({record:c.record,maker:c.maker,film:c.title});continue;}
    if((r.films||[]).some(f=>norm(f.title)===norm(c.title))){result.duplicateCredits++;continue;}
    addFilms(r,[{id:c.id,title:c.title,year:c.year,credit:c.credit,medium:'Film',languages:null,notes:c.notes,review:false,sourceURL:c.sourceURL,metadata:{sourceLayer:'mirror_work 2026-11-05',sourceStatus:'Existing filmmaker + sourced film credit',thumbnailStatus:'No cleared film-specific thumbnail linked',filmTerritory:null}}]);
    addSources(r,[{url:c.sourceURL,type:'Director-film credit',evidence:c.credit,authority:'Research mirror source retained',checkedOn:'2026-11-05'}]);
    result.addedCredits++;result.items.push({id:c.id,record:r.id,maker:r.name,title:c.title,year:c.year});
   }
   const nahua=records.find(x=>x.id==='DIR-0230');
   if(nahua){nahua.nation='Nahua';nahua.affiliation='Nahua';nahua.community='Acatlán, Chilapa de Álvarez, Guerrero (filmmaker origin)';addSources(nahua,[{url:'https://suracapulco.mx/pondera-el-documentalista-indigena-jose-luis-matias-difusion-de-problemas-sociales-mediante-el-cine/',type:'Personal Indigenous identity and origin',evidence:'Nahua; Acatlán, Chilapa, Guerrero',authority:'Filmmaker biography',checkedOn:'2026-11-05'}]);result.nahuaOriginCorrected=true;}
   window.ATLAS_NEXT25_RESULT=result;
  }
  return stats;
 }
 return {apply,stats};
})();
