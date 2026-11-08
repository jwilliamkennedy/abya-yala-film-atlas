"""Export the public (on-map) records from the loaded beta runtime: python3 dump.py <beta url> <out.json>"""
import asyncio, json, sys
from playwright.async_api import async_playwright
JS = '''()=>{const A=window.Atlas,on=window.ATLAS_ON_MAP,M=window.ATLAS_PROFILE_MEDIA||{};const WATCH=/watch|full film|stream|viewing|ver pelicula|ver filme/i,NOT=/trailer|teaser|preview/i;
const lands=id=>{try{return [...new Set((A.recordLandReferences?A.recordLandReferences(id):[]).map(l=>l&&(A.landDisplayName?A.landDisplayName(l):l.name)).filter(Boolean))]}catch(e){return []}};
return A.allRecords().filter(r=>on.has(r.status)).map(r=>({id:r.id,name:r.name,aliases:(r.aliases||[]).map(a=>typeof a==='string'?a:a&&a.name).filter(Boolean),
 nation:r.nation||r.community||'',country:r.countryName||'',status:r.status,lands:lands(r.id),
 sources:(Array.isArray(r.sources)?r.sources:[]).filter(s=>s&&s.url).map(s=>({url:s.url,type:s.type||'',evidence:s.evidence||''})).slice(0,12),
 films:(r.films||[]).map(f=>{const m=M[f.id];let routes=[];try{routes=A.viewingRoutes(f)||[]}catch(e){}
  return {id:f.id,title:f.title,year:f.year||null,credit:f.credit||'',medium:f.medium||'',languages:f.languages||'',languageLabels:f.languageLabels||null,languageSource:f.languageSource||'',languageNote:f.languageNote||'',source:f.sourceURL||f.source||'',
   image:(m&&m.image)||f.thumbnailURL||f.imageURL||'',imagePage:(m&&m.sourceURL)||'',watch:routes.filter(l=>WATCH.test(l.title||'')&&!NOT.test(l.title||'')).map(l=>l.url)}})}))}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': sys.argv[3]} if len(sys.argv) > 3 else {}), args=['--no-sandbox'])
        ctx = await b.new_context()
        await ctx.route(lambda u: not u.startswith('http://127.0.0.1'), lambda r: r.abort())
        pg = await ctx.new_page(); await pg.goto(sys.argv[1], wait_until='networkidle'); await pg.wait_for_timeout(3500)
        data = await pg.evaluate(JS)
        json.dump(data, open(sys.argv[2], 'w'), ensure_ascii=False)
        print(len(data), 'records', sum(len(r['films']) for r in data), 'films')
        await b.close()
asyncio.run(main())
