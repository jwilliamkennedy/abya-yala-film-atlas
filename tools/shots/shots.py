"""Screenshot beta pages on a runner. Each job: name, path, viewport, optional steps (click / press / wait / eval).
A job with "filmstrip": {"every": ms, "count": n, "probe": js} records the page as it loads instead: a frame every
`every` ms from the first byte, and the probe's value at each frame (shots/<name>/NN-<ms>.png, report <name>.frames)."""
import asyncio, json
from playwright.async_api import async_playwright
JOBS = json.load(open('tools/shots/jobs.json'))
async def main():
    rep = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        for j in JOBS:
            vp = j.get('viewport', [1440, 900])
            ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=j.get('mobile', False), has_touch=j.get('mobile', False))
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            out = {}
            try:
                if 'filmstrip' in j:
                    fs = j['filmstrip']; import os, time; os.makedirs(f"shots/{j['name']}", exist_ok=True); frames = []
                    t0 = time.monotonic(); await pg.goto('http://127.0.0.1:8771/' + j['path'], wait_until='commit', timeout=90000)
                    for i in range(fs.get('count', 40)):
                        await pg.wait_for_timeout(fs.get('every', 100))
                        ms = round((time.monotonic() - t0) * 1000)
                        try: v = await pg.evaluate(fs['probe'])
                        except Exception as e: v = 'probe: ' + str(e)[:80]
                        try: await pg.screenshot(path=f"shots/{j['name']}/{i:02d}-{ms:05d}.png", timeout=4000, scale='css')
                        except Exception as e: v = {'shot': str(e)[:60], 'v': v}
                        frames.append([ms, v])
                    out['frames'] = frames
                    rep[j['name']] = {'errors': errs[:10], **out}; await ctx.close(); continue
                await pg.goto('http://127.0.0.1:8771/' + j['path'], wait_until='load', timeout=90000)
                await pg.wait_for_timeout(j.get('settle', 6000))
                for st in j.get('steps', []):
                    if 'click' in st: await pg.click(st['click'], timeout=15000)
                    if 'press' in st: await pg.keyboard.press(st['press'])
                    if 'fill' in st: await pg.fill(st['fill'][0], st['fill'][1])
                    if 'eval' in st: out[st.get('as', 'eval')] = await pg.evaluate(st['eval'])
                    await pg.wait_for_timeout(st.get('wait', 800))
                await pg.screenshot(path=f"shots/{j['name']}.png", full_page=j.get('full', False), timeout=150000)
            except Exception as e:
                errs.append('RUNNER ' + str(e)[:200])
            rep[j['name']] = {'errors': errs[:10], **out}
            await ctx.close()
        await b.close()
    json.dump(rep, open('shots/report.json', 'w'), indent=1, ensure_ascii=False); print(json.dumps(rep, indent=1, ensure_ascii=False))
asyncio.run(main())
