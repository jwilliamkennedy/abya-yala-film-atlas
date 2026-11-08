"""Open each NFB embed from a US runner; record whether it plays here or says it is not available in this location."""
import asyncio, json
from playwright.async_api import async_playwright
emb = {u: e for u, e in json.load(open('tools/watch/embeds.json')).items() if e and 'nfb.ca' in e}
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page()
        for url, e in emb.items():
            try:
                await pg.goto(e, wait_until='networkidle', timeout=45000); await pg.wait_for_timeout(2500)
                t = await pg.evaluate("document.body.innerText")
                out[url] = 'blocked' if 'not available for free viewing in your location' in t.lower() or 'not available in your' in t.lower() else 'plays'
            except Exception as ex:
                out[url] = 'error'
            print(out[url], url, flush=True)
        await b.close()
    json.dump(out, open('out/geo.json', 'w'), indent=1)
    print('PLAYS', sum(v == 'plays' for v in out.values()), 'BLOCKED', sum(v == 'blocked' for v in out.values()))
asyncio.run(main())
