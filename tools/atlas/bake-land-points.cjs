/* Land points for the globe.
   The globe marks a land with one point and its name and draws no territory shapes,
   so its page does not need the shapes file. This writes beta/land-points-data.js:
   one entry per source feature, carrying the name, the source link and a marker a few
   kilometres across centred on the point the atlas already uses for that land.
   No boundary coordinates are copied.

   node tools/atlas/bake-land-points.cjs           write the file and verify it
   node tools/atlas/bake-land-points.cjs --check   fail if the committed file is stale */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../..','beta'),OUT=path.join(base,'land-points-data.js');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const m={exports:{}};vm.runInNewContext(read('assets/d3.min.js'),{module:m,exports:m.exports});const d3=m.exports;
const gm={exports:{}};vm.runInNewContext(read('assets/geo-integrity.js'),{module:gm});const G=gm.exports(d3);
const clone=x=>JSON.parse(JSON.stringify(x));
function section(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a,'Catalogue contract changed: '+start);return s.slice(a,b);}
// Build the catalogue exactly as the pages do, from a given territories script.
function catalogue(territoriesScript){
 const w={},ctx={window:w,structuredClone:clone,d3,URL};
 vm.runInNewContext(read('atlas-data.js')+'\n'+territoriesScript,ctx);
 const raw=clone(w.ATLAS_TERRITORIES);
 vm.runInNewContext(read('territory-fixes.js'),ctx);
 const p=read('patches-catalog.js');
 w.AtlasMapLabelLayout=vm.runInNewContext('(()=>{'+section(p,' const baseCache=',' function clipRing')+';return {sourceMatches};})()',ctx);
 vm.runInNewContext(read('assets/catalogue.js'),ctx);
 return {raw,q:w.AtlasCatalogue};
}
const wrap=x=>((x+180)%360+360)%360-180,round=n=>Math.round(n*1e7)/1e7;
function marker([lon,lat],r){
 const k=Math.max(.05,Math.cos(lat*Math.PI/180)),dx=r*Math.sqrt(3)/k;
 const top=Math.min(89.9,lat+2*r),low=Math.max(-89.9,lat-r);
 return [[round(wrap(lon)),round(top)],[round(wrap(lon+dx)),round(low)],[round(wrap(lon-dx)),round(low)],[round(wrap(lon)),round(top)]];
}
function build(){
 const {raw,q}=catalogue(read('territories-data.js'));
 // Each source feature's own point, and the size of the component that point sits in.
 const own=new Map();
 for(const f of q.territories){if(f.properties.broadOf)continue;const a=G.anchor([f]);assert(a,'No contained point for source feature '+f.id);
  const polys=G.polys(f.geometry),area=d3.geoArea({type:'Polygon',coordinates:polys[a.component]});own.set(String(f.id),{at:a.coordinates,area});}
 // Marker sizes keep the order of the real component sizes, so a land joined from
 // several source features still resolves to the same point.
 const areas=[...new Set([...own.values()].map(v=>v.area))].sort((a,b)=>a-b),rank=new Map(areas.map((a,i)=>[a,i]));
 const features=[];
 for(const f of raw.features){const v=own.get(String(f.id));if(!v)continue;
  const r=.002*Math.pow(1.0015,rank.get(v.area));
  features.push({type:'Feature',id:f.id,properties:{name:f.properties.name,url:f.properties.url,sourceId:f.properties.sourceId},geometry:{type:'Polygon',coordinates:[marker(v.at,r)]}});}
 const meta={...(raw.metadata||{}),landPoints:'Points and names only. Each entry is a marker a few kilometres across at the point the atlas uses for that land; no territory boundary is included. Built by tools/atlas/bake-land-points.cjs from territories-data.js.'};
 const text='window.ATLAS_TERRITORIES='+JSON.stringify({type:'FeatureCollection',features,metadata:meta})+';window.ATLAS_LAND_POINTS=true;\n';
 // Verify: the same lands, the same names, and every land's point within 60 m of the one the shapes give.
 const real=q,pts=catalogue(text).q;
 const ids=l=>l.map(x=>x.id).sort().join('|');
 assert.equal(ids(pts.lands),ids(real.lands),'Land list differs');
 let worst=0,checked=0;const moved=[];
 for(const land of real.lands){const a=real.landById(land.id),b=pts.landById(land.id);
  assert.equal(b.groups.length,a.groups.length,'Groups differ for '+land.id);
  const fa=a.groups.flatMap(g=>g.features),fb=b.groups.flatMap(g=>g.features);if(!fa.length)continue;
  const pa=G.anchor(fa),pb=G.anchor(fb);assert(pa&&pb,'No point for '+land.id);
  const d=G.distance(pa.coordinates,pb.coordinates);checked++;worst=Math.max(worst,d);if(d>60)moved.push({id:land.id,metres:Math.round(d),from:pa.sourceId,to:pb.sourceId});}
 assert.equal(moved.length,0,'Points moved: '+JSON.stringify(moved.slice(0,8)));
 return {text,features:features.length,checked,worst};
}
const built=build();
if(process.argv.includes('--check')){
 const current=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):'';
 assert.equal(current,built.text,'beta/land-points-data.js is stale: run node tools/atlas/bake-land-points.cjs');
 console.log('Land points current:',built.features,'entries;',built.checked,'lands checked; largest shift',built.worst.toFixed(1),'m');
}else{
 fs.writeFileSync(OUT,built.text);
 console.log('Wrote',path.relative(process.cwd(),OUT),Math.round(built.text.length/1024)+' KB;',built.features,'entries;',built.checked,'lands checked; largest shift',built.worst.toFixed(1),'m');
}
