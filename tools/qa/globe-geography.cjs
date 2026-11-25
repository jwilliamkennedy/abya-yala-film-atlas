/* Repeatable offline geometry and relation audit. No network or source edits. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../..','beta');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const m={exports:{}};vm.runInNewContext(read('assets/d3.min.js'),{module:m,exports:m.exports});const d3=m.exports;
const gm={exports:{}};vm.runInNewContext(read('assets/geo-integrity.js'),{module:gm});const G=gm.exports(d3);
const w={};const clone=x=>JSON.parse(JSON.stringify(x));
const ctx={window:w,structuredClone:clone,d3,URL};
vm.runInNewContext(read('atlas-data.js')+'\n'+read('territories-data.js'),ctx);
const original=w.ATLAS_TERRITORIES.features,rawMap=new Map(original.map(f=>[String(f.id),f]));
vm.runInNewContext(read('territory-fixes.js'),ctx);
const p=read('patches-catalog.js');
function section(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a,'Production audit contract changed: '+start);return s.slice(a,b);}
w.AtlasMapLabelLayout=vm.runInNewContext('(()=>{'+section(p,' const baseCache=',' function clipRing')+';return {sourceMatches};})()',ctx);
vm.runInNewContext(read('assets/catalogue.js'),ctx);
const q=w.AtlasCatalogue,crossEdges=[...q.edgesByRecord.values()].flat();
const failures=[];for(const f of q.territories){const orig=rawMap.get(String(f.properties.broadOf||f.id));const x=G.inspect(f);if(!x.ok||!orig||G.signature(f.geometry)!==G.signature(orig.geometry))failures.push({id:f.id,...x});}
const projection=G.projectionAudit(q.territories);
// Report long original edges for source review. Never simplify or remove them automatically.
const rings=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='GeometryCollection'?g.geometries.flatMap(rings):[];
const sourceEdges=[];for(const f of q.territories)for(const ring of rings(f.geometry))for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],km=d3.geoDistance(a,b)*6371;if(km>500)sourceEdges.push({id:f.id,name:f.properties?.Name||f.properties?.name||'',km:Math.round(km),a,b});}sourceEdges.sort((a,b)=>b.km-a.km);
const records=w.ATLAS_FLAT.records,ids=new Set(records.map(r=>r.id)),live=crossEdges.filter(e=>ids.has(e.record)),mapped=live.filter(e=>q.landById(e.land)?.groups.length);
const landIds=[...new Set(mapped.map(e=>e.land))],badAnchors=[],methods={};
for(const id of landIds){const l=q.landById(id),fs=l.groups.flatMap(g=>g.features),a=G.anchor(fs);if(!a||!fs.some(f=>String(f.id)===a.sourceId&&d3.geoContains(f,a.coordinates)))badAnchors.push(id);else methods[a.method]=(methods[a.method]||0)+1;}
const makers=d3.csvParse(read('data/atlas-filmmakers.csv')),films=d3.csvParse(read('data/atlas-films.csv'));
const mcsv=new Set(makers.map(x=>x.record_id)),fcsv=new Set(films.map(x=>x.record_id+'|'+x.film_id)),runtime=new Set(records.flatMap(r=>r.films.map(f=>r.id+'|'+f.id)));
const diff=(a,b)=>[...a].filter(v=>!b.has(v));const discrepancies={makerCSV:diff(mcsv,ids),makerRuntime:diff(ids,mcsv),filmCSV:diff(fcsv,runtime),filmRuntime:diff(runtime,fcsv)};
const result={longOriginalEdgeCount:sourceEdges.length,longestOriginalEdges:sourceEdges.slice(0,30),sourceFeatures:original.length,correctedFeatures:q.territories.length,failures,projection,landIds:landIds.length,badAnchors,methods,filmmakers:ids.size,credits:runtime.size,discrepancies,staleEdges:crossEdges.length-live.length,mappedEdges:mapped.length,unmappedEdges:live.length-mapped.length,mappedMakers:new Set(mapped.map(e=>e.record)).size};
console.log(JSON.stringify(result,null,2));
assert.equal(failures.length,0,'Source coordinate preservation');assert(projection.ok,'Projection precision');assert.equal(badAnchors.length,0,'Contained anchors');assert(Object.values(discrepancies).every(a=>!a.length),'CSV/runtime ID disagreement');
