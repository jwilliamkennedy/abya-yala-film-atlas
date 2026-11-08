/* Beta-only duplicate folds, 2026-11-07 (Claude audit of the 5–7 Nov layers).
   Each pair is the same filmmaker entered twice. The copy listed as `from` folds into `into`,
   which keeps its ID and land links. Films and sources from `from` carry over; nothing is deleted from any data file. */
(()=>{'use strict';const d=window.ATLAS_UPDATE_1031;if(!d||!Array.isArray(d.records))return;
d.patches=d.patches||[];d.folds=d.folds||[];
const pairs=[
 {into:'NEW-f60277eedca1',from:'NEW-2ce81d7ce25c',why:'Nery Bernárdez entered twice (31 Oct merge and 1 Nov research layer)'},
 {into:'NEW-373f5316c571',from:'NEW-a2bd7463fb06',why:'Benjamín Dibaidi Ávila entered twice (31 Oct merge and 1 Nov research layer)'},
 {into:'BETA-T1101-PER-01',from:'BETA30-20261106-D02',why:'Rómulo Sulca Ricra entered twice (1 Nov test layer and 6 Nov verified30 layer)'},
 {into:'DIR-0013',from:'BETA25-20261105-06',why:'Aldira Akay is Aldira Akai Munduruku (master DIR-0013); the 5 Nov layer listed that name as its own alias',status:true},
 {into:'DIR-0030',from:'BETA11D-20261107-D01',why:'Jhonatan Gomes is Jhonaton Gomes (master DIR-0030); the 7 Nov layer listed that spelling as its own alias'},
 {into:'DIR-0358',from:'NEW-8cac5b92e26b',why:'Elise Beers is Elise Beers Aachix̂ Qağaduug (master DIR-0358); both cards list Braids (2025)'},
 {into:'DIR-0042',from:'NEW-25205c351598',why:'Morzaniel Ɨramari Yanomami is Morzaniel Ɨramari (master DIR-0042)',skip:['mari hi','urihi haromati']}
];
const byId=new Map(d.records.map(r=>[r.id,r]));
const out={batch:'DEDUPE-20261107',folded:0,missing:[]};
const key=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
for(const p of pairs){const from=byId.get(p.from);if(!from){d.folds.push({into:p.into,from:p.from,why:p.why});out.folded++;continue;}
 const films=JSON.parse(JSON.stringify(from.films||[])).filter(f=>!(p.skip||[]).some(k=>key(f.title).startsWith(k)));
 const patch={id:p.into,films,aliases:[from.name,...(from.aliases||[])],note:'2026-11-07: duplicate record '+p.from+' folded in; its films and sources carried over.'};
 const years={};for(const f of films)if(f.title&&f.year)years[f.title]=f.year;patch.filmYears=years;
 if(p.status&&from.status)patch.set={status:from.status};
 d.patches.push(patch);d.folds.push({into:p.into,from:p.from,why:p.why});out.folded++;}
window.ATLAS_DEDUPE_20261107=out;
})();
