"""Capture the beta's complete data state as the browser sees it after every script has run.

usage: python3 tools/atlas/capture.py <page url> <out.json> [chrome path]
Writes {records, countries, meta, globals:{ATLAS_*}} (ATLAS_TERRITORIES left out: geometry, unchanged).
The output contains every record, including leads that are not shown on the map, so it belongs in the
private research repository, never in the public site repository."""
import json, sys, asyncio
from playwright.async_api import async_playwright

async def main(url, out, chrome=None):
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': chrome} if chrome else {}))
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url, wait_until='load', timeout=180000)
        await pg.wait_for_function('window.Atlas && Atlas.allRecords && Atlas.allRecords().length>100', timeout=180000)
        await pg.wait_for_timeout(4000)
        data = await pg.evaluate('''()=>{const g={};
          for(const k of Object.keys(window))if(/^ATLAS_/.test(k)&&k!=='ATLAS_TERRITORIES'){const v=window[k];g[k]=v instanceof Set?{__set:[...v]}:v;}
          return JSON.parse(JSON.stringify({records:Atlas.allRecords(),countries:Atlas.allCountries?Atlas.allCountries():null,
            meta:Atlas.archiveMeta?Atlas.archiveMeta():null,globals:g,territories:(window.ATLAS_TERRITORIES.features||[]).map(f=>[String(f.id),f.properties&&f.properties.name,f.properties&&f.properties.broadOf||null,JSON.stringify(f.geometry).length])}));}''')
        data['errors'] = errs
        json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, sort_keys=True)
        print(url, '|', len(data['records']), 'records |', len(data['globals']), 'globals | page errors:', errs[:3])
        await b.close()

if __name__ == '__main__':
    asyncio.run(main(*sys.argv[1:4]))
