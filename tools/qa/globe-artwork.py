"""Inventory every exact credit and land; decode representative real images; test land selection and boundary overlays."""
import asyncio,collections,json,os
from urllib.parse import urlparse, urlencode, parse_qs, unquote
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
        playback={"indexed":sum(bool(c["watch"]) for c in credits),"embedded":sum(bool(c["watch"] and c["watch"]["embedded"]) for c in credits),"recorded_external":sum(bool(c["view"]) for c in credits)}
        assert playback["embedded"]>0,"Watch index was not loaded"
        print("PLAYBACK_COVERAGE",json.dumps(playback),flush=True)
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
        local=list(dict.fromkeys(domains.get("local",[])))
        remote=[]
        for domain,urls in sorted(domains.items()):
            if domain=="local":continue
            unique=list(dict.fromkeys(urls))
            remote.extend(unique[:min(4,len(unique))])
        full=os.getenv("ATLAS_ARTWORK_FULL")=="1"
        samples=list(dict.fromkeys(c["source"] for c in credits if c["source"])) if full else local+remote[:96]
        print("ARTWORK_MODE","full" if full else "sample",len(samples),flush=True)
        loaded=[]
        for i in range(0,len(samples),16):
            loaded.extend(await page.evaluate("""async urls=>Promise.all(urls.map(src=>new Promise(resolve=>{
              const img=new Image();let done=false;
              const finish=state=>{if(done)return;done=true;clearTimeout(timer);resolve({src,state,w:img.naturalWidth,h:img.naturalHeight});};
              const timer=setTimeout(()=>finish('timeout'),12000);
              img.referrerPolicy='strict-origin-when-cross-origin';img.onload=()=>finish(img.naturalWidth?'decoded':'empty');img.onerror=()=>finish('failed');img.src=src;
            })))""",samples[i:i+16]))
            if i%96==0 or i+16>=len(samples):print("ARTWORK_PROGRESS",min(i+16,len(samples)),len(samples),flush=True)
        by_source={v["src"]:v for v in loaded}
        failed_credits=[{**c,"image_result":by_source[c["source"]]["state"]} for c in credits if c["source"] in by_source and by_source[c["source"]]["state"]!="decoded"]
        local_failed=[v for v in loaded if not urlparse(v["src"]).netloc and v["state"]!="decoded"]
        report={"local_urls_checked":len(local),"local_failures":local_failed,"failed_credit_images":failed_credits,"counts":counts,"playback":playback,"image_audit_mode":"full" if full else "sample","distinct_recorded_urls":len(set(c["source"] for c in credits if c["source"])),"lands_without_recorded_art":absent,"missing_credit_images":[c for c in credits if not c["source"]],"boundaries":boundaries,"sampled_image_responses":loaded,"all_credit_images":credits}
        with open("shots/globe-independent/artwork-inventory.json","w",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2)
        print("ARTWORK_INVENTORY",json.dumps(counts), "NO_ART_LANDS",json.dumps([l["name"] for l in absent],ensure_ascii=False),"IMAGE_SAMPLE",dict(collections.Counter(v["state"] for v in loaded)),"BOUNDARIES",json.dumps(boundaries),flush=True)
        assert any(v["state"]=="decoded" for v in loaded),"No real artwork decoded"
        print("LOCAL_ARTWORK",len(local),"FAILURES",len(local_failed),flush=True)
        # Exercise a geographic spread, including populated territories without recorded art.
        candidates=[l for l in lands if l["credits"] and any(c["source"] for c in refs[l["id"]])]
        selected=[candidates[i] for i in sorted(set(round(j*(len(candidates)-1)/7) for j in range(8)))] if candidates else []
        selected+=absent[:2]
        for l in selected:
            print("SELECTING_LAND",l["id"],l["name"],flush=True)
            await page.locator("#globe-find-toggle").click()
            await page.locator("#globe-find").select_option(l["id"])
            try:
                await page.wait_for_function("(id)=>window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.land===id",arg=l["id"],timeout=30000)
                await page.wait_for_function("['ready','missing','broken'].includes(window.AtlasGlobe.discovery.artState)",timeout=20000)
            except Exception:
                print("ENCOUNTER_FAILURE",l["id"],l["name"],json.dumps(await page.evaluate("(id)=>({anchor:AtlasGlobe.anchors.find(a=>a.id===id),camera:AtlasGlobe.camera,focus:AtlasGlobe.focus,featured:AtlasGlobe.discovery.featured,preferred:AtlasGlobe.discovery.preferredLand,art:AtlasGlobe.discovery.artState,tiles:AtlasGlobe.tileState?.motion})",l["id"]),ensure_ascii=False),flush=True)
                await page.screenshot(path="shots/globe-independent/artwork-encounter-failure.png",timeout=15000)
                raise
            state=await page.evaluate("window.AtlasGlobe.discovery")
            assert any(c["id"]==state["featured"]["film"] for c in refs[l["id"]])
            print("ENCOUNTER",l["name"],state["artState"],state["posterReason"],flush=True)
        if selected:
            expected=await page.evaluate("window.AtlasGlobe.discovery.featured")
            shared=await page.evaluate("window.AtlasGlobe.discovery.shareURL")
            await page.goto(shared,wait_until="domcontentloaded",timeout=90000)
            await page.wait_for_function("(v)=>window.AtlasGlobe?.discovery.publication==='ready' && window.AtlasGlobe.focus.settled && window.AtlasGlobe.discovery.featured?.land===v.land && window.AtlasGlobe.discovery.featured?.film===v.film",arg=expected,timeout=90000)
            print("SHARED_ENCOUNTER passed",expected,flush=True)
        # Verify both indexed playback types in a separate tab, without depending
        # on the availability of the third-party video itself.
        watch_tab=await browser.new_page()
        try:
            for pattern in ("**/youtube-nocookie.com/**","**/youtube.com/embed/**","**/player.vimeo.com/**"):
                await watch_tab.route(pattern,lambda route:route.abort())
            indexed=await page.evaluate("window.ATLAS_WATCH.films")
            for embedded in (True,False):
                entry=next((f for f in indexed if any(l.get("embed") for l in f["links"])==embedded),None)
                if not entry:continue
                shared=await page.evaluate("window.AtlasGlobe.discovery.shareURL")
                query=urlparse(shared).query
                await watch_tab.goto(BASE+"watch.html?"+urlencode({"fromGlobe":query})+"#"+entry["fid"],wait_until="domcontentloaded",timeout=90000)
                await watch_tab.wait_for_function("(t)=>document.querySelector('#now-title')?.textContent.startsWith(t)",arg=entry["t"])
                assert await watch_tab.locator("#now-frame").is_visible()==embedded
                assert await watch_tab.locator("#now-external").is_visible()==(not embedded)
                if not embedded:assert await watch_tab.locator("#now-external a").get_attribute("href")==entry["links"][0]["url"]
                href=await watch_tab.locator("#watch-return-globe").get_attribute("href")
                assert parse_qs(urlparse(href).query)==parse_qs(query),(href,shared)
                print("WATCH_RETURN",entry["fid"],"embedded" if embedded else "external",flush=True)
            # A standalone Watch link should not carry a globe return control.
            await watch_tab.goto(BASE+"watch.html#"+indexed[0]["fid"],wait_until="domcontentloaded",timeout=90000)
            assert await watch_tab.locator("#watch-return-globe").count()==0
        finally:await watch_tab.close()
        await page.locator("#globe-more-toggle").click()
        await page.locator("#globe-close").click()
        await page.wait_for_function("!window.AtlasGlobe.active && window.AtlasConstellate.enabled")
        assert await page.locator("#atlas-rotational-globe").count()==0
        print("FLAT_RETURN passed",flush=True)
        await browser.close()
if __name__=="__main__":asyncio.run(main())
