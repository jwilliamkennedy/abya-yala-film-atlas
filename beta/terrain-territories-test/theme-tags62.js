'use strict';
window.AtlasThemeTags=(()=>{
 const vocabulary=['water','land defense','language return','memory','kinship','migration','sovereignty','gender','healing','futurity','archives','youth','ceremony','environmental change','urban life'];
 const seeds=[
  ['Mala Junta (Bad Influence)',['youth','kinship']],
  ['ADMONGEN, Vida Mapuche en Wallmapu',['land defense','sovereignty']],
  ['El Río de los Espíritus / River of Spirits',['water','memory']],
  ['Owners of the Water',['water','land defense']],
  ['MIWENE: Reclaiming the Amazon',['land defense','environmental change']],
  ['Mamá',['kinship','gender']],
  ['Nudo Mixteco',['kinship','gender','migration']],
  ['Smoke Signals',['kinship','memory']],
  ['Kicking the Clouds',['memory','kinship']],
  ['Do You Speak Paiute?',['language return']],
  ['Anishinaabemowin',['language return']],
  ['Nũhũ yãg mũ yõg hãm - This Land Is Ours!',['land defense','memory']]
 ];
 const norm=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 function clean(raw){if(!raw||typeof raw.term!=='string'||!['curator','community'].includes(raw.source))return null;const result={term:raw.term.trim().slice(0,100),source:raw.source};if(!result.term)return null;if(raw.source==='community'){if(raw.indigenousTerm)result.indigenousTerm=String(raw.indigenousTerm).slice(0,140);if(raw.gloss)result.gloss=String(raw.gloss).slice(0,200);if(raw.language)result.language=String(raw.language).slice(0,80);}return result;}
 function apply(records){for(const r of records)for(const f of r.films){const tags=(Array.isArray(f.themes)?f.themes:[]).map(clean).filter(Boolean),seed=seeds.find(([title])=>norm(title)===norm(f.title));for(const term of seed?.[1]||[])if(!tags.some(t=>t.term===term))tags.push({term,source:'curator'});f.themes=tags;}}
 return {vocabulary,seeds,clean,apply};
})();
