"""Exercise the real beta entry and the stale address reported by the maintainer.
Uses the production catalogue and local overview fallback, not mocked application state."""
import asyncio
import os
from urllib.parse import urlsplit, urlencode
from playwright.async_api import async_playwright

BASE = os.environ.get("ATLAS_QA_BASE", "http://127.0.0.1:8985/beta/")
READY = """window.AtlasGlobe?.active && document.documentElement.dataset.globeEntry==='ready'
&& AtlasGlobe.discovery.publication==='ready' && AtlasGlobe.focus.settled"""
STALE = "?constellate=1&globe=1&weave=61b22ae4-4801-4379-a456-62c23b984561#view=filmmakers&browse=1"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        context = await browser.new_context(viewport={"width":1440,"height":900},reduced_motion="reduce")
        origin=urlsplit(BASE).netloc
        await context.route(lambda url: urlsplit(url).scheme in ("http","https") and urlsplit(url).netloc!=origin, lambda route:route.abort())
        page=await context.new_page()
        # Detect synthetic public URL writes during bootstrap, even if later removed.
        await page.add_init_script("""window.__atlasHistoryWrites=[];for(const key of ['replaceState','pushState']){const original=history[key];history[key]=function(...args){if(args[2]!=null)window.__atlasHistoryWrites.push(String(args[2]));return original.apply(this,args);};}""")
        for suffix in ("",STALE):
            await page.goto("about:blank")
            await page.goto(BASE+suffix,wait_until="domcontentloaded",timeout=90000)
            await page.wait_for_function(READY,timeout=90000)
            assert page.url==BASE,(suffix,page.url)
            writes=await page.evaluate("window.__atlasHistoryWrites")
            assert not any("constellate=1" in u or "globe=1" in u for u in writes),writes
            assert await page.locator('script[src^="assets/globe.js"]').count()==1
            assert await page.evaluate("!window.AtlasConstellate && !window.AtlasOpenBasemap && !window.AtlasCollectionEditor.enabled")
            assert await page.locator('#atlas, #index, script[src*="encounters.js"], script[src*="constellate.js"]').count()==0
            assert not await page.locator("header .constellate-link").is_visible()
            assert await page.locator("#globe-close,.globe-legacy-link").count()==0
            await page.locator("#globe-find-toggle").click()
            assert await page.locator("#globe-search").is_visible()
            assert page.url==BASE
            print("CANONICAL_GLOBE",suffix or "clean",page.url,flush=True)
        # Exercise a real catalogue credit, not synthetic placeholder IDs.
        credit=await page.evaluate("""() => {
            const mapped=new Set(AtlasGlobe.anchors.map(x=>x.id));
            const c=AtlasGlobe.artworkInventory().credits.find(x=>x.lands.some(l=>mapped.has(l)));
            return {maker:c.record,film:c.film,credit:c.id,land:c.lands.find(l=>mapped.has(l))};
        }""")
        query=urlencode({k:credit[k] for k in ("maker","film","land")})
        await page.goto(BASE+"?globe=1#view=films&"+query,wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function(READY,timeout=90000)
        await page.wait_for_function("c=>AtlasGlobe.focus.settled && AtlasGlobe.discovery.featured?.film===c.credit && AtlasGlobe.discovery.featured?.land===c.land",arg=credit,timeout=60000)
        assert "globe=1" not in page.url and "film=" in page.url and "maker=" in page.url and "land=" in page.url
        print("EXACT_CREDIT_LINK",credit,page.url,flush=True)
        # A valid locally saved collection survives canonicalization and reload.
        # Unknown UUIDs are still stripped (the STALE case above).
        local=await page.evaluate("""() => {
            AtlasCollections.create('Route audit');
            if(!AtlasCollections.persist())throw Error('Could not persist route fixture');
            return AtlasCollections.current().id;
        }""")
        await page.goto(BASE+"?constellate=1&globe=1&weave="+local,wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function(READY,timeout=90000)
        assert page.url==BASE+"?weave="+local
        assert await page.evaluate("AtlasCollections.current().id")==local
        await page.reload(wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function(READY,timeout=90000)
        assert await page.evaluate("AtlasCollections.current().id")==local and page.url==BASE+"?weave="+local
        print("LOCAL_COLLECTION_RELOAD",local,flush=True)
        await page.goto(BASE+"?menu=find",wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function(READY,timeout=90000)
        assert await page.locator("#globe-search").is_visible()
        print("PUBLIC_FIND_LINK",page.url,flush=True)
        # Watch returns only to the public globe, and preserves supported
        # state even when there was no camera snapshot.
        for state in ("", "menu=find", query+"&at=-91%2C12%2C2&trace=1&traceTheme=Land+Defense"):
            await page.goto(BASE+"watch.html?"+urlencode({"fromGlobe":state}),wait_until="domcontentloaded",timeout=90000)
            link=page.locator("#watch-return-globe")
            await link.wait_for(state="visible",timeout=30000)
            from urllib.parse import parse_qs
            href=await link.get_attribute("href")
            assert urlsplit(href).path==urlsplit(BASE).path
            assert parse_qs(urlsplit(href).query)==parse_qs(state),(href,state)
        entries=await page.evaluate("ATLAS_WATCH.films.slice(0,2).map(f=>({id:f.fid,title:f.t}))")
        assert len(entries)==2
        initial=await page.locator("#watch-return-globe").get_attribute("href")
        for entry in entries:
            await page.evaluate("id=>{location.hash=encodeURIComponent(id)}",entry["id"])
            await page.wait_for_function("title=>document.querySelector('#now-title')?.textContent.startsWith(title)",arg=entry["title"])
            assert await page.locator("#watch-return-globe").is_visible()
            assert await page.locator("#watch-return-globe").get_attribute("href")==initial
        await page.goto(BASE+"watch.html",wait_until="domcontentloaded",timeout=90000)
        assert await page.locator("#watch-return-globe").is_hidden()
        print("WATCH_RETURN_ROUTES passed",flush=True)
        await page.goto(BASE+"flat.html",wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function("document.documentElement.dataset.atlasUi==='ready'",timeout=60000)
        assert urlsplit(page.url).path.endswith("/flat.html")
        assert await page.locator('script[src^="assets/globe.js"]').count()==0
        assert await page.evaluate("!window.AtlasGlobe?.active && document.documentElement.dataset.legacyWorkspace==='true'")
        assert (await page.locator('#atlas-rail [data-rail="map"]').get_attribute("href")).endswith("/flat.html")
        print("HIDDEN_FLAT",page.url,flush=True)
        await page.goto(BASE+"about.html",wait_until="domcontentloaded",timeout=90000)
        await page.locator("#atlas-rail").wait_for(state="visible")
        assert await page.locator('main .cta a[href="./"]').count()>=1
        assert await page.locator('main .cta a[href*="constellate=1"]').count()==0
        await page.locator('#atlas-rail [data-rail="map"]').click()
        await page.wait_for_function(READY,timeout=90000)
        assert page.url==BASE
        print("ABOUT_TO_MAP",page.url,flush=True)
        await browser.close()

if __name__=="__main__":
    asyncio.run(main())
