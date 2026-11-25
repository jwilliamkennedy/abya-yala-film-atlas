"""Verify portable globe collections across isolated browser profiles."""
import asyncio
import os

from urllib.parse import urlsplit

from playwright.async_api import async_playwright, expect

BASE = os.environ.get("ATLAS_QA_BASE", "http://127.0.0.1:8985/beta/")
READY = "window.AtlasGlobe?.discovery.publication === 'ready' && window.AtlasGlobe.focus.settled"
CONTENTS = """() => {
    const {items, threads, links, pins, activeThread} = AtlasCollections.current();
    return {items, threads, links, pins, activeThread};
}"""


async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        viewport = {"width": 1440, "height": 900}
        origin = urlsplit(BASE).netloc
        sender = await browser.new_context(viewport=viewport, permissions=["clipboard-read", "clipboard-write"], reduced_motion="reduce")
        # External media is outside this persistence test. Its separate audit exercises live hosts.
        await sender.route(lambda url: urlsplit(url).scheme in ("https", "http") and urlsplit(url).netloc != origin, lambda r: r.abort())
        page = await sender.new_page()
        await page.goto(BASE + "?constellate=1&globe=1", wait_until="domcontentloaded")
        await page.wait_for_function(READY, timeout=90000)
        # Select distinct public credits deterministically, using their own land references.
        stops = await page.evaluate("""() => {
          const chosen = [], credits = AtlasGlobe.artworkInventory().credits;
          const mapped = new Set(AtlasGlobe.anchors.map(a => a.id));
          for (const c of credits) {
            const land = c.lands.find(l => mapped.has(l) && !chosen.some(s => s.land === l));
            if (land) chosen.push({land, film:c.id});
            if (chosen.length === 2) break;
          }
          return chosen;
        }""")
        assert len(stops) == 2
        for stop in stops:
            await page.locator("#globe-find-toggle").click()
            await page.locator("#globe-find").select_option(stop["land"])
            await page.wait_for_function("id=>AtlasGlobe.focus.settled && AtlasGlobe.discovery.featured?.land===id", arg=stop["land"])
            collect = page.locator("#globe-collect-film")
            if await collect.is_disabled():
                await page.locator("#globe-surprise").click()
                await expect(collect).to_be_enabled()
            await collect.click()
            await expect(collect).to_be_disabled()
        assert await page.evaluate("Object.keys(AtlasCollections.current().pins).length===2 && AtlasCollections.current().links.length===0")
        await page.locator("#globe-collection-toggle").click()
        await page.locator("#globe-draw-link").click()
        films = page.locator(".globe-collected-item")
        await films.nth(0).click()
        await films.nth(1).click()
        await page.get_by_label("Connection reason").fill("Shared screening")
        await page.get_by_role("textbox", name="Connection note").fill("Compare the opening sequences.")
        await page.locator(".globe-link-form button[type=submit]").click()
        assert await page.evaluate("localStorage.getItem('atlas-collections-v1')") is None
        await page.locator("#globe-save-collection").click()
        expected = await page.evaluate(CONTENTS)
        featured = await page.evaluate("AtlasGlobe.discovery.featured")
        camera = await page.evaluate("AtlasGlobe.camera")
        await page.get_by_role("button", name="Share constellation", exact=True).click()
        link = await page.evaluate("navigator.clipboard.readText()")
        assert "#weave=" in link and "globe=1" in link

        receiver = await browser.new_context(viewport=viewport, reduced_motion="reduce")
        await receiver.route(lambda url: urlsplit(url).scheme in ("https", "http") and urlsplit(url).netloc != origin, lambda r: r.abort())
        opened = await receiver.new_page()
        for _ in range(2):
            await opened.goto("about:blank")
            await opened.goto(link, wait_until="domcontentloaded")
            await opened.wait_for_function(READY, timeout=90000)
            await opened.wait_for_function("AtlasCollections.current().items.length===2")
            assert await opened.evaluate(CONTENTS) == expected
            assert await opened.evaluate("AtlasGlobe.discovery.featured") == featured
            assert await opened.evaluate("AtlasGlobe.discovery.collection.stars") == 2
            assert await opened.evaluate("localStorage.getItem('atlas-collections-v1')") is None
            actual = await opened.evaluate("AtlasGlobe.camera")
            assert max(abs(a-b) for a,b in zip(actual["center"],camera["center"])) < .02
            assert abs(actual["zoom"]-camera["zoom"]) < .01
            await expect(opened.locator("#constellate-popup")).to_be_hidden()
        print("Shared link opened in a clean profile. Exact credits, pins, threads, note, link, stars and camera matched.")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(check())
