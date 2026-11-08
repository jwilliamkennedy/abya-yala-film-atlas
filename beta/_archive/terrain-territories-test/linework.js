'use strict';

// The geometry interprets archive records. It does not locate people or territories.
window.AtlasLinework = (() => {
  const preferences = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = {waves:true, branches:true, borders:true, paused:true};
  try {
    const saved = JSON.parse(localStorage.getItem('atlas-linework') || '{}');
    for (const key of ['waves','branches','borders','paused']) if (typeof saved[key] === 'boolean') settings[key] = saved[key];
  } catch { /* Appearance still works when browser storage is unavailable. */ }
  if (preferences.matches) settings.paused = true;
  let canvas, ctx, layer, frame = 0, clock = 0, lastTime = 0, visible = true;
  let cw = 0, ch = 0, focus = null;
  const pointer = {x:-1000,y:-1000,tx:-1000,ty:-1000};
  const hash = value => [...String(value)].reduce((n,c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); };
  const f = n => Number(n).toFixed(2);

  function save() {
    try { localStorage.setItem('atlas-linework',JSON.stringify(settings)); } catch { /* Device-local preference only. */ }
  }

  function sync() {
    document.body.dataset.motion = settings.paused ? 'still' : 'moving';
    document.body.classList.toggle('borders-hidden',!settings.borders);
    document.body.classList.toggle('branches-hidden',!settings.branches);
    document.body.classList.toggle('waves-hidden',!settings.waves);
    for (const [key,label] of [['waves','Background flow'],['branches','Connecting lines'],['borders','Country borders']]) {
      const button=document.getElementById(`${key}-toggle`);if(button){button.setAttribute('aria-pressed',String(settings[key]));button.textContent=`${label} · ${settings[key]?'On':'Off'}`;}
    }
    const toggle = document.getElementById('motion-toggle');
    if (toggle) {
      toggle.textContent = preferences.matches ? 'Animation · Reduced motion' : !settings.waves ? 'Animation · Flow is hidden' : `Animate flow · ${settings.paused?'Off':'On'}`;
      toggle.setAttribute('aria-pressed',String(!settings.paused&&settings.waves&&!preferences.matches));
      toggle.setAttribute('aria-label',toggle.textContent);
      toggle.disabled = preferences.matches||!settings.waves;
    }
    if (canvas) canvas.hidden = !settings.waves;
    if (focus) drawFocus();
    save(); drawWaves(); schedule();
  }

  function schedule() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (settings.waves && !settings.paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (now - lastTime < 32) return;
    clock += Math.min(64,now - (lastTime || now)) * 0.000085;
    lastTime = now;
    pointer.x += (pointer.tx - pointer.x) * .055;
    pointer.y += (pointer.ty - pointer.y) * .055;
    drawWaves();
  }
  function drawWaves() {
    if (!ctx || !cw || !ch) return;
    ctx.clearRect(0,0,cw,ch);
    if (!settings.waves) return;
    const spacing = cw < 500 ? 21 : 18;
    const horizon = Math.ceil(ch / spacing) + 12;
    for (let line = -6; line < horizon; line++) {
      const offset = line * spacing;
      ctx.beginPath();
      for (let x = -15; x <= cw + 20; x += 12) {
        const nx = x / cw;
        const swell = Math.sin(nx * 5.3 + clock + line * .046) * 36
          + Math.sin(nx * 11.1 - clock * .7 + line * .072) * 10;
        const fold = Math.exp(-Math.pow((nx - .27 - .035 * Math.sin(clock))/ .19,2)) * (line - horizon*.45) * 3.3;
        let y = offset + swell + fold;
        if (pointer.x > -500) {
          const distance = Math.hypot(x - pointer.x,y - pointer.y);
          y += Math.exp(-distance * distance / 26000) * Math.sin((x - pointer.x) / 83) * 20;
        }
        if (x === -15) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.lineWidth = line % 5 === 0 ? .8 : .55;
      ctx.strokeStyle = line % 5 === 0 ? '#55cbd76b' : '#a298df3d';
      ctx.stroke();
    }
  }
  function resize() {
    if (!canvas) return;
    const b = canvas.getBoundingClientRect();
    // Hidden waves retain their previous geometry until enabled again.
    if (!b.width || !b.height) return;
    cw = b.width; ch = b.height;
    const dpr = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawWaves();
  }

  function branches(records,radius,seed,inner=15) {
    let path = '', dots = '', targets = [];
    const count = records.length;
    records.forEach((record,i) => {
      const n = hash(record.id || i) + seed;
      const angle = -Math.PI/2 + (i / Math.max(1,count)) * Math.PI * 2;
      const length = radius * (.68 + rand(n) * .3);
      const bend = (rand(n+4) - .5) * .28;
      const xy = (r,a=angle) => [Math.cos(a)*r,Math.sin(a)*r];
      const a = xy(inner), b = xy(length,angle+bend), c = xy(length*.54,angle-bend*.7);
      path += `M${f(a[0])},${f(a[1])}Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}`;
      const films = record.films || [];
      films.forEach((film,j) => {
        const at = .32 + .52 * ((j+1)/(films.length+1));
        const side = j%2 ? 1 : -1;
        const base = xy(length*at,angle+bend*at);
        const tip = [base[0]+Math.cos(angle+side*.72)*radius*.16,base[1]+Math.sin(angle+side*.72)*radius*.16];
        path += `M${f(base[0])},${f(base[1])}L${f(tip[0])},${f(tip[1])}`;
        targets.push({x:tip[0],y:tip[1],record:record.id,film:film.id,title:film.title});
      });
      dots += `<circle cx="${f(b[0])}" cy="${f(b[1])}" r="1.4"/>`;
    });
    return {path,dots,targets};
  }

  function drawFocus() {
    if (!layer || !focus) return;
    layer.replaceChildren();
    if (!settings.branches || !focus.records.length) return;
    const radius = Math.min(cw < 500 ? 85 : 145,65 + Math.sqrt(focus.records.length)*9);
    const shape = branches(focus.records,radius,hash(focus.key));
    layer.setAttribute('transform',`translate(${focus.x},${focus.y})`);
    layer.innerHTML = `<circle class="branch-orbit" r="${f(radius+8)}"/><path class="branch-path" d="${shape.path}" pathLength="1"/><g class="branch-tips">${shape.dots}</g>`;
    if(focus.records.length<=12)shape.targets.forEach(target=>{
      const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('class','film-tip');circle.setAttribute('cx',f(target.x));circle.setAttribute('cy',f(target.y));circle.setAttribute('r','6');
      circle.setAttribute('role','button');circle.setAttribute('tabindex','0');circle.setAttribute('aria-label',`Open ${target.title}`);
      const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=target.title;circle.append(title);
      const open=event=>{event.stopPropagation();window.dispatchEvent(new CustomEvent('atlas-open-film',{detail:target}));};
      circle.addEventListener('click',open);circle.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();open(event)}});layer.append(circle);
    });
    layer.classList.remove('unfold');
    // Restart once per focused place, never on each pointermove.
    requestAnimationFrame(()=>layer?.classList.add('unfold'));
  }
  function show(d,records) {
    if (!d || !layer) return;
    if (focus?.key === d.key && focus.x === d.x && focus.y === d.y) return;
    focus = {key:d.key,x:d.x,y:d.y,records}; drawFocus();
  }
  function clear() {
    focus = null;
    if (layer) layer.replaceChildren();
  }

  function glyph(record,large=false) {
    // One central record; each spoke represents one captured work.
    const count = record.films.length;
    const works = record.films.map((film,i)=>({id:film.id || `${record.id}-${i}`,films:[]}));
    const shape = branches(works,large ? 91 : 24,hash(record.id),large ? 18 : 5);
    const extent = large ? 120 : 32;
    const heart=record.entity==='Person'?`<circle class="glyph-heart" r="${large?7:3}"/>`:`<circle class="glyph-heart" cx="-${large?5:2}" r="${large?7:3}"/><circle class="glyph-heart" cx="${large?5:2}" r="${large?7:3}"/>`;
    return `<svg class="record-drawing ${large?'large-drawing':''}" viewBox="-${extent} -${extent} ${extent*2} ${extent*2}" fill="none" aria-hidden="true"><circle class="glyph-orbit" r="${large?103:28}"/><path d="${shape.path}"/><g class="glyph-tips">${shape.dots}</g>${heart}${!count?`<circle class="glyph-empty" r="${large?40:12}"/>`:''}</svg>`;
  }

  function init(svg) {
    canvas = document.getElementById('wave-field'); ctx = canvas.getContext('2d');
    layer = document.createElementNS('http://www.w3.org/2000/svg','g');
    layer.setAttribute('class','branch-focus'); layer.setAttribute('role','group');layer.setAttribute('aria-label','Films in the selected records');
    svg.node().insertBefore(layer,svg.node().querySelector('.markers-layer'));
    for (const key of ['waves','branches','borders']) document.getElementById(`${key}-toggle`).addEventListener('click',()=>{settings[key]=!settings[key];sync();resize();});
    document.getElementById('motion-toggle').addEventListener('click',()=>{settings.paused=!settings.paused;sync();});
    document.querySelector('.map-panel').addEventListener('pointermove',event=>{
      if (event.pointerType === 'touch') return;
      const b=canvas.getBoundingClientRect();pointer.tx=event.clientX-b.left;pointer.ty=event.clientY-b.top;
    },{passive:true});
    document.querySelector('.map-panel').addEventListener('pointerleave',()=>{pointer.tx=-1000;pointer.ty=-1000;},{passive:true});
    new ResizeObserver(resize).observe(document.querySelector('.map-panel'));
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(canvas);
    document.addEventListener('visibilitychange',schedule);
    preferences.addEventListener('change',()=>{if(preferences.matches) settings.paused=true;sync();});
    document.addEventListener('click',event=>{const menu=document.getElementById('appearance');if(menu?.open&&!menu.contains(event.target))menu.open=false;});
    document.getElementById('appearance').addEventListener('keydown',event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary').focus();}});
    sync();resize();
  }

  return {init,resize,show,clear,glyph};
})();
