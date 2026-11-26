/* Pure discovery helpers shared by both globe renderers. No catalogue mutations. */
(function(root){
'use strict';
function greatCircleSegments(a,b,geo){
  const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  if(!valid(a)||!valid(b))return [];
  const distance=geo.geoDistance(a,b);
  if(!Number.isFinite(distance)||distance<1e-8)return [];
  const interpolate=geo.geoInterpolate(a,b),steps=Math.max(8,Math.ceil(distance*60)),segments=[];
  let segment=[interpolate(0)];
  const append=(list,point)=>{const last=list[list.length-1];if(!last||last[0]!==point[0]||last[1]!==point[1])list.push(point);};
  for(let i=1;i<=steps;i++){
    const p=segment[segment.length-1],q=interpolate(i/steps),delta=q[0]-p[0];
    if(Math.abs(delta)>180){
      const edge=delta>0?-180:180,direction=edge===180?1:-1;
      let lo=(i-1)/steps,hi=i/steps;
      for(let j=0;j<28;j++){const mid=(lo+hi)/2,lon=interpolate(mid)[0],unwrapped=lon+360*Math.round((p[0]-lon)/360);if(direction*(unwrapped-edge)<0)lo=mid;else hi=mid;}
      const lat=interpolate((lo+hi)/2)[1];
      append(segment,[edge,lat]);if(segment.length>1)segments.push(segment);segment=[[-edge,lat]];
    }
    append(segment,q);
  }
  if(segment.length>1)segments.push(segment);
  return segments;
}

function selectConnections(candidates,limit=3){
  const ranked=candidates.filter(v=>Number.isFinite(v.score)&&Number.isFinite(v.distance)).sort((a,b)=>b.score-a.score||a.distance-b.distance||a.film.title.localeCompare(b.film.title)||a.film.id.localeCompare(b.film.id)||a.ref.id.localeCompare(b.ref.id));
  const result=[],films=new Set(),lands=new Set(),cap=Math.max(0,Math.min(3,Math.floor(limit)));
  const eligible=v=>v&&!films.has(v.film.film)&&!lands.has(v.ref.id);
  const add=v=>{if(result.length>=cap||!eligible(v))return;result.push(v);films.add(v.film.film);lands.add(v.ref.id);};
  if(!ranked.length)return result;
  add(ranked[0]);
  add(ranked.find(v=>eligible(v)&&v.distance<.25&&v.score>=ranked[0].score-12));
  add(ranked.find(v=>eligible(v)&&v.distance>=.25&&v.score>=ranked[0].score-12));
  for(const v of ranked){if(result.length>=cap)break;add(v);}
  return result;
}

function createArtworkCache(limit=160,now=()=>Date.now()){
  const decoded=new Map(),failed=new Map();
  function put(map,key,value){map.delete(key);map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);}
  return {
    get(source){const value=decoded.get(source);if(value)put(decoded,source,value);return value;},
    remember(source,w,h){if(!source||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return false;put(decoded,source,{w,h,ratio:w/h});failed.delete(source);return true;},
    fail(source){if(source&&!decoded.has(source))put(failed,source,now());},
    canWarm(source){return !!source&&!decoded.has(source)&&(!failed.has(source)||now()-failed.get(source)>=60000);},
    clear(){decoded.clear();failed.clear();},
    stats(){return {decoded:decoded.size,failed:failed.size,limit};}
  };
}
function communityCinema(credits,hasImage,hasWatch){
 const unique=[...new Map(credits.map(f=>[f.id,f])).values()],works=new Set(),art=new Set(),watch=new Set(),makers=new Map();
 for(const f of unique){const id=f.film||f.id;works.add(id);if(hasImage(f))art.add(id);if(hasWatch(f))watch.add(id);
 if(!f.record)continue;let group=makers.get(f.record);if(!group){group={id:f.record,name:f.maker,credits:[],works:new Set()};makers.set(f.record,group);}group.credits.push(f);group.works.add(id);}
 return {credits:unique.length,films:works.size,artwork:art.size,watch:watch.size,makers:[...makers.values()].map(m=>({...m,works:m.works.size})).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id))};
}

function broadcastCredits(credits,selected,sourceImage,limit=6){
 const work=f=>f.film||f.id,seen=new Set(selected?[work(selected)]:[]),makers=new Set(selected?[selected.record]:[]),images=new Set(selected&&sourceImage(selected)?[sourceImage(selected)]:[]),out=[];
 const pool=credits.map(f=>({f,source:sourceImage(f)})).filter(x=>x.source&&!seen.has(work(x.f)));
 const add=entry=>{const {f,source}=entry;if(out.length>=limit||seen.has(work(f))||images.has(source))return;out.push(f);seen.add(work(f));makers.add(f.record);images.add(source);};
 for(const item of pool)if(!makers.has(item.f.record))add(item);
 for(const item of pool)add(item);
 return out;
}
function cinemaBeltOrder(credits,image){const first=broadcastCredits(credits,null,image,Math.min(credits.length,12)),seen=new Set(first.map(f=>f.id));return [...first,...credits.filter(f=>!seen.has(f.id))];}
function beltLayout(width,height,count,position=0){
 const landscape=height<=500&&width>760,mobile=width<=760,card=landscape?78:mobile?82:104,gap=7;
 const available=Math.max(card,width-(mobile?62:70)),side=landscape?210:mobile?0:260,padding=mobile?16:landscape?16:38;
 const capacity=Math.max(1,Math.min(landscape?5:6,Math.floor((available-side-padding+gap)/(card+gap))));
 const total=Math.max(0,Math.floor(count)),size=Math.min(capacity,total),at=Math.max(0,Math.min(total-1,Math.floor(position))),start=size?Math.floor(at/size)*size:0;
 const visible=Math.min(size,total-start),desired=Math.min(available,Math.max(mobile?230:side+padding+card,side+padding+size*(card+gap)-gap));
 return {capacity,size,start,visible,width:Math.floor(desired),card};
}
function wheelDelta(deltaY,mode,height,pinch=false){if(!Number.isFinite(deltaY))return 0;const unit=mode===1?16:mode===2?Math.max(1,height):1;return Math.max(-1.25,Math.min(1.25,-deltaY*unit*(pinch?.009:.004)/Math.LN2));}
function zoomTarget(current,pending,delta,min,max){if(!Number.isFinite(delta)||!Number.isFinite(current))return current;return Math.max(min,Math.min(max,(Number.isFinite(pending)?pending:current)+delta));}
const api=Object.freeze({greatCircleSegments,selectConnections,createArtworkCache,communityCinema,broadcastCredits,cinemaBeltOrder,beltLayout,wheelDelta,zoomTarget});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AtlasGlobeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
