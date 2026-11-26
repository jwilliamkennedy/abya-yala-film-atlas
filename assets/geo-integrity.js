/* Shared spherical checks. Inputs are WGS84 longitude/latitude, never screen coordinates. */
((root,factory)=>{if(typeof module==='object'&&module.exports)module.exports=factory;else root.AtlasGeoIntegrity=factory(root.d3);})(typeof window==='object'?window:this,d3=>{
 'use strict';
 const rad=Math.PI/180,deg=180/Math.PI,R=6371008.8;
 const wrap=x=>((x+180)%360+360)%360-180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const polys=g=>g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
 const valid=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[1])<=90;
 function mercator(p){return [6378137*wrap(p[0])*rad,6378137*Math.log(Math.tan(Math.PI/4+clamp(p[1],-85.05112878,85.05112878)*rad/2))];}
 function inverseMercator(p){return [wrap(p[0]/6378137*deg),(2*Math.atan(Math.exp(p[1]/6378137))-Math.PI/2)*deg];}
 function ortho(p,c,s=1,t=[0,0]){const d=wrap(p[0]-c[0])*rad,l=p[1]*rad,b=c[1]*rad;return [t[0]+s*Math.cos(l)*Math.sin(d),t[1]-s*(Math.cos(b)*Math.sin(l)-Math.sin(b)*Math.cos(l)*Math.cos(d)),Math.sin(b)*Math.sin(l)+Math.cos(b)*Math.cos(l)*Math.cos(d)];}
 function inverseOrtho(p,c,s=1,t=[0,0]){const x=(p[0]-t[0])/s,y=-(p[1]-t[1])/s,r=Math.hypot(x,y),b=c[1]*rad;if(r>1+1e-9)return null;if(r<1e-12)return [...c];const a=Math.asin(clamp(r,0,1));return [wrap(c[0]+Math.atan2(x*Math.sin(a),r*Math.cos(b)*Math.cos(a)-y*Math.sin(b)*Math.sin(a))*deg),Math.asin(clamp(Math.cos(a)*Math.sin(b)+y*Math.sin(a)*Math.cos(b)/r,-1,1))*deg];}
 function distance(a,b){return a&&b?R*d3.geoDistance(a,b):Infinity;}
 function signature(g){return JSON.stringify(polys(g).map(p=>p.map(r=>{const a=JSON.stringify(r),b=JSON.stringify(r.slice().reverse());return a<b?a:b;})));}
 function inspect(f){let vertices=0,unwrapped=0,invalid=0,openRings=0;const ps=polys(f.geometry);for(const p of ps)for(const r of p){if(r.length<4||r[0][0]!==r.at(-1)[0]||r[0][1]!==r.at(-1)[1])openRings++;for(const v of r){vertices++;if(!valid(v))invalid++;else if(Math.abs(v[0])>180)unwrapped++;}}const area=d3.geoArea(f);return {vertices,unwrapped,invalid,openRings,area,ok:!!ps.length&&!invalid&&!openRings&&Number.isFinite(area)&&area>0&&area<=2*Math.PI};}
 // Test a point in a connected component, not a viewport label or proxy country.
 function anchor(features){
  const cs=features.flatMap(f=>polys(f.geometry).map((coordinates,i)=>({type:'Feature',id:String(f.id),component:i,geometry:{type:'Polygon',coordinates}}))).map(f=>({f,area:d3.geoArea(f)})).filter(v=>v.area>0&&v.area<=2*Math.PI).sort((a,b)=>b.area-a.area||a.f.id.localeCompare(b.f.id)||a.f.component-b.f.component);
  for(const {f} of cs){
   const c=d3.geoCentroid(f),test=p=>valid(p)&&d3.geoContains(f,[wrap(p[0]),p[1]]),result=(p,method)=>({coordinates:[wrap(p[0]),p[1]],sourceId:f.id,component:f.component,method});
   if(test(c))return result(c,'contained-spherical-centroid');
   const [[west,south],[east,north]]=d3.geoBounds(f),span=((east-west+360)%360)||360;
   for(const n of [5,11,23]){let best=null,bd=Infinity;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const p=[wrap(west+span*(i+.5)/n),south+(north-south)*(j+.5)/n];if(test(p)){const d=distance(c,p);if(d<bd){bd=d;best=p;}}}if(best)return result(best,'contained-geographic-grid');}
   const ring=f.geometry.coordinates[0];for(let i=1;i<ring.length;i++){const m=d3.geoInterpolate(ring[i-1],ring[i])(.5);for(const eps of [1e-5,1e-4,.001])for(const [dx,dy] of [[eps,0],[-eps,0],[0,eps],[0,-eps]]){const p=[wrap(m[0]+dx),m[1]+dy];if(test(p))return result(p,'contained-edge-neighbour');}}
  }return null;
 }
 function projectionAudit(features){
  const views=[[0,0],[90,0],[-90,0],[180,0],[0,90],[0,-90]],pjs=views.map(c=>d3.geoOrthographic().rotate([-c[0],-c[1],0]).scale(4096).translate([5000,5000]).clipAngle(90));
  let vertices=0,mercatorTested=0,mercatorSkipped=0,maxMercatorMetres=0,maxGlobeMetres=0,maxInverseMetres=0,maxIndependentPixels=0,failed=0;
  for(const f of features)for(const poly of polys(f.geometry))for(const ring of poly)for(const v of ring){vertices++;if(!valid(v)){failed++;continue;}const p=[wrap(v[0]),v[1]];
   if(Math.abs(p[1])<=85.05112878){mercatorTested++;maxMercatorMetres=Math.max(maxMercatorMetres,distance(p,inverseMercator(mercator(p))));}else mercatorSkipped++;
   let best=0,z=-Infinity;for(let i=0;i<views.length;i++){const a=ortho(p,views[i]);if(a[2]>z){best=i;z=a[2];}}
   const c=views[best],pj=pjs[best],xy=pj(p),ind=ortho(p,c,4096,[5000,5000]),e=distance(p,pj.invert(xy)),e2=distance(p,inverseOrtho(ind,c,4096,[5000,5000])),ep=Math.hypot(xy[0]-ind[0],xy[1]-ind[1]);
   if(![e,e2,ep].every(Number.isFinite)){failed++;continue;}maxGlobeMetres=Math.max(maxGlobeMetres,e);maxInverseMetres=Math.max(maxInverseMetres,e2);maxIndependentPixels=Math.max(maxIndependentPixels,ep);
  }
  return {vertices,mercatorTested,mercatorSkipped,maxMercatorMetres,maxGlobeMetres,maxInverseMetres,maxIndependentPixels,failed,ok:!failed&&maxGlobeMetres<.01&&maxInverseMetres<.01&&maxMercatorMetres<.01&&maxIndependentPixels<.0001};
 }
 return {polys,inspect,signature,anchor,mercator,inverseMercator,ortho,inverseOrtho,projectionAudit,distance,wrap};
});
