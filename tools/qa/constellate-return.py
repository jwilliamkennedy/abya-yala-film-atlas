"""Beta: returning from Constellate must restore the actual interactive Map."""
import asyncio
import os
from playwright.async_api import async_playwright

BASE = os.environ.get("ATLAS_QA_BASE", "http://127.0.0.1:8985/beta/")

READY = """() => window.AtlasConstellate?.enabled &&
    document.documentElement.dataset.atlasUi === 'ready'"""
MAP_READY = """() => {
    const root=document.documentElement, map=document.querySelector('#atlas');
    const index=document.querySelector('#index'), style=getComputedStyle(map);
    return !window.AtlasConstellate?.enabled &&
      root.dataset.atlasEntry==='map' && !root.dataset.weaveStage &&
      !new URL(location.href).searchParams.has('constellate') &&
      !document.body.matches('.is-constellating,.weave-tracing,.is-theme-web-open,.weave-playing,.weave-unmapped,.weave-theme-lens') &&
      style.visibility==='visible' && style.opacity==='1' &&
      getComputedStyle(index).visibility==='visible' &&
      document.querySelector('#constellate-graph').hidden.baseVal !== false &&
      document.querySelector('#weave-trace-layer')?.hidden !== false &&
      document.querySelector('#atlas-theme-web')?.hidden !== false;
}"""
# SVG elements may not expose an HTML-style hidden property; test the attribute.
MAP_READY = MAP_READY.replace(
    "document.querySelector('#constellate-graph').hidden.baseVal !== false",
    "document.querySelector('#constellate-graph').hasAttribute('hidden')"
)
SNAPSHOT = """() => {
  const c=window.AtlasCollections.current();
  return JSON.stringify([c.items,c.threads,c.links]);
}"""

async def check(browser, name, viewport):
    context = await browser.new_context(viewport=viewport, reduced_motion="reduce")
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(BASE+"?constellate=1", wait_until="domcontentloaded", timeout=90000)
    await page.wait_for_function(READY, timeout=60000)
    await page.wait_for_function("window.AtlasThemeWeb?.close && document.getElementById('map-draw-line')", timeout=30000)
    # Direct entry; trace must be cleared by Exit.
    await page.evaluate("window.AtlasConstellate.trace()")
    await page.wait_for_function("window.AtlasConstellate.tracing")
    await page.evaluate("document.getElementById('constellate-exit').click()")
    await page.wait_for_function(MAP_READY, timeout=30000)
    # The map must receive a real interaction after returning.
    # Choose a direction that is not already at the zoom limit, and measure actual camera scale.
    prior = await page.evaluate("window.Atlas.captureState().scale")
    zoom_in = await page.locator('#zoom-in').is_enabled()
    await page.locator('#zoom-in' if zoom_in else '#zoom-out').click(timeout=15000)
    try:
        await page.wait_for_function('v => Math.abs(window.Atlas.captureState().scale-v)>0.01', arg=prior, timeout=15000)
    except Exception:
        print('MAP_RETURN_CAMERA', await page.evaluate('({scale:window.Atlas.captureState().scale,zoom:window.Atlas.captureState().zoom,body:document.body.className,entry:document.documentElement.dataset.atlasEntry})'), 'prior',prior, 'errors', errors, flush=True)
        raise

    # Re-enter without reload; explore a documented theme intersection without editing.
    await page.evaluate("document.querySelector('header .constellate-link').click()")
    await page.wait_for_function(READY, timeout=30000)
    snapshot = await page.evaluate(SNAPSHOT)
    storage = await page.evaluate("localStorage.getItem('atlas-collections-v1')")
    # Successive star clicks replace the active discovery surface.
    await page.wait_for_function("document.querySelectorAll('#atlas .land-sky-star').length>1")
    lands = await page.evaluate("""() => {
      const stars=[...document.querySelectorAll('#atlas .land-sky-star')];
      return stars.slice(0,2).map(s=>s.__data__.ids);
    }""")
    await page.evaluate("ids=>window.AtlasConstellate.openLands(ids)", lands[0])
    await page.locator("#weave-land").wait_for(state="visible")
    await page.evaluate("""() => {
      const api=window.AtlasConstellate;
      api.showPreview(api.catalog.find(x=>x.type==='film'));
    }""")
    await page.locator("#weave-film-preview").wait_for(state="visible")
    await page.evaluate("ids=>window.AtlasConstellate.openLands(ids)", lands[1])
    await page.locator("#weave-land").wait_for(state="visible")
    assert await page.locator("#weave-film-preview").is_hidden(), (name,"previous film still visible")
    assert await page.evaluate("window.AtlasConstellate.selectedLandIds")==lands[1], (name,"wrong star selection")
    assert await page.evaluate(SNAPSHOT)==snapshot, (name,"star browsing changed collection")
    # Actual film preview: no collection change, no local persistence.
    await page.evaluate("""() => {
      const api=window.AtlasConstellate;
      const film=api.catalog.find(x=>x.type==='film' && api.terms(x).length);
      if(!film || !api.showPreview(film)) throw Error('No film preview');
    }""")
    await page.locator("#weave-film-preview").wait_for(state="visible")
    assert await page.evaluate(SNAPSHOT)==snapshot, (name,"preview changed collection")
    assert await page.evaluate("localStorage.getItem('atlas-collections-v1')")==storage, (name,"preview persisted")
    related=page.locator('#weave-film-preview [data-preview-film]').first
    if await related.count():
        first=await page.locator('#weave-film-preview h3').inner_text()
        await related.click()
        await page.locator('#weave-film-preview [data-preview-back]').click()
        assert await page.locator('#weave-film-preview h3').inner_text()==first, (name,'related-film Back lost previous film')
        assert await page.evaluate(SNAPSHOT)==snapshot, (name,'related-film browsing changed collection')
    await page.locator("#weave-film-preview [data-explore-theme]").first.click()
    await page.wait_for_function("document.getElementById('weave-map-theme').value!==''")
    assert await page.evaluate(SNAPSHOT)==snapshot, (name,"theme chip changed collection")
    await page.evaluate("document.querySelector('#weave-theme-lens button').click()")
    await page.locator("#weave-film-preview [data-preview-back]").click()
    themes = await page.evaluate("""() => {
      const api=window.AtlasConstellate, terms=api.themeTerms();
      for (let i=0;i<terms.length;i++) for(let j=i+1;j<terms.length;j++)
        if(api.themeIntersection([terms[i],terms[j]]).length) return [terms[i],terms[j]];
      return terms.slice(0,1);
    }""")
    assert themes, (name, "no published themes")
    camera_before=await page.evaluate('window.Atlas.captureState().scale')
    await page.locator('#weave-map-theme').select_option(themes[0])
    if len(themes)>1:
        await page.locator('#weave-map-theme-second').select_option(themes[1])
    result = await page.evaluate("""themes => {
      const api=window.AtlasConstellate, films=api.themeIntersection(themes);
      return {ok:document.getElementById('weave-map-theme').value===themes[0] && (themes.length===1 || document.getElementById('weave-map-theme-second').value===themes[1]),count:films.length,
              exact:films.every(f=>themes.every(t=>api.terms(f).includes(t)))};
    }""", themes)
    assert result["ok"] and result["count"] and result["exact"], (name, result)
    # Once the dock is open, changing the second term should not move the camera.
    camera_filtered=await page.evaluate('window.Atlas.captureState().scale')
    if len(themes)>1:
        await page.locator('#weave-map-theme-second').select_option('')
        await page.locator('#weave-map-theme-second').select_option(themes[1])
        assert abs(await page.evaluate('window.Atlas.captureState().scale')-camera_filtered)<0.01, (name,'theme selection moved camera')
    assert await page.evaluate(SNAPSHOT) == snapshot, (name, "theme exploration mutated the saved collection")
    await page.evaluate("document.getElementById('weave-theme-web-toggle').click()")
    await page.wait_for_function("!document.getElementById('atlas-theme-web').hidden")
    # Map header uses the same in-page exit, not a reload.
    await page.evaluate("window.__atlasReturnTest=1;document.querySelector('header .map-link').click()")
    await page.wait_for_function(MAP_READY, timeout=30000)
    assert await page.evaluate("window.__atlasReturnTest") == 1, (name, "Map reloaded")
    assert await page.evaluate(SNAPSHOT) == snapshot, (name, "exit mutated the collection")
    await page.evaluate("document.querySelector('header .constellate-link').click()")
    await page.wait_for_function(READY, timeout=30000)
    assert await page.evaluate("!window.AtlasConstellate.tracing && !document.getElementById('weave-theme-lens').hidden && document.getElementById('weave-map-theme').value===''"), name
    await page.evaluate("document.getElementById('constellate-exit').click()")
    await page.wait_for_function(MAP_READY, timeout=30000)
    # Add, save, then edit: only the explicit Save operation changes storage.
    await page.evaluate("document.querySelector('header .constellate-link').click()")
    await page.wait_for_function(READY, timeout=30000)
    await page.evaluate("""() => {
      const api=window.AtlasConstellate;
      api.showPreview(api.catalog.find(x=>x.type==='film'));
    }""")
    await page.locator("#weave-film-preview [data-preview-add]").click()
    assert await page.evaluate("localStorage.getItem('atlas-collections-v1')")==storage, (name,"Add persisted draft")
    await page.evaluate("document.getElementById('constellate-save').click()")
    saved = await page.evaluate("localStorage.getItem('atlas-collections-v1')")
    assert saved and saved!=storage, (name,"explicit Save did not persist")
    await page.evaluate("window.AtlasCollections.addConcept('Temporary test star')")
    assert await page.evaluate("localStorage.getItem('atlas-collections-v1')")==saved, (name,"edit persisted")
    assert not errors, (name, errors)
    print(name, "map return and theme intersection passed", result, flush=True)
    await context.close()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        try:
            for name, viewport in [("desktop", {"width":1440,"height":900}), ("mobile", {"width":390,"height":844})]:
                await check(browser, name, viewport)
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
