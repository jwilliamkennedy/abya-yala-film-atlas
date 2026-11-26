"""Globe: actual Natural Earth land, spherical rotation, aperture, index join and stable camera."""
import asyncio
import os
from playwright.async_api import async_playwright
BASE=os.environ.get("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
CAM="window.AtlasGlobe.camera"
SNAP="JSON.stringify(window.AtlasCollections.current())"

async def shot(page,path):
    try: await page.screenshot(path=path,timeout=45000)
    except Exception as e: print("SCREENSHOT_FAILED",path,str(e)[:240],flush=True)

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
    await page.goto(BASE,wait_until="domcontentloaded",timeout=90000)
    assert await page.evaluate("window.AtlasRoute?.globe && new URL(window.AtlasRoute.canonical).search==='' && new URL(window.AtlasRoute.canonical).hash===''"), "Clean beta entry did not select globe"
    # Measure the map plate before the delayed native renderer can reveal it.
    plate=await page.locator("#atlas-globe-stage").bounding_box()
    assert plate and plate["width"]>200 and plate["height"]>200, (name,"collapsed initial map",plate)
    await page.wait_for_function("window.AtlasGlobe?.active && window.AtlasGlobe.focus.settled",timeout=60000)
    await page.wait_for_function("document.querySelector('#atlas-rotational-globe')?.dataset.ready==='true'",timeout=60000)
    after=await page.locator("#atlas-globe-stage").bounding_box()
    assert max(abs(plate[k]-after[k]) for k in ("x","y","width","height"))<=3, (name,"map plate jumped during startup",plate,after)
    assert await page.evaluate("document.querySelector('#atlas-rotational-globe').parentElement.id==='atlas-globe-stage' && !document.querySelector('.map-panel,#atlas,#index')"), (name,"legacy runtime owns public layout")
    assert await page.evaluate("!location.search && !location.hash"), (name,"legacy controllers changed public URL")
    assert await page.evaluate("window.AtlasGlobe.pointCount>0 && window.AtlasGlobe.geometryCount>0 && window.AtlasGlobe.landArea>2.5 && window.AtlasGlobe.landArea<4.8"),name
    # Test the production index rather than a mocked grouping or screen location.
    join = await page.evaluate("""() => {
      const C=window.AtlasCollectionEditor,A=window.AtlasCatalogue,G=window.AtlasGlobe,I=C.globeCreditIndex();
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

    # Regression: Hawaiian catalogue identities and the Native Land source
    # polygon must resolve to one real, contained geographic anchor.
    hawaii = await page.evaluate("""() => {
      const A=window.AtlasCatalogue,C=window.AtlasCollectionEditor,G=window.AtlasGlobe;
      const land=A.landById('NAME-165'),I=C.globeCreditIndex(),entry=I.byLand.get('NAME-165');
      const a=G.anchors.find(x=>x.id==='NAME-165');
      const source=land?.groups.flatMap(g=>g.features).find(f=>String(f.id)==='35877');
      const makers=new Set((entry?.films||[]).map(f=>f.record));
      return {name:land?.name,source:source?.properties.name,coordinate:a?.coordinate,
        contained:!!(a&&source&&d3.geoContains(source,a.coordinate)),
        aliases:['NAME-166','NAME-167','LAND-35877'].every(id=>A.landById(id)?.id==='NAME-165'),
        makers:makers.size,films:new Set((entry?.films||[]).map(f=>f.film||f.id)).size,
        credits:entry?.films.length||0,
        ciara:makers.has('DIR-0332'),erin:makers.has('NEW-4a265d56f02e'),
        wongKalu:makers.has('NEW-5b2be22f2d92'),
        badMaka:A.recordLandReferences('NEW-c2f1143331bb').some(r=>r.id==='LAND-33208')};
    }""")
    assert hawaii["name"] == "Hawaiʻi" and hawaii["source"] == "Nā moku ʻehā", hawaii
    assert hawaii["contained"] and hawaii["aliases"] and not hawaii["badMaka"], hawaii
    assert -157 < hawaii["coordinate"][0] < -154 and 18 < hawaii["coordinate"][1] < 21, hawaii
    assert hawaii["makers"] >= 30 and hawaii["films"] >= 60, hawaii
    assert hawaii["ciara"] and hawaii["erin"] and hawaii["wongKalu"], hawaii
    print(name,"HAWAII_LAND_RELAY",hawaii,flush=True)
    # All explicit aliases must resolve to the exact named source feature,
    # and subgroup-qualified geometries must remain distinct.
    relays = await page.evaluate("""() => {
      const A=window.AtlasCatalogue,C=window.AtlasCollectionEditor,I=C.globeCreditIndex();
      const aliases=(window.AtlasLandAliasRelays||[]).map(([id,sid,label])=>{
        const l=A.landById(id);
        return {id,target:l?.id,ok:!!l?.groups.some(g=>g.features.some(f=>String(f.id)===sid&&f.properties.name===label))};
      });
      const groups=['NAME-015','NAME-063','NAME-161','NAME-153'].map(id=>({id,ids:A.landById(id)?.groups.map(g=>String(g.id))}));
      const subgroup=['LAND-33460','LAND-33458','LAND-33387'].map(id=>({id,count:I.byLand.get(id)?.films.length||0}));
      const generic=(I.byLand.get('NAME-153')?.films||[]).filter(f=>
        A.recordLandReferences(f.record).some(r=>r.id==='NAME-153'&&/kaiowa|nhande[wv]a|nande[wv]a|ava[ -]+guarani|mbya/i.test(String(r.basis||'').normalize('NFD').replace(/\\p{Diacritic}/gu,'')))).map(f=>f.id);
      return {aliases,groups,subgroup,generic};
    }""")
    assert len(relays["aliases"]) >= 17 and all(x["ok"] for x in relays["aliases"]), relays
    assert {x["id"]:x["ids"] for x in relays["groups"]} == {"NAME-015":["33550"],"NAME-063":["36317"],"NAME-161":["33417"],"NAME-153":["36000"]}, relays
    assert all(x["count"] > 0 for x in relays["subgroup"]), relays
    assert not relays["generic"], relays
    print(name,"TERRITORY_ALIAS_AND_SUBGROUP_AUDIT",relays,flush=True)



    await page.wait_for_function("window.AtlasGlobe.terrain in {'tiled':1,'ready':1,'unavailable':1}",timeout=25000)
    await page.wait_for_function("window.AtlasGlobe.camera.renderer === 'maplibre-globe'",timeout=40000)
    assert await page.evaluate("window.AtlasGlobe.tileState?.mesh === null"),(name,"overview should not load an elevation mesh")
    assert await page.evaluate("window.AtlasGlobe.territoryLayer.features>0 && window.AtlasGlobe.territoryLayer.visible")
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    os.makedirs("shots/globe",exist_ok=True)
    await shot(page,f"shots/globe/{name}-planet.png")
    assert await page.locator('#globe-live-map canvas').is_visible(),(name,"native globe canvas not visible")
    anchor_snapshot=await page.evaluate('JSON.stringify(window.AtlasGlobe.anchors)')
    before=await page.evaluate(CAM)
    assert before["projection"]=="globe",(name,before)
    snapshot=await page.evaluate(SNAP)
    box=await page.locator("#globe-live-map canvas").bounding_box()
    x=box["x"]+box["width"]*.50
    y=box["y"]+box["height"]*.48
    assert await page.evaluate("([x,y])=>!!document.elementFromPoint(x,y)?.closest('#globe-live-map')",[x,y]),(name,"drag starts outside globe")
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+min(65,box["width"]*.15),y+8,steps=10)
    await page.mouse.up()
    try:
        await page.wait_for_function("window.AtlasGlobe.focus.settled",timeout=20000)
    except Exception:
        print(name,"DRAG_SETTLE",await page.evaluate("window.AtlasGlobe.tileState"),flush=True)
        raise
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
    # Verify the application's Ctrl+wheel route with a DOM event. Headless CDP
    # previously swallowed the browser-level pinch before delivery. Do not
    # represent this test as a physical trackpad test.
    count=await page.evaluate("window.AtlasGlobe.tileState.input.pinch")
    await page.locator("#globe-live-map canvas").dispatch_event("wheel",{"deltaY":-80,"deltaX":0,"ctrlKey":True,"bubbles":True,"cancelable":True})
    await page.wait_for_function("(n)=>window.AtlasGlobe.tileState.input.pinch>n",arg=count)
    await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom > z*1.10",arg=before_zoom["zoom"],timeout=15000)
    print(name,"DOM pinch diagnostics (not hardware)",await page.evaluate("window.AtlasGlobe.tileState"),flush=True)
    await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
    after_zoom=await page.evaluate(CAM)
    assert after_zoom["zoom"]>before_zoom["zoom"],(name,"trackpad pinch wheel did not zoom")
    # Wheel input at the center must preserve the tuned geographic location.
    assert abs((after_zoom["center"][0]-before_zoom["center"][0]+180)%360-180)<.05,(name,"pinch displaced center",before_zoom,after_zoom)
    await page.mouse.wheel(0,-120)
    await page.wait_for_function("(z)=>window.AtlasGlobe.camera.zoom>z",arg=after_zoom["zoom"],timeout=8000)
    await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
    aperture=await page.locator("#globe-aperture").bounding_box()
    aperture_center=(aperture["x"]+aperture["width"]/2,aperture["y"]+aperture["height"]/2)
    # Local geometry only: no satellite imagery and no elevation mesh at any scale.
    await page.evaluate("window.AtlasGlobe.goTo([-90.875,14.501],10)")
    await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.motion.moving",timeout=30000)
    assert await page.evaluate("window.AtlasGlobe.tileState?.mesh === null"),(name,"terrain mesh present")
    assert not imagery,(name,"remote imagery or elevation requested",imagery[:3])
    assert await page.evaluate("getComputedStyle(document.querySelector('#globe-aperture')).visibility==='hidden'"),(name,"reticle visible")
    await shot(page,f"shots/globe/{name}-guatemala-overhead.png")
    await page.locator("#globe-more-toggle").click()
    await page.locator("#globe-home").click()
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    land=await page.evaluate("window.AtlasGlobe.anchors[0].id")
    await page.locator("#globe-find-toggle").click()
    await page.locator("#globe-find").select_option(value=land)
    await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.focus.ids.includes(id)",arg=land)
    assert land in await page.evaluate("window.AtlasGlobe.focus.ids"),(name,"index join failed",land)
    assert await page.locator("#globe-encounter .globe-feature-art").count()>0,(name,"no automatic film encounter")
    assert await page.locator("#globe-encounter .globe-film-title").inner_text(),(name,"no film title")
    if await page.locator("#globe-encounter .globe-cycle").count() and await page.locator("#globe-encounter .globe-cycle").last.is_enabled():
        await page.locator("#globe-encounter .globe-cycle").last.click()
        assert (await page.evaluate("window.AtlasGlobe.discovery.filmOffset"))>0
    assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('at')")
    await page.locator("#globe-more-toggle").click()
    await page.locator("#globe-period").select_option("2020")
    assert await page.evaluate("window.AtlasGlobe.discovery.period")== "2020"
    await page.locator("#globe-period").select_option("")
    await page.wait_for_function("window.AtlasGlobe.discovery.publication==='ready'",timeout=60000)
    await page.wait_for_function("window.AtlasGlobe.focus.settled")
    selected=await page.evaluate(CAM)
    await page.locator("#globe-theme-toggle").click()
    await page.locator("#weave-map-theme").select_option(index=1)
    await page.wait_for_timeout(450)
    assert await page.evaluate(CAM)==selected,(name,"theme moved camera")
    assert await page.evaluate("""() => {
      const C=window.AtlasCollectionEditor, t=document.querySelector('#weave-map-theme').value;
      return window.AtlasGlobe.focus.ids.every(id=>C.globeLandCatalogFilms(id).every(f=>C.terms(f).includes(t)));
    }"""),(name,"theme leaked between credits")

    final_aperture=await page.locator("#globe-aperture").bounding_box()
    final_center=(final_aperture["x"]+final_aperture["width"]/2,final_aperture["y"]+final_aperture["height"]/2)
    assert max(abs(a-b) for a,b in zip(aperture_center,final_center))<.5,(name,"aperture center shifted",aperture,final_aperture)
    radius=await page.evaluate("AtlasGlobe.focus.target.radius")
    assert abs(final_aperture["width"]-2*radius)<.5,(name,"visible target and hit radius differ")
    assert await page.evaluate(SNAP)==snapshot,(name,"discovery mutated collection")
    assert await page.evaluate("!location.search && !location.hash"), (name,"public URL changed during discovery")
    assert not await page.locator("header .constellate-link").is_visible(), (name,"old Constellate navigation exposed")
    assert await page.locator("#globe-close,.globe-legacy-link").count()==0, (name,"old flat navigation exposed")
    await page.evaluate("AtlasGlobe.close()")
    await page.wait_for_function("!window.AtlasOpenBasemap?.active || !!document.querySelector('#atlas-basemap')",timeout=30000)
    assert await page.evaluate("!document.documentElement.dataset.globeEntry && !document.querySelector('#atlas-rotational-globe')"),(name,"globe ownership not released")
    await page.wait_for_function("!window.AtlasGlobe.active && !window.AtlasCollectionEditor.enabled")
    assert await page.locator("#atlas-rotational-globe").count()==0
    await page.goto(BASE+"flat.html",wait_until="domcontentloaded",timeout=90000)
    await page.wait_for_function("document.documentElement.dataset.atlasUi==='ready'",timeout=60000)
    assert await page.evaluate("location.pathname.endsWith('flat.html') && !document.documentElement.dataset.globeEntry && !window.AtlasGlobe?.active"), (name,"legacy page did not remain independent")
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
