'use strict';
window.AtlasPlaces=(()=>{
  const data=window.ATLAS_TERRITORIES, entries=data.features;
  const norm=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().replace(/[’‘ʻʼ`]/g,"'");
  const key=s=>norm(s).replace(/[^\p{L}\p{N}]/gu,'');
  const esc=s=>escapeHTML(s);
  const palette=['#edba72','#79c7c0','#b49bcf','#da8c79','#a6c68b','#91b9dc'];
  let layer,world=false,pinned=false,lastKey='',lastLocation=null;
  // GeoJSON uses the opposite exterior-ring winding to D3's spherical geometry.
  for(const f of entries){
    const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const rings of polygons){
      if(d3.geoArea({type:'Polygon',coordinates:[rings[0]]})>2*Math.PI)rings[0].reverse();
      for(const hole of rings.slice(1))if(d3.geoArea({type:'Polygon',coordinates:[hole]})<2*Math.PI)hole.reverse();
    }
    f.bounds=d3.geoBounds(f);f.area=d3.geoArea(f);
    f.search=norm(f.properties.name);f.nameKeys=[key(f.properties.name),...f.properties.name.split(/[()]/).map(key)].filter(Boolean);
  }
  function within(f,p){const [[w,s],[e,n]]=f.bounds;return p[1]>=s&&p[1]<=n&&(w<=e?p[0]>=w&&p[0]<=e:p[0]>=w||p[0]<=e)&&d3.geoContains(f,p);}
  function lookup(point){return entries.filter(f=>within(f,point)).sort((a,b)=>a.area-b.area);}
  function isIxim(point){const guatemala=features?.find(f=>String(f.id)==='320');return guatemala&&d3.geoContains(guatemala,point);}
  function init(){
    layer=mapLayer.append('g').attr('class','territory-layer').attr('pointer-events','none');
    svg.on('pointermove.places',e=>{if(state.view!=='places'||pinned||e.buttons)return;const xy=d3.pointer(e,svg.node()),point=projection.invert(transform.invert(xy));if(point)inspect(point,{xy});});
    svg.on('pointerleave.places',()=>{$('#place-hover').hidden=true;});
    svg.on('click.places',e=>{if(state.view!=='places'||e.defaultPrevented)return;const xy=d3.pointer(e,svg.node()),point=projection.invert(transform.invert(xy));if(point){pinned=true;inspect(point,{xy,force:true});}});
    $('#place-search').addEventListener('input',search);
    $('#place-search').addEventListener('keydown',e=>{if(e.key==='Escape'){$('#place-search-results').hidden=true;}if(e.key==='Enter')$('#place-search-results button')?.click();});
    $('#place-americas').addEventListener('click',()=>{world=false;release();drawMap();});
    $('#place-world').addEventListener('click',()=>{world=true;release();drawMap();});
    $('#place-ixim').addEventListener('click',findIxim);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.view==='places')release();});
    $('#place-details').addEventListener('click',e=>{if(e.target.closest('#place-release'))release();});
  }
  function release(){pinned=false;lastKey='';$('#place-hover').hidden=true;$('#place-release')?.remove();$('#place-mode').textContent='Hover to explore · click or tap to hold';}
  function draw(){
    layer.style('display',state.view==='places'?null:'none');
    if(state.view!=='places')return;
    layer.selectAll('path').data(entries,f=>f.id).join('path').attr('d',geoPath).attr('data-territory',f=>f.id).attr('fill',f=>palette[Number(f.id)%palette.length]).attr('stroke',f=>palette[Number(f.id)%palette.length]);
    lastKey='';
  }
  function renderView(){
    document.body.dataset.browse='places';AtlasLinework.clear();AtlasNames.syncBand();
    $$('.view-control button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='places')));
    $('#atlas-map').setAttribute('aria-label','Indigenous mapped names. Hover or tap to reveal overlapping records. Search names above for keyboard access.');
    $('.map-note').innerHTML='Territories: Native Land Digital via MapMaker · snapshot data dated 1 Oct 2023; retrieved 23 Sep 2026. Source extents are incomplete, span different periods, and are not official or legal boundaries. <a href="https://education.nationalgeographic.org/resource/mapmaker-indigenous-territories/" target="_blank" rel="noopener noreferrer">Source & limits ↗</a>';
    if(!$('#place-mode'))$('#place-readout').innerHTML='<p id="place-mode">Hover to explore · click or tap to hold</p><p>Use “Find Ixim Ulew” to begin in Guatemala, or search any mapped name.</p><p class="place-source-note">Names retain the source’s spelling. A territorial record may be named after a people; it is not automatically a territorial autonym. No name here establishes an individual’s identity.</p>';
    renderMarkers();
  }
  function sourceCards(hits){
    // Collapse repeated labels in the readout, retaining every distinct source link.
    const groups=new Map();for(const f of hits){const name=f.properties.name;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(f);}
    return [...groups].map(([name,records])=>{const links=[...new Set(records.map(f=>safeURL(f.properties.url)).filter(Boolean))];return `<article class="place-card"><h3>${esc(name)}</h3><p>Territorial record${records.length>1?'s':''} · Native Land Digital${records.length>1?' · '+records.length+' source records grouped':''}</p>${links.map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Read ${links.length>1?'source '+(i+1):'this name’s sources'} ↗</a>`).join('<br>')}</article>`;}).join('');
  }
  function inspect(point,{xy=null,force=false}={}){
    const hits=lookup(point),ixim=isIxim(point),signature=hits.map(f=>f.id).join(',')+'|'+!!ixim+'|'+pinned;
    lastLocation=point;
    const title=ixim?'Ixim Ulew · Iximulew':hits.length?[...new Set(hits.map(f=>f.properties.name))].join(' · '):'No mapped name in this source';
    if(xy){const tip=$('#place-hover');tip.textContent=title;tip.hidden=false;tip.style.left=Math.max(10,Math.min(xy[0]+16,width-270))+'px';tip.style.top=Math.max(12,Math.min(xy[1]+18,height-95))+'px';}
    if(signature===lastKey&&!force)return;lastKey=signature;
    layer.selectAll('path').classed('is-active',f=>hits.includes(f));
    $('#place-details').innerHTML=`<div class="place-readout-top"><p class="eyebrow">${pinned?'HELD PLACE':'AT YOUR CURSOR'}</p>${pinned?'<button id="place-release">Resume hover ×</button>':''}</div><h2>${ixim?'Ixim Ulew':hits.length?esc(hits[0].properties.name):'A gap in this layer'}</h2><p id="place-mode">${pinned?'This place is held. Read the sources, or resume hover.':'Hover to explore · click or tap to hold'}</p><div id="place-readout">${ixim?`<article class="place-card place-autonym"><p class="eyebrow">PLACE NAME · ALSO WRITTEN IXIMULEW</p><p>The International Mayan League uses Iximulew for Guatemala. The modern country outline is used only to find this name; it does not define an Indigenous territory or a single people.</p><a href="https://www.mayanleague.org/indigenous-language-resources" target="_blank" rel="noopener noreferrer">Mayan League · name in use ↗</a></article>`:''}<p class="place-overlaps">${hits.length?`${hits.length} overlapping source record${hits.length===1?'':'s'}`:'No territorial record covers this point in the imported layer. This is a coverage gap, not an absence of Indigenous peoples.'}</p>${sourceCards(hits)}</div><p class="place-source-note">Source spellings retained. These records can name peoples as well as lands; they do not all describe the same period. No claim of complete coverage or definitive boundaries.</p>`;
  }
  function focusFeature(f){
    if(state.view!=='places')setBrowseView('places');
    const c=d3.geoCentroid(f);if(!world&&(c[0]>-25||c[0]<-175)){world=true;drawMap();}
    const [[x0,y0],[x1,y1]]=geoPath.bounds(f),k=Math.max(1,Math.min(14,.6/Math.max((x1-x0)/width,(y1-y0)/height)));
    svg.call(zoom.transform,d3.zoomIdentity.translate(width*.5,height*.48).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));
    pinned=true;inspect(c,{force:true});
    // A centroid can fall outside a concave or multipart feature. Keep the selected record explicit.
    if(!lookup(c).includes(f)){
      layer.selectAll('path').classed('is-active',d=>d===f);
      $('#place-details').innerHTML=`<div class="place-readout-top"><p class="eyebrow">SELECTED SOURCE RECORD</p><button id="place-release">Resume hover ×</button></div><h2>${esc(f.properties.name)}</h2><p id="place-mode">Showing this record’s mapped extent.</p><div id="place-readout">${sourceCards([f])}</div>`;
    }
    $('#place-search-results').hidden=true;
  }
  function findIxim(){
    if(state.view!=='places')setBrowseView('places');world=false;drawMap();
    const p=projection([-90.5,15.5]);svg.call(zoom.transform,d3.zoomIdentity.translate(width*.5,height*.48).scale(9).translate(-p[0],-p[1]));pinned=true;inspect([-90.5,15.5],{force:true});$('#place-search-results').hidden=true;
  }
  function search(){
    const q=normalize($('#place-search').value).trim(),box=$('#place-search-results');box.hidden=!q;if(!q)return;
    const ixim=key('Ixim Ulew').includes(key(q))||normalize('Guatemala').includes(q);
    const hits=entries.filter(f=>f.search.includes(q)||f.nameKeys.some(k=>k.includes(key(q)))).sort((a,b)=>a.properties.name.localeCompare(b.properties.name));
    const seen=new Set(),unique=hits.filter(f=>{const k=f.properties.name+'|'+f.properties.url;if(seen.has(k))return false;seen.add(k);return true;});
    box.innerHTML=(ixim?'<button data-find-ixim><strong>Ixim Ulew / Iximulew</strong><small>Place-name usage · Guatemala</small></button>':'')+unique.slice(0,30).map(f=>`<button data-find-territory="${f.id}"><strong>${esc(f.properties.name)}</strong><small>Native Land Digital · territorial record</small></button>`).join('')+(!unique.length&&!ixim?'<p>No matching mapped name. The supplied-name band may still contain it; no extent will be invented.</p>':'')+(unique.length>30?`<p>${unique.length} matches. Refine your search to see others.</p>`:'');
    box.querySelector('[data-find-ixim]')?.addEventListener('click',findIxim);
    box.querySelectorAll('[data-find-territory]').forEach(b=>b.addEventListener('click',()=>focusFeature(entries.find(f=>f.id===b.dataset.findTerritory))));
  }
  function openName(item){
    if(key(item.name)==='iximulew'){findIxim();return;}
    const hits=entries.filter(f=>f.nameKeys.includes(key(item.name)));
    if(hits.length===1){focusFeature(hits[0]);return;}
    pinned=true;$('#place-hover').hidden=true;
    $('#place-details').innerHTML=`<div class="place-readout-top"><p class="eyebrow">SUPPLIED NAME · ${esc(item.usage)}</p><button id="place-release">Resume hover ×</button></div><h2>${esc(item.name)}</h2><p id="place-mode">${hits.length?'Choose a source record below.':'No verified geographic match in this edition.'}</p><div id="place-readout"><p>${esc(item.context)}</p><p>A people’s name, a language, a sacred place and a homeland are kept distinct. This entry remains available without assigning an unsupported footprint.</p>${hits.map(f=>`<button class="place-match" data-source="${f.id}">${esc(f.properties.name)} ↗</button>`).join('')}</div>`;
    layer.selectAll('path').classed('is-active',false);
    $('#place-details').querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>focusFeature(entries.find(f=>f.id===b.dataset.source))));
  }
  return {init,draw,renderView,lookup,inspect,findIxim,openName,isWorld:()=>world,count:entries.length};
})();
