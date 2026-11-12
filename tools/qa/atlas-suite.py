"""Atlas browser suite (Claude, 2026-11-12).

Drives the site through its main states in a real browser and does two things in each:
  * checks that it works (hard failures: script errors, missing controls, wrong counts, page overflow on a phone);
  * records a fingerprint of what is on screen: every visible element's position, size, text and computed style.

Two fingerprints can then be compared, element by element, so a change that was meant to leave the
page looking the same can be proved to have done so, and a change that moved something says what moved.

  python3 tools/qa/atlas-suite.py capture <base-url> <out-dir> [--shots] [--only name,name]
  python3 tools/qa/atlas-suite.py compare <dir-before> <dir-after> [--limit N]

<base-url> is the folder to test, e.g. http://127.0.0.1:8983/ (main) or http://127.0.0.1:8983/beta/.
Outside hosts are blocked, so results do not depend on map tiles or hotlinked images.
Set CHROME_PATH to use a specific browser binary.
"""
import asyncio, gzip, json, os, re, sys

PUBLISHED = "constellations-of-indigenous-cinema"

PROPS = ["display", "visibility", "opacity", "color", "background-color", "background-image", "border-top-width",
         "border-right-width", "border-bottom-width", "border-left-width", "border-top-color", "border-bottom-color",
         "border-top-style", "border-top-left-radius", "border-bottom-right-radius", "font-family", "font-size",
         "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "text-decoration-line",
         "text-align", "white-space", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top",
         "margin-bottom", "position", "z-index", "overflow-x", "overflow-y", "box-shadow", "transform", "filter",
         "cursor", "pointer-events", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
         "stroke-dasharray", "outline-style", "outline-width", "mix-blend-mode", "gap", "flex-direction",
         "justify-content", "align-items", "grid-template-columns"]

FINGERPRINT = """(PROPS) => {
  const rows = [], seen = {}, groups = {};
  const cls = e => { const c = e.getAttribute('class'); return c ? '.' + c.trim().split(/\\s+/).sort().join('.') : ''; };
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls(e);
  const short = v => v.length > 90 ? v.slice(0, 40) + '…' + v.length + '…' + v.slice(-30) : v;
  const vh = innerHeight, vw = innerWidth;
  for (const e of document.body.querySelectorAll('*')) {
    const tag = e.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'TEMPLATE') continue;
    if (e.closest('#atlas-basemap, #land-thumb-layer, .geography .base, #weave-notice')) continue;   // map tiles and their fallback land shapes; film stills that rotate on a timer; the status notice that times out
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.bottom < -50 || r.top > vh + 400 || r.right < -50 || r.left > vw + 50) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const p = e.parentElement, parent = p ? name(p) : '', group = parent + '>' + name(e);
    groups[group] = (groups[group] || 0) + 1;
    if (groups[group] > 8) continue;                      // long runs of like siblings: keep the first eight
    const gp = p && p.parentElement ? name(p.parentElement) + '>' : '';
    let key = gp + group; seen[key] = (seen[key] || 0) + 1; key += '~' + seen[key];
    let text = ''; for (const n of e.childNodes) if (n.nodeType === 3) text += n.textContent;
    text = text.replace(/\\s+/g, ' ').trim().slice(0, 60);
    const style = PROPS.map(k => short(cs.getPropertyValue(k)));
    const pseudo = ['::before', '::after'].map(s => { const c = getComputedStyle(e, s); return c.content === 'none' || c.content === 'normal' ? '' : [short(c.content), c.color, c.backgroundColor, c.width, c.height, c.opacity].join('|'); });
    const box = tag === 'g' ? [0, 0, 0, 0] : [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];   // an SVG group's box is only the union of its children, which are recorded themselves
    rows.push([key, box, text, style, pseudo]);
  }
  return { rows, groups: Object.fromEntries(Object.entries(groups).filter(([, n]) => n > 8)), page: [document.documentElement.scrollWidth, innerWidth, innerHeight], body: document.body.className.split(/\\s+/).sort().join(' '), html: Object.fromEntries(Object.entries(document.documentElement.dataset)) };
}"""

QUICK = """() => { let n = 0, s = 0; for (const e of document.body.querySelectorAll('*')) { if (e.closest('#atlas-basemap, #land-thumb-layer, .geography .base, #weave-notice')) continue; const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { n++; s += Math.round(r.x) * 3 + Math.round(r.y) * 7 + Math.round(r.width) + Math.round(r.height) * 5 + Math.round(parseFloat(getComputedStyle(e).opacity) * 100); } } return n + ':' + s; }"""

SEED = """(() => { let s = 20261112; Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })();"""


class Fail(Exception):
    pass


def need(ok, message, detail=None):
    if not ok:
        raise Fail(message + (" :: " + json.dumps(detail, ensure_ascii=False)[:300] if detail is not None else ""))


async def settle(page, quiet=450, limit=12000):
    last, waited, same = None, 0, 0
    while waited < limit:
        await page.wait_for_timeout(quiet)
        waited += quiet
        now = await page.evaluate(QUICK)
        same = same + 1 if now == last else 0
        if same >= 2:          # three equal readings in a row
            return
        last = now


async def fallback_map(page):
    # Map tiles are blocked here, so the atlas falls back to its own land shapes after a timeout.
    # Wait for that, so every run fingerprints the same map.
    try:
        await page.wait_for_function("document.querySelector('.geography')?.dataset.geographyFallback === 'true' && document.querySelector('.geography')?.dataset.geographyVisible === 'true'", timeout=25000)
    except Exception:
        pass


async def atlas_ready(page):
    await page.wait_for_function("window.Atlas && document.querySelectorAll('#atlas .land-word').length > 5", timeout=60000)
    await fallback_map(page)


async def constellate_ready(page):
    await page.wait_for_function("window.AtlasConstellate?.enabled && window.AtlasCollections", timeout=60000)
    await fallback_map(page)


# ---- scenarios: each opens a state, checks it, and leaves the page ready to be fingerprinted ----
async def map_home(page, base):
    await page.goto(base, wait_until="load"); await atlas_ready(page)
    info = await page.evaluate("""() => ({ lands: document.querySelectorAll('#atlas .land-word').length,
      tools: [...document.querySelectorAll('.map-toolbar summary, .map-toolbar #td-toggle')].map(e => e.textContent.trim()),
      counts: [...document.querySelectorAll('header strong, header b, header [class*=count]')].map(e => e.textContent.trim()).filter(t => /^[\\d,]+$/.test(t)),
      rows: document.querySelectorAll('#index .entry').length })""")
    need(info["lands"] >= 10, "fewer than ten land names on the opening map", info)
    need({"Countries", "Layers", "Map key", "Time"} <= set(info["tools"]), "map toolbar is missing a control", info["tools"])
    need(len(info["counts"]) >= 2, "header film and filmmaker counts are missing", info["counts"])
    need(info["rows"] >= 5, "the filmmaker list is empty", info)


async def map_night(page, base):
    await map_home(page, base)
    await page.click(".ui-theme-toggle")
    await page.wait_for_function("document.documentElement.dataset.readingTheme === 'night'", timeout=8000)


async def map_key(page, base):
    await map_home(page, base)
    await page.click(".map-toolbar summary:has-text('Map key')")
    await page.wait_for_selector("#map-info #visual-key", state="visible", timeout=8000)
    order = await page.evaluate("() => { const k = document.querySelector('#visual-key').getBoundingClientRect().top, s = document.querySelector('#map-info .map-external-links').getBoundingClientRect().top; return [k, s]; }")
    need(order[0] < order[1], "Map key: the key no longer comes before the source links", order)


async def map_layers(page, base):
    await map_home(page, base)
    await page.click(".map-toolbar summary:has-text('Layers')")
    await page.wait_for_timeout(400)
    need(await page.evaluate("!!document.querySelector('.map-toolbar details[open]')"), "Layers did not open")


async def map_search(page, base):
    await map_home(page, base)
    await page.fill("input[placeholder^='Search filmmakers']", "Obomsawin")
    await page.wait_for_function("[...document.querySelectorAll('#index .entry strong')].some(e => /Obomsawin/.test(e.textContent))", timeout=10000)


async def map_record(page, base):
    await map_search(page, base)
    await page.click("#index .entry:has(strong:has-text('Obomsawin')) .entry-button")
    await page.wait_for_function("/Obomsawin/.test(document.querySelector('#index')?.innerText || '') && /Abenaki/.test(document.querySelector('#index')?.innerText || '')", timeout=10000)
    await settle(page)
    await page.evaluate("document.querySelector('#index .entry.selected')?.scrollIntoView({ block: 'start' })")


async def map_dial(page, base):
    await page.goto(base + "?dial=1995", wait_until="load"); await atlas_ready(page)
    await page.wait_for_selector("#td-bar", state="visible", timeout=15000)
    await page.wait_for_function("document.querySelector('#td-year')?.textContent === '1995'", timeout=8000)
    d = await page.evaluate("""() => ({ count: document.querySelector('#td-count').textContent,
      states: [...document.querySelectorAll('#atlas .land-word')].reduce((m, e) => (m[e.dataset.td] = (m[e.dataset.td] || 0) + 1, m), {}) })""")
    need(re.match(r"^[\d,]+ films · \d+ of \d+ lands$", d["count"]), "time dial readout is malformed", d)
    need(d["states"].get("dark", 0) > 0 and (d["states"].get("lit", 0) + d["states"].get("new", 0)) > 0, "time dial at 1995 should show both lit and unlit lands", d)
    full = await page.evaluate("() => { window.AtlasTimeDial.set(9999); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r([...document.querySelectorAll('#atlas .land-word[data-td=dark]')].length)))); }")
    need(full == 0, "time dial at its last year still leaves lands dark", full)
    await page.evaluate("window.AtlasTimeDial.set(1995)")


async def dial_closed(page, base):
    await map_dial(page, base)
    await page.click("#td-close")
    left = await page.evaluate("document.querySelectorAll('#atlas [data-td]').length")
    need(left == 0, "closing the time dial left lands dimmed", left)


async def con_start(page, base):
    await page.goto(base + "?constellate=1", wait_until="load"); await constellate_ready(page)
    await page.wait_for_selector("#weave-start", state="visible", timeout=20000)
    need(await page.evaluate("!!document.querySelector('[data-ws-example]') && document.querySelectorAll('[data-ws-theme]').length >= 3"), "Constellate start card is missing its three ways in")


async def con_follow(page, base):
    await page.goto(base + "?c=" + PUBLISHED, wait_until="load"); await constellate_ready(page)
    await page.wait_for_function("window.AtlasPublished?.current()", timeout=60000)
    info = await page.evaluate("({ films: window.AtlasCollections.current().items.length, threads: window.AtlasCollections.current().threads.length, reading: document.querySelector('#constellate-read').getAttribute('aria-pressed') })")
    need(info["films"] == 8 and info["threads"] == 3 and info["reading"] == "true", "published constellation did not open in Follow with 8 films on 3 threads", info)


async def con_build(page, base):
    await con_follow(page, base)
    await page.evaluate("document.querySelector('#constellate-edit').click()")
    await page.wait_for_function("document.documentElement.dataset.weaveStage === 'build'", timeout=8000)
    drawn = await page.evaluate("document.querySelectorAll('#constellate-graph .weave-thread').length")
    need(drawn == 3, "Build should draw three threads", drawn)


async def con_select(page, base):
    await con_build(page, base)
    await settle(page)
    await page.click("#constellate-graph .weave-star-label >> nth=2", force=True)
    await page.wait_for_selector("#constellate-context h3", state="visible", timeout=8000)
    need(await page.evaluate("document.querySelectorAll('#constellate-graph .constellate-card').length >= 1"), "selecting a film did not open its card")


async def con_add(page, base):
    await con_build(page, base)
    await page.evaluate("document.querySelector('#weave-tab-add').click()")
    await page.fill("#constellate-search", "kinship")
    await page.wait_for_timeout(700)
    n = await page.evaluate("document.querySelectorAll('#constellate-results .constellate-result, #weave-az .constellate-result, .constellate-result').length")
    need(n > 0, "Add films: a search for 'kinship' returned nothing")


async def con_share(page, base):
    await con_follow(page, base)
    await page.evaluate("document.querySelector('#constellate-share').click()")
    await page.wait_for_function("document.querySelector('#weave-url')?.value.length > 20", timeout=10000)
    await page.wait_for_timeout(1800)
    s = await page.evaluate("({ url: document.querySelector('#weave-url').value, cite: document.querySelector('#weave-citation').textContent })")
    need(len(s["url"]) < 160 and s["url"] in s["cite"], "published constellation is not cited by its short address", s)


async def con_play(page, base):
    await con_follow(page, base)
    await page.evaluate("document.querySelector('#weave-play').click()")
    await page.wait_for_function("document.body.classList.contains('weave-playing')", timeout=10000)
    await page.wait_for_timeout(1500)
    await page.keyboard.press("Space")                    # pause, then show a fixed stop
    await page.evaluate("window.AtlasConstellate.playStep(1)")
    await page.wait_for_timeout(2500)
    shown = await page.evaluate("""() => ['.map-panel .zoom', '.map-toolbar'].filter(s => [...document.querySelectorAll(s)].some(e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 2; }))""")
    need(not shown, "Play still shows map controls", shown)


async def con_themeweb(page, base):
    await con_build(page, base)
    await page.evaluate("document.querySelector('#weave-theme-web-toggle').click()")
    await page.wait_for_selector("#atlas-theme-web", state="visible", timeout=10000)
    need(await page.evaluate("document.querySelectorAll('#atlas-theme-web svg circle, #atlas-theme-web [data-tw-node]').length > 5"), "Theme web drew no nodes")


async def con_threads(page, base):
    await page.goto(base + "?constellate=1", wait_until="load"); await constellate_ready(page)
    await page.wait_for_selector("#weave-start", state="visible", timeout=20000)
    await page.evaluate("async () => { const C = window.AtlasConstellate; for (const t of ['Kinship', 'Water', 'Land Defense']) { C.themeThread(t); await new Promise(r => setTimeout(r, 600)); } C.fit('quiet'); }")
    colours = await page.evaluate("window.AtlasCollections.current().threads.map(t => t.color)")
    need(len(set(colours)) == 3, "three theme threads should have three colours", colours)


async def con_unmapped(page, base):
    await con_build(page, base)
    await page.evaluate("document.querySelector('#weave-unmap').click()")
    await page.wait_for_function("document.body.classList.contains('weave-unmapped')", timeout=8000)


async def con_night(page, base):
    await con_build(page, base)
    await page.click(".ui-theme-toggle")
    await page.wait_for_function("document.documentElement.dataset.readingTheme === 'night'", timeout=8000)


async def no_overflow(page):
    w = await page.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    need(w[0] <= w[1] + 1, "the page scrolls sideways on a phone", w)


async def phone_map(page, base):
    await page.goto(base, wait_until="load"); await atlas_ready(page); await settle(page); await no_overflow(page)


async def phone_follow(page, base):
    await con_follow(page, base); await settle(page); await no_overflow(page)


async def phone_build(page, base):
    await con_build(page, base); await settle(page); await no_overflow(page)


async def phone_dial(page, base):
    await map_dial(page, base); await settle(page); await no_overflow(page)


DESKTOP, PHONE = (1440, 900, False), (390, 844, True)
SCENARIOS = [
    ("map-home", DESKTOP, map_home), ("map-night", DESKTOP, map_night), ("map-key", DESKTOP, map_key),
    ("map-layers", DESKTOP, map_layers), ("map-search", DESKTOP, map_search), ("map-filmmaker", DESKTOP, map_record),
    ("map-dial-1995", DESKTOP, map_dial), ("map-dial-closed", DESKTOP, dial_closed),
    ("constellate-start", DESKTOP, con_start), ("constellate-follow", DESKTOP, con_follow),
    ("constellate-build", DESKTOP, con_build), ("constellate-selected", DESKTOP, con_select),
    ("constellate-add-films", DESKTOP, con_add), ("constellate-share", DESKTOP, con_share),
    ("constellate-play", DESKTOP, con_play), ("constellate-theme-web", DESKTOP, con_themeweb),
    ("constellate-three-threads", DESKTOP, con_threads), ("constellate-no-map", DESKTOP, con_unmapped),
    ("constellate-night", DESKTOP, con_night),
    ("phone-map", PHONE, phone_map), ("phone-follow", PHONE, phone_follow), ("phone-build", PHONE, phone_build),
    ("phone-dial", PHONE, phone_dial),
]


async def capture(base, out, shots, only):
    from playwright.async_api import async_playwright
    os.makedirs(out, exist_ok=True)
    origin = "/".join(base.split("/")[:3])
    fails, sem = [], asyncio.Semaphore(int(os.environ.get("SUITE_JOBS", "3")))
    async with async_playwright() as pw:
        exe = os.environ.get("CHROME_PATH")
        browser = await pw.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"], **({"executable_path": exe} if exe else {}))

        async def one(name, view, fn):
            async with sem:
                ctx = await browser.new_context(viewport={"width": view[0], "height": view[1]}, is_mobile=view[2], has_touch=view[2], reduced_motion="reduce")
                await ctx.add_init_script(SEED)
                page = await ctx.new_page()
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)[:240]))
                await page.route(lambda u: not u.startswith(origin), lambda r: r.abort())
                try:
                    await fn(page, base)
                    try:    # status notices time out on their own; wait for them to go
                        await page.wait_for_function("(() => { const n = document.querySelector('#weave-notice'); if (!n) return true; const c = getComputedStyle(n); return n.hidden || !n.textContent.trim() || c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0'; })()", timeout=9000)
                    except Exception:
                        pass
                    await settle(page)
                    need(not errors, "script errors", errors[:4])
                    data = await page.evaluate(FINGERPRINT, PROPS)
                    with gzip.open(os.path.join(out, name + ".json.gz"), "wt", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False)
                    print(f"ok    {name}  ({len(data['rows'])} elements)")
                except Exception as e:  # a failed check or a timeout: record it and keep going
                    fails.append(f"FAIL  {name}: {str(e).splitlines()[0][:400]}")
                    print(fails[-1])
                if shots:
                    try:
                        await page.screenshot(path=os.path.join(out, name + ".png"))
                    except Exception:
                        pass
                await ctx.close()

        await asyncio.gather(*[one(n, v, f) for n, v, f in SCENARIOS if not only or n in only])
        await browser.close()
    print(f"\n{len(fails)} failed" if fails else "\nAll scenarios passed.")
    return 1 if fails else 0


def load(d):
    out = {}
    for f in sorted(os.listdir(d)):
        if f.endswith(".json.gz"):
            with gzip.open(os.path.join(d, f), "rt", encoding="utf-8") as h:
                out[f[:-8]] = json.load(h)
    return out


def compare(a_dir, b_dir, limit):
    a, b = load(a_dir), load(b_dir)
    total, changed = 0, []
    for name in sorted(set(a) | set(b)):
        if name not in a or name not in b:
            print(f"{name}: only in {'after' if name in b else 'before'}"); total += 1; changed.append(name); continue
        ra, rb = {r[0]: r for r in a[name]["rows"]}, {r[0]: r for r in b[name]["rows"]}
        diffs = []
        for k in ra.keys() - rb.keys():
            diffs.append(f"  gone     {k}")
        for k in rb.keys() - ra.keys():
            diffs.append(f"  new      {k}")
        for k in ra.keys() & rb.keys():
            x, y = ra[k], rb[k]
            if any(abs(p - q) > 1 for p, q in zip(x[1], y[1])):
                diffs.append(f"  moved    {k}: {x[1]} -> {y[1]}")
            if x[2] != y[2]:
                diffs.append(f"  text     {k}: {x[2]!r} -> {y[2]!r}")
            for i, (p, q) in enumerate(zip(x[3], y[3])):
                if p != q:
                    diffs.append(f"  style    {k}: {PROPS[i]}: {p} -> {q}")
            for i, (p, q) in enumerate(zip(x[4], y[4])):
                if p != q:
                    diffs.append(f"  pseudo   {k} {'::before' if i == 0 else '::after'}: {p} -> {q}")
        for key in ("body", "html", "page"):
            if a[name].get(key) != b[name].get(key):
                diffs.append(f"  {key:8} {a[name].get(key)} -> {b[name].get(key)}")
        if diffs:
            changed.append(name); total += len(diffs)
            print(f"{name}: {len(diffs)} difference(s)")
            for d in sorted(diffs)[:limit]:
                print(d[:260])
            if len(diffs) > limit:
                print(f"  … and {len(diffs) - limit} more")
    print(f"\n{total} difference(s) in {len(changed)} of {len(set(a) | set(b))} states" if total else f"\nIdentical: {len(a)} states, {sum(len(v['rows']) for v in a.values())} elements compared.")
    return 1 if total else 0


if __name__ == "__main__":
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    flags = {x.split("=")[0]: (x.split("=")[1] if "=" in x else True) for x in sys.argv[1:] if x.startswith("--")}
    if len(args) == 3 and args[0] == "capture":
        base = args[1] if args[1].endswith("/") else args[1] + "/"
        only = set(str(flags["--only"]).split(",")) if "--only" in flags else None
        sys.exit(asyncio.run(capture(base, args[2], "--shots" in flags, only)))
    if len(args) == 3 and args[0] == "compare":
        sys.exit(compare(args[1], args[2], int(flags.get("--limit", 12))))
    print(__doc__); sys.exit(2)
