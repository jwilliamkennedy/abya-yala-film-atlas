"""Inventory every exact credit and land; decode representative real images; test land selection and boundary overlays."""
import asyncio,collections,json,os
from urllib.parse import urlparse
from playwright.async_api import async_playwright
BASE=os.getenv("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
async def main():
    os.makedirs("shots/globe-independent",exist_ok=True)
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        page=await browser.new_page(viewport={"width":1440,"height":900})
        await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function("window.AtlasGlobe?.discovery.publication==='ready' && window.AtlasGlobe.camera.renderer==='maplibre-globe' && window.AtlasGlobe.focus.settled",timeout=90000)
        inv=await page.evaluate("window.AtlasGlobe.artworkInventory()")
        credits=inv["credits"]; lands=inv["lands"]
        land_ids={l["id"] for l in lands}
        refs=collections.defaultdict(list)
        for c in credits:
            for lid in c["lands"]:refs[lid].append(c)
        counts={"credits":len(credits),"with_image":sum(bool(c["source"]) for c in credits),"mapped_credits":sum(bool(c["lands"]) for c in credits),"land_groups":len(lands),"lands_with_films":sum(l["credits"]>0 for l in lands),"lands_with_art":sum(any(c["source"] for c in refs[l["id"]]) for l in lands)}
        absent=[l for l in lands if l["credits"] and not any(c["source"] for c in refs[l["id"]])]
        mismatch=[c for c in credits if c["published"] and c["source"]!=c["published"]]
        assert not mismatch,("published image resolver mismatch",mismatch[:4])
        assert all(l["credits"]==len(refs[l["id"]]) for l in lands)
        assert all(l["matching"]==l["credits"] for l in lands)
        boundaries=await page.evaluate("window.AtlasGlobe.territoryLayer")
        assert boundaries["boundaries"]["features"]==boundaries["features"]
        # Audit images from a spread of URL hosts, up to 96 distinct URLs.
        # Record actual browser decodes; external outages are reported, not mistaken for absent metadata.
        domains=collections.defaultdict(list)
        for c in credits:
            if c["source"]:domains[urlparse(c["source"]).netloc or "local"].append(c["source"])
        samples=[]
        for domain,urls in sorted(domains.items()):
            unique=list(dict.fromkeys(urls))
            samples.extend(unique[:min(4,len(unique))])
        samples=samples[:96]
        loaded=[]
        for i in range(0,len(samples),8):
            loaded.extend(await page.evaluate("""async urls=>Promise.all(urls.map(src=>new Promise(resolve=>{
              const img=new Image();let done=false;
              const finish=state=>{if(done)return;done=true;clearTimeout(timer);resolve({src,state,w:img.naturalWidth,h:img.naturalHeight});};
              const timer=setTimeout(()=>finish('timeout'),12000);
              img.referrerPolicy='strict-origin-when-cross-origin';img.onload=()=>finish(img.naturalWidth?'decoded':'empty');img.onerror=()=>finish('failed');img.src=src;
            })))""",samples[i:i+8]))
        report={"counts":counts,"lands_without_recorded_art":absent,"missing_credit_images":[c for c in credits if not c["source"]],"boundaries":boundaries,"sampled_image_responses":loaded,"all_credit_images":credits}
        with open("shots/globe-independent/artwork-inventory.json","w",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2)
        print("ARTWORK_INVENTORY",json.dumps(counts), "NO_ART_LANDS",json.dumps([l["name"] for l in absent],ensure_ascii=False),"IMAGE_SAMPLE",dict(collections.Counter(v["state"] for v in loaded)),"BOUNDARIES",json.dumps(boundaries),flush=True)
        assert any(v["state"]=="decoded" for v in loaded),"No real artwork decoded"
        # Exercise a geographic spread, including populated territories without recorded art.
        candidates=[l for l in lands if l["credits"] and any(c["source"] for c in refs[l["id"]])]
        selected=[candidates[i] for i in sorted(set(round(j*(len(candidates)-1)/7) for j in range(8)))] if candidates else []
        selected+=absent[:2]
        for l in selected:
            await page.locator("#globe-find-toggle").click()
            await page.locator("#globe-find").select_option(l["id"])
            await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.land===id",arg=l["id"],timeout=30000)
            await page.wait_for_function("['ready','missing','broken'].includes(window.AtlasGlobe.discovery.artState)",timeout=20000)
            state=await page.evaluate("window.AtlasGlobe.discovery")
            assert any(c["id"]==state["featured"]["film"] for c in refs[l["id"]])
            print("ENCOUNTER",l["name"],state["artState"],state["posterReason"],flush=True)
        await page.locator("#globe-more-toggle").click()
        await page.locator("#globe-close").click()
        await page.wait_for_function("!window.AtlasGlobe.active && window.AtlasConstellate.enabled")
        assert await page.locator("#atlas-rotational-globe").count()==0
        print("FLAT_RETURN passed",flush=True)
        await browser.close()
if __name__=="__main__":asyncio.run(main())
