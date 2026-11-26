/* One public beta route. Old URLs remain compatible without allowing the legacy
   workspace to own the globe address. Explicit legacy routes remain available. */
(function(root){
'use strict';
const stateKeys=['at','pitch','territories','land','film','maker','themes','period','lands','edges','language','form','length','menu','trace','traceTheme','open'];
function resolve(href){
 const source=new URL(href),q=source.searchParams,hash=new URLSearchParams(source.hash.slice(1));
 const legacy=q.get('globe')==='0'||(q.get('globe')!=='1'&&(q.get('constellate')==='1'||['c','dial','theme-web','constellation-embed','intro'].some(k=>q.has(k))));
 const mappedHash=hash.has('maker')||hash.has('film')||hash.has('land');
 // Keep explicitly shared legacy views, but unrelated query strings must not
 // send visitors to the unlisted workspace (e.g. analytics or referral links).
 const legacyHash=hash.has('view')&&!mappedHash&&!hash.has('weave');
 const globe=!legacy&&(q.get('globe')==='1'||!legacyHash||stateKeys.some(k=>q.has(k)));
 if(!globe){
  const flat=new URL('flat.html',source);flat.search=source.search;flat.hash=source.hash;
  return {globe:false,canonical:flat.href};
 }
 const canonical=new URL('./',source);
 for(const k of stateKeys)if(q.has(k))canonical.searchParams.set(k,q.get(k));
 // Old film/profile/land links use explicit IDs, never a geographic guess.
 if(mappedHash)for(const k of ['maker','film','land'])if(hash.has(k)&&!canonical.searchParams.has(k))canonical.searchParams.set(k,hash.get(k));
 if(hash.has('weave'))canonical.hash='weave='+hash.get('weave');
 return {globe:true,canonical:canonical.href};
}
// Watch origin belongs to the query, not to the currently playing film hash.
function watchReturn(href){
 const source=new URL(href),q=source.searchParams;
 if(!q.has('fromGlobe'))return null;
 const state=new URLSearchParams(q.get('fromGlobe')||''),back=new URL('./',source);
 for(const key of stateKeys)if(state.has(key))back.searchParams.set(key,state.get(key));
 return back.href;
}
const tools=Object.freeze({resolve,watchReturn});
if(typeof module!=='undefined'&&module.exports)module.exports=tools;
else {
 root.AtlasRouteTools=tools;
 if(root.document.documentElement.dataset.atlasEntry==='globe'){
  root.AtlasRoute=Object.freeze(resolve(location.href));
  if(!root.AtlasRoute.globe)location.replace(root.AtlasRoute.canonical);
 }
}
})(typeof globalThis!=='undefined'?globalThis:this);
