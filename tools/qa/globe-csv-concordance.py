"""Compare all six public CSV exports with actual browser catalogue and globe indexes."""
import asyncio,csv,json,os,collections
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.getenv("ATLAS_QA_BASE","http://127.0.0.1:8985/beta/")
def read(name):
    with open(Path("beta/data")/name,encoding="utf-8-sig",newline="") as f:return list(csv.DictReader(f))
def parts(v):return {x.strip() for x in (v or "").split(";") if x.strip()}
async def main():
    pub=read("atlas-published.csv"); makers=read("atlas-filmmakers.csv"); films=read("atlas-films.csv"); names=read("atlas-names.csv"); facets=read("film-facets.csv"); langs=read("languages.csv")
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        page=await browser.new_page(viewport={"width":1440,"height":900})
        await page.goto(BASE+"?constellate=1&globe=1",wait_until="domcontentloaded",timeout=90000)
        await page.wait_for_function("window.AtlasGlobe?.active && window.AtlasGlobe.discovery.publication==='ready' && window.AtlasConstellate?.globeCreditIndex",timeout=60000)
        live=await page.evaluate("""() => {
          const A=window.Atlas,C=window.AtlasConstellate,I=C.globeCreditIndex(),F=window.ATLAS_FACETS||{};
          return {makers:A.allRecords().map(r=>({id:r.id,name:r.name,community:r.community,nation:r.nation,countries:r.countryCodes})),
            films:I.films.map(x=>{const r=A.recordById(x.record),f=r.films.find(f=>f.id===x.film),m=C.globeMetadata(x);return {maker:x.record,film:x.film,title:x.title,year:x.year,credit:m?.film.credit||f.credit,refs:I.refs.get(x.id),terms:C.terms(x),image:C.sourceImage(x),watch:C.globeViewingRoutes(x).map(l=>l.url),facets:m?{l:m.l,f:m.f,n:m.n,p:m.p,t:m.t}:F.films?.[x.film]||{},exportFacet:C.globeFacetExport(x.film),baked:F.films?.[x.film]||{},hasPublic:!!m}}),
            languages:Object.keys(F.languages||{}),terms:Object.values(F.families||{}).flat()};
        }""")
        await browser.close()
    index={(x["maker"],x["film"]):x for x in live["films"]}; mid={x["id"]:x for x in live["makers"]}
    published={(r["filmmaker_id"],r["film_id"]):r for r in pub if r["film_id"]}
    exported={(r["record_id"],r["film_id"]):r for r in films if r["film_id"]}
    discrepancy=collections.defaultdict(list)
    def note(kind,key,expected=None,actual=None):discrepancy[kind].append({"key":key,"expected":expected,"actual":actual})
    for k,r in published.items():
        x=index.get(k)
        if not x:note("published_credit_missing",k);continue
        if not x['hasPublic']:note('published_exact_row_missing',k)
        for col in ("title","year","credit"):
            if r.get(col) and str(r[col]).strip()!=str(x.get(col) or "").strip():note("published_"+col,k,r[col],x.get(col))
        if r.get("themes") and not parts(r["themes"]).issubset(set(x["terms"])):note("published_theme",k,r["themes"],x["terms"])
        if r.get("languages") and not parts(r["languages"]).issubset(set(x["facets"].get("l",[]))):note("published_language",k,r["languages"],x["facets"].get("l",[]))
        for col,field in [("form","f"),("length","n"),("primary_theme","p")]:
            if r.get(col) and r[col]!=x["facets"].get(field):note("published_"+col,k,r[col],x["facets"].get(field))
        for n in (1,2):
            url=r.get(f"watch_{n}_url")
            if url and url not in x["watch"]:note("published_watch",k,url,x["watch"])
        if r.get("image_url") and not x["image"]:note("published_image_missing",k,r["image_url"])
    for k in exported.keys()-index.keys():note("film_export_credit_missing",k)
    for r in makers:
        if r["record_id"] not in mid:note("maker_export_missing",r["record_id"])
    for r in pub:
        if r["filmmaker_id"] not in mid:note("published_maker_missing",r["filmmaker_id"])
    facet_index={}
    for x in live["films"]:facet_index.setdefault(x["film"],x["exportFacet"] or {})
    for r in facets:
        field={"language":"l","theme":"t","form":"f","length":"n"}.get(r["field"])
        if not field:continue
        value=facet_index.get(r["film_id"],{}).get(field)
        if not (r["value"] in value if isinstance(value,list) else r["value"]==value):note("facet_export_"+r["field"],r["film_id"],r["value"],value)
    for r in langs:
        if r.get("match")!="not in authority" and r["label"] not in live["languages"]:note("language_authority_missing",r["label"])
    named=collections.Counter((str(r["film_title"]),str(r["year"]),str(r["filmmaker"])) for r in names)
    export_names=collections.Counter((str(r["title"]),str(r["year"]),str(r["filmmaker"])) for r in films)
    report={"counts":{"published_rows":len(pub),"published_credits":len(published),"film_export_credits":len(exported),"maker_export":len(makers),"names_rows":len(names),"facet_rows":len(facets),"language_authority_rows":len(langs),"globe_credits":len(index),"globe_makers":len(mid),"mapped_credits":sum(bool(x["refs"]) for x in index.values()),"unmapped_credits":sum(not x["refs"] for x in index.values())},"names_export_differences":sum((named-export_names).values())+sum((export_names-named).values()),"runtime_only_credits":sorted(index.keys()-published.keys()),"discrepancies":dict(discrepancy)}
    os.makedirs("shots/globe-independent",exist_ok=True)
    with open("shots/globe-independent/csv-concordance.json","w",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2)
    print("CSV_CONCORDANCE",json.dumps({"counts":report["counts"],"names_export_differences":report["names_export_differences"],"runtime_only_credits":len(report["runtime_only_credits"]),"discrepancies":{k:len(v) for k,v in discrepancy.items()}},ensure_ascii=False),flush=True)
    for k,v in discrepancy.items():print(k,json.dumps(v[:3],ensure_ascii=False),flush=True)
    assert not any(discrepancy.values()),'CSV/runtime discrepancies remain; see report'
    assert not report['names_export_differences'] and not report['runtime_only_credits'],'Export identity mismatch'
if __name__=="__main__":asyncio.run(main())
