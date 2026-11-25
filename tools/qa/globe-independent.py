"""Independent terrain/discovery checks: a gesture failure must not mask terrain or cinema."""
import asyncio, os, json, sys
from playwright.async_api import async_playwright
BASE=os.getenv("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
MODE=sys.argv[1] if len(sys.argv)>1 else "terrain"
async def shot(page,path):
    try: await page.screenshot(path=path,timeout=45000)
    except Exception as e: print("SCREENSHOT_FAILED",path,str(e)[:240],flush=True)

async def run(browser,name,viewport):
    context=await browser.new_context(viewport=viewport, reduced_motion="reduce")
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
        if MODE=="terrain":
            await page.evaluate("window.AtlasGlobe.goTo([-90.875,14.501],10)")
            await page.wait_for_function("window.AtlasGlobe.tileState?.mesh==='dem'",timeout=20000)
            await page.wait_for_function("window.AtlasGlobe.tileState?.elevation>1500",timeout=60000)
            assert any("tiles.maps.eox.at/" in u for u in tiles),("no successful satellite response",tiles)
            assert any("tiles.mapterhorn.com/" in u for u in tiles),("no successful DEM response",tiles)
            await shot(page,f"shots/globe-independent/{name}-overhead.png")
            await page.locator("#globe-landscape").click()
            await page.wait_for_function("window.AtlasGlobe.tileState.pitch>35 && window.AtlasGlobe.focus.settled")
            await shot(page,f"shots/globe-independent/{name}-tilted.png")
        else:
            initial=await page.evaluate("JSON.stringify(window.AtlasCollections.current())")
            await page.locator("#globe-lands").click()
            assert not await page.evaluate("window.AtlasGlobe.territoryLayer.visible")
            await page.locator("#globe-lands").click()
            assert await page.evaluate("window.AtlasGlobe.territoryLayer.visible")
            land=await page.evaluate("window.AtlasGlobe.anchors.find(a=>window.AtlasConstellate.globeLandFilmCount(a.id)>1).id")
            await page.locator("#globe-find").select_option(value=land)
            await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.focus.ids.includes(id)",arg=land)
            await page.locator("#globe-encounter .globe-film-title").wait_for()
            first=await page.locator("#globe-encounter .globe-film-title").inner_text()
            await page.locator("#globe-encounter .globe-cycle").last.click()
            assert await page.locator("#globe-encounter .globe-film-title").inner_text()!=first or await page.evaluate("window.AtlasGlobe.discovery.filmOffset===1")
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('at')")
            assert await page.evaluate("window.AtlasGlobe.discovery.recent.length>0")
            await shot(page,f"shots/globe-independent/{name}-encounter.png")
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
