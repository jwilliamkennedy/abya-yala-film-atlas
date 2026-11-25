"""Opt-in globe: rotate, discover, filter, and return without changing a draft."""
import asyncio
import os
from playwright.async_api import async_playwright

BASE=os.environ.get("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
CAM="window.AtlasGlobe.camera"
SNAP="JSON.stringify(window.AtlasCollections.current())"

async def check(browser, name, viewport):
    context=await browser.new_context(viewport=viewport,reduced_motion="reduce")
    page=await context.new_page()
    errors=[]
    page.on("pageerror",lambda err: errors.append(str(err)))
    await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
    await page.wait_for_function("window.AtlasGlobe?.active",timeout=60000)
    assert await page.evaluate("window.AtlasGlobe.pointCount>0"),name
    before=await page.evaluate(CAM)
    assert before["projection"]=="globe",(name,before)
    snapshot=await page.evaluate(SNAP)
    storage=await page.evaluate("localStorage.getItem('atlas-collections-v1')")
    # Real pointer drag across the visible globe.
    box=await page.locator("#globe-surface").bounding_box()
    x=box["x"]+box["width"]*.50
    y=box["y"]+box["height"]*.48
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+min(65,box["width"]*.15),y+8,steps=10)
    await page.mouse.up()
    await page.wait_for_timeout(650)
    after=await page.evaluate(CAM)
    assert abs(after["center"][0]-before["center"][0])>.1,(name,"drag did not rotate",before,after)
    await page.locator("#globe-find").select_option(index=1)
    await page.locator("#weave-land").wait_for(state="visible",timeout=12000)
    await page.wait_for_timeout(650)
    selected=await page.evaluate(CAM)
    await page.locator("#weave-map-theme").select_option(index=1)
    await page.wait_for_timeout(400)
    filtered=await page.evaluate(CAM)
    assert abs(filtered["zoom"]-selected["zoom"])<.01,(name,"theme changed zoom")
    assert max(abs(a-b) for a,b in zip(filtered["center"],selected["center"]))<.001,(name,"theme changed center")
    assert await page.evaluate(SNAP)==snapshot,(name,"discovery mutated constellation")
    assert await page.evaluate("localStorage.getItem('atlas-collections-v1')")==storage,(name,"discovery persisted draft")
    await page.locator("#globe-close").click()
    await page.wait_for_function("!window.AtlasGlobe.active && window.AtlasConstellate.enabled")
    assert await page.locator("#atlas-rotational-globe").count()==0
    assert not errors,(name,errors)
    print(name,"globe rotation, theme and return passed",flush=True)
    await context.close()

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        try:
            for name,viewport in [("desktop",{"width":1440,"height":900}),("phone",{"width":390,"height":844})]:
                await check(browser,name,viewport)
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(main())
