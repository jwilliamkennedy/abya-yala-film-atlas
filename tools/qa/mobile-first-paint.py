"""Phone first-paint audit. Browser WebKit approximates Safari, not a physical iPhone."""
import asyncio, json, os
from playwright.async_api import async_playwright

BASE='http://127.0.0.1:8894/'
JS=r"""() => {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};};
 const shown=e=>!!e&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none'&&rect(e).w>0;
 const nav=$$('header nav.primary>a,header nav.primary>details>summary').filter(shown).map(e=>({text:e.textContent.trim(),r:rect(e)}));
 const collisions=[];
 for(let i=0;i<nav.length;i++)for(let j=i+1;j<nav.length;j++){
  const a=nav[i].r,b=nav[j].r,inter=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  if(inter>30)collisions.push([nav[i].text,nav[j].text,Math.round(inter)]);
 }
 const labels=$$('#atlas .land-word-label').filter(shown).map(e=>({text:e.textContent.trim(),r:rect(e),stroke:getComputedStyle(e).stroke,strokeWidth:getComputedStyle(e).strokeWidth,font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize})).filter(e=>e.text);
 const doubles=[];
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const a=labels[i],b=labels[j];if(a.text!==b.text)continue;
  if(Math.abs(a.r.x-b.r.x)<20&&Math.abs(a.r.y-b.r.y)<20)doubles.push(a.text);
 }
 const frame=$('header'),map=$('.map-panel'),bar=$('.map-toolbar'),sheet=$('#index');
 const basemap=$('#atlas-basemap'),start=$('#atlas-startup-status');
 return {
  clock:Math.round(performance.now()),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
  headingRect:rect(frame),navRects:nav,navCollisions:collisions,
  mainRect:rect($('main')),mapRect:rect(map),barRect:rect(bar),barVisible:shown(bar),
  sheetRect:rect(sheet),sheetState:document.documentElement.dataset.sheet||null,
  uiReady:document.documentElement.dataset.atlasUi||null,theme:document.documentElement.dataset.readingTheme||null,
  weave:document.documentElement.dataset.weaveStage||null,
  headerLang:$('header #ui-lang').length,headerTheme:$('header .ui-theme-toggle').length,
  currentNav:$$('header nav.primary [aria-current="page"]').map(x=>x.textContent.trim()),
  randomHome:$('#random-entry')?.closest('.ui-index-more')?'more':'elsewhere',
  zoomText:$('#zoom-reset')?.textContent.trim(),
  mapSvg:$$('svg#atlas').length,basemapCount:$$('#atlas-basemap').length,
  basemapVisible:shown(basemap),synced:basemap?.dataset.cameraSynced||null,
  mapActions:$$('.map-actions>details').map(e=>e.id),
  preparing:document.body?.innerText.includes('Preparing the atlas')||!!(start&&shown(start)),
  legacyIntroVisible:shown($('#weave-empty-hint')),
  prematureConstellateToolbar:!!(document.body?.classList.contains('is-constellating')&&!document.documentElement.dataset.weaveStage&&shown($('#constellate-mode'))),
  featuredExpanded:shown($('#featured-weave'))&&!$('#featured-weave')?.classList.contains('is-collapsed'),
  labels:labels.length,duplicateLabelPairs:[...new Set(doubles)].slice(0,12),sampleLabels:labels.slice(0,4)
 };
}"""

async def case(browser,engine,name,route,width):
 context=await browser.new_context(viewport={'width':width,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,locale='en-US')
 p=await context.new_page()
 errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)[:240]))
 async def delay_world(req):
  await asyncio.sleep(0.9)
  await req.continue_()
 await p.route('**/assets/world-50m.json', delay_world)
 url=BASE+route+('?constellate=1' if name=='constellate' else '')
 samples=[]
 try:
  await p.goto(url,wait_until='domcontentloaded',timeout=90000)
  for phase,ms in [('dom',0),('early',300),('middle',900),('settled',2100)]:
   if ms:await p.wait_for_timeout(ms)
   sample=await p.evaluate(JS)
   sample['phase']=phase
   samples.append(sample)
   if phase in ('dom','settled'):
    try:await p.screenshot(path=f'shots/mobile-{engine}-{width}-{route.replace("/","-")}-{name}-{phase}.png',animations='disabled',timeout=7000)
    except Exception as e:print('NONFATAL_MOBILE_SCREENSHOT',engine,width,name,str(e)[:110])
  # Interaction: menu, sheet, and touch target sizes
  if name=='map' and await p.locator('#layers').count():
   await p.locator('#layers>summary').click(timeout=5000)
   samples.append({'phase':'layers-open','open':await p.locator('#layers').evaluate('(x)=>x.open'),'inViewport':await p.locator('#layers>div').evaluate('(e)=>{const b=e.getBoundingClientRect();return b.left>=-1 && b.right<=innerWidth+1}')})
  out={'name':name,'browser':engine,'width':width,'route':route,'samples':samples,'errors':errors[:12]}
 except Exception as e:out={'name':name,'browser':engine,'width':width,'route':route,'samples':samples,'errors':errors[:12], 'runnerError':str(e)[:450]}
 await context.close()
 print('MOBILE_QA_CASE',json.dumps({k:v for k,v in out.items() if k!='samples'},ensure_ascii=False),flush=True)
 for s in samples:
  print('MOBILE_QA_SAMPLE',engine,width,route,name,s['phase'],json.dumps({k:v for k,v in s.items() if k not in ('navRects','sampleLabels')},ensure_ascii=False),flush=True)
 return out

async def main():
 os.makedirs('shots',exist_ok=True)
 report=[]
 async with async_playwright() as pw:
  for engine in ('webkit','chromium'):
   browser=await getattr(pw,engine).launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'] if engine=='chromium' else [])
   dims=[390,430] if engine=='webkit' else [390]
   for width in dims:
    for path in ('index.html','beta/index.html'):
     for view in ('map','constellate'):
      report.append(await case(browser,engine,view,path,width))
   await browser.close()
 failures=[]
 for item in report:
  if item.get('runnerError'):failures.append((item['browser'],item['route'],item['name'],'runtime error',item['runnerError']))
  seq=[v for v in item['samples'] if v.get('phase') in ('dom','early','middle','settled')]
  if len(seq)<4:failures.append((item['browser'],item['route'],item['name'],'missing phases'));continue
  first,last=seq[0],seq[-1]
  if first['sheetState']!='peek' or last['sheetState']!='peek':failures.append((item['browser'],item['route'],item['name'],'sheet state',first['sheetState'],last['sheetState']))
  h0,h1=first['mapRect']['h'],last['mapRect']['h']
  if abs(h1-h0)>5:failures.append((item['browser'],item['route'],item['name'],'map height shift',h0,h1))
  for v in seq:
   if v['preparing']:failures.append((item['browser'],item['route'],item['name'],'obsolete loading text'))
   if item['name']=='map' and not v['barVisible']:failures.append((item['browser'],item['route'],item['name'],'final map menu not visible'))
   if item['name']=='constellate' and v['phase']=='dom' and v['barVisible']:failures.append((item['browser'],item['route'],item['name'],'constellate shows map menu while loading'))
   if v['legacyIntroVisible']:failures.append((item['browser'],item['route'],item['name'],'old Constellate intro visible'))
   if v['prematureConstellateToolbar']:failures.append((item['browser'],item['route'],item['name'],'old toolbar visible before stage ready'))
   if v['featuredExpanded']:failures.append((item['browser'],item['route'],item['name'],'featured card expands before initialization'))
   if v['navCollisions']:failures.append((item['browser'],item['route'],item['name'],'nav collision',v['navCollisions']))
   if v['duplicateLabelPairs']:failures.append((item['browser'],item['route'],item['name'],'duplicate labels',v['duplicateLabelPairs']))
   if v['scrollWidth']>v['width']+2:failures.append((item['browser'],item['route'],item['name'],'horizontal overflow',v['scrollWidth']))
   if v['randomHome']!='more':failures.append((item['browser'],item['route'],item['name'],'Surprise me displaced'))
   if v['zoomText']!='Overview':failures.append((item['browser'],item['route'],item['name'],'Overview text changes'))
   expected='Constellate' if item['name']=='constellate' else 'Map'
   if v['currentNav']!=[expected]:failures.append((item['browser'],item['route'],item['name'],'active navigation',v['currentNav']))
 print('MOBILE_QA_FAILURES',json.dumps(failures,ensure_ascii=False),flush=True)
 with open('shots/mobile-first-paint.json','w') as fp:json.dump(report,fp,ensure_ascii=False,indent=2)
 if failures:raise AssertionError('Mobile geometry regression: '+str(failures[:8]))
 print('MOBILE_QA_DONE',len(report),'cases',flush=True)
asyncio.run(main())
