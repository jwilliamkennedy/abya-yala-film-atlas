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
    gate=asyncio.Event()
    fallback_camera=None
    async def hold_native(route):
        await gate.wait()
        await route.continue_()
    try:
        if MODE=="input":
            await page.route("**/assets/maplibre/maplibre-gl.mjs*",hold_native)
        await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
        if MODE=="input":
            await page.wait_for_function("window.AtlasGlobe?.camera?.renderer==='orthographic-canvas' && window.AtlasGlobe.focus.settled && document.querySelector('#atlas-rotational-globe')?.dataset.ready==='true'",timeout=60000)
            fallback=page.locator("#globe-surface")
            await fallback.press("ArrowRight")
            await fallback.press("+")
            fallback_camera=await page.evaluate("window.AtlasGlobe.camera")
            gate.set()
        await page.wait_for_function("window.AtlasGlobe?.camera?.renderer==='maplibre-globe' && window.AtlasGlobe.focus.settled",timeout=60000)
        await page.wait_for_function("document.querySelector('#atlas-rotational-globe')?.classList.contains('globe-revealed')",timeout=15000)
        startup=await page.evaluate("window.AtlasGlobe.tileState.startup")
        assert startup["fallbackPaint"]<=startup["nativeLoaded"]<=startup["handoff"]<=startup["revealed"],(name,startup)
        assert startup["reason"] in ("local-sources","local-and-imagery"),(name,startup)
        assert startup["handoff"]<=startup["localReady"]<=startup["revealed"],(name,startup)
        assert startup["stableFrames"]>=3 and startup["stableMs"]>=420,(name,startup)
        if MODE=="input":
            assert startup["firstRenderer"]=="overview" and startup["firstVisible"]<startup["handoff"],(name,startup)
        elif startup["firstRenderer"]=="native":
            assert startup["firstVisible"]>=startup["revealed"],(name,startup)
            assert await page.locator('#globe-surface').evaluate("e=>getComputedStyle(e).visibility==='hidden' && Number(getComputedStyle(e).opacity)===0")
        else:
            print(name,'slow-start overview fallback',startup,flush=True)
        if fallback_camera:
            native=await page.evaluate("window.AtlasGlobe.camera")
            assert max(abs((native["center"][0]-fallback_camera["center"][0]+180)%360-180),abs(native["center"][1]-fallback_camera["center"][1]))<.01,(name,"handoff moved camera",fallback_camera,native)
            assert abs(native["zoom"]/fallback_camera["zoom"]-1)<.002,(name,"handoff changed zoom",fallback_camera,native)
        assert await page.evaluate("!AtlasOpenBasemap.active || (!AtlasOpenBasemap.map && !document.querySelector('#atlas-basemap'))"),(name,"hidden flat renderer competing with globe")
        print(name,"startup handoff",json.dumps(startup),flush=True)
        assert await page.evaluate("document.documentElement.dataset.globeEntry==='ready' && document.querySelector('#atlas-rotational-globe').dataset.ready==='true'")
        if MODE=="terrain":
            boxes=[]
            for key in ("find","theme","more","collection"):
                await page.locator("#globe-"+key+"-toggle").click()
                panel=page.locator("#globe-"+key+"-panel")
                await panel.wait_for()
                bounds=await panel.evaluate("""e=>{const a=e.getBoundingClientRect(),r=document.querySelector('#atlas-rotational-globe').getBoundingClientRect(),f=document.querySelector('.globe-footer').getBoundingClientRect(),p=document.querySelector('.globe-primary').getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,right:a.right,rootRight:r.right,rootLeft:r.left,bottom:a.bottom,footer:f.top,primaryBottom:p.bottom,font:getComputedStyle(e).fontFamily};}""")
                assert bounds["x"]>=bounds["rootLeft"]-.5 and bounds["right"]<=bounds["rootRight"]+.5 and bounds["bottom"]<=bounds["footer"]+.5 and bounds["y"]>=bounds["primaryBottom"],(name,key,bounds)
                boxes.append(bounds)
                await page.locator("#globe-"+key+"-toggle").click()
            assert max(x["right"] for x in boxes)-min(x["right"] for x in boxes)<.5 and max(x["w"] for x in boxes)-min(x["w"] for x in boxes)<.5 and len({x["font"] for x in boxes})==1,(name,boxes)
            print(name,"standardized menu bounds and typography",json.dumps(boxes),flush=True)
        layer=await page.evaluate("window.AtlasGlobe.territoryLayer")
        assert layer["visible"] and layer["features"]>0 and layer["fill"] is not None,(name,"ambient territory layer absent",layer)
        assert layer["boundaries"]["longEdges"]==0,(name,"cross-world territory edges",layer["boundaries"])
        print(name,"ambient territory layer",json.dumps(layer),flush=True)
        if MODE=="terrain":
            counts=await page.evaluate("""()=>{const G=AtlasGlobe,I=AtlasConstellate.globeCreditIndex(),A=new Map(G.anchors.map(a=>[a.id,a.coordinate])),credits=new Map(I.films.map(f=>[f.id,f])),markers=G.cinemaMarkers;return {markers:markers.length,multiple:markers.filter(m=>m.films>1&&m.makers>1).length,invalid:markers.filter(m=>{const rows=G.matchingCreditIds(m.land).map(id=>credits.get(id));return !A.has(m.land)||JSON.stringify(m.coordinate)!==JSON.stringify(A.get(m.land))||rows.some(f=>!f)||m.credits!==new Set(rows.map(f=>f.id)).size||m.films!==new Set(rows.map(f=>f.film||f.id)).size||m.makers!==new Set(rows.map(f=>f.record).filter(Boolean)).size;}).map(m=>m.land)};}""")
            assert counts["markers"]>0 and counts["multiple"]>0 and not counts["invalid"],(name,counts)
            print(name,"cinema multiplicity from exact catalogue IDs",json.dumps(counts),flush=True)
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
            # A failed module request must retain a usable overview and its shared camera.
            await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
            shared=await page.evaluate("window.AtlasGlobe.discovery.shareURL")
            expected=await page.evaluate("window.AtlasGlobe.camera")
            await page.unroute("**/assets/maplibre/maplibre-gl.mjs*",hold_native)
            await page.route("**/assets/maplibre/maplibre-gl.mjs*",lambda route: route.abort())
            await page.goto(shared,wait_until="domcontentloaded",timeout=90000)
            await page.wait_for_function("window.AtlasGlobe?.camera?.renderer==='orthographic-canvas' && window.AtlasGlobe.focus.settled",timeout=60000)
            await page.wait_for_function("document.querySelector('#globe-detail-status')?.textContent.includes('unavailable')")
            overview=await page.evaluate("window.AtlasGlobe.camera")
            assert max(abs((overview["center"][0]-expected["center"][0]+180)%360-180),abs(overview["center"][1]-expected["center"][1]))<.01,(name,expected,overview)
            assert abs(overview["zoom"]/expected["zoom"]-1)<.003,(name,expected,overview)
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('at')")
            await page.locator("#globe-surface").press("ArrowRight")
            await page.wait_for_function("(x)=>Math.abs(window.AtlasGlobe.camera.center[0]-x)>.01",arg=overview["center"][0])
            print(name,"degraded renderer remains navigable",flush=True)
        elif MODE=="terrain":
            await page.evaluate("window.AtlasGlobe.goTo([-90.875,14.501],10)")
            await page.wait_for_function("window.AtlasGlobe.tileState?.mesh==='dem'",timeout=20000)
            await page.wait_for_function("window.AtlasGlobe.tileState?.elevation>1500",timeout=60000)
            # Elevation can arrive first; explicitly await actual satellite tile success.
            await page.wait_for_function("window.AtlasGlobe.tileState?.received.satellite>0",timeout=60000)
            assert await page.locator("#globe-credit-satellite").is_visible()
            assert any("tiles.maps.eox.at/" in u for u in tiles),("no successful satellite response",tiles)
            assert any("tiles.mapterhorn.com/" in u for u in tiles),("no successful DEM response",tiles)
            await page.wait_for_function("AtlasGlobe.territoryNames.withoutCinema>0",timeout=60000)
            labels=await page.evaluate("""()=>{const N=AtlasGlobe.territoryNames,L=new Map(Atlas.lands.map(x=>[x.id,x]));return {indexed:N.indexed,total:N.total,withoutCinema:N.withoutCinema,invalid:N.anchors.filter(a=>!L.get(a.id)?.groups.some(g=>g.features.some(f=>String(f.id)===a.sourceId&&d3.geoContains(f,a.coordinate)))).map(a=>a.id)};}""")
            assert not labels["invalid"] and labels["withoutCinema"]>0,(name,labels)
            print(name,"geographic name coverage",json.dumps(labels),flush=True)
            await shot(page,f"shots/globe-independent/{name}-overhead.png")
            await page.locator("#globe-more-toggle").click()
            await page.locator("#globe-landscape").click()
            await page.wait_for_function("window.AtlasGlobe.tileState.pitch>35 && window.AtlasGlobe.focus.settled")
            await shot(page,f"shots/globe-independent/{name}-tilted.png")
            # Confirm that the actual reticle, geographic hit test and encounter
            # remain aligned through close zoom, including a pitched terrain view.
            await page.locator("#globe-more-toggle").click()
            await page.locator("#globe-landscape").click()
            await page.wait_for_function("AtlasGlobe.tileState.pitch<1 && AtlasGlobe.focus.settled")
            land=await page.evaluate("AtlasGlobe.anchors.find(a=>a.id==='LAND-36072')")
            assert land
            await page.locator("#globe-find-toggle").click()
            await page.locator("#globe-find").select_option(land["id"])
            await page.wait_for_function("id=>AtlasGlobe.focus.settled && AtlasGlobe.discovery.featured?.land===id",arg=land["id"],timeout=30000)
            film=await page.evaluate("AtlasGlobe.discovery.featured.film")
            sizes=[]
            for z in (3,5,8,10):
                await page.evaluate("([a,z])=>AtlasGlobe.goTo(a,z)",[land["coordinate"],z])
                await page.wait_for_function("AtlasGlobe.focus.settled && !AtlasGlobe.tileState.motion.moving",timeout=30000)
                target=await page.evaluate("""()=>{const G=AtlasGlobe,T=G.focus.target,e=document.querySelector('#globe-aperture').getBoundingClientRect(),b=document.querySelector('#globe-live-map').getBoundingClientRect();return {target:T,inside:G.focus.inside,featured:G.discovery.featured,width:e.width,offset:[e.x+e.width/2-b.x-b.width/2,e.y+e.height/2-b.y-b.height/2],lit:document.querySelector('#atlas-rotational-globe').classList.contains('has-cinema')};}""")
                assert abs(target["width"]-2*target["target"]["radius"])<.5 and max(map(abs,target["offset"]))<.5,(name,z,target)
                assert target["target"]["primary"]==land["id"] and target["featured"]["film"]==film and target["lit"],(name,z,target)
                sizes.append(target["width"])
            assert sizes[0]>sizes[-1] and sizes[-1]==26,(name,sizes)
            await page.locator("#globe-more-toggle").click()
            await page.locator("#globe-landscape").click()
            await page.wait_for_function("AtlasGlobe.tileState.pitch>35 && AtlasGlobe.focus.settled")
            assert await page.evaluate("""()=>{const G=AtlasGlobe,t=G.focus.target;const ids=Atlas.lands.filter(l=>!l.browseGroup&&l.groups?.some(g=>g.features.some(f=>d3.geoContains(f,t.coordinate)))).map(l=>l.id);return G.focus.inside.every(id=>ids.includes(id))&&ids.every(id=>G.focus.inside.includes(id))&&(!t.primary||G.focus.ids.includes(t.primary))&&(t.reason!=='contains-target'||ids.includes(t.primary));}"""),(name,"pitched geographic target mismatch")
            print(name,"adaptive targeting",sizes,flush=True)
            # Verify real button-driven zoom, not only programmatic jumps.
            before=await page.evaluate("({center:AtlasGlobe.camera.center,zoom:AtlasGlobe.camera.zoom,featured:AtlasGlobe.discovery.featured})")
            await page.locator("#globe-plus").click()
            await page.wait_for_function("AtlasGlobe.focus.settled && !AtlasGlobe.tileState.wheelActive")
            after=await page.evaluate("({center:AtlasGlobe.camera.center,zoom:AtlasGlobe.camera.zoom,featured:AtlasGlobe.discovery.featured})")
            assert after["zoom"]>before["zoom"] and after["featured"]==before["featured"],(name,before,after)
            assert max(abs((after["center"][0]-before["center"][0]+180)%360-180),abs(after["center"][1]-before["center"][1]))<.01,(name,before,after)
            await page.locator("#globe-minus").click()
            await page.wait_for_function("AtlasGlobe.focus.settled && !AtlasGlobe.tileState.wheelActive")
            assert abs((await page.evaluate("AtlasGlobe.camera.zoom"))/before["zoom"]-1)<.002,(name,"zoom controls not reversible")
            if startup["firstRenderer"]=="native":
                # A graphics-context failure must reveal the actual overview, even
                # when normal entry has never shown that canvas to the visitor.
                # Use an overhead view at a scale above the overview's ordinary
                # maximum, where a renderer failure previously made the next
                # zoom-out jump by several orders of magnitude.
                await page.locator("#globe-more-toggle").click()
                await page.locator("#globe-landscape").click()
                await page.wait_for_function("AtlasGlobe.tileState.pitch<1 && AtlasGlobe.focus.settled",timeout=30000)
                await page.evaluate("a=>AtlasGlobe.goTo(a,8)",land["coordinate"])
                await page.wait_for_function("AtlasGlobe.focus.settled && AtlasGlobe.camera.zoom>40",timeout=30000)
                expected=await page.evaluate("({camera:AtlasGlobe.camera,featured:AtlasGlobe.discovery.featured,collection:JSON.stringify(AtlasCollections.current())})")
                assert expected["featured"]["land"]==land["id"],(name,expected)
                await page.locator("#globe-live-map canvas").focus()
                assert await page.evaluate("""()=>{const canvas=document.querySelector("#globe-live-map canvas");if(!canvas||document.activeElement!==canvas)return false;canvas.dispatchEvent(new Event("webglcontextlost",{cancelable:true}));return true;}"""),(name,"missing focused native canvas before context loss")
                await page.wait_for_function("AtlasGlobe.camera.renderer==='orthographic-canvas' && AtlasGlobe.focus.settled",timeout=30000)
                surface=page.locator("#globe-surface")
                assert await surface.evaluate("e=>getComputedStyle(e).visibility==='visible' && Number(getComputedStyle(e).opacity)===1 && document.activeElement===e")
                recovered=await page.evaluate("({camera:AtlasGlobe.camera,featured:AtlasGlobe.discovery.featured,collection:JSON.stringify(AtlasCollections.current())})")
                assert recovered["featured"]==expected["featured"] and recovered["collection"]==expected["collection"],(name,expected,recovered)
                assert max(abs((recovered["camera"]["center"][0]-expected["camera"]["center"][0]+180)%360-180),abs(recovered["camera"]["center"][1]-expected["camera"]["center"][1]))<.01,(name,expected,recovered)
                assert abs(recovered["camera"]["zoom"]/expected["camera"]["zoom"]-1)<.002,(name,expected,recovered)
                await surface.press("-")
                await page.wait_for_function("AtlasGlobe.focus.settled")
                after=await page.evaluate("AtlasGlobe.camera.zoom")
                assert abs(after/(recovered["camera"]["zoom"]/1.4)-1)<.002,(name,"overview zoom-out jumped",recovered,after)
                print(name,"native-first context loss preserves film, camera, focus and gradual zoom-out",flush=True)
        else:
            await page.wait_for_function("window.AtlasGlobe.discovery.publication==='ready'",timeout=60000)
            await page.wait_for_function("window.AtlasGlobe.focus.settled && !window.AtlasGlobe.tileState.wheelActive")
            initial=await page.evaluate("JSON.stringify(window.AtlasCollections.current())")
            assert await page.locator(".globe-primary button").count()==5
            assert await page.locator(".globe-map-sources").get_attribute("href")=="map-sources.html"
            assert await page.locator("#globe-credit-live").is_visible()
            await page.wait_for_function("document.querySelector('#globe-encounter').getBoundingClientRect().bottom <= document.querySelector('.globe-footer').getBoundingClientRect().top+1")
            sources=await page.request.get(BASE+"map-sources.html")
            assert sources.ok and "Copernicus Sentinel data 2016" in await sources.text()
            assert await page.locator(".globe-menu-panel:visible").count()==0
            cam=await page.evaluate("window.AtlasGlobe.camera")
            await page.locator("#globe-theme-toggle").click()
            assert await page.locator("#weave-map-theme").is_visible()
            await page.locator("#weave-map-theme").select_option("Water")
            await page.wait_for_function("!document.querySelector('#globe-theme-coverage').hidden && window.AtlasGlobe.discovery.themeCoverage.credits>0")
            assert await page.evaluate("""()=>{const G=window.AtlasGlobe,sets=G.anchors.map(a=>G.matchingCreditIds(a.id)),coverage=G.discovery.themeCoverage;return coverage.lands===sets.filter(x=>x.length).length&&coverage.credits===new Set(sets.flat()).size;}""")
            await page.locator("#weave-map-theme").select_option("")
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
            for mode,expected in [("none",["none","none"]),("all",["visible","visible"]),("selected",["none","visible"])]:
                await page.locator("#globe-edges").select_option(mode)
                assert await page.evaluate("window.AtlasGlobe.territoryLayer.edgeVisibility")==expected
            await page.locator(".globe-settings summary").click()
            await page.locator("#globe-find-toggle").click()
            land=await page.evaluate("""()=>{const inv=window.AtlasGlobe.artworkInventory(),local=new Map();for(const c of inv.credits){if(!c.source||/^https?:/i.test(c.source))continue;for(const id of c.lands)local.set(id,(local.get(id)||0)+1);}return window.AtlasGlobe.anchors.find(a=>(local.get(a.id)||0)>1)?.id||window.AtlasGlobe.anchors.find(a=>window.AtlasConstellate.globeLandFilmCount(a.id)>1).id;}""")
            await page.locator("#globe-find").select_option(value=land)
            assert await page.locator(".globe-menu-panel:visible").count()==0
            await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.focus.ids.includes(id)",arg=land)
            await page.locator("#globe-encounter .globe-film-title").wait_for()
            panel=page.locator("#globe-encounter")
            await page.locator("#globe-expand-encounter").click()
            assert await panel.get_attribute("data-expanded")=="true"
            assert await page.locator("#globe-expand-encounter").get_attribute("aria-expanded")=="true"
            assert not await page.locator("#globe-emergent").is_visible()
            await page.locator("#globe-expand-encounter").click()
            assert await panel.get_attribute("data-expanded")=="false"
            first=await page.locator("#globe-encounter .globe-film-title").inner_text()
            await page.locator('#globe-encounter [aria-label="Next film"]').focus()
            await page.keyboard.press("Enter")
            assert await page.evaluate("document.activeElement?.getAttribute('aria-label')==='Next film'"),(name,"film navigation lost keyboard focus")
            assert await page.locator("#globe-encounter .globe-film-title").inner_text()!=first or await page.evaluate("window.AtlasGlobe.discovery.filmOffset===1")
            await page.locator("#globe-encounter .globe-land-films summary").click()
            listed=page.locator("#globe-encounter .globe-land-film")
            await listed.first.wait_for()
            first_id=await listed.first.get_attribute("data-film-id")
            await listed.first.click()
            assert await page.evaluate("id=>AtlasGlobe.discovery.featured.film===id",first_id)
            assert not await page.locator("#constellate-popup").is_visible()
            assert await page.evaluate("document.activeElement?.classList.contains('globe-film-title')")
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).searchParams.has('at')")
            assert await page.evaluate("new URL(window.AtlasGlobe.discovery.shareURL).hash === ''")
            assert await page.evaluate("""() => {
                const b=document.querySelector('#globe-emergent'),f=window.AtlasGlobe.discovery.featured;
                if(!f||b.hidden)return true;
                const a=document.querySelector('#globe-aperture').getBoundingClientRect(),r=b.getBoundingClientRect();
                return !!b.querySelector('img') && (r.right<a.left||r.left>a.right||r.bottom<a.top||r.top>a.bottom);
            }"""),(name,"poster obstructs aperture or lacks sourced image")
            # The catalogue order is independent of artwork. Select a recorded local
            # image explicitly instead of assuming the first few films have one.
            assert await page.evaluate("""id=>{const films=AtlasConstellate.globeLandCatalogFilms(id).slice().sort((a,b)=>a.title.localeCompare(b.title)||String(a.maker||'').localeCompare(String(b.maker||''))||a.id.localeCompare(b.id));return AtlasGlobe.discovery.featured.film===films[0]?.id;}""",land),(name,"artwork-neutral order")
            image_id=await page.evaluate("""id=>AtlasGlobe.artworkInventory().credits.find(c=>c.lands.includes(id)&&c.source&&!/^https?:/i.test(c.source))?.id""",land)
            if image_id and await page.evaluate("AtlasGlobe.discovery.featured.film")!=image_id:
                picker=page.locator("#globe-encounter .globe-land-films")
                if not await picker.evaluate("(e)=>e.open"):await picker.locator("summary").click()
                image_choice=picker.locator("[data-film-id='"+image_id+"']")
                while not await image_choice.count() and await picker.locator(".globe-land-film-more").count():
                    await picker.locator(".globe-land-film-more").click()
                await image_choice.click()
            await page.wait_for_function("window.AtlasGlobe.discovery.artState==='ready'",timeout=25000)
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
            # Previewing a film must not send Back into the old land-list interface.
            camera_before=await page.evaluate("window.AtlasGlobe.camera")
            featured_before=await page.evaluate("window.AtlasGlobe.discovery.featured")
            await page.locator("#globe-encounter .globe-film-title").click()
            await page.locator("#weave-film-preview").wait_for()
            await page.locator("[data-preview-back]").click()
            assert not await page.locator("#constellate-popup").is_visible(),(name,"Back left old editor open")
            await page.wait_for_function("window.AtlasGlobe.focus.settled")
            camera_after=await page.evaluate("window.AtlasGlobe.camera")
            assert max(abs((camera_after["center"][0]-camera_before["center"][0]+180)%360-180),abs(camera_after["center"][1]-camera_before["center"][1]))<.01,(name,camera_before,camera_after)
            assert abs(camera_after["zoom"]/camera_before["zoom"]-1)<.002
            assert await page.evaluate("window.AtlasGlobe.discovery.featured")==featured_before
            await page.wait_for_function("document.activeElement?.classList.contains('globe-film-title')")
            await page.locator(".globe-credit-details summary").click()
            await page.wait_for_function("document.querySelector('.globe-credit-data dl') || document.querySelector('.globe-credit-data p')?.textContent.includes('No exact row')",timeout=30000)
            assert await page.locator(".globe-credit-data dl").count()>0,(name,"featured credit missing from public CSV")
            assert await page.locator(".globe-credit-data").get_by_text("Film id",exact=True).count()>0
            assert await page.locator("#globe-encounter .globe-feature-art").count()==1
            assert await page.locator("#globe-encounter .globe-film-strip").count()==0
            assert await page.locator("#globe-encounter .globe-credit-details").count()==1
            await page.locator(".globe-credit-details summary").click()
            print(name,"emergent artwork",await page.evaluate("window.AtlasGlobe.discovery.posterVisible"),flush=True)
            assert await page.evaluate("window.AtlasGlobe.discovery.recent.length>0")
            await shot(page,f"shots/globe-independent/{name}-encounter.png")
            targets=await page.locator("#globe-encounter [data-target-film]").evaluate_all("(els)=>els.map(e=>({film:e.dataset.targetFilm,land:e.dataset.targetLand}))")
            assert len(targets)<=3 and len(set(v["land"] for v in targets))==len(targets)
            bridge=page.locator("#globe-encounter [data-target-film]").first
            if await bridge.count():
                previous=await page.evaluate("window.AtlasGlobe.discovery.featured")
                target=await bridge.get_attribute("data-target-film")
                await page.locator(".globe-related-details summary").click()
                await bridge.click()
                await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.film===id",arg=target,timeout=30000)
                await page.locator("#globe-more-toggle").click()
                await page.locator("#globe-period").select_option("2020")
                await page.keyboard.press("Escape")
                await page.locator("#globe-journey-back").click()
                await page.wait_for_function("(v)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.film===v.film && window.AtlasGlobe.discovery.featured?.land===v.land",arg=previous,timeout=30000)
                assert await page.evaluate("window.AtlasGlobe.discovery.period===''")
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
            before_surprise=await page.evaluate("window.AtlasGlobe.discovery.featured?.land || window.AtlasGlobe.discovery.recent[0]?.id")
            await page.locator("#globe-surprise").click()
            await page.wait_for_function("(id)=>{const G=window.AtlasGlobe,f=G.discovery.featured;return G.focus.settled && f && f.land!==id && document.querySelector('#globe-encounter').dataset.film===f.film && !G.tileState.motion.moving}",arg=before_surprise)
            assert await page.evaluate("JSON.stringify(window.AtlasCollections.current())")==initial
            assert await page.evaluate("window.AtlasGlobe.discovery.collection.stars===0")
            if not await page.locator("#globe-encounter .globe-credit-details").evaluate("(d)=>d.open"):
                await page.locator("#globe-encounter .globe-credit-details summary").click()
            await page.wait_for_function("document.querySelector('#globe-encounter .globe-credit-details')?.open")
            before_collect=await page.evaluate("""()=>{const p=document.querySelector('#globe-encounter');window.__qaEncounterArt=p.querySelector('.globe-feature-art');return {featured:AtlasGlobe.discovery.featured,open:p.querySelector('.globe-credit-details').open,art:window.__qaEncounterArt?.dataset.source,camera:AtlasGlobe.camera}}""")
            await page.locator("#globe-collect-film").click()
            await page.wait_for_function("window.AtlasGlobe.discovery.collection.items===1 && window.AtlasGlobe.discovery.collection.stars===1")
            await page.wait_for_function("window.AtlasGlobe.focus.settled")
            after_collect=await page.evaluate("""()=>{const p=document.querySelector('#globe-encounter');return {featured:AtlasGlobe.discovery.featured,open:p.querySelector('.globe-credit-details')?.open,sameArt:p.querySelector('.globe-feature-art')===window.__qaEncounterArt,art:p.querySelector('.globe-feature-art')?.dataset.source,camera:AtlasGlobe.camera}}""")
            assert after_collect["featured"]==before_collect["featured"] and after_collect["open"] and after_collect["sameArt"],(name,"collecting reset the active film card",before_collect,after_collect)
            assert await page.evaluate("window.AtlasGlobe.discovery.collection.links===0")
            await page.locator("#globe-connect-featured").click()
            assert await page.locator("#globe-connect-featured").is_disabled()
            assert await page.locator("#globe-collection-toggle").inner_text()=="Connecting (1)"
            first_land=await page.evaluate("window.AtlasGlobe.discovery.featured.land")
            await page.locator("#globe-surprise").click()
            await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.land!==id && !!window.AtlasGlobe.discovery.featured",arg=first_land)
            await page.locator("#globe-collect-film").click()
            await page.wait_for_function("window.AtlasGlobe.discovery.collection.items===2")
            await page.locator("#globe-connect-featured").click()
            await page.locator("#globe-link-reason").fill("A test of an authored connection")
            await page.get_by_role('textbox', name='Connection note').fill("Unsubmitted note")
            await page.locator('[aria-label="Connection type"]').select_option("question")
            await page.keyboard.press("Escape")
            await page.locator("#globe-collection-toggle").click()
            assert await page.locator("#globe-link-reason").input_value()=="A test of an authored connection"
            assert await page.get_by_role('textbox', name='Connection note').input_value()=="Unsubmitted note"
            assert await page.locator('[aria-label="Connection type"]').input_value()=="question"
            await page.locator(".globe-link-form button[type=submit]").click()
            assert await page.evaluate("window.AtlasGlobe.discovery.collection.links===1 && window.AtlasGlobe.discovery.collection.lines===1")
            await page.locator("#globe-save-collection").click()
            assert await page.evaluate("window.AtlasGlobe.discovery.collection.saved")
            saved=await page.evaluate("window.AtlasGlobe.discovery.collection.id")
            await page.reload(wait_until="domcontentloaded")
            await page.wait_for_function("window.AtlasGlobe?.camera?.renderer==='maplibre-globe' && window.AtlasGlobe.focus.settled",timeout=90000)
            assert not await page.locator("#constellate-popup").is_visible(),"legacy editor opened over globe"
            await page.locator("#globe-collection-toggle").click()
            await page.locator(".globe-collection-settings summary").click()
            await page.locator('#globe-collection-panel select[aria-label="Choose constellation"]').select_option(saved)
            await page.wait_for_function("window.AtlasGlobe.discovery.collection.items===2 && window.AtlasGlobe.discovery.collection.links===1 && window.AtlasGlobe.discovery.collection.stars===2")
            await page.locator("#globe-read-thread").click()
            await page.wait_for_function("window.AtlasGlobe.focus.settled && !!document.querySelector('.globe-reading-journey')")
            await page.locator('[aria-label="Next film in thread"]').click()
            await page.wait_for_function("window.AtlasGlobe.focus.settled && document.querySelector('.globe-reading-journey')?.textContent.includes('A test of an authored connection')")
            # Add an actual unmapped catalogue film to the temporary test draft.
            unmapped=await page.evaluate("""()=>{const I=AtlasGlobe.artworkInventory(),c=I.credits.find(x=>!x.lands.length);if(!c)return null;const f=AtlasConstellate.globeCreditIndex().films.find(x=>x.id===c.id);if(!f||!AtlasCollections.add(f))return null;AtlasGlobe.sync();return {id:f.id,title:f.title};}""")
            assert unmapped
            before_unmapped=await page.evaluate("AtlasGlobe.camera")
            await page.locator('#globe-encounter [aria-label="Next film in thread"]').click()
            await page.wait_for_function("id=>document.querySelector('#globe-encounter').dataset.film===id && AtlasGlobe.discovery.featured===null",arg=unmapped["id"])
            assert await page.locator(".globe-unmapped-title").inner_text()==unmapped["title"]
            assert await page.evaluate("AtlasGlobe.camera")==before_unmapped
            assert not await page.locator("#weave-offmap-rail").is_visible(),(name,"flat workspace rail appeared over globe reading")
            assert not await page.evaluate("document.querySelector('#atlas-rotational-globe').classList.contains('has-cinema')"),(name,"unmapped reading incorrectly signaled a cinematic location")
            await page.locator('#globe-encounter [aria-label="Previous film in thread"]').click()
            await page.wait_for_function("AtlasGlobe.focus.settled && !!AtlasGlobe.discovery.featured && !document.querySelector('.globe-unmapped-title')")
            print(name,"globe collect, author, save, restore and complete thread reading passed",flush=True)
            if name=="desktop":
                # Use actual published credit IDs and anchors, not fabricated locations.
                fixture=await page.evaluate("""()=>{const G=AtlasGlobe,C=AtlasConstellate,I=C.globeCreditIndex(),A=G.anchors;for(const a of A){const f=I.byLand.get(a.id)?.films||[];if(f.length<2)continue;for(const b of A){const d=d3.geoDistance(a.coordinate,b.coordinate);if(d<.26||d>.60||Math.abs(a.coordinate[1])>60||Math.abs(b.coordinate[1])>60)continue;const g=I.byLand.get(b.id)?.films.find(x=>!f.slice(0,2).some(y=>x.id===y.id));if(!g)continue;return {a:a.id,b:b.id,ids:[f[0].id,f[1].id,g.id],center:d3.geoInterpolate(a.coordinate,b.coordinate)(.5)};}}return null;}""")
                assert fixture,"No grouped star test fixture"
                assert await page.evaluate("""v=>{AtlasCollections.create('Grouped star test');const C=AtlasConstellate,I=C.globeCreditIndex();return v.ids.every((id,i)=>C.globeCollect(I.films.find(x=>x.id===id),i<2?v.a:v.b));}""",fixture)
                await page.evaluate("v=>{AtlasGlobe.sync();AtlasGlobe.goTo(v.center,2.8);}",fixture)
                await page.wait_for_function("AtlasGlobe.focus.settled && AtlasGlobe.discovery.collection.stars===2 && AtlasGlobe.discovery.collection.items===3",timeout=30000)
                surface=page.locator("#globe-live-map canvas")
                box=await surface.bounding_box()
                stars=await page.evaluate("AtlasGlobe.collectionStars")
                group=next(s for s in stars if s["land"]==fixture["a"])
                single=next(s for s in stars if s["land"]==fixture["b"])
                xy=lambda s:(box["x"]+s["screen"][0],box["y"]+s["screen"][1])
                x,y=xy(group);u,v=xy(single)
                assert await page.evaluate("pts=>pts.every(([x,y])=>!!document.elementFromPoint(x,y)?.closest('#globe-live-map'))",[[x,y],[u,v]]),(name,"grouped star fixtures blocked",stars)
                # Allow the GeoJSON source to render before dispatching real input.
                await page.wait_for_timeout(700)
                await page.mouse.click(x,y)
                await page.locator("#globe-star-group-heading").wait_for()
                assert set(await page.locator("#globe-collection-panel [data-collected-id]").evaluate_all("els=>els.map(e=>e.dataset.collectedId)"))==set(fixture["ids"][:2])
                await page.locator("#globe-draw-link").click()
                await page.locator('[data-collected-id="'+fixture["ids"][0]+'"]').click()
                await page.wait_for_function("AtlasGlobe.discovery.menu===''",timeout=15000)
                await page.mouse.click(x,y)
                await page.locator("#globe-star-group-heading").wait_for()
                await page.locator('[data-collected-id="'+fixture["ids"][1]+'"]').click()
                await page.locator("#globe-link-reason").fill("Same-land relation")
                await page.locator(".globe-link-form button[type=submit]").click()
                assert await page.evaluate("AtlasGlobe.discovery.collection.links===1 && AtlasGlobe.discovery.collection.lines===0")
                await page.locator("#globe-draw-link").click()
                await page.locator("#globe-collection-toggle").click()
                await page.mouse.click(x,y)
                await page.locator("#globe-star-group-heading").wait_for()
                await page.locator('[data-collected-id="'+fixture["ids"][0]+'"]').click()
                camera=await page.evaluate("AtlasGlobe.camera")
                # Draw a temporary screen-space line, then cancel without storing anything.
                await page.mouse.move(x,y)
                await page.mouse.down()
                await page.mouse.move((x+u)/2,(y+v)/2,steps=5)
                await page.locator("#globe-draw-preview").wait_for()
                await page.keyboard.press("Escape")
                await page.mouse.up()
                assert not await page.locator("#globe-draw-preview").count()
                assert await page.evaluate("AtlasGlobe.discovery.collection.links===1")
                assert await page.evaluate("AtlasGlobe.camera")==camera
                # Complete the same gesture and explicitly author the relationship.
                await page.mouse.move(x,y)
                await page.mouse.down()
                await page.mouse.move(u,v,steps=8)
                await page.locator("#globe-draw-preview").wait_for()
                await page.mouse.up()
                await page.locator("#globe-link-reason").fill("Cross-land relation")
                assert await page.evaluate("AtlasGlobe.discovery.collection.links===1")
                await page.locator(".globe-link-form button[type=submit]").click()
                assert await page.evaluate("AtlasGlobe.discovery.collection.links===2 && AtlasGlobe.discovery.collection.lines===1")
                assert await page.evaluate("AtlasGlobe.camera")==camera
                print(name,"grouped stars, same-land connection, cancel and direct drawing passed",flush=True)

        assert not errors,(name,errors)
        print(name,MODE,"passed",flush=True)
    finally:
        gate.set()
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
