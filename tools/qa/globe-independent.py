"""Independent terrain/discovery checks: a gesture failure must not mask terrain or cinema."""
import asyncio, os, json, sys
from playwright.async_api import async_playwright
BASE=os.getenv("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
MODE=sys.argv[1] if len(sys.argv)>1 else "terrain"
async def shot(page,path):
    try: await page.screenshot(path=path,timeout=45000)
    except Exception as e: print("SCREENSHOT_FAILED",path,str(e)[:240],flush=True)

async def run(browser,name,viewport):
    context=await browser.new_context(viewport=viewport, reduced_motion="reduce",has_touch=(MODE=="input" and name=="phone"))
    page=await context.new_page()
    errors=[]; tiles=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    def response(r):
        if r.ok and r.headers.get("content-type","").startswith("image/") and ("tiles.mapterhorn.com/" in r.url or "tiles.maps.eox.at/" in r.url or "gibs.earthdata.nasa.gov/" in r.url):
            tiles.append(r.url)
    page.on("response",response)
    os.makedirs("shots/globe-independent",exist_ok=True)
    try:
        await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function("window.AtlasGlobe?.camera?.renderer==='maplibre-globe' && window.AtlasGlobe.focus.settled",timeout=60000)
        layer=await page.evaluate("window.AtlasGlobe.territoryLayer")
        assert layer["visible"] and layer["features"]>0 and layer["fill"] is not None,(name,"ambient territory layer absent",layer)
        print(name,"ambient territory layer",json.dumps(layer),flush=True)
        if MODE=="input":
            # Keep ordinary physical wheel, synthetic DOM Ctrl-wheel and
            # CDP two-touch gestures distinct in the report.
            surface=page.locator("#globe-live-map canvas")
            box=await surface.bounding_box()
            x=box["x"]+box["width"]*.5; y=box["y"]+box["height"]*.48
            assert await page.evaluate("([x,y])=>!!document.elementFromPoint(x,y)?.closest('#globe-live-map')",[x,y])
            before=await page.evaluate("window.AtlasGlobe.camera.zoom")
            await page.mouse.move(x,y)
            await page.mouse.wheel(0,-160)
            await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom>z*1.05",arg=before,timeout=15000)
            await page.wait_for_function("window.AtlasGlobe.focus.settled")
            print(name,"native wheel delivered",await page.evaluate("window.AtlasGlobe.tileState.input"),flush=True)
            before=await page.evaluate("window.AtlasGlobe.camera.zoom")
            await surface.dispatch_event("wheel",{"deltaY":-80,"deltaX":0,"ctrlKey":True,"bubbles":True,"cancelable":True})
            await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom>z*1.1",arg=before,timeout=15000)
            await page.wait_for_function("window.AtlasGlobe.focus.settled")
            print(name,"synthetic Ctrl-wheel delivered",await page.evaluate("window.AtlasGlobe.tileState.input"),flush=True)
            if name=="phone":
                before=await page.evaluate("window.AtlasGlobe.camera.zoom")
                cdp=await context.new_cdp_session(page)
                def fingers(d):
                    return [{"x":x-d,"y":y,"id":1},{"x":x+d,"y":y,"id":2}]
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":fingers(25)})
                for d in range(30,76,5):
                    await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":fingers(d)})
                    await page.wait_for_timeout(35)
                await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
                await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom>z*1.05",arg=before,timeout=15000)
                print(name,"two-touch gesture delivered",await page.evaluate("window.AtlasGlobe.tileState.input"),flush=True)
            await shot(page,f"shots/globe-independent/{name}-input.png")
        elif MODE=="terrain":
            await page.evaluate("window.AtlasGlobe.goTo([-90.875,14.501],10)")
            await page.wait_for_function("window.AtlasGlobe.tileState?.mesh==='dem'",timeout=20000)
            await page.wait_for_function("window.AtlasGlobe.tileState?.elevation>1500",timeout=60000)
            # Elevation can arrive first; explicitly await actual satellite tile success.
            await page.wait_for_function("window.AtlasGlobe.tileState?.received.satellite>0",timeout=60000)
            assert any("tiles.maps.eox.at/" in u for u in tiles),("no successful satellite response",tiles)
            assert any("tiles.mapterhorn.com/" in u for u in tiles),("no successful DEM response",tiles)
            await shot(page,f"shots/globe-independent/{name}-overhead.png")
            await page.locator("#globe-more-toggle").click()
            await page.locator("#globe-landscape").click()
            await page.wait_for_function("window.AtlasGlobe.tileState.pitch>35 && window.AtlasGlobe.focus.settled")
            await shot(page,f"shots/globe-independent/{name}-tilted.png")
        else:
            await page.wait_for_function("window.AtlasGlobe.discovery.publication==='ready'",timeout=60000)
            await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
            initial=await page.evaluate("JSON.stringify(window.AtlasCollections.current())")
            assert await page.locator(".globe-primary button").count()==4
            assert await page.locator(".globe-menu-panel:visible").count()==0
            cam=await page.evaluate("window.AtlasGlobe.camera")
            await page.locator("#globe-theme-toggle").click()
            assert await page.locator("#weave-map-theme").is_visible()
            assert await page.locator(".globe-menu-panel:visible").count()==1
            await page.locator("#globe-more-toggle").click()
            assert await page.locator(".globe-menu-panel:visible").count()==1
            assert not await page.locator("#weave-map-theme").is_visible()
            await page.keyboard.press("Escape")
            assert await page.locator(".globe-menu-panel:visible").count()==0
            after=await page.evaluate("window.AtlasGlobe.camera")
            print(name,'menu camera',cam,after,flush=True)
            assert after is not None,(name,'Escape exited the globe instead of closing its menu')
            assert max(abs((after['center'][0]-cam['center'][0]+180)%360-180),abs(after['center'][1]-cam['center'][1]))<.01 and abs(after['zoom']/cam['zoom']-1)<.002,(name,cam,after)
            await page.locator("#globe-more-toggle").click()
            await page.locator("#globe-lands").click()
            assert not await page.evaluate("window.AtlasGlobe.territoryLayer.visible")
            await page.locator("#globe-lands").click()
            assert await page.evaluate("window.AtlasGlobe.territoryLayer.visible")
            await page.locator(".globe-settings summary").click()
            await page.locator("#globe-opacity").select_option("1.6")
            assert await page.evaluate("window.AtlasGlobe.territoryLayer.strength===1.6")
            await page.locator("#globe-opacity").select_option("1")
            await page.locator(".globe-settings summary").click()
            await page.locator("#globe-find-toggle").click()
            land=await page.evaluate("window.AtlasGlobe.anchors.find(a=>window.AtlasConstellate.globeLandFilmCount(a.id)>1).id")
            await page.locator("#globe-find").select_option(value=land)
            assert await page.locator(".globe-menu-panel:visible").count()==0
            await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.focus.ids.includes(id)",arg=land)
            await page.locator("#globe-encounter .globe-film-title").wait_for()
            first=await page.locator("#globe-encounter .globe-film-title").inner_text()
            await page.locator("#globe-encounter .globe-cycle").last.click()
            assert await page.locator("#globe-encounter .globe-film-title").inner_text()!=first or await page.evaluate("window.AtlasGlobe.discovery.filmOffset===1")
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('at')")
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).hash === ''")
            assert await page.evaluate("""() => {
                const b=document.querySelector('#globe-emergent'),f=window.AtlasGlobe.discovery.featured;
                if(!f||b.hidden)return true;
                const a=document.querySelector('#globe-aperture').getBoundingClientRect(),r=b.getBoundingClientRect();
                return !!b.querySelector('img') && (r.right<a.left||r.left>a.right||r.bottom<a.top||r.top>a.bottom);
            }"""),(name,"poster obstructs aperture or lacks sourced image")
            # Audit actual decoded dimensions, fit and contrast; allow honest missing/broken images.
            await page.wait_for_timeout(1000)
            art=await page.evaluate("""() => [...document.querySelectorAll('#atlas-rotational-globe .globe-artwork[data-art-state=ready] img')].filter(i=>i.getClientRects().length&&i.getBoundingClientRect().width>0).map(i=>{
                const b=i.getBoundingClientRect(),s=getComputedStyle(i);
                const f=i.parentElement.getBoundingClientRect();
                return {natural:[i.naturalWidth,i.naturalHeight],display:[b.width,b.height],frame:[f.width,f.height],fit:s.objectFit,filter:s.filter,opacity:s.opacity,film:i.parentElement.dataset.film};
            })""")
            assert art,(name,"no decoded artwork audited")
            for a in art:
                n=a["natural"]; d=a["display"]
                assert abs(d[0]/d[1]-n[0]/n[1])<0.04*max(1,n[0]/n[1]),(name,"stretched artwork",a)
                assert d[0]<=n[0]+1 and d[1]<=n[1]+1,(name,"upscaled artwork",a)
                assert all(abs(v-u)<1.1 for v,u in zip(a["frame"],d)),(name,"oversized exterior artwork frame",a)
            # Audit outer floating card width against image plus actual padding/border.
            assert await page.evaluate("""() => {
                const p=document.querySelector('#globe-emergent');if(p.hidden)return true;
                const a=p.querySelector('.globe-artwork'),s=getComputedStyle(p);
                return Math.abs(p.getBoundingClientRect().width-a.getBoundingClientRect().width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth))<1.1;
            }"""),(name,"floating exterior width does not fit image")
            for a in art:
                assert a["fit"]=="contain" and a["filter"]=="none" and a["opacity"]=="1",(name,"washed artwork",a)
            print(name,"artwork dimensions",json.dumps(art),flush=True)
            await page.locator(".globe-credit-details summary").click()
            await page.wait_for_function("document.querySelector('.globe-credit-data dl') || document.querySelector('.globe-credit-data p')?.textContent.includes('No exact row')",timeout=30000)
            assert await page.locator(".globe-credit-data dl").count()>0,(name,"featured credit missing from public CSV")
            assert await page.locator(".globe-credit-data").get_by_text("Film id",exact=True).count()>0
            await page.locator(".globe-credit-details summary").click()
            print(name,"emergent artwork",await page.evaluate("window.AtlasGlobe.discovery.posterVisible"),flush=True)
            assert await page.evaluate("window.AtlasGlobe.discovery.recent.length>0")
            await shot(page,f"shots/globe-independent/{name}-encounter.png")
            bridge=page.locator("#globe-encounter [data-target-film]").first
            if await bridge.count():
                previous=await page.evaluate("window.AtlasGlobe.discovery.featured")
                target=await bridge.get_attribute("data-target-film")
                await bridge.click()
                await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.film===id",arg=target,timeout=30000)
                await page.locator("#globe-journey-back").click()
                await page.wait_for_function("(v)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.film===v.film && window.AtlasGlobe.discovery.featured?.land===v.land",arg=previous,timeout=30000)
                print(name,"thematic journey and return passed",flush=True)
            await page.locator("#globe-more-toggle").click()
            await page.locator('.globe-catalog-filters summary').click()
            form=await page.locator('#globe-filter-form option').nth(1).get_attribute('value')
            await page.locator('#globe-filter-form').select_option(form)
            assert await page.evaluate('(f)=>window.AtlasGlobe.discovery.filters.form===f',form)
            assert await page.evaluate('''(f)=>{const G=window.AtlasGlobe,C=window.AtlasConstellate,I=C.globeCreditIndex(),byId=new Map(I.films.map(x=>[x.id,x]));return G.anchors.every(a=>G.matchingCreditIds(a.id).every(id=>C.globeMetadata(byId.get(id))?.f===f));}''',form),(name,'form filter leaked into geographic selection')
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('form')")
            await page.locator('#globe-clear-filters').click()
            assert await page.evaluate("Object.values(window.AtlasGlobe.discovery.filters).every(v=>!v) && !new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('form')")
            await page.locator('.globe-catalog-filters summary').click()
            await page.locator("#globe-period").select_option("2020")
            assert await page.evaluate("window.AtlasGlobe.discovery.period==='2020'")
            await page.locator("#globe-period").select_option("")
            await page.locator("#globe-surprise").click()
            await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.recent[0]?.id!==id",arg=land)
            assert await page.evaluate("JSON.stringify(window.AtlasCollections.current())")==initial
        assert not errors,(name,errors)
        print(name,MODE,"passed",flush=True)
    finally:
        data=await page.evaluate("window.AtlasGlobe?.tileState||null")
        print(name,MODE,"diagnostics",json.dumps({"state":data,"images":tiles[:30],"errors":errors},ensure_ascii=False),flush=True)
        try: await page.screenshot(path=f"shots/globe-independent/{name}-last.png",timeout=10000)
        except Exception: pass
        await context.close()
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        try:
            for name,viewport in [("desktop",{"width":1440,"height":900}),("phone",{"width":390,"height":844})]:
                await run(browser,name,viewport)
        finally:
            await browser.close()
if __name__=="__main__":
    asyncio.run(main())
