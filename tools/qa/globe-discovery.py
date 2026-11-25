"""Globe: actual Natural Earth land, spherical rotation, aperture, index join and stable camera."""
import asyncio
import os
from playwright.async_api import async_playwright
BASE=os.environ.get("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
CAM="window.AtlasGlobe.camera"
SNAP="JSON.stringify(window.AtlasCollections.current())"

async def check(browser,name,viewport):
    context=await browser.new_context(viewport=viewport,reduced_motion="reduce")
    page=await context.new_page()
    errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
    await page.wait_for_function("window.AtlasGlobe?.active && window.AtlasGlobe.focus.settled",timeout=60000)
    assert await page.evaluate("window.AtlasGlobe.pointCount>0 && window.AtlasGlobe.geometryCount>0 && window.AtlasGlobe.landArea>2.5 && window.AtlasGlobe.landArea<4.8"),name
    assert await page.evaluate("""() => {const c=document.querySelector('#globe-surface'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]===105&&d[i+1]===135&&d[i+2]===123)n++;return n>100;}"""),(name,"no visible land pixels")
    before=await page.evaluate(CAM)
    assert before["projection"]=="globe",(name,before)
    snapshot=await page.evaluate(SNAP)
    box=await page.locator("#globe-surface").bounding_box()
    x=box["x"]+box["width"]*.50
    y=box["y"]+box["height"]*.48
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+min(65,box["width"]*.15),y+8,steps=10)
    await page.mouse.up()
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    after=await page.evaluate(CAM)
    assert abs(after["center"][0]-before["center"][0])>.1,(name,"drag did not rotate")
    aperture=await page.locator("#globe-aperture").bounding_box()
    await page.locator("#globe-find").select_option(index=1)
    await page.wait_for_function("window.AtlasGlobe.focus.settled && window.AtlasGlobe.focus.ids.length>0")
    land=await page.locator("#globe-find").input_value()
    assert land in await page.evaluate("window.AtlasGlobe.focus.ids"),(name,"index join failed",land)
    assert await page.locator("#globe-encounter .globe-film").count()>0,(name,"no automatic film encounter")
    selected=await page.evaluate(CAM)
    await page.locator("#weave-map-theme").select_option(index=1)
    await page.wait_for_timeout(450)
    assert await page.evaluate(CAM)==selected,(name,"theme moved camera")
    assert await page.locator("#globe-aperture").bounding_box()==aperture,(name,"aperture shifted")
    assert await page.evaluate(SNAP)==snapshot,(name,"discovery mutated collection")
    await page.locator("#globe-close").click()
    await page.wait_for_function("!window.AtlasGlobe.active && window.AtlasConstellate.enabled")
    assert await page.locator("#atlas-rotational-globe").count()==0
    assert not errors,(name,errors)
    print(name,"globe land, rotation, aperture and thematic index passed",flush=True)
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
