'use strict';
/* Native-resolution vector basemap. Replaces the enlarged earth-57 PNG images
   with geographic paths from the existing, self-hosted world-50m TopoJSON.
   Projection, zoom, country interaction and Native Land layers are unchanged. */
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
  geo.selectAll('image.natural-earth-image').remove();
  base.selectAll('path.atlas-vector-ocean').data([0]).join('path')
    .attr('class','atlas-vector-ocean').attr('d',path({type:'Sphere'}))
    .attr('pointer-events','none').lower();
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
