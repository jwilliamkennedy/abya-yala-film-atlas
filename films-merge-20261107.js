/* Beta, 2026-11-07: a film credited to several filmmakers shows as one row in the Films list, with every director.
   Rows already merge when they share a film ID; this also merges copies of the same title from different records
   when their years agree (or one is missing). Short or generic titles merge only when both years are present and equal. */
(()=>{'use strict';const A=window.AtlasArtwork;if(!A||typeof A.groupCredits!=='function')return;
const base=A.groupCredits.bind(A);
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
A.groupCredits=(items,currentRecord,currentFilm)=>{
 const groups=base(items,currentRecord,currentFilm),out=[],byTitle=new Map(),byMain=new Map();
 const main=t=>norm(String(t||'').split(/\s+\/\s+|:\s/)[0]);
 for(const g of groups){const t=norm(g.f.title),y=g.f.year||null,list=byTitle.get(t)||[];
  let match=list.find(o=>{const oy=o.f.year||null;if(y&&oy)return y===oy;return t.length>=10;});
  const mk=main(g.f.title)+'|'+(y||'');if(!match&&y&&mk.length>8)match=byMain.get(mk);
  if(match){for(const c of g.credits)if(!match.credits.some(x=>x.r.id===c.r.id))match.credits.push(c);
   if(!match.f.year&&y)match.f=Object.assign({},match.f,{year:y});
   if(g.credits.some(x=>x.r.id===currentRecord&&x.f.id===currentFilm)){match.r=g.r;match.f=Object.assign({},g.f,{year:g.f.year||match.f.year});}
   continue;}
  list.push(g);byTitle.set(t,list);if(y)byMain.set(mk,g);out.push(g);}
 return out;};
})();
