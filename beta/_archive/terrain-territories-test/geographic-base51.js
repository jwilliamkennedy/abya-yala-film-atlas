'use strict';
window.AtlasGeographicBase={base({geo,path,world}){
 const b=path.bounds({type:'Sphere'}),url='assets/earth-'+(world?'world':'americas')+'-57.png';
 const image=geo.selectAll('image.natural-earth-image').data([world]).join('image').attr('class','natural-earth-image').attr('x',b[0][0]).attr('y',b[0][1]).attr('width',b[1][0]-b[0][0]).attr('height',b[1][1]-b[0][1]).attr('preserveAspectRatio','none').attr('pointer-events','none').lower();
 image.on('error.geography',()=>{geo.attr('data-geography-fallback','true');image.style('visibility','hidden');}).on('load.geography',()=>{geo.attr('data-geography-fallback','false');image.style('visibility',null);});
 if(image.attr('href')!==url){geo.attr('data-geography-fallback','true');image.style('visibility',null).attr('href',url);}
}};
