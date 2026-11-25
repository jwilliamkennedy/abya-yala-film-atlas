"""Exercise the real beta entry and the stale address reported by the maintainer.
Uses the production catalogue and local overview fallback, not mocked application state."""
import asyncio
import os
from urllib.parse import urlsplit
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
        for suffix in ("",STALE):
            await page.goto("about:blank")
            await page.goto(BASE+suffix,wait_until="domcontentloaded",timeout=90000)
            await page.wait_for_function(READY,timeout=90000)
            assert page.url==BASE,(suffix,page.url)
            assert not await page.locator("header .constellate-link").is_visible()
            assert await page.locator("#globe-close,.globe-legacy-link").count()==0
            await page.locator("#globe-find-toggle").click()
            assert await page.locator("#globe-search").is_visible()
            assert page.url==BASE
            print("CANONICAL_GLOBE",suffix or "clean",page.url,flush=True)
        await page.goto(BASE+"flat.html",wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function("document.documentElement.dataset.atlasUi==='ready'",timeout=60000)
        assert urlsplit(page.url).path.endswith("/flat.html")
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
