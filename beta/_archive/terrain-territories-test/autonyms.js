'use strict';
window.AtlasNames=(()=>{
  const data=window.ATLAS_NAMES_DATA.records;
  const groups=[...new Set(data.map(r=>r.region))];
  // Editorial colors distinguish browsing groups, not peoples or cultural symbols.
  const colors=['#efb94e','#55cbd7','#dd88b5','#f08762','#d6b357','#b89ce9','#5cc8af','#e8a25e','#a6cc70','#68baf1','#f18c9f','#71c5b5','#c5a7f1'];
  const color=r=>colors[groups.indexOf(typeof r==='string'?r:r.region)%colors.length];
  let area='all',selected=null,layer,trail=[],page=0,bandReady=false,bandTimer,lastQuery='';
  const esc=s=>escapeHTML(s);
  const pageSize=()=>width<600?8:12;
  function matches(){const q=normalize(state.query).trim().split(/\s+/).filter(Boolean);return data.filter(r=>(area==='all'||r.region===area)&&q.every(t=>normalize(r.name+' '+(r.aliases||[]).join(' ')+' '+r.context+' '+r.usage+' '+r.region).includes(t)));}
  function init(){
    layer=svg.append('g').attr('class','names-map-layer');
    $('#names-area').innerHTML='<option value="all">All names together</option>'+groups.map(g=>`<option>${esc(g)}</option>`).join('');
    const p=new URLSearchParams(location.search);if(groups.includes(p.get('namesArea')))area=p.get('namesArea');
    if(data.some(r=>r.id===p.get('name')))selected=p.get('name');
    $('#names-area').addEventListener('change',e=>{area=e.target.value;selected=null;page=0;updateView();drawMap();});
    $('#record-list').addEventListener('click',e=>{const b=e.target.closest('[data-name]');if(b)choose(b.dataset.name);});
    initBand();
    $('#names-previous').addEventListener('click',()=>advance(-1));
    $('#names-next').addEventListener('click',()=>advance(1));
    const savedPage=Number(p.get('namesPage'));if(Number.isInteger(savedPage)&&savedPage>0)page=savedPage;
    lastQuery=state.query;
    if(selected)page=Math.max(0,Math.floor(matches().findIndex(r=>r.id===selected)/pageSize()));
  }
  function initBand(){
    $('#names-band-items').innerHTML=data.map((r,i)=>`<button class="ribbon-name" data-ribbon-name="${r.id}" style="--name-color:${color(r)}" aria-pressed="false"><small>${i===0||data[i-1].region!==r.region?esc(r.region):'&nbsp;'}</small><span>${esc(r.name)}</span><i aria-hidden="true"></i></button>`).join('');
    const band=$('#names-band');
    band.addEventListener('click',e=>{const b=e.target.closest('[data-ribbon-name]');if(b)choose(b.dataset.ribbonName,{fromBand:true});});
    const preview=e=>{const b=e.target.closest('[data-ribbon-name]');if(!b)return;const r=data.find(r=>r.id===b.dataset.ribbonName);$('#ribbon-caption').textContent=r.name+' · '+r.usage+' · '+r.context;highlight(r.id);};
    band.addEventListener('pointerover',preview);band.addEventListener('focusin',preview);
    band.addEventListener('pointerleave',()=>{highlight(null);caption();});
    band.addEventListener('focusout',e=>{if(!band.contains(e.relatedTarget)){highlight(null);caption();}});
    band.addEventListener('keydown',e=>{const buttons=[...band.querySelectorAll('.ribbon-name:not([hidden])')],at=buttons.indexOf(e.target);let next;
      if(e.key==='ArrowRight')next=Math.min(buttons.length-1,at+1);else if(e.key==='ArrowLeft')next=Math.max(0,at-1);else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;
      if(buttons[next]){e.preventDefault();buttons[next].focus();centerBand(buttons[next]);}
    });
    for(const [id,direction] of [['ribbon-prev',-1],['ribbon-next',1]])$('#'+id).addEventListener('click',()=>band.scrollBy({left:direction*band.clientWidth*.75,behavior:reducedMotion?'instant':'smooth'}));
    const arrows=()=>{$('#ribbon-prev').disabled=band.scrollLeft<=1;$('#ribbon-next').disabled=band.scrollLeft>=band.scrollWidth-band.clientWidth-2;};
    band.addEventListener('scroll',arrows,{passive:true});
    $('#ribbon-search').addEventListener('input',e=>{const q=normalize(e.target.value).trim();let count=0;
      data.forEach(r=>{const b=band.querySelector(`[data-ribbon-name="${r.id}"]`);b.hidden=!!q&&!normalize(r.name+' '+(r.aliases||[]).join(' ')+' '+r.context+' '+r.region).includes(q);if(!b.hidden)count++;});
      if(state.view==='names'){state.query=e.target.value;selected=null;page=0;updateView();}
      $('#ribbon-total').textContent=`${count} / ${data.length} names`;band.scrollLeft=0;drawThread();arrows();$('#ribbon-caption').textContent=count?'Choose a name to open its context.':'No matching name. Clear the search to see all 171.';
    });
    $('#ribbon-all').addEventListener('click',()=>{$('#ribbon-search').value='';$('#ribbon-search').dispatchEvent(new Event('input'));state.query='';reset();setBrowseView('names');});
    new ResizeObserver(()=>{clearTimeout(bandTimer);bandTimer=setTimeout(()=>{drawThread();arrows()},80)}).observe(band);
    bandReady=true;drawThread();arrows();syncBand();
    document.fonts?.ready.then(()=>{drawThread();arrows()});
  }
  function drawThread(){
    if(!bandReady)return;const inner=$('#names-band-inner'),thread=d3.select('#ribbon-thread');thread.selectAll('*').remove();
    const buttons=[...inner.querySelectorAll('.ribbon-name:not([hidden])')];const w=inner.scrollWidth;thread.attr('viewBox',`0 0 ${w} 114`).attr('width',w).attr('height',114);
    buttons.forEach((b,i)=>{const x=b.offsetLeft+b.offsetWidth/2,next=buttons[i+1],end=next?next.offsetLeft+next.offsetWidth/2:x+50,c=b.style.getPropertyValue('--name-color');
      thread.append('path').attr('d',`M${x},90 C${x+26},${i%2?72:109} ${end-32},${i%2?111:75} ${end},90`).attr('stroke',c).attr('fill','none').attr('stroke-width',1.8);
      thread.append('path').attr('d',`M${x-2},94 Q${(x+end)/2},${i%2?115:74} ${end+2},93`).attr('stroke',c).attr('fill','none').attr('stroke-width',.6).attr('opacity',.5);
    });
  }
  function centerBand(button){if(!button)return;const band=$('#names-band');band.scrollTo({left:button.offsetLeft-(band.clientWidth-button.offsetWidth)/2,behavior:reducedMotion?'instant':'smooth'});}
  function caption(){const r=data.find(r=>r.id===selected);$('#ribbon-caption').textContent=r?`${r.name} · ${r.usage} · ${r.region}`:'Follow a name. Make your own path.';}
  function syncBand(){
    if(!bandReady)return;let changed=false,count=0;
    const q=normalize(state.view==='names'?state.query:$('#ribbon-search').value).trim();
    if(state.view==='names')$('#ribbon-search').value=state.query;
    $$('[data-ribbon-name]').forEach(b=>{b.setAttribute('aria-pressed',String(state.view==='names'&&b.dataset.ribbonName===selected));const r=data.find(r=>r.id===b.dataset.ribbonName);const hidden=!!q&&!normalize(r.name+' '+(r.aliases||[]).join(' ')+' '+r.context+' '+r.region).includes(q);if(b.hidden!==hidden)changed=true;b.hidden=hidden;if(!hidden)count++;});
    $('#ribbon-total').textContent=q?`${count} / ${data.length} names`:`${data.length} names`;
    if(changed)drawThread();caption();
  }

  function highlight(id){if(!layer)return;layer.selectAll('[data-map-name]').classed('is-hovered',function(){return this.getAttribute('data-map-name')===id});}
  function choose(id,{fromBand=false,remember=true}={}){
    const item=data.find(r=>r.id===id);if(!item)return;
    if(state.view==='places'&&fromBand){AtlasPlaces.openName(item);return;}
    if(remember&&selected&&selected!==id){trail.push(selected);trail=trail.slice(-12);}
    selected=id;if(fromBand){area='all';state.query='';}else if(!matches().some(r=>r.id===id)){area='all';state.query='';}
    const wasNames=state.view==='names';state.view='names';page=Math.max(0,Math.floor(matches().findIndex(r=>r.id===id)/pageSize()));
    lastQuery=state.query;updateView();if(!wasNames)drawMap();syncBand();centerBand($(`[data-ribbon-name="${id}"]`));
  }
  function back(){const id=trail.pop();if(id)choose(id,{remember:false});else{selected=null;updateView();drawMap();}}
  function renderView(){
    document.body.dataset.browse='names';if(lastQuery!==state.query){page=0;lastQuery=state.query;}syncBand();
    $('#search').value=state.query;$('#search').placeholder='Search names and their contexts…';
    $('.map-note').textContent='Lines follow the reading sequence and your encounters. Open a name for its language, usage, and supplied context.';
    $('#atlas-map').setAttribute('aria-label','Names linked in reading order. Select a name to explore its context. The horizontal band includes the entire collection.');
    const list=matches();$('#names-area').value=area;
    $('#archive-title').textContent=selected?'An encounter':'Names & lands';$('#results-count').textContent=list.length;
    $('#map-count').textContent=data.length;$('#map-count').nextElementSibling.firstChild.textContent='names in the band';
    $('#map-count-caption').textContent='lands · peoples · languages';
    $('#selection-summary').textContent=area==='all'?'Across the supplied collection':area;$('#map-region-label').textContent='';$('#clear-filters').hidden=area==='all'&&!state.query&&!selected;
    const item=data.find(r=>r.id===selected),context=$('#name-detail');context.hidden=!item;
    $('#country-context').hidden=true;$('#record-list').replaceChildren();
    if(item){
      context.style.setProperty('--encounter-color',color(item));
      context.innerHTML=`<div class="detail-title"><p class="eyebrow">${esc(item.usage)}</p><h3>${esc(item.name)}</h3></div><div class="detail-context"><p>${esc(item.context)}</p><details class="name-provenance"><summary>Source & context</summary><p>${esc(item.region)}. ${esc(item.source)}. ${esc(item.verification)} Positions in this drawing are for browsing. ${item.sourceURL?`<a href="${esc(item.sourceURL)}" target="_blank" rel="noopener noreferrer">Read source ↗</a>`:''}</p></details>${trail.length?'<button class="name-back" id="name-back">← Previous encounter</button>':''}</div><button id="name-detail-close" class="detail-close" aria-label="Close name details">×</button>`;
      $('#name-back')?.addEventListener('click',back);
      $('#name-detail-close').addEventListener('click',()=>{const id=selected;selected=null;updateView();$(`[data-map-name="${id}"]`)?.focus();});
    }else context.replaceChildren();
    render();
    const url=new URL(location.href);url.searchParams.set('view','names');if(page)url.searchParams.set('namesPage',String(page));else url.searchParams.delete('namesPage');if(area==='all')url.searchParams.delete('namesArea');else url.searchParams.set('namesArea',area);if(selected)url.searchParams.set('name',selected);else url.searchParams.delete('name');if(state.query)url.searchParams.set('q',state.query);else url.searchParams.delete('q');try{history.replaceState(null,'',url)}catch{}
    $('#announcement').textContent=`${list.length} names. ${item?.name||'Begin anywhere'}.`;
  }
  function render(){
    if(!layer||!projection)return;
    layer.selectAll('*').remove();layer.style('display',state.view==='names'?null:'none');markersLayer.style('display',state.view==='names'?'none':null);
    if(state.view!=='names')return;AtlasLinework.clear();
    const all=matches(),mobile=width<600,perPage=pageSize(),pages=Math.max(1,Math.ceil(all.length/perPage));page=Math.max(0,Math.min(page,pages-1));
    if(selected){const index=all.findIndex(r=>r.id===selected);if(index>=0)page=Math.floor(index/perPage);}
    const records=all.slice(page*perPage,(page+1)*perPage),cols=mobile?2:width>=1050?4:3,rows=Math.ceil(records.length/cols),top=65,bottom=Math.max(top+170,height-65),step=(bottom-top)/Math.max(1,rows-1),cell=(width-40)/cols;
    const points=records.map((r,i)=>{const row=Math.floor(i/cols),col=row%2?cols-1-i%cols:i%cols;return {r,x:20+cell*(col+.5)+Math.sin(i*2.1)*cell*.06,y:top+row*step+Math.sin(i*1.8)*16};});
    const strokes=layer.append('g').attr('class','encounter-strokes').attr('aria-hidden','true');
    points.slice(0,-1).forEach((p,i)=>{const q=points[i+1],sameRow=Math.floor(i/cols)===Math.floor((i+1)/cols),dx=q.x-p.x;
      const path=sameRow?`M${p.x},${p.y+23} C${p.x+dx*.35},${p.y+72} ${q.x-dx*.4},${q.y-37} ${q.x},${q.y+23}`:`M${p.x},${p.y+23} C${p.x+(p.x>width/2?65:-65)},${p.y+65} ${q.x+(q.x>width/2?54:-54)},${q.y-32} ${q.x},${q.y+23}`;
      strokes.append('path').attr('class','encounter-line').attr('d',path).attr('stroke',color(p.r)).attr('pathLength',1);
      strokes.append('path').attr('class','encounter-echo').attr('d',path).attr('transform',`translate(${i%2?3:-3},5)`).attr('stroke',color(q.r));
    });
    points.forEach(({r,x,y})=>{
      const g=layer.append('g').attr('class',`encounter-name ${selected===r.id?'selected':''}`).attr('data-map-name',r.id).attr('style',`--name-color:${color(r)}`).attr('transform',`translate(${x},${y})`).attr('role','button').attr('tabindex',0).attr('aria-pressed',String(selected===r.id)).attr('aria-label',`${r.name}, ${r.usage}`);
      g.append('rect').attr('x',-cell*.47).attr('y',-31).attr('width',cell*.94).attr('height',82).attr('rx',16);
      const title=g.append('text').attr('class','encounter-label').attr('text-anchor','middle').attr('y',0).text(r.name);
      // Fit each authentic spelling inside its reading space without clipping.
      const limit=cell*.88;const length=title.node().getComputedTextLength();
      let wrapped=false;
      if(length>limit&&r.name.includes(' ')){
        const words=r.name.split(' ');let split=1,best=Infinity;for(let k=1;k<words.length;k++){const score=Math.abs(words.slice(0,k).join(' ').length-words.slice(k).join(' ').length);if(score<best){best=score;split=k;}}
        title.text('');title.append('tspan').attr('x',0).attr('y',-12).text(words.slice(0,split).join(' '));title.append('tspan').attr('x',0).attr('y',15).text(words.slice(split).join(' '));wrapped=true;
      }else if(length>limit)title.attr('font-size',Math.max(18,28*limit/length)).style('font-size',Math.max(18,28*limit/length)+'px');
      g.append('circle').attr('cy',wrapped?43:30).attr('r',selected===r.id?5:2.5);
      g.append('title').text(r.context);activate(g,()=>choose(r.id));
      g.on('pointerenter',()=>{$('#ribbon-caption').textContent=r.name+' · '+r.usage;$$('[data-ribbon-name]').forEach(b=>b.classList.toggle('is-hovered',b.dataset.ribbonName===r.id));}).on('pointerleave',()=>{$$('.ribbon-name.is-hovered').forEach(b=>b.classList.remove('is-hovered'));caption();});
    });
    const first=all.length?page*perPage+1:0,last=Math.min((page+1)*perPage,all.length);
    $('#names-position').textContent=all.length?`${first}–${last} of ${all.length}`:'No matching names';
    $('#names-previous').disabled=page===0;$('#names-next').disabled=page>=pages-1||!all.length;
    const visibleIds=new Set(records.map(r=>r.id));
    $$('[data-ribbon-name]').forEach(b=>b.classList.toggle('in-view',visibleIds.has(b.dataset.ribbonName)));
  }
  function advance(delta){
    const pages=Math.max(1,Math.ceil(matches().length/pageSize()));
    page=Math.max(0,Math.min(pages-1,page+delta));selected=null;
    updateView();centerBand($(`[data-ribbon-name="${matches()[page*pageSize()]?.id}"]`));
    $('#announcement').textContent=$('#names-position').textContent;
  }

  function activate(g,fn){g.on('mousedown',event=>event.stopPropagation()).on('touchstart',event=>event.stopPropagation()).on('click',event=>{event.stopPropagation();fn()}).on('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();fn()}});}
  function fit(){if(state.view!=='names')return false;svg.call(zoom.transform,d3.zoomIdentity);return true;}
  function reset(){area='all';selected=null;trail=[];page=0;lastQuery='';}
  return {init,renderView,render,fit,reset,syncBand,isWorld:()=>state.view==='names',count:data.length,matches};
})();
