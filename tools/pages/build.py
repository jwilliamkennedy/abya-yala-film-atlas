"""Generate permanent pages: <out>/maker/<record id>.html for every filmmaker on the public map, <out>/maker/index.html (A–Z),
and <out>/sitemap.xml. usage: build.py public.json <beta dir> <site base url>"""
import json, sys, html, re, os, unicodedata, datetime
from urllib.parse import urlparse, quote
data = json.load(open(sys.argv[1])); out = sys.argv[2]; BASE = sys.argv[3].rstrip('/')
os.makedirs(os.path.join(out, 'maker'), exist_ok=True)
esc = lambda s: html.escape(str(s or ''), quote=True)
TODAY = datetime.date.today()
SITE = 'Indigenous Cinema Atlas: Abya Yala and Turtle Island'

def sortkey(s):
    return re.sub(r'^[^a-z0-9]+', '', unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower())

CSS = '''
:root{--ink:#182028;--muted:#55616b;--accent:#9c3b26;--line:rgba(24,32,40,.15);--bg:#eef0ec;--card:#e4e8e2;--serif:Georgia,'Times New Roman',serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,Roboto,Arial,sans-serif}
@media (prefers-color-scheme:dark){:root{--ink:#efe6d2;--muted:#a9b3c8;--accent:#e9d9ad;--line:rgba(233,217,173,.22);--bg:#0e1729;--card:#15213a}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink)}body{font:400 16px/1.6 var(--sans)}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--line)}a:hover,a:focus-visible{border-color:var(--accent)}
header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;padding:20px clamp(16px,4vw,48px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;font:400 24px/1.1 var(--serif);color:var(--ink);border:0}.brand img{width:28px;height:28px}
.brand small{display:block;font:500 11px/1.4 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:4px}
nav.primary{display:flex;flex-wrap:wrap;gap:4px 20px}nav.primary a{color:var(--ink);border:0;font-size:15px;padding:6px 0}
main{max-width:860px;margin:0 auto;padding:30px clamp(16px,4vw,32px) 64px}
.crumb{font-size:13px;color:var(--muted);margin:0}h1{font:400 clamp(30px,4vw,42px)/1.12 var(--serif);margin:6px 0 6px}
.who{font-size:17px;margin:0}.lands{color:var(--muted);font-size:14px;margin:4px 0 0}.aka{color:var(--muted);font-size:14px;margin:2px 0 0}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 6px}.actions a,.actions button{font:inherit;font-size:14px;min-height:34px;padding:5px 14px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center}
.actions .primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}
h2{font:400 22px/1.2 var(--serif);margin:32px 0 8px}h2 small{font:13px var(--sans);color:var(--muted)}
ol.films{list-style:none;margin:0;padding:0}ol.films li{display:grid;grid-template-columns:120px 1fr;gap:4px 16px;padding:14px 0;border-bottom:1px solid var(--line);scroll-margin-top:16px}
ol.films li:target{background:var(--card)}.thumb{width:120px;aspect-ratio:16/10;object-fit:cover;background:var(--card);border-radius:3px;display:block}
.noimg{width:120px;aspect-ratio:16/10;background:var(--card);border-radius:3px;display:flex;align-items:center;justify-content:center;font:28px var(--serif);color:var(--muted)}
.ft{font:400 19px/1.3 var(--serif);margin:0}.fm{font-size:14px;color:var(--muted);margin:2px 0 0}.fl{font-size:13px;margin:4px 0 0;display:flex;flex-wrap:wrap;gap:4px 14px}
ul.src{padding-left:18px;font-size:14px}ul.src li{margin:4px 0}
.cite{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 16px;font-size:14px}.cite p{margin:6px 0}.cite b{font-weight:600}
.cite button{font:inherit;font-size:12px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:2px 10px;cursor:pointer;margin-left:6px}
.note{color:var(--muted);font-size:13px;margin-top:28px}
.az{display:flex;flex-wrap:wrap;gap:4px;margin:12px 0 4px}.az a{min-width:30px;text-align:center;padding:4px 6px;border:1px solid var(--line);border-radius:4px;font-size:14px}
ul.dir{list-style:none;padding:0;margin:0;columns:2 280px;column-gap:28px}ul.dir li{break-inside:avoid;padding:5px 0;border-bottom:1px solid var(--line)}ul.dir small{display:block;color:var(--muted);font-size:13px}
#q{width:100%;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--ink);margin:10px 0}
@media (max-width:560px){ol.films li{grid-template-columns:88px 1fr}.thumb,.noimg{width:88px}}
'''
def header(depth):
    up = '../' * depth
    return (f'<header><a class="brand" href="{up}./"><img src="{up}assets/icon-1107.svg" alt=""><span>Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></span></a>'
            f'<nav class="primary" aria-label="Explore the atlas"><a href="{up}about.html">About</a><a href="{up}./#view=filmmakers">Filmmakers</a><a href="{up}./#view=films">Films</a>'
            f'<a href="{up}./#view=land">Land</a><a href="{up}./?constellate=1">Constellate</a><a href="{up}watch.html">▸ Watch</a></nav></header>')

def page(title, desc, body, depth, extra_head=''):
    up = '../' * depth
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">'
            f'<title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><link rel="icon" href="{up}assets/icon-1107.svg" type="image/svg+xml">'
            f'<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">{extra_head}<style>{CSS}</style></head><body>{header(depth)}<main>{body}</main></body></html>')

CITE_JS = '''<script>(()=>{const u=location.href.split('#')[0],d=new Date(),M=['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
for(const e of document.querySelectorAll('[data-url]'))e.textContent=u.replace(/^https?:\\/\\//,'');for(const e of document.querySelectorAll('[data-urlfull]'))e.textContent=u;
for(const e of document.querySelectorAll('[data-acc]'))e.textContent=d.getDate()+' '+M[d.getMonth()]+' '+d.getFullYear();
for(const b of document.querySelectorAll('[data-copy]'))b.onclick=async()=>{const t=document.getElementById(b.dataset.copy).innerText.trim();try{await navigator.clipboard.writeText(t);b.textContent='Copied';}catch{b.textContent='Select to copy';}};
const ris=document.getElementById('ris');if(ris){ris.onclick=()=>{const t=ris.dataset.ris.replace('{URL}',u).replace('{Y}',d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate());const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'application/x-research-info-systems'}));a.download=ris.dataset.name+'.ris';a.click();};}})();</script>'''

pages = []
for r in data:
    films = sorted(r['films'], key=lambda f: (f['year'] or 9999, sortkey(f['title'])))
    nm = r['name']
    who = ' · '.join(x for x in [r['nation'], r['country']] if x)
    items = []
    for f in films:
        img = (f'<img class="thumb" src="{esc(f["image"])}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{{className:\'noimg\',textContent:\'{esc((sortkey(f["title"])[:1] or "#").upper())}\'}}))">'
               if f['image'] else f'<div class="noimg" aria-hidden="true">{esc((sortkey(f["title"])[:1] or "#").upper())}</div>')
        links = []
        for w in f['watch'][:2]: links.append(f'<a href="{esc(w)}" target="_blank" rel="noopener">▶ Watch</a>')
        if f['source']: links.append(f'<a href="{esc(f["source"])}" target="_blank" rel="noopener">Credit source ↗</a>')
        if f['image'] and f['imagePage']: links.append(f'<a href="{esc(f["imagePage"])}" target="_blank" rel="noopener">Image: {esc(urlparse(f["imagePage"]).netloc.replace("www.",""))} ↗</a>')
        links.append(f'<a href="../#view=films&amp;maker={esc(r["id"])}&amp;film={esc(f["id"])}">On the map</a>')
        meta = ' · '.join(x for x in [str(f['year']) if f['year'] else '', f['credit'], f['medium'] if f['medium'] and f['medium'] != 'Film' else '', f['languages']] if x)
        items.append(f'<li id="{esc(f["id"])}">{img}<div><p class="ft">{esc(f["title"])}</p><p class="fm">{esc(meta)}</p><p class="fl">{"".join(links)}</p></div></li>')
    srcs = ''.join(f'<li><a href="{esc(s["url"])}" target="_blank" rel="noopener">{esc(urlparse(s["url"]).netloc.replace("www.",""))}</a>{" · " + esc(s["type"]) if s["type"] else ""}{" — " + esc(s["evidence"][:140]) if s["evidence"] else ""}</li>' for s in r['sources'])
    mla = f'“{esc(nm)}.” <i>{SITE}</i>, created by John Kennedy Godoy, University of Colorado Boulder, 2026, <span data-url>{esc(BASE)}/maker/{esc(r["id"])}.html</span>. Accessed <span data-acc></span>.'
    chi = f'Godoy, John Kennedy. “{esc(nm)}.” <i>{SITE}</i>. University of Colorado Boulder, 2026. <span data-urlfull>{esc(BASE)}/maker/{esc(r["id"])}.html</span>.'
    ris = f'TY  - ELEC\nTI  - {nm}\nT2  - {SITE}\nAU  - Godoy, John Kennedy\nPB  - University of Colorado Boulder\nPY  - 2026\nUR  - {{URL}}\nY2  - {{Y}}\nER  - \n'
    correct = f'../corrections.html?about={quote(nm)}&record={quote(r["id"])}&page={quote(BASE + "/maker/" + r["id"] + ".html")}'
    ld = {'@context': 'https://schema.org', '@type': 'Person', 'name': nm, 'alternateName': r['aliases'] or None, 'url': f'{BASE}/maker/{r["id"]}.html',
          'subjectOf': {'@type': 'WebSite', 'name': SITE},
          'sameAs': [s['url'] for s in r['sources'] if 'wikipedia.org/wiki/Category' not in s['url']][:6] or None}
    ld = {k: v for k, v in ld.items() if v}
    movies = [{'@context': 'https://schema.org', '@type': 'Movie', 'name': f['title'], 'dateCreated': str(f['year']) if f['year'] else None, 'director': {'@type': 'Person', 'name': nm}} for f in films]
    movies = [{k: v for k, v in m.items() if v} for m in movies]
    body = (f'<p class="crumb"><a href="./">Filmmakers A–Z</a></p><h1>{esc(nm)}</h1>'
            + (f'<p class="who">{esc(who)}</p>' if who else '')
            + (f'<p class="lands">Land references on the atlas: {esc(", ".join(r["lands"]))}</p>' if r['lands'] else '')
            + (f'<p class="aka">Also credited as {esc(", ".join(r["aliases"]))}</p>' if r['aliases'] else '')
            + f'<div class="actions"><a class="primary" href="../#view=filmmakers&amp;maker={esc(r["id"])}">Open on the map</a><a href="{esc(correct)}">Suggest a correction</a></div>'
            + f'<h2>Films <small>{len(films)}</small></h2><ol class="films">{"".join(items)}</ol>'
            + (f'<h2>Sources</h2><ul class="src">{srcs}</ul>' if srcs else '')
            + f'<h2 id="cite">Cite this page</h2><div class="cite"><p><b>MLA</b><button type="button" data-copy="mla-{esc(r["id"])}">Copy</button></p><p id="mla-{esc(r["id"])}">{mla}</p>'
            + f'<p><b>Chicago</b><button type="button" data-copy="chi-{esc(r["id"])}">Copy</button></p><p id="chi-{esc(r["id"])}">{chi}</p>'
            + f'<p><button type="button" id="ris" data-name="{esc(r["id"])}" data-ris="{esc(ris)}">Download for Zotero (RIS)</button></p></div>'
            + '<p class="note">Identity is recorded only from the filmmaker’s own words or an explicit biographical source; it is never inferred from a film’s subject, language or setting. Images remain with their rights holders.</p>'
            + CITE_JS)
    head = '<script type="application/ld+json">' + json.dumps([ld] + movies, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    desc = f'{nm}{" (" + r["nation"] + ")" if r["nation"] else ""}: {len(films)} film{"s" if len(films) != 1 else ""} on the Indigenous Cinema Atlas.'
    open(os.path.join(out, 'maker', r['id'] + '.html'), 'w', encoding='utf-8').write(page(f'{nm} · Indigenous Cinema Atlas', desc, body, 1, head))
    pages.append(r)

# A–Z directory
pages.sort(key=lambda r: sortkey(r['name']))
letters = {}
for r in pages:
    L = (sortkey(r['name'])[:1] or '#').upper()
    letters.setdefault(L if L.isalpha() else '#', []).append(r)
order = sorted(k for k in letters if k != '#') + (['#'] if '#' in letters else [])
az = ''.join(f'<a href="#L-{k}">{k}</a>' for k in order)
blocks = ''.join(f'<h2 id="L-{k}">{k}</h2><ul class="dir">' + ''.join(
    f'<li data-q="{esc((r["name"] + " " + r["nation"] + " " + " ".join(r["aliases"])).lower())}"><a href="{esc(r["id"])}.html">{esc(r["name"])}</a><small>{esc(r["nation"] or r["country"])} · {len(r["films"])} film{"s" if len(r["films"]) != 1 else ""}</small></li>'
    for r in letters[k]) + '</ul>' for k in order)
body = (f'<p class="crumb">Indigenous Cinema Atlas</p><h1>Filmmakers A–Z</h1><p class="who">{len(pages)} filmmakers on the public map, each with a permanent page you can cite.</p>'
        f'<input id="q" type="search" placeholder="Find a filmmaker or people" aria-label="Find a filmmaker or people"><nav class="az" aria-label="Jump to letter">{az}</nav>{blocks}'
        '<script>(()=>{const q=document.getElementById("q");q.oninput=()=>{const t=q.value.trim().toLowerCase();for(const li of document.querySelectorAll("ul.dir li"))li.hidden=!!t&&!li.dataset.q.includes(t);'
        'for(const h of document.querySelectorAll("main h2")){const ul=h.nextElementSibling;const any=[...ul.children].some(li=>!li.hidden);h.hidden=ul.hidden=!any;}};})();</script>')
open(os.path.join(out, 'maker', 'index.html'), 'w', encoding='utf-8').write(page('Filmmakers A–Z · Indigenous Cinema Atlas', f'{len(pages)} Indigenous filmmakers on the atlas, A to Z.', body, 1))
urls = [f'{BASE}/', f'{BASE}/about.html', f'{BASE}/watch.html', f'{BASE}/maker/'] + [f'{BASE}/maker/{r["id"]}.html' for r in pages]
open(os.path.join(out, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{esc(u)}</loc><lastmod>{TODAY}</lastmod></url>' for u in urls) + '</urlset>\n')
print('pages', len(pages), '+ index + sitemap')
