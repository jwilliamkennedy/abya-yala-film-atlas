'use strict';
/* Historical beta geography restored. Shaded physical raster beneath crisp
   self-hosted Natural Earth vector geometry, both in the established Equal Earth projection.
   Keeps all film links, territory hit-testing, world toggle and camera unchanged. */
window.AtlasGeographicBase={
 base({geo,path,world}){
  const base=geo.select('g.base');
  if(base.empty())return;
  const defs=geo.selectAll('defs.atlas-vector-earth-defs').data([0]).join('defs').attr('class','atlas-vector-earth-defs');
  function gradient(id,stops,vertical=true){
   const grad=defs.selectAll('linearGradient#'+id).data([0]).join('linearGradient')
      .attr('id',id).attr('gradientUnits','objectBoundingBox')
      .attr('x1','0%').attr('y1','0%').attr('x2',vertical?'0%':'100%').attr('y2',vertical?'100%':'0%');
   grad.selectAll('stop').data(stops).join('stop')
      .attr('offset',d=>d[0]).attr('stop-color',d=>d[1]);
  }
  gradient('atlas-vector-ocean-gradient',[['0%','#6e9eaf'],['52%','#4b7e96'],['100%','#305976']]);
  gradient('atlas-vector-land-gradient',[['0%','#afbd9d'],['52%','#8caa92'],['100%','#6f9184']]);
  // Restore the atlas's original, self-hosted shaded geographic raster underneath
  // the crisp TopoJSON coastlines. Both variants were composed in this exact D3
  // Equal Earth projection and follow the existing camera transform.
  const extent=path.bounds({type:'Sphere'}),spherePath=path({type:'Sphere'});
  const raster='assets/earth-'+(world?'world':'americas')+'-57.png';
  defs.selectAll('clipPath#atlas-physical-earth-clip').data([0]).join('clipPath')
    .attr('id','atlas-physical-earth-clip')
    .selectAll('path').data([spherePath]).join('path').attr('d',d=>d);
  base.selectAll('path.atlas-vector-ocean').data([0]).join('path')
    .attr('class','atlas-vector-ocean').attr('d',spherePath)
    .attr('pointer-events','none').lower();
  const image=base.selectAll('image.natural-earth-image').data([0])
    .join(enter=>enter.insert('image','path.land-shape'))
    .attr('class','natural-earth-image')
    .attr('x',extent[0][0]).attr('y',extent[0][1])
    .attr('width',extent[1][0]-extent[0][0])
    .attr('height',extent[1][1]-extent[0][1])
    .attr('preserveAspectRatio','none')
    .attr('clip-path','url(#atlas-physical-earth-clip)')
    .attr('pointer-events','none');
  image.on('error.earth-relief',()=>geo.attr('data-geography-fallback','true'))
    .on('load.earth-relief',()=>geo.attr('data-geography-fallback','false'));
  if(image.attr('href')!==raster){
    geo.attr('data-geography-fallback','true');
    image.attr('href',raster);
  }
  if(typeof d3.geoGraticule10==='function'){
   base.selectAll('path.atlas-vector-grid').data([0])
    .join(enter=>enter.insert('path','path.land-shape'))
    .attr('class','atlas-vector-grid').attr('d',path(d3.geoGraticule10()))
    .attr('pointer-events','none');
  }
  base.selectAll('path.land-shape').attr('pointer-events','none')
    .attr('vector-effect','non-scaling-stroke');
  geo.attr('data-geography-mode','vector')
     .attr('data-geography-fallback','false')
     .attr('data-vector-world',world?'world':'americas');
 }
};
