'use strict';
// Screen-space placement keeps names inside the visible part of their source geometry.
window.AtlasMapLabelLayout=(()=>{
 const baseName=s=>String(s||'').replace(/\s*\([^)]*\)\s*/g,' ').trim().normalize('NFD').replace(/[’‘ʻʼ`]/g,"'").replace(/\p{Diacritic}/gu,'').toLowerCase();
 function sourceMatches(name,source){
  const a=baseName(name),b=baseName(source);
  // The source explicitly lists Binnizá among its names; this is a spelling relay, not an affiliation inference.
  return a===b||(a==='binniza'&&b.split('/').some(part=>part.trim()==='binniza'))||(a==="maaya'"&&/maya \(yucateco\)/i.test(source));
 }
 function clipRing(points,box){
  let out=points;
  const edges=[{axis:0,value:box.left,greater:true},{axis:0,value:box.right,greater:false},{axis:1,value:box.top,greater:true},{axis:1,value:box.bottom,greater:false}];
  for(const edge of edges){const input=out;out=[];if(!input.length)break;const inside=p=>edge.greater?p[edge.axis]>=edge.value:p[edge.axis]<=edge.value;
   let a=input[input.length-1];for(const b of input){const ai=inside(a),bi=inside(b);if(ai!==bi){const t=(edge.value-a[edge.axis])/(b[edge.axis]-a[edge.axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(bi)out.push(b);a=b;}
  }return out;
 }
 function visibleAnchor(features,{project,invert,contains,centroid,centroidInside,bounds,viewport}){
  const inside=p=>p&&p.every(Number.isFinite)&&p[0]>=viewport.left&&p[0]<=viewport.right&&p[1]>=viewport.top&&p[1]<=viewport.bottom;
  const belongs=(f,p)=>inside(p)&&contains(f,invert(p));
  const center=project(centroid(features));if(inside(center)&&(centroidInside?centroidInside():features.some(f=>belongs(f,center))))return center;
  const candidates=[];
  for(const feature of features){
   const b=bounds(feature),lo=[Math.max(viewport.left,b[0][0]),Math.max(viewport.top,b[0][1])],hi=[Math.min(viewport.right,b[1][0]),Math.min(viewport.bottom,b[1][1])];
   if(lo[0]>=hi[0]||lo[1]>=hi[1])continue;
   const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
   for(const rings of polygons){const ring=clipRing(rings[0].map(project).filter(p=>p?.every(Number.isFinite)),viewport);if(ring.length<3)continue;
    const point=d3.polygonCentroid(ring),area=Math.abs(d3.polygonArea(ring));if(belongs(feature,point))candidates.push({point,area,feature});
   }
   // Concave shapes and holes may exclude the clipped centroid. Use interior samples.
   if(!candidates.some(c=>c.feature===feature))for(const fy of [.5,.25,.75,.1,.9])for(const fx of [.5,.25,.75,.1,.9]){const point=[lo[0]+fx*(hi[0]-lo[0]),lo[1]+fy*(hi[1]-lo[1])];if(belongs(feature,point))candidates.push({point,area:(hi[0]-lo[0])*(hi[1]-lo[1])*.01,feature});}
  }
  return candidates.sort((a,b)=>b.area-a.area)[0]?.point||null;
 }
 return {baseName,sourceMatches,clipRing,visibleAnchor};
})();
