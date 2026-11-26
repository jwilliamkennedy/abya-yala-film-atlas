'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('../../beta/assets/globe-core.js');
const d3=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../beta/assets/d3.min.js'),'utf8')+';d3',{}, {timeout:10000});
const plain=x=>JSON.parse(JSON.stringify(x));
for(const [a,b] of [[[170,35],[-160,40]],[[-160,40],[170,35]],[[179,75],[-175,80]],[[-75,-12],[-71,45]]]){
 const s=core.greatCircleSegments(a,b,d3);
 assert(s.length>=1);
 assert(s.every(l=>l.length>=2&&l.every((p,i)=>p.every(Number.isFinite)&&(!i||Math.abs(p[0]-l[i-1][0])<=180+1e-8))));
 assert(d3.geoDistance(s[0][0],a)<1e-8);
 assert(d3.geoDistance(s.at(-1).at(-1),b)<1e-8);
 for(let i=1;i<s.length;i++){assert.equal(s[i-1].at(-1)[0],-s[i][0][0]);assert.equal(s[i-1].at(-1)[1],s[i][0][1]);}
 const total=s.reduce((sum,line)=>sum+line.slice(1).reduce((n,p,i)=>n+d3.geoDistance(line[i],p),0),0);
 assert(Math.abs(total-d3.geoDistance(a,b))<1e-7,'great-circle length');
}
assert.deepEqual(core.greatCircleSegments([0,0],[0,0],d3),[]);
assert.deepEqual(core.greatCircleSegments([181,0],[0,0],d3),[]);
const v=(id,work,land,score,distance)=>({film:{id,film:work,title:id},ref:{id:land},score,distance});
const routes=[v('a','a','1',30,.1),v('a2','a','2',29,.2),v('b','b','1',28,.3),v('c','c','3',27,.1),v('d','d','4',26,.5),v('e','e','5',25,.7)];
assert.deepEqual(core.selectConnections(routes).map(x=>x.film.id),['a','c','d']);
assert.deepEqual(core.selectConnections([]),[]);assert.equal(core.selectConnections(routes,1).length,1);
assert.equal(core.selectConnections(routes,20).length,3);assert.equal(core.selectConnections(routes,0).length,0);
let time=0;const cache=core.createArtworkCache(2,()=>time);
assert(cache.remember('a',100,50));cache.remember('b',50,100);assert.equal(cache.get('a').ratio,2);cache.remember('c',1,1);assert(!cache.get('b'));cache.fail('bad');assert(!cache.canWarm('bad'));time=60000;assert(cache.canWarm('bad'));assert(!cache.remember('bad',0,10));cache.remember('bad',10,10);assert(!cache.canWarm('bad'));cache.clear();assert.equal(cache.stats().decoded,0);
console.log('Globe core: geographic arcs, distinct thematic destinations, bounded artwork cache passed');

const credit=(id,film,record,image)=>({id,film,record,maker:record,title:id,image});
const community=[credit('a','1','A',''),credit('b','2','A','one'),credit('c','3','B','two'),credit('d','3','C','two'),credit('e','4','C','three'),credit('f','5','C','three')];
const info=core.communityCinema(community,f=>f.image,f=>f.film==='3');
assert.equal(info.credits,6);assert.equal(info.films,5);assert.equal(info.artwork,4);assert.equal(info.watch,1);assert.equal(info.makers.length,3);
assert.deepEqual(core.broadcastCredits(community,community[0],f=>f.image).map(f=>f.id),['c','e','b']);
assert.equal(core.broadcastCredits(community,community[0],f=>f.image,1).length,1);
console.log('Community counts and director-diverse broadcast selection passed');

const belt=core.cinemaBeltOrder(community,f=>f.image);
assert.equal(belt.length,community.length);assert.equal(new Set(belt.map(f=>f.id)).size,community.length);assert.deepEqual(belt.slice(0,3).map(f=>f.id),['b','c','e']);

for(const [w,h] of [[1440,900],[1024,768],[844,390],[390,844],[320,640]]){
 for(const n of [0,1,2,5,6,7,37])for(let at=0;at<Math.max(1,n);at++){
  const b=core.beltLayout(w,h,n,at);assert(b.capacity>=1&&b.capacity<=6);assert(b.visible<=b.size&&b.size<=n);assert(b.width<=w);if(n)assert(b.start<=at&&at<b.start+b.visible);
 }
 assert(core.beltLayout(w,h,1).width<=core.beltLayout(w,h,37).width);
}
assert.equal(core.beltLayout(1440,900,37).capacity,6);assert.equal(core.beltLayout(390,844,37).capacity,3);
console.log('Adaptive six-film belt geometry, pagination and small communities passed');
