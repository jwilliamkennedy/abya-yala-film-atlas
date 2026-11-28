"""Keyboard navigation on the public beta, including the local overview renderer."""
import asyncio
import os
from urllib.parse import urlsplit
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("ATLAS_QA_BASE", "http://127.0.0.1:8985/beta/")
READY = "window.AtlasGlobe?.discovery.publication === 'ready' && document.documentElement.dataset.globeEntry==='ready' && AtlasGlobe.focus.settled"

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=os.environ.get("ATLAS_CHROMIUM") or None, args=["--no-sandbox"])
        context = await browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        origin = urlsplit(BASE).netloc
        await context.route(lambda u: urlsplit(u).netloc != origin, lambda r: r.abort())
        # Deliberately exercise the independent renderer without requesting tiles.
        await context.route("**/assets/maplibre/maplibre-gl.mjs*", lambda r: r.abort())
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE, wait_until="domcontentloaded", timeout=90000)
        await page.wait_for_function(READY, timeout=90000)
        await page.locator("#globe-find-toggle").click()
        search = page.locator("#globe-search")
        await search.fill("Iyonel")
        await search.press("ArrowDown")
        result = page.locator(".globe-search-film").first
        await expect(result).to_be_focused()
        await result.press("Enter")
        await page.wait_for_function("AtlasGlobe.focus.settled && AtlasGlobe.discovery.featured && document.querySelector('.globe-film-title')?.textContent==='Iyonel'", timeout=30000)

        summaries = page.locator("#globe-belt-details .globe-section-summary")
        await summaries.first.focus()
        await page.keyboard.press("ArrowRight")
        await expect(summaries.nth(1)).to_be_focused()
        await page.locator(".globe-related-details > summary").click()
        related = page.locator(".globe-related-row > .globe-related")
        assert await related.count() >= 2
        await related.first.focus()
        snapshot = await page.evaluate("JSON.stringify(AtlasCollections.current())")
        await page.keyboard.press("ArrowRight")
        await expect(related.nth(1)).to_be_focused()
        await page.keyboard.press("ArrowLeft")
        await expect(related.first).to_be_focused()
        assert await page.evaluate("JSON.stringify(AtlasCollections.current())") == snapshot
        # Tab to the paired action and activate it deliberately.
        await page.keyboard.press("Tab")
        await expect(page.locator(".globe-retain-related").first).to_be_focused()
        await page.keyboard.press("Enter")
        reason = page.locator("#globe-link-reason")
        await expect(reason).to_be_focused()
        await reason.fill("example")
        await reason.press("End")
        await reason.press("ArrowLeft")
        assert await reason.evaluate("e=>e.selectionStart") == 6
        chips = page.locator(".globe-link-reason-chip")
        await chips.first.focus()
        await page.keyboard.press("ArrowRight")
        await expect(chips.nth(1)).to_be_focused()
        assert await page.evaluate("AtlasCollections.current().links.length") == 0
        await page.keyboard.press("Enter")
        await page.wait_for_function("AtlasCollections.current().links.length===1")

        cited = page.locator(".globe-collected-item")
        await expect(cited).to_have_count(2)
        await page.locator("#globe-cited-jump").click()
        await expect(cited.first).to_be_focused()
        await page.keyboard.press("ArrowRight")
        await expect(cited.nth(1)).to_be_focused()
        await expect(page.locator(".globe-cited-position")).to_have_text("2 / 2")
        await expect(page.locator("#globe-cited-next")).to_be_disabled()
        await page.keyboard.press("Home")
        await expect(cited.first).to_be_focused()
        await page.locator("#globe-cited-next").click()
        await expect(cited.nth(1)).to_be_focused()
        await page.keyboard.press("Escape")
        await expect(page.locator("#globe-collection-panel")).to_be_hidden()
        await expect(page.locator("#globe-collection-toggle")).to_be_focused()
        await page.keyboard.press("ArrowDown")
        await expect(page.locator("#globe-cited-jump")).to_be_focused()
        await page.locator("#globe-read-thread").click()
        thread = await page.evaluate("AtlasCollections.activeThread().items")
        assert len(thread) == 2
        await page.wait_for_function("id=>AtlasGlobe.focus.settled && document.querySelector('#globe-encounter')?.dataset.film===id", arg=thread[0], timeout=30000)
        reading = page.locator(".globe-reading-journey")
        await expect(reading).to_be_focused(timeout=15000)
        await page.keyboard.press("ArrowRight")
        await page.wait_for_function("id=>AtlasGlobe.focus.settled && document.querySelector('#globe-encounter')?.dataset.film===id", arg=thread[1], timeout=30000)
        await expect(reading).to_be_focused(timeout=15000)
        await expect(reading.get_by_role("button", name="Next film in thread")).to_be_disabled()
        await page.keyboard.press("ArrowLeft")
        await page.wait_for_function("id=>AtlasGlobe.focus.settled && document.querySelector('#globe-encounter')?.dataset.film===id", arg=thread[0], timeout=30000)
        await expect(reading).to_be_focused(timeout=15000)
        await reading.get_by_role("button", name="Constellate").click()
        await expect(page.locator("#globe-cited-jump")).to_be_focused()
        await page.locator("#globe-collection-close").click()
        await expect(page.locator("#globe-collection-toggle")).to_be_focused()
        assert not errors, errors
        print("PASS: Find, disclosure and related-film focus; link draft isolation; cited-film browsing; keyboard thread traversal and focus restoration.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check())
