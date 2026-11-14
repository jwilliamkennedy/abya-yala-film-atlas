"""Friction audit (13 Nov 2026). Walks the main journey (land, filmmaker, films, search, Layers; Constellate start,
Read, Build, a selected card, Add films, Options, Share, Draw a line, Theme web, Play) on desktop and phone, and lists
controls that are covered by another element, cut off at the screen edge, too small to tap on a phone (<30px), or
clipped, plus script errors. Popovers covering what is beneath them are expected; everything else is a seam.
Usage: CHROME_PATH=... python3 tools/qa/friction-audit.py [base-url]
"""
import asyncio, json, sys, os
from playwright.async_api import async_playwright
PROBE="""(phone)=>{const out={covered:[],offscreen:[],small:[],clipped:[]};
 const vis=e=>{if(e.closest('details:not([open])>:not(summary)'))return false;const c=getComputedStyle(e);if(c.display==='none'||c.visibility==='hidden'||+c.opacity<0.05)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1};
 const lab=e=>((e.getAttribute('aria-label')||e.textContent||e.title||e.id||e.tagName).replace(/\\s+/g,' ').trim().slice(0,30))+(e.id?'#'+e.id:'');
 const els=[...document.querySelectorAll('button,a[href],summary,select,input:not([type=hidden]),[role=button]')].filter(vis).filter(e=>!e.closest('#atlas,#constellate-graph,.sr-only,[aria-hidden=true]'));
 for(const e of els){const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;
  if(r.left<-1||r.right>innerWidth+1)out.offscreen.push(lab(e));
  const cx=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),cy=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2));const t=document.elementFromPoint(cx,cy);
  if(t&&t!==e&&!e.contains(t)&&!t.contains(e)&&!(t.closest('label')&&t.closest('label').contains(e)))out.covered.push(lab(e)+' <under> '+((t.id?'#'+t.id:'')+'.'+String(t.className.baseVal??t.className).split(' ')[0]).slice(0,40));
  if(phone&&(r.width<30||r.height<30)&&e.tagName!=='INPUT'&&e.tagName!=='A')out.small.push(lab(e)+' '+Math.round(r.width)+'x'+Math.round(r.height));
  if(e.tagName!=='SELECT'&&e.tagName!=='INPUT'&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=='visible')out.clipped.push(lab(e));
 }
 for(const k in out)out[k]=[...new Set(out[k])].slice(0,12);return out}"""
B=sys.argv[1] if len(sys.argv)>1 else "http://localhost:8765/beta/"
ORIGIN=B.split("/")[0]+"//"+B.split("/")[2]
async def start(p,w=1440,h=900,m=False):
    exe=os.environ.get("CHROME_PATH")
    b=await p.chromium.launch(args=["--no-sandbox"],**({"executable_path":exe} if exe else {}))
    ctx=await b.new_context(viewport={"width":w,"height":h},is_mobile=m,has_touch=m)
    pg=await ctx.new_page();pg.logs=[]
    pg.on("pageerror",lambda e:pg.logs.append(str(e)[:200]))
    await pg.route(lambda u: not u.startswith(ORIGIN), lambda r: r.abort())
    return b,pg
async def state(pg,name,js=None,wait=1800,phone=False):
    if js:
        try: await pg.evaluate(js)
        except Exception as e: print("  !!",name,"setup failed:",str(e)[:120]); return
        await pg.wait_for_timeout(wait)
    d=await pg.evaluate(PROBE,phone)
    bad={k:v for k,v in d.items() if v}
    print(f"== {name}: "+(json.dumps(bad,ensure_ascii=False) if bad else "clean"))
async def run(p,w,h,m):
    tag="PHONE" if m else "DESK"
    b, pg = await start(p,w,h,m)
    await pg.goto(B, wait_until="load"); await pg.wait_for_timeout(4000)
    print("#####",tag)
    await state(pg,tag+" map home",phone=m)
    await state(pg,tag+" land open","document.querySelector('#atlas .land-word[data-ui-tier]').dispatchEvent(new MouseEvent('click',{bubbles:true}))",phone=m)
    await state(pg,tag+" filmmaker open","document.querySelector('#index .entry .entry-button').click()",phone=m)
    await state(pg,tag+" films view","document.querySelector('#index .view-switch [data-view=films]')?.click()",phone=m)
    await state(pg,tag+" search","(()=>{const i=document.querySelector('#search');i.value='Obomsawin';i.dispatchEvent(new Event('input',{bubbles:true}))})()",phone=m)
    await state(pg,tag+" layers","document.querySelector('#layers>summary')?.click()",phone=m)
    await pg.goto(B+"?constellate=1", wait_until="load"); await pg.wait_for_function("window.AtlasConstellate?.enabled",timeout=60000); await pg.wait_for_timeout(2500)
    await state(pg,tag+" C start",phone=m)
    await pg.goto(B+"?c=constellations-of-indigenous-cinema", wait_until="load"); await pg.wait_for_function("window.AtlasPublished?.current()",timeout=60000); await pg.wait_for_timeout(2500)
    await state(pg,tag+" C read",phone=m)
    await state(pg,tag+" C build","document.querySelector('#constellate-edit').click()",phone=m)
    await state(pg,tag+" C card selected","window.AtlasConstellate.choose(window.AtlasCollections.current().items[2].id)",phone=m)
    await state(pg,tag+" C add films","document.querySelector('#weave-browse-films').click()",phone=m)
    await state(pg,tag+" C options","document.querySelector('#constellate-mode .weave-more').open=true",phone=m)
    await state(pg,tag+" C share","document.querySelector('#constellate-mode .weave-more').open=false;document.querySelector('#constellate-share').click()",phone=m)
    await state(pg,tag+" C draw line","document.querySelector('#weave-share-panel .cm-pop-close')?.click();document.querySelector('#weave-trace').click()",phone=m)
    await state(pg,tag+" C theme web","window.AtlasConstellate.stopTrace();document.querySelector('#weave-theme-web-toggle').click()",2500,phone=m)
    await state(pg,tag+" C play","document.querySelector('#tw-close')?.click();document.querySelector('#weave-play').click()",3000,phone=m)
    print("  errors:",pg.logs[:4])
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,1440,900,False); await run(p,390,844,True)
asyncio.run(main())
