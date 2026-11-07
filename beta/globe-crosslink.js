'use strict';
// Beta-only bidirectional land-ID relay. No new affiliation or geographic matches.
(async()=>{
 const atlas=window.Atlas,globe=document.getElementById('globe-lab-link');
 if(!atlas||!globe)return;
 await atlas.ready;
 function sync(){
  const st=atlas.state||{},id=st.crossLand||st.land||null;
  globe.setAttribute('href','globe-lab/'+(id?'?land='+encodeURIComponent(id):''));
  globe.title=id?'Open selected Atlas land ID '+id+' in the globe prototype':'Open the rotating globe prototype';
  globe.dataset.landId=id||'';
 }
 const summary=document.getElementById('selection-summary');
 if(summary)new MutationObserver(sync).observe(summary,{childList:true,characterData:true,attributes:true,subtree:true});
 window.addEventListener('hashchange',sync);
 window.addEventListener('popstate',sync);
 document.addEventListener('click',()=>queueMicrotask(sync),true);
 sync();
})().catch(()=>{});