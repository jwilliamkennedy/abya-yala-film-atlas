"""Check the beta before it is pushed: every kind of page loads without a script error, and the header (brand,
menu, More, language) sits in the same place on every page at desktop, laptop and phone widths. At 901px and wider the left rail
(assets/rail-20261121.js) takes the header's place, so there the rail must be present, in the same place, with the same items.
Exits 1 with the differences if not. Needs the beta served locally (as for dump.py).
usage: python3 tools/pages/check_pages.py http://127.0.0.1:8765/beta/ [chromium path]"""
import sys, asyncio
from playwright.async_api import async_playwright

PAGES = ['index.html', 'about.html', 'resources.html', 'watch.html', 'languages.html', 'themes.html', 'timeline.html', 'screening.html',
         'data.html', 'corrections.html', 'maker/index.html', 'maker/DIR-0059.html']
WIDTHS = [(1440, 900), (1000, 800), (390, 844)]
TOLERANCE = 4  # px

JS = '''() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const c = e.getBoundingClientRect();
  return [Math.round(c.x), Math.round(c.y)]; };
  return { brand: r('header .brand'), nav: r('header nav.primary'), more: r('header .more-menu summary'),
           items: [...document.querySelectorAll('header nav.primary > a, header nav.primary > button')].map(e => e.textContent.trim()).join('|'),
           rail: r('#atlas-rail .rail-item[data-rail="map"]'),
           railItems: [...document.querySelectorAll('#atlas-rail .rail-item .full')].map(e => e.textContent.trim()).join('|') }; }'''

async def main(base, chrome=None):
    problems = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': chrome} if chrome else {}), args=['--no-sandbox'])
        for w, h in WIDTHS:
            ref = None
            for page in PAGES:
                ctx = await b.new_context(viewport={'width': w, 'height': h})
                await ctx.route(lambda u: not u.startswith(base.split('/beta')[0]), lambda r: asyncio.ensure_future(r.abort()))
                pg = await ctx.new_page()
                errors = []
                pg.on('pageerror', lambda e: errors.append(str(e)))
                await pg.goto(base + page)
                await pg.wait_for_timeout(2500 if page == 'index.html' else 700)
                got = await pg.evaluate(JS)
                # A missing Watch loader is silent on the map: the globe simply loses
                # playable encounters. Check the actual generated payload before publishing.
                if page in ('index.html', 'watch.html'):
                    watch = await pg.evaluate("""() => {
                      const scripts = [...document.scripts].map(s => new URL(s.src || location.href, location.href).pathname);
                      const loaders = scripts.filter(s => s.endsWith('/watch-data.js'));
                      const globe = scripts.findIndex(s => s.endsWith('/assets/globe-experiment.js'));
                      const films = window.ATLAS_WATCH?.films;
                      return {loaders: loaders.length, films: Array.isArray(films) ? films.length : -1,
                              ordered: globe < 0 || scripts.indexOf(loaders[0]) < globe};
                    }""")
                    if watch['loaders'] != 1 or watch['films'] <= 0 or not watch['ordered']:
                        problems.append(f'{w}px {page}: Watch data missing, duplicated, empty or loaded after globe: {watch}')
                await ctx.close()
                if errors:
                    problems.append(f'{w}px {page}: script error: {errors[0][:160]}')
                if not got['nav'] or not got['more']:
                    problems.append(f'{w}px {page}: header menu missing'); continue
                if w >= 901 and not got['rail']:
                    problems.append(f'{w}px {page}: left rail missing'); continue
                if ref is None:
                    ref = (page, got); continue
                if w >= 901:
                    a, c = ref[1]['rail'], got['rail']
                    if abs(a[0] - c[0]) > TOLERANCE or abs(a[1] - c[1]) > TOLERANCE:
                        problems.append(f'{w}px {page}: rail at {c}, on {ref[0]} at {a}')
                    if got['railItems'] != ref[1]['railItems']:
                        problems.append(f'{w}px {page}: rail items differ: {got["railItems"]} vs {ref[1]["railItems"]}')
                for k in ('brand', 'nav', 'more'):
                    a, c = ref[1][k], got[k]
                    if a and c and (abs(a[0] - c[0]) > TOLERANCE or abs(a[1] - c[1]) > TOLERANCE):
                        problems.append(f'{w}px {page}: {k} at {c}, on {ref[0]} at {a}')
                if got['items'] != ref[1]['items']:
                    problems.append(f'{w}px {page}: menu items differ: {got["items"]} vs {ref[1]["items"]}')
        await b.close()
    for x in problems:
        print('PROBLEM', x)
    print(f'page check: {len(PAGES)} pages x {len(WIDTHS)} widths, {len(problems)} problems')
    sys.exit(1 if problems else 0)

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
