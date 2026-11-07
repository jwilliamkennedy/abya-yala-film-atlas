/* Display aliases only: catalog records and source credits remain unchanged. */
'use strict';
(()=>{
 const groups=[
 ['FILM-0188','FILM-0189'],
 ['REVIEWFILM-20261008-001-01','REVIEWFILM-20261008-002-01'],
 ['REVIEWFILM-20261008-008-01','REVIEWFILM-20261008-009-01'],
 ['SA50-20261014-59f87a2e3ce5-WORK-01','SA50-20261014-0eb675abc594-WORK-01','SA50-20261014-3646d5d9be66-WORK-02'],
 ['SA50-20261014-6e4c85b67329-WORK-01','SA50-20261014-ebfdde5694a3-WORK-01','SAB2-20261014-a56923e1ac7e-WORK-01','SAB2-20261014-2bb01fb41c3a-WORK-01','SAB2-20261014-1c023b64bff0-WORK-01','SAB2-20261014-1578a82f9243-WORK-01'],
 ['SA50-20261014-3646d5d9be66-WORK-01','SA50-20261014-eee8df9ab785-WORK-01','SAB2-20261014-0aef6d0ac10e-WORK-01','SAB2-20261014-cc42652768df-WORK-01','SAB2-20261014-c9a2bcfd4699-WORK-01'],
 ['SA50-20261014-14e876264d18-WORK-01','SAB2-20261014-4af382f5d619-WORK-01'],
 ['SAB2-20261014-5b6dc34f3c55-WORK-01','SAB2-20261014-df9a2b0fb783-WORK-01'],
 ['SAB2-20261014-e3499178f69e-WORK-01','SAB2-20261014-bcdd867e2132-WORK-01']
 ];
 const aliases=new Map(groups.flatMap(g=>g.map(id=>[id,g[0]])));
 const workKey=x=>{const id=x.film||x.f?.id||x.id;return aliases.get(id)||id;};
 function uniqueFilms(films,current){const g=new Map();for(const f of films){const k=workKey(f);if(!g.has(k)||f.id===current?.id)g.set(k,f);}return [...g.values()];}
 function groupCredits(items,currentRecord,currentFilm){const g=new Map();for(const x of items){const k=workKey(x.f);if(!g.has(k))g.set(k,[]);g.get(k).push(x);}return [...g.values()].map(credits=>({...credits.find(x=>x.r.id===currentRecord&&x.f.id===currentFilm)||credits[0],credits}));}
 function imageForItem(x){if(x.type!=='film')return '';const r=window.Atlas?.recordById(x.record),f=r?.films.find(f=>f.id===x.film);return f?window.Atlas.mediaForFilm(f)?.image||'':x.image||'';}
 function registerWorkGroups(extra){for(const group of extra){if(group.length<2||group.some(id=>typeof id!=='string'))throw Error('Invalid reviewed work group');const canonical=group.map(id=>aliases.get(id)).find(Boolean)||group[0];for(const id of group)aliases.set(id,canonical);groups.push([...group]);}}
 window.AtlasArtwork={registerWorkGroups,workKey,uniqueFilms,groupCredits,imageForItem,groups};
})();
