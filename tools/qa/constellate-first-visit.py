"""Constellate: what a first-time visitor sees (2026-11-11).

Runs the beta in a real browser and fails on the faults found in the 11 Nov review:
  1. the example opens with a visible thread;
  2. "Films that could come next" never offers a film already on the thread;
  3. Play hides the map controls and shows where you are;
  4. three theme threads get three different colours;
  5. the example's share link stays short enough to paste;
  6. no script errors;
  7. a published constellation opens at ?c=<slug> and is cited by that address.
Usage: python3 tools/qa/constellate-first-visit.py [base-url] [screenshot-dir]
Outside hosts are blocked so the result does not depend on tiles or hotlinked images.
"""
import asyncio, json, sys, os
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8983/beta/"
SHOTS = sys.argv[2] if len(sys.argv) > 2 else ""
ORIGIN = BASE.split("/")[0] + "//" + BASE.split("/")[2]
SHARE_LIMIT = 1500

VISIBLE = """(sel) => [...document.querySelectorAll(sel)].some(e => {
  const c = getComputedStyle(e), r = e.getBoundingClientRect();
  if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0 || r.width < 2 || r.height < 2) return false;
  const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
  const top = document.elementFromPoint(x, y);
  return !!top && (e === top || e.contains(top));
})"""


async def run(pw, width, height, mobile, label):
    fails, errors = [], []
    exe = os.environ.get("CHROME_PATH")
    browser = await pw.chromium.launch(args=["--no-sandbox"], **({"executable_path": exe} if exe else {}))
    ctx = await browser.new_context(viewport={"width": width, "height": height}, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    await page.route(lambda u: not u.startswith(ORIGIN), lambda r: r.abort())

    async def shot(name):
        if SHOTS:
            await page.screenshot(path=os.path.join(SHOTS, f"{label}-{name}.png"))

    def check(ok, message, detail=None):
        if not ok:
            fails.append(f"[{label}] {message}" + (f" :: {json.dumps(detail, ensure_ascii=False)[:400]}" if detail is not None else ""))

    await page.goto(BASE + "?constellate=1", wait_until="load", timeout=90000)
    await page.wait_for_function("window.AtlasConstellate?.enabled && document.querySelector('#weave-start')", timeout=60000)

    # 0a. an idle start screen stays idle. (Until 13 Nov a sync routine rewrote unchanged values, which
    # re-triggered itself on every frame; pages never settled and slow machines timed out.)
    await page.wait_for_timeout(2500)
    idle = await page.evaluate("""async () => { let n = 0;
      const o = new MutationObserver(ms => { for (const m of ms) if (!(m.target.closest && m.target.closest('#land-thumb-layer'))) n++; });
      o.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      await new Promise(r => setTimeout(r, 2000)); o.disconnect(); return n; }""")
    check(idle < 30, f"the idle start screen changed the page {idle} times in 2 seconds")

    # Discovery starts on the map; exploring does not author a constellation.
    await page.wait_for_function("document.documentElement.dataset.weaveStage==='build'")
    check(not await page.locator("#weave-start").is_visible(), "obsolete welcome covers the map")
    await page.locator("#weave-map-theme").wait_for(state="visible")
    before=await page.evaluate("JSON.stringify(window.AtlasCollections.current())")
    await page.locator("#weave-map-theme").select_option("Water")
    await page.locator(".weave-map-theme-results").wait_for(state="visible")
    check(await page.evaluate("JSON.stringify(window.AtlasCollections.current())")==before,"theme discovery changed collection")
    await page.locator("#weave-map-theme").select_option("")
    await page.evaluate("window.AtlasConstellate.close()")
    browse = page.locator("#weave-browse-films")
    disclosure = browse.locator("xpath=ancestor::details[not(@open)][1]/summary")
    if await disclosure.count():
        await disclosure.click()
    await browse.click()
    await page.locator("#constellate-search").fill("water")
    await page.wait_for_function("document.querySelectorAll('#constellate-results .constellate-result').length>0")
    check(await page.evaluate("JSON.stringify(window.AtlasCollections.current())")==before,"film search changed collection")
    await page.evaluate("window.AtlasConstellate.close()")

    # 0b. Trace a line: from the start screen, a drag across the map gathers lands in the order
    # crossed, and the thread holds one film from each kept land, pinned to that land, in that order.
    await page.locator("#weave-trace").click()
    await page.wait_for_function("window.AtlasConstellate.tracing === true", timeout=8000)
    await page.wait_for_timeout(1200)
    await page.keyboard.press("Escape")
    check(not await page.evaluate("window.AtlasConstellate.tracing"), "Escape did not leave Trace a line")
    await page.evaluate("window.AtlasConstellate.trace()")
    await page.wait_for_timeout(800)
    through = await page.evaluate("""() => { const A = window.Atlas, C = window.AtlasConstellate, s = document.querySelector('#atlas').getBoundingClientRect(), l = document.querySelector('#weave-trace-layer').getBoundingClientRect();
      const ids = [...new Set(C.catalog.filter(x => x.type === 'film' && x.record).flatMap(x => A.recordLandReferences(x.record).filter(r => r.mapped).map(r => r.id)))];
      const ms = ids.map(id => A.landMarkerReference(id)).filter(Boolean).map(k => ({ x: k.x + s.left, y: k.y + s.top })).filter(k => k.x > l.left + 12 && k.x < l.right - 12 && k.y > l.top + 70 && k.y < l.bottom - 12).sort((a, b) => a.y - b.y);
      return [ms[0], ms[Math.floor(ms.length / 2)], ms[ms.length - 1]]; }""")
    await page.mouse.move(through[0]["x"], through[0]["y"] - 10)
    await page.mouse.down()
    for q in through:
        await page.mouse.move(q["x"], q["y"], steps=16)
    await page.mouse.up()
    await page.wait_for_selector("#weave-trace-layer .wt-result:not([hidden])", timeout=8000)
    kept = await page.evaluate("""() => { const boxes = [...document.querySelectorAll('.wt-result [data-wt-land]')], step = Math.max(1, Math.floor(boxes.length / 3));
      boxes.forEach((b, i) => { if (i % step || i / step >= 3) b.click(); });
      return boxes.filter(b => b.checked).map(b => b.closest('li').querySelector('span').textContent); }""")
    check(len(kept) >= 2, "a line across the map gathered fewer than two lands", kept)
    await page.click(".wt-result [data-wt=one]")
    await page.wait_for_function("!window.AtlasConstellate.tracing && window.AtlasCollections.current().items.length >= 2", timeout=10000)
    made = await page.evaluate("""() => { const S = window.AtlasCollections, C = window.AtlasConstellate, c = S.current(), t = S.activeThread();
      return { lands: t.items.map(id => C.reference(c.items.find(x => x.id === id))?.name), lit: document.querySelectorAll('#atlas .nation-wash.trace-lit').length, stage: document.documentElement.dataset.weaveStage }; }""")
    in_order = [n for n in kept if n in made["lands"]]
    check(made["lands"] == in_order and len(made["lands"]) >= 2 and made["lit"] == 0 and made["stage"] == "build", "the traced thread is not one film per kept land, in line order", {"kept": kept, "made": made})
    await page.evaluate("localStorage.clear()")
    await page.goto(BASE + "?constellate=1", wait_until="load", timeout=90000)
    await page.wait_for_function("window.AtlasConstellate?.enabled && document.querySelector('#weave-start')", timeout=60000)

    # 1. the example
    # Seed the existing example fixture for the downstream playback/share tests.
    await page.evaluate("document.querySelector('#weave-example').click()")
    await page.wait_for_function("window.AtlasCollections.current().items.length >= 3", timeout=20000)
    await page.wait_for_timeout(2500)
    ex = await page.evaluate("""() => {
      const paths = [...document.querySelectorAll('#constellate-graph .weave-thread .weave-cord')];
      const longest = Math.max(0, ...paths.map(p => { try { return p.getTotalLength(); } catch { return 0; } }));
      const c = window.AtlasCollections.current();
      return { films: c.items.length, longest: Math.round(longest), cards: document.querySelectorAll('.constellate-card').length };
    }""")
    check(ex["longest"] > 120, "the example opens without a visible thread", ex)
    await shot("1-example")

    # 2. suggestions
    sug = await page.evaluate("""() => {
      const S = window.AtlasCollections, t = S.activeThread(), c = S.current();
      const key = (x) => String(x.title).normalize('NFD').replace(/\\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const on = new Set(t.items.map(id => c.items.find(x => x.id === id)).filter(Boolean).map(key));
      const offered = [...document.querySelectorAll('#weave-suggest .constellate-result strong')].map(e => e.textContent);
      return { offered, already: offered.filter(title => on.has(key({ title }))) };
    }""")
    check(not sug["already"], "a suggested film is already on the thread", sug)

    # 5. share link
    await page.evaluate("document.querySelector('#constellate-share').click()")
    await page.wait_for_function("document.querySelector('#weave-url')?.value.length > 20", timeout=10000)
    await page.wait_for_timeout(1800)
    n = await page.evaluate("document.querySelector('#weave-url').value.length")
    check(n <= SHARE_LIMIT, f"share link for the example is {n} characters (limit {SHARE_LIMIT})")
    await page.evaluate("document.querySelector('#constellate-edit').click()")

    # 4. colours
    await page.evaluate("""async () => { const C = window.AtlasConstellate;
      for (const t of ['Kinship', 'Water', 'Land Defense']) { C.themeThread(t); await new Promise(r => setTimeout(r, 600)); } C.fit('quiet'); }""")
    await page.wait_for_timeout(1500)
    colours = await page.evaluate("window.AtlasCollections.current().threads.map(t => [t.name, t.color])")
    check(len({c for _, c in colours}) == len(colours), "two threads share a colour", colours)
    await shot("2-threads")

    # 3. Play
    await page.evaluate("document.querySelector('#weave-play').click()")
    await page.wait_for_function("document.body.classList.contains('weave-playing')", timeout=10000)
    await page.wait_for_timeout(3000)
    for sel, name in [(".map-panel .zoom", "zoom buttons"), (".map-toolbar", "Countries / Layers / Map key")]:
        check(not await page.evaluate(VISIBLE, sel), f"Play still shows the {name}")
    where = await page.evaluate("""() => [...document.querySelectorAll('#weave-player *')].filter(e => {
        const r = e.getBoundingClientRect(), c = getComputedStyle(e);
        return !e.children.length && r.width > 20 && r.height > 8 && c.visibility !== 'hidden' && c.display !== 'none' && /\\b\\d+\\s+(of|OF)\\s+\\d+\\b/.test(e.textContent);
      }).map(e => e.textContent.trim())""")
    check(bool(where), "Play shows no visible position (n of m)")
    await shot("3-play")
    await page.keyboard.press("Escape")

    # 7. a published constellation opens by its short address and is cited by it
    idx = await page.evaluate("fetch('constellations/index.json').then(r => r.json())")
    slug = idx["constellations"][0]["slug"]
    await page.goto(BASE + "?c=" + slug, wait_until="load", timeout=90000)
    await page.wait_for_function("window.AtlasPublished?.current()", timeout=60000)
    await page.evaluate("document.querySelector('#constellate-share').click()")
    await page.wait_for_timeout(1800)
    pub = await page.evaluate("({films: window.AtlasCollections.current().items.length, url: document.querySelector('#weave-url').value, cite: document.querySelector('#weave-citation').textContent})")
    check(pub["films"] == idx["constellations"][0]["films"], "published constellation lost films", pub)
    check(len(pub["url"]) < 160 and pub["url"] in pub["cite"], "published constellation is not cited by its short address", pub)

    # All published film credits must survive hydration and have a reachable surface.
    # In particular, Yintah (FILM-0079) has a land name but may have no map marker.
    await page.evaluate("window.AtlasConstellate.setRead(false)")
    await page.wait_for_timeout(700)
    coverage = await page.evaluate("""() => {
      const S=window.AtlasCollections,C=window.AtlasConstellate,A=window.Atlas, c=S.current();
      const surface=id=>{
        const q=(s)=>[...document.querySelectorAll(s)].some(e=>e.getAttribute('data-weave-item')===id
          ||e.getAttribute('data-weave-knot')===id||e.getAttribute('data-offmap-item')===id);
        return q('#constellate-graph [data-weave-item]')||q('#constellate-graph .weave-star-label')
          ||q('#weave-offmap-rail [data-offmap-item]');
      };
      const rows=c.items.filter(x=>x.type==='film').map(x=>{
        const ref=C.reference(x), marker=ref&&A.landMarkerReference(ref.id);
        return {id:x.id,title:x.title,inThread:c.threads.some(t=>t.items.includes(x.id)),
          surface:surface(x.id),offmap:!!document.querySelector('#weave-offmap-rail [data-offmap-item="'+x.id+'"]'),
          mapped:!!marker};
      });
      return {rows,railDisplay:getComputedStyle(document.querySelector('#weave-offmap-rail')).display};
    }""")
    check(len(coverage["rows"]) == pub["films"], "published credits lost on the map", coverage)
    check(all(x["inThread"] and x["surface"] for x in coverage["rows"]),
          "published film cannot be reached on the map or off-map rail", coverage)
    yintah = next((x for x in coverage["rows"] if x["id"] == "film:DIR-0103:FILM-0079"), None)
    check(yintah is not None, "Yintah was omitted from the published constellation")
    if yintah is not None and not yintah["mapped"]:
        check(yintah["offmap"], "Yintah has no land marker but is missing from Off the map", coverage)
        check(coverage["railDisplay"] != "none", "Off the map rail is hidden while Yintah needs it", coverage)

    # Hiding the rail in Disappear map must really remove it from the layout.
    await page.evaluate("document.querySelector('#weave-unmap').click()")
    hidden_rail = await page.evaluate("""() => {
      const e=document.querySelector('#weave-offmap-rail');
      return {hidden:e.hidden,display:getComputedStyle(e).display};
    }""")
    check(hidden_rail == {"hidden": True, "display": "none"},
          "Off the map rail remains over the Disappear map view", hidden_rail)
    await page.evaluate("document.querySelector('#weave-unmap').click()")

    # The rail and all thread stops should survive selecting and reading Yintah.
    await page.evaluate("window.AtlasConstellate.choose('film:DIR-0103:FILM-0079')")
    selection = await page.evaluate("""() => ({
      context: document.querySelector('#constellate-context')?.textContent||'',
      selected: document.querySelector('#weave-offmap-rail [aria-current="true"]')?.dataset.offmapItem||''
    })""")
    check("Yintah" in selection["context"], "selecting Yintah did not open its context", selection)
    await page.evaluate("window.AtlasConstellate.setRead(true)")
    steps = await page.evaluate("""() => ({
      count:document.querySelectorAll('#weave-read-panel [data-read-step]').length,
      titles:[...document.querySelectorAll('#weave-read-panel [data-read-step]')].map(e=>e.textContent.trim())
    })""")
    check(steps["count"] == pub["films"] and any("Yintah" in t for t in steps["titles"]),
          "Follow does not contain all published films, including Yintah", steps)
    for _ in range(max(0, pub["films"] - 1)):
        await page.evaluate("document.querySelector('#weave-read-next')?.click()")
    last = await page.evaluate("document.querySelector('#weave-read-panel .weave-read-nav span')?.textContent.trim()")
    expected = await page.evaluate("""() => {
      const t = window.AtlasCollections.current().threads.filter(t => t.visible && t.items.length).at(-1);
      return t.items.length + ' / ' + t.items.length + ' · ' + t.name;
    }""")
    check(last == expected, "Read did not reach the final stop on the final thread", last)

    # Play must progress through the same sequence, including Yintah.
    await page.evaluate("""() => {
      const S=window.AtlasCollections,C=window.AtlasConstellate;
      const items=S.current().threads.filter(t=>t.visible).flatMap(t=>t.items);
      C.play(items.indexOf('film:DIR-0103:FILM-0079'));
    }""")
    play_yintah = await page.evaluate("document.querySelector('#weave-play-title')?.textContent")
    check(play_yintah == "Yintah", "Play cannot open Yintah", {"title": play_yintah})
    await page.evaluate("document.querySelector('#weave-play-next').click()")
    play_next = await page.evaluate("document.querySelector('#weave-play-title')?.textContent")
    check(play_next == "Punalka", "Play cannot progress from Yintah to Punalka", {"title": play_next})
    await page.evaluate("window.AtlasConstellate.stopPlay()")

    # Give Mamá two positions and two different notes in this browser's copy.
    routes = await page.evaluate("""() => {
      const store = window.AtlasCollections;
      const [story, memory] = store.current().threads;
      const id = memory.items[1];
      store.addToThread(id, story.id);
      store.threadNote(story.id, id, 'Crossing test');
      return [story.id, memory.id, id];
    }""")
    story, memory, film = routes
    label = page.locator(f'[data-read-thread="{memory}"]')
    await label.focus()
    await label.press("Enter")
    await page.locator(f'[data-thread="{memory}"] [data-weave-knot="{film}"]').first.dispatch_event("click")
    title = page.locator(".weave-read-focus h4")
    check(await title.text_content() == "Mamá", "Map selection in Read missed Mamá")
    await page.locator(f'.weave-read-focus [data-switch-thread="{story}"]').click()
    check(await title.text_content() == "Mamá", "Switching threads lost the crossing film")
    check("Crossing test" in await page.locator(".weave-read-focus").inner_text(), "Wrong thread note at crossing")
    await page.evaluate("document.querySelector('#weave-play').click()")
    check(await page.locator("#weave-play-title").text_content() == "Mamá", "Play restarted at the first film")
    await page.evaluate("window.AtlasConstellate.stopPlay()")
    await page.locator("#weave-read-prev").click()
    check("Fainting Spells" in await title.inner_text(), "Previous followed the wrong thread")

    # Leaving and clearing do only what they say (13 Nov): × on the start screen and Clear both leave an empty Build.
    stage = lambda: page.evaluate("document.documentElement.dataset.weaveStage")
    await page.evaluate("window.AtlasConstellate.setRead(false)")
    await page.locator(".weave-more > summary").press("Enter")
    await page.locator("#constellate-clear").click()
    await page.wait_for_function("window.AtlasCollections.current().items.length===0")
    await page.locator("#constellate-undo").click()
    check(await page.evaluate("window.AtlasCollections.current().items.length") == pub["films"], "Undo failed to restore the cleared films")
    await page.wait_for_timeout(900)
    check(await stage() == "build", "Clear left Build", await stage())
    await page.evaluate("localStorage.clear()")
    await page.goto(BASE + "?constellate=1", wait_until="load", timeout=90000)
    await page.wait_for_function("window.AtlasConstellate?.enabled && document.documentElement.dataset.weaveStage==='build'")
    check(not await page.locator("#weave-start").is_visible(),"reentry opened obsolete welcome")
    check(await page.evaluate("window.AtlasCollections.current().items.length===0"),"reentry unexpectedly populated collection")
    # The Map page offers a thread from an open land.
    await page.goto(BASE + "?globe=0", wait_until="load", timeout=90000)
    await page.wait_for_timeout(3500)
    # Draw on the Map page draws without entering Constellate; Escape ends it.
    await page.click("#map-draw-line")
    await page.wait_for_timeout(500)
    st = await page.evaluate("[window.AtlasConstellate.tracing, window.AtlasConstellate.enabled]")
    check(st == [True, False], "Draw on the Map page did not start a line on the map", st)
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(300)
    check(not await page.evaluate("window.AtlasConstellate.tracing"), "Escape did not end drawing on the Map page")
    await page.evaluate("document.querySelector('#atlas .land-word[data-ui-tier]').dispatchEvent(new MouseEvent('click',{bubbles:true}))")
    await page.wait_for_selector("[data-land-thread]", timeout=15000)
    await page.click("[data-land-thread]")
    await page.wait_for_function("window.AtlasConstellate.enabled && window.AtlasCollections.activeThread().items.length >= 1", timeout=15000)

    check(not errors, "script errors", errors[:5])
    await browser.close()
    return fails


async def main():
    async with async_playwright() as pw:
        fails = await run(pw, 1440, 900, False, "desktop") + await run(pw, 390, 844, True, "phone")
    if fails:
        print("\n".join(fails))
        sys.exit(1)
    print("Constellate first-visit checks passed (desktop and phone).")


asyncio.run(main())
