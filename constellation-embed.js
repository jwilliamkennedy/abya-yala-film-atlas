'use strict';
if(new URLSearchParams(location.search).get('constellation-embed')==='1'){
 document.body.classList.add('constellation-embedded');
 (async()=>{const app=window.Atlas;await app.ready;app.state.cinema=false;document.querySelector('#layer-cinema').checked=false;app.refresh();window.dispatchEvent(new Event('resize'));
 function receive(e){if(e.origin!==location.origin||e.source!==parent||!e.data||typeof e.data!=='object')return;if(e.data.type==='atlas-workspace-map-controls'){document.querySelector('#zoom-in')?.focus({preventScroll:true});return;}if(e.data.type==='atlas-workspace-overview'){app.resetWorkspace();app.state.cinema=false;document.querySelector('#layer-cinema').checked=false;app.refresh();return;}if(e.data.type!=='atlas-workspace-focus')return;const r=app.recordById(e.data.record);if(!r)return;if(e.data.film&&r.films.some(f=>f.id===e.data.film))app.openProfileFilm(r.id,e.data.film);else app.selectRecord(r.id);const ref=app.recordMapFocus(r.id);parent.postMessage({type:'atlas-workspace-reference',record:r.id,label:ref.label,kind:ref.kind,message:ref.message},location.origin);}
 window.addEventListener('message',receive);parent.postMessage({type:'atlas-workspace-ready'},location.origin);window.AtlasWorkspaceEmbed={receive};
 })();
}
