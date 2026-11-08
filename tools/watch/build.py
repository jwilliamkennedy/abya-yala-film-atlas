"""Build beta/watch.html and beta/watch-20261107-data.js from the runner's checked links (out/watch.json)."""
import json, sys, html
from urllib.parse import urlparse
d = json.load(open(sys.argv[1]))
esc = lambda s: html.escape(str(s or ''), quote=True)
ca = {f['url']: f['canadaOnly'] for f in d['found']}
rows = {}
def add(e, url, source):
    key = (e['fid'], url)
    if key in rows: return
    rows[key] = {'fid': e['fid'], 'rid': e['rid'], 'title': e['title'], 'year': e.get('year'), 'maker': e['maker'], 'url': url, 'source': source, 'canadaOnly': ca.get(url, False)}
def source_of(url):
    h = urlparse(url).netloc.replace('www.', '')
    if 'nfb.ca' in h: return 'National Film Board of Canada'
    if 'skyhopinka' in h or 'vimeo.com' in h: return 'Sky Hopinka'
    return 'Other platforms'
for e in d['existing']:
    if e['status'] and e['status'] < 400: add(e, e['url'], source_of(e['url']))
for f in d['found']: add(f, f['url'], source_of(f['url']))
# one row per film title + url (co-directors listed together)
films = {}
for r in rows.values():
    k = (r['title'], r['url'])
    films.setdefault(k, {**r, 'makers': []})['makers'].append((r['rid'], r['maker'], r['fid']))
ORDER = ['National Film Board of Canada', 'Sky Hopinka', 'Other platforms']
BLURB = {'National Film Board of Canada': 'Streaming at the NFB. Films marked “Free in Canada” play only from Canada.',
         'Sky Hopinka': 'On the filmmaker’s own site and Vimeo, as he presents them.',
         'Other platforms': 'At the filmmaker’s or producer’s page; access conditions are set by each platform.'}
parts = []
for src in ORDER:
    es = sorted([f for f in films.values() if f['source'] == src], key=lambda f: (f['title'].lower()))
    if not es: continue
    parts.append(f'<section class="src" data-src="{esc(src)}"><h2>{esc(src)} <small>{len(es)}</small></h2><p class="blurb">{esc(BLURB[src])}</p><ol>')
    for f in es:
        makers = ', '.join(f'<a href="./#view=films&amp;maker={esc(rid)}&amp;film={esc(fid)}">{esc(m)}</a>' for rid, m, fid in f['makers'])
        host = urlparse(f['url']).netloc.replace('www.', '')
        tag = '<span class="tag">Free in Canada</span>' if f['canadaOnly'] else ''
        q = esc(' '.join([f['title'], src] + [m for _, m, _ in f['makers']]).lower())
        parts.append(f'<li data-q="{q}"><a class="t" href="{esc(f["url"])}" target="_blank" rel="noopener">{esc(f["title"])}</a>'
                     f'<span class="meta">{esc(f["year"] or "")}{" · " if f["year"] else ""}{esc(host)}</span><span class="by">{makers}{tag}</span></li>')
    parts.append('</ol></section>')
total = len(films)
chips = '<button type="button" aria-pressed="true" data-src="">All</button>' + ''.join(f'<button type="button" aria-pressed="false" data-src="{esc(s)}">{esc(s.replace("National Film Board of Canada","NFB"))}</button>' for s in ORDER if any(f['source']==s for f in films.values()))
nav = '<nav class="primary" aria-label="Explore the atlas"><a href="about.html">About</a><a href="./#view=filmmakers">Filmmakers</a><a href="./#view=films">Films</a><a href="./#view=land">Land</a><a href="./?constellate=1">Constellate</a><a href="watch.html" aria-current="page">▸ Watch</a></nav>'
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>Watch · Indigenous Cinema Atlas</title>
<meta name="description" content="{total} films by Indigenous filmmakers on the atlas that you can stream, each linked to its source and to its place on the map.">
<link rel="icon" href="assets/icon-1107.svg" type="image/svg+xml">
<style>
:root{{--ink:#182028;--muted:#55616b;--accent:#9c3b26;--line:rgba(24,32,40,.15);--bg:#eef0ec;--bg2:#e2e6e0;--serif:Georgia,'Times New Roman',serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,Roboto,Arial,sans-serif}}
@media (prefers-color-scheme:dark){{:root{{--ink:#efe6d2;--muted:#a9b3c8;--accent:#e9d9ad;--line:rgba(233,217,173,.22);--bg:#0e1729;--bg2:#121d33}}}}
*{{box-sizing:border-box}}html,body{{margin:0;background:var(--bg);color:var(--ink)}}
body{{font:400 16px/1.6 var(--sans)}}
a{{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--line)}}a:hover,a:focus-visible{{border-color:var(--accent)}}
header{{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;padding:20px clamp(16px,4vw,48px);border-bottom:1px solid var(--line)}}
.brand{{display:flex;align-items:center;gap:10px;font:400 26px/1.1 var(--serif);color:var(--ink);border:0}}.brand img{{width:30px;height:30px}}
.brand small{{display:block;font:500 11px/1.4 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:4px}}
nav.primary{{display:flex;flex-wrap:wrap;gap:4px 20px}}nav.primary a{{color:var(--ink);border:0;font-size:15px;padding:6px 0}}nav.primary a[aria-current]{{box-shadow:inset 0 -2px 0 var(--accent)}}
main{{max-width:860px;margin:0 auto;padding:36px clamp(16px,4vw,32px) 64px}}
.eyebrow{{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0}}
h1{{font:400 clamp(30px,4vw,44px)/1.1 var(--serif);margin:8px 0 12px}}.lede{{font-size:18px;margin:0 0 6px}}.note{{color:var(--muted);font-size:14px;margin:0 0 22px}}
.tools{{position:sticky;top:0;z-index:2;background:var(--bg);display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}}
#q{{flex:1 1 240px;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--ink)}}
.chips{{display:flex;gap:6px;flex-wrap:wrap}}.chips button{{font:inherit;font-size:14px;min-height:34px;padding:0 13px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink);cursor:pointer}}
.chips button[aria-pressed=true]{{background:var(--ink);color:var(--bg)}}.count{{font-size:13px;color:var(--muted)}}
h2{{font:400 24px/1.2 var(--serif);margin:34px 0 4px}}h2 small{{font:13px var(--sans);color:var(--muted)}}.blurb{{color:var(--muted);font-size:14px;margin:0 0 10px}}
ol{{list-style:none;margin:0;padding:0}}li{{display:grid;grid-template-columns:1fr auto;gap:2px 16px;padding:12px 0;border-bottom:1px solid var(--line)}}
li .t{{font:400 19px/1.3 var(--serif);color:var(--ink);border:0}}li .t:hover{{color:var(--accent)}}li .meta{{font-size:13px;color:var(--muted);text-align:right}}
li .by{{grid-column:1/-1;font-size:14px;color:var(--muted)}}.tag{{margin-left:10px;font-size:12px;padding:1px 8px;border:1px solid var(--line);border-radius:999px}}
.credit,.empty{{color:var(--muted);font-size:14px;margin-top:32px}}
@media (max-width:560px){{li{{grid-template-columns:1fr}}li .meta{{text-align:left}}}}
</style></head><body>
<header><a class="brand" href="./"><img src="assets/icon-1107.svg" alt=""><span>Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></span></a>{nav}</header>
<main>
<p class="eyebrow">Watch</p><h1>Films you can watch now</h1>
<p class="lede">{total} films by filmmakers on the atlas, streaming at the National Film Board of Canada, on the filmmakers’ own sites and on other platforms.</p>
<p class="note">Each title opens at its source, where the film and its credits live. A filmmaker’s name opens the film on the map. Links checked on 7 November 2026; availability can change.</p>
<div class="tools" role="search"><input id="q" type="search" placeholder="Search titles or filmmakers" aria-label="Search titles or filmmakers"><div class="chips" role="group" aria-label="Source">{chips}</div><span class="count" id="count" aria-live="polite">{total} films</span></div>
{''.join(parts)}
<p class="empty" id="empty" hidden>No films match.</p>
<p class="credit">Know a public link to a film by a filmmaker on the atlas? <a href="corrections.html">Suggest it</a>.</p>
</main>
<script>
(()=>{{const q=document.getElementById('q'),chips=[...document.querySelectorAll('.chips button')],secs=[...document.querySelectorAll('section.src')],count=document.getElementById('count'),empty=document.getElementById('empty');let src='';
const run=()=>{{const t=q.value.trim().toLowerCase();let n=0;for(const s of secs){{let k=0;const on=!src||s.dataset.src===src;for(const li of s.querySelectorAll('li')){{const ok=on&&(!t||li.dataset.q.includes(t));li.hidden=!ok;if(ok)k++;}}s.hidden=!k;n+=k;}}count.textContent=n+(n===1?' film':' films');empty.hidden=n>0;}};
q.addEventListener('input',run);for(const b of chips)b.addEventListener('click',()=>{{src=b.dataset.src;for(const c of chips)c.setAttribute('aria-pressed',String(c===b));run();}});
document.addEventListener('keydown',e=>{{if(e.key==='/'&&document.activeElement!==q){{e.preventDefault();q.focus();}}}});}})();
</script></body></html>'''
open(sys.argv[2], 'w', encoding='utf-8').write(page)
# data layer: give new links to the films so the Films list shows "Watch online"
links = {}
for f in d['found']:
    label = 'Watch at the NFB' if 'nfb.ca' in f['url'] else 'Watch on the filmmaker’s site'
    links.setdefault(f['fid'], []).append({'url': f['url'], 'title': label, 'context': 'Free to stream in Canada.' if f['canadaOnly'] else ''})
js = ('/* Beta-only watch links found 7 Nov 2026 (NFB film pages and skyhopinka.com), each matched on title and director and checked from a runner. */\n'
      '(()=>{const add=' + json.dumps(links, ensure_ascii=False) + ';const X=window.ATLAS_FILM_EXPLORATION=window.ATLAS_FILM_EXPLORATION||{};'
      'for(const [id,ls] of Object.entries(add)){const e=X[id]||(X[id]={});const have=new Set((e.links||[]).map(l=>l.url));e.links=[...(e.links||[]),...ls.filter(l=>!have.has(l.url))];}})();\n')
open(sys.argv[3], 'w', encoding='utf-8').write(js)
print('films on page', total, '| data links for', len(links), 'films')
