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
    imagery=[]
    def tile_response(response):
        url=response.url
        if response.ok and ('gibs.earthdata.nasa.gov/wmts/' in url or 'tiles.maps.eox.at/wmts/' in url or 'tiles.mapterhorn.com/' in url) and response.headers.get('content-type','').startswith('image/'):
            imagery.append(url)
    page.on("response",tile_response)
    page.on("pageerror",lambda e: errors.append(str(e)))
    await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
    await page.wait_for_function("window.AtlasGlobe?.active && window.AtlasGlobe.focus.settled",timeout=60000)
    assert await page.evaluate("window.AtlasGlobe.pointCount>0 && window.AtlasGlobe.geometryCount>0 && window.AtlasGlobe.landArea>2.5 && window.AtlasGlobe.landArea<4.8"),name
    # Test the production index rather than a mocked grouping or screen location.
    join = await page.evaluate("""() => {
      const C=window.AtlasConstellate,A=window.Atlas,G=window.AtlasGlobe,I=C.globeCreditIndex();
      const credits=new Set(A.allRecords().flatMap(r=>r.films.map(f=>'film:'+r.id+':'+f.id)));
      const actual=new Set(I.films.map(f=>f.id));
      const missing=[...credits].filter(id=>!actual.has(id));
      const extra=[...actual].filter(id=>!credits.has(id));
      const badJoins=[];
      for(const [land,entry] of I.byLand)for(const f of entry.films){
        if(!A.recordLandReferences(f.record).some(r=>r.id===land&&r.mapped))badJoins.push([land,f.id]);
        if(!credits.has(f.id))badJoins.push(['missing credit',f.id]);
      }
      const expected=new Set(I.byLand.keys()),anchors=G.anchors;
      const invalid=anchors.filter(a=>!A.landById(a.id)?.groups.some(g=>g.features.some(f=>String(f.id)===a.sourceId&&d3.geoContains(f,a.coordinate))));
      const missingAnchors=[...expected].filter(id=>!anchors.some(a=>a.id===id));
      return {credits:actual.size,lands:expected.size,points:anchors.length,missing,extra,badJoins,invalid,missingAnchors,anchorFailures:G.anchorFailures};
    }""")
    assert not any(join[k] for k in ('missing','extra','badJoins','invalid','missingAnchors','anchorFailures')), (name,join)
    print(name,"exact geographic credit joins",join["credits"],"land anchors",join["points"],flush=True)

    await page.wait_for_function("window.AtlasGlobe.terrain in {'tiled':1,'ready':1,'unavailable':1}",timeout=25000)
    await page.wait_for_function("window.AtlasGlobe.camera.renderer === 'maplibre-globe'",timeout=40000)
    assert await page.evaluate("window.AtlasGlobe.tileState?.mesh === null"),(name,"overview should not load an elevation mesh")
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    os.makedirs("shots/globe",exist_ok=True)
    await page.screenshot(path=f"shots/globe/{name}-planet.png",timeout=15000)
    assert await page.locator('#globe-live-map canvas').is_visible(),(name,"native globe canvas not visible")
    anchor_snapshot=await page.evaluate('JSON.stringify(window.AtlasGlobe.anchors)')
    before=await page.evaluate(CAM)
    assert before["projection"]=="globe",(name,before)
    snapshot=await page.evaluate(SNAP)
    box=await page.locator("#globe-live-map canvas").bounding_box()
    x=box["x"]+box["width"]*.50
    y=box["y"]+box["height"]*.48
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+min(65,box["width"]*.15),y+8,steps=10)
    await page.mouse.up()
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    after=await page.evaluate(CAM)
    assert abs(after["center"][0]-before["center"][0])>.1,(name,"drag did not rotate")
    assert await page.evaluate('JSON.stringify(window.AtlasGlobe.anchors)') == anchor_snapshot, (name,'rotation changed geographic anchors')
    # Assert the physical hit target before sending wheel events (not a script dispatch).
    assert await page.evaluate("([x,y])=>!!document.elementFromPoint(x,y)?.closest('#globe-live-map')",[x,y]),(name,"map center is obstructed")
    await page.mouse.move(x,y)
    before_zoom=await page.evaluate(CAM)
    # Ordinary wheel first; Chromium CDP sends a real ctrl-wheel separately.
    await page.mouse.wheel(0,-160)
    await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom > z*1.05",arg=before_zoom["zoom"],timeout=15000)
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    before_zoom=await page.evaluate(CAM)
    session=await context.new_cdp_session(page)
    await session.send("Input.dispatchMouseEvent",{"type":"mouseWheel","x":x,"y":y,"deltaX":0,"deltaY":-120,"modifiers":2})
    await page.wait_for_timeout(500)
    print(name,"pinch diagnostics",await page.evaluate("window.AtlasGlobe.tileState"),flush=True)
    await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom > z*1.10",arg=before_zoom["zoom"],timeout=15000)
    await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
    after_zoom=await page.evaluate(CAM)
    assert after_zoom["zoom"]>before_zoom["zoom"],(name,"trackpad pinch wheel did not zoom")
    # Wheel input at the center must preserve the tuned geographic location.
    assert abs(after_zoom["center"][0]-before_zoom["center"][0])<.05,(name,"pinch displaced center",before_zoom,after_zoom)
    await page.mouse.wheel(0,-120)
    await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom>z",arg=after_zoom["zoom"],timeout=8000)
    await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
    aperture=await page.locator("#globe-aperture").bounding_box()
    # Real remote tiles + known high-elevation geography, not a mocked terrain fixture.
    await page.evaluate("window.AtlasGlobe.goTo([-90.875,14.501],10)")
    await page.wait_for_function("window.AtlasGlobe.tileState?.mesh === 'dem'",timeout=20000)
    await page.wait_for_function("window.AtlasGlobe.tileState?.elevation > 1500",timeout=45000)
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    assert any('tiles.maps.eox.at/wmts/' in u for u in imagery),(name,"no successful satellite image responses")
    assert any('tiles.mapterhorn.com/' in u for u in imagery),(name,"no successful DEM image responses")
    print(name,"Acatenango elevation",await page.evaluate("window.AtlasGlobe.tileState"),flush=True)
    await page.screenshot(path=f"shots/globe/{name}-guatemala-overhead.png",timeout=15000)
    await page.locator("#globe-landscape").click()
    await page.wait_for_function("window.AtlasGlobe.tileState.pitch > 35")
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    await page.screenshot(path=f"shots/globe/{name}-guatemala-terrain.png",timeout=15000)
    await page.locator("#globe-home").click()
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    land=await page.evaluate("window.AtlasGlobe.anchors[0].id")
    await page.locator("#globe-find").select_option(value=land)
    await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.focus.ids.includes(id)",arg=land)
    assert land in await page.evaluate("window.AtlasGlobe.focus.ids"),(name,"index join failed",land)
    assert await page.locator("#globe-encounter .globe-feature-art").count()>0,(name,"no automatic film encounter")
    assert await page.locator("#globe-encounter .globe-film-title").inner_text(),(name,"no film title")
    if await page.locator("#globe-encounter .globe-cycle").last.is_enabled():
        await page.locator("#globe-encounter .globe-cycle").last.click()
        assert (await page.evaluate("window.AtlasGlobe.discovery.filmOffset"))>0
    assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('at')")
    await page.locator("#globe-period").select_option("2020")
    assert await page.evaluate("window.AtlasGlobe.discovery.period")== "2020"
    await page.locator("#globe-period").select_option("")
    selected=await page.evaluate(CAM)
    await page.locator("#weave-map-theme").select_option(index=1)
    await page.wait_for_timeout(450)
    assert await page.evaluate(CAM)==selected,(name,"theme moved camera")
    assert await page.evaluate("""() => {
      const C=window.AtlasConstellate, t=document.querySelector('#weave-map-theme').value;
      return window.AtlasGlobe.focus.ids.every(id=>C.globeLandCatalogFilms(id).every(f=>C.terms(f).includes(t)));
    }"""),(name,"theme leaked between credits")

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
