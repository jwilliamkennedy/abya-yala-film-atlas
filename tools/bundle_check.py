"""Check that beta/index-bundled.html loads exactly the same data as beta/index.html."""
import asyncio,json,hashlib
from playwright.async_api import async_playwright
JS='''()=>{const h=o=>JSON.stringify(o);const keys=Object.keys(window).filter(k=>/^ATLAS_/.test(k)).sort();
 const g={};for(const k of keys){try{const v=window[k];g[k]=v instanceof Set?[...v].sort():v instanceof Map?[...v.entries()]:v}catch(e){g[k]='ERR'}}
 return {records:h(Atlas.allRecords()),globals:keys.map(k=>k+':'+(()=>{try{return h(g[k]).length}catch(e){return 'x'}})()),gjson:(()=>{try{return h(g)}catch(e){return 'cyc'}})(),films:document.querySelector('header').innerText.replace(/\\n/g,' ').slice(0,120)}}'''
async def run(url):
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(); await ctx.route(lambda u: not u.startswith('http://127.0.0.1'), lambda r: r.abort())
    pg=await ctx.new_page(); errs=[]; reqs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
    pg.on('request',lambda r: reqs.append(r.url) if r.url.endswith('.js') or '.js?' in r.url else None)
    await pg.goto(url, wait_until='networkidle'); await pg.wait_for_timeout(3500)
    r=await pg.evaluate(JS); await b.close()
    return r,errs,len([x for x in reqs if '127.0.0.1' in x])
async def main():
  a,ea,na=await run('http://127.0.0.1:8771/beta/index.html')
  b,eb,nb=await run('http://127.0.0.1:8771/beta/index-bundled.html')
  H=lambda s:hashlib.sha1(s.encode()).hexdigest()[:12]
  print('records  ',H(a['records']),H(b['records']),'SAME' if a['records']==b['records'] else 'DIFF', len(a['records']))
  print('globals  ',H(a['gjson']),H(b['gjson']),'SAME' if a['gjson']==b['gjson'] else 'DIFF')
  if a['globals']!=b['globals']: print([x for x in a['globals'] if x not in b['globals']],[x for x in b['globals'] if x not in a['globals']])
  print('header   ',a['films']==b['films'],b['films'])
  print('js requests',na,'->',nb,'| errors',ea[:3],eb[:3])
  import sys
  if a['records']!=b['records'] or a['gjson']!=b['gjson'] or eb: sys.exit('BUNDLE DIFFERS FROM LAYERS')
asyncio.run(main())
