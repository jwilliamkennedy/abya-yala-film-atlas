'use strict';
/* Beta-only single map surface: globe under the existing filmmaker/film reading index.
   Keeps SVG as a silent fallback if the external physical basemap cannot initialize. */
(async()=>{
 const A=window.Atlas;if(!A)return;
 await A.ready;
 const panel=document.querySelector('.map-panel'),map=document.getElementById('atlas');
 if(!panel||!map||new URLSearchParams(location.search).get('legacy')==='1')return;
 const frame=document.createElement('iframe');
 frame.id='atlas-unified-globe';
 frame.title='Rotating globe with Indigenous land references, physical terrain and links to the filmmaker index';
 frame.setAttribute('loading','eager');
 frame.setAttribute('allow','fullscreen');
 frame.src='globe-lab/?embed=1';
 frame.style.visibility='hidden';
 panel.appendChild(frame);
 let ready=false,lastOutboundLand='',lastOutboundMaker='',scheduled=false;
 const $=id=>document.getElementById(id);
 const send=(type,other)=>{
  if(!ready||!frame.contentWindow)return;
  frame.contentWindow.postMessage({source:'atlas-beta-parent',type,...other},location.origin);
 };
 function currentLayers(){
  return {
   territories:!!$('layer-shading')?.checked,
   names:!!$('layer-connections')?.checked,
   relief:!!$('layer-geography')?.checked,
   boundaries:!!$('layer-boundaries')?.checked,
   anchors:!!$('layer-cinema')?.checked
  };
 }
 function sync(){
  scheduled=false;if(!ready)return;
  const s=A.state||{},land=s.crossLand||s.land||'',maker=s.record||'';
  if(land&&land!==lastOutboundLand){
   lastOutboundLand=land;send('land',{id:land});
  }
  if(!land&&lastOutboundLand){lastOutboundLand='';send('land',{id:null});}
  if(maker&&maker!==lastOutboundMaker){
   lastOutboundMaker=maker;send('maker',{id:maker});
  }
  if(!maker&&lastOutboundMaker){lastOutboundMaker='';send('maker',{id:null});}
 }
 function schedule(){
  if(scheduled)return;scheduled=true;requestAnimationFrame(sync);
 }
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==frame.contentWindow||!e.data||e.data.source!=='atlas-globe')return;
  const d=e.data;
  if(d.type==='ready'){
   ready=true;
   document.body.classList.add('beta-globe-unified');
   frame.style.visibility='visible';
   send('layers',{layers:currentLayers()});
   schedule();return;
  }
  if(!ready)return;
  if(d.type==='land'&&typeof d.id==='string'&&A.landById(d.id)){
   const existing=A.state.crossLand||A.state.land||'';
   lastOutboundLand=d.id;
   if(existing!==d.id){
    A.openReadingLand(d.id);
    if((A.state.crossLand||A.state.land)!==d.id){
     A.switchView('land');A.selectLand(d.id);
    }
   }
   schedule();
  }
  if(d.type==='maker'&&typeof d.id==='string'&&A.recordById(d.id)){
   if(A.state.record!==d.id){
    A.switchView('filmmakers');A.selectRecord(d.id,null,{locate:false});
   }
   lastOutboundMaker=d.id;schedule();
  }
  if(d.type==='country'&&typeof d.code==='string'&&A.countryByCode(d.code)){
   A.selectCountry(d.code);schedule();
  }
 });
 const selection=$('selection-summary'),index=$('index');
 // Preserving one map also preserves existing search, A–Z, films, and deep links.
 // This observer syncs selected IDs, not inferred geographical coordinates.
 if(selection)new MutationObserver(schedule).observe(selection,{subtree:true,attributes:true,childList:true,characterData:true});
 if(index)new MutationObserver(schedule).observe(index,{attributes:true,attributeFilter:['data-view']});
 document.addEventListener('click',schedule,true);
 document.addEventListener('keydown',schedule,true);
 window.addEventListener('hashchange',schedule);
 window.addEventListener('popstate',schedule);
 for(const id of ['layer-shading','layer-connections','layer-geography','layer-boundaries','layer-cinema']){
  $(id)?.addEventListener('change',()=>send('layers',{layers:currentLayers()}));
 }
 // Retain an explicit fallback for accessibility or if external tiles fail to load.
 window.AtlasUnifiedMap={getStatus:()=>({ready,src:frame.src,selected:A.state.crossLand||A.state.land||null}),showLegacy:()=>{
  document.body.classList.remove('beta-globe-unified');frame.style.visibility='hidden';
 }};
})().catch(e=>{console.warn('The original Atlas map remains available.',e);});
