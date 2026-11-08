"""Build beta/watch.html and beta/watch-20261107-data.js.
usage: build.py watch-checked.json embeds.json people.json out.html out-data.js"""
import json, sys, html, re, datetime
from urllib.parse import urlparse
d = json.load(open(sys.argv[1])); embeds = json.load(open(sys.argv[2])); people = json.load(open(sys.argv[3]))
esc = lambda s: html.escape(str(s or ''), quote=True)
ca = {f['url']: f['canadaOnly'] for f in d['found']}

def people_label(rid):
    n = (people.get(rid) or {}).get('nation') or ''
    n = re.split(r';', n)[0]
    n = re.sub(r'^(Member of the|Member of)\s+', '', n).replace(' filmmaker', '').strip()
    return n or 'Not recorded'

def source_of(url):
    h = urlparse(url).netloc.replace('www.', '')
    if 'nfb.ca' in h: return 'National Film Board of Canada'
    if 'skyhopinka' in h or 'vimeo.com' in h: return 'Sky Hopinka'
    return 'Other platforms'

rows = {}
def add(e, url):
    k = (e['title'], url)
    r = rows.setdefault(k, {'title': e['title'], 'year': e.get('year'), 'url': url, 'source': source_of(url), 'canadaOnly': ca.get(url, False),
                            'embed': embeds.get(url), 'makers': []})
    if not r['year'] and e.get('year'): r['year'] = e['year']
    if all(m[0] != e['rid'] for m in r['makers']):
        r['makers'].append((e['rid'], e['maker'], e['fid']))
for e in d['existing']:
    if e['status'] and e['status'] < 400: add(e, e['url'])
for f in d['found']: add(f, f['url'])
films = sorted(rows.values(), key=lambda f: f['title'].lower())
for i, f in enumerate(films): f['i'] = i

def item(f):
    makers = ', '.join(f'<a href="./#view=films&amp;maker={esc(rid)}&amp;film={esc(fid)}">{esc(m)}</a>' for rid, m, fid in f['makers'])
    tag = '<span class="tag">Free in Canada</span>' if f['canadaOnly'] else ''
    play = f'<button type="button" class="play" data-embed="{esc(f["embed"])}" data-title="{esc(f["title"])}" aria-label="Play {esc(f["title"])} here">▶ Play here</button>' if f['embed'] else ''
    host = urlparse(f['url']).netloc.replace('www.', '')
    peoples = ' · '.join(dict.fromkeys(people_label(rid) for rid, _, _ in f['makers']))
    q = esc(' '.join([f['title'], f['source'], peoples] + [m for _, m, _ in f['makers']]).lower())
    return (f'<li data-q="{q}" data-i="{f["i"]}"><div class="row"><a class="t" href="{esc(f["url"])}" target="_blank" rel="noopener">{esc(f["title"])}</a>'
            f'<span class="meta">{esc(f["year"] or "")}{" · " if f["year"] else ""}{esc(host)}</span></div>'
            f'<span class="by">{makers} <span class="ppl">{esc(peoples)}</span>{tag}</span>{play}<div class="slot"></div></li>')

def group(name, key, order=None, blurb=None):
    groups = {}
    for f in films:
        for k in key(f): groups.setdefault(k, []).append(f)
    keys = order or sorted(groups, key=lambda k: k.lower())
    out = [f'<div class="view" data-view="{name}"{" hidden" if name != "source" else ""}>']
    for k in keys:
        if k not in groups: continue
        out.append(f'<section class="grp"><h2>{esc(k)} <small>{len(groups[k])}</small></h2>' + (f'<p class="blurb">{esc(blurb[k])}</p>' if blurb and k in blurb else '') + '<ol>')
        out += [item(f) for f in sorted(groups[k], key=lambda f: f['title'].lower())]
        out.append('</ol></section>')
    out.append('</div>')
    return ''.join(out)

ORDER = ['National Film Board of Canada', 'Sky Hopinka', 'Other platforms']
BLURB = {'National Film Board of Canada': 'Streaming at the NFB. Press ▶ Play here to watch on this page; films marked “Free in Canada” play only from Canada.',
         'Sky Hopinka': 'On the filmmaker’s own site, as he presents them.',
         'Other platforms': 'At the filmmaker’s or producer’s page; access conditions are set by each platform.'}
initial = lambda name: (re.sub(r'^[^A-Za-zÀ-ÿ]+', '', name)[:1] or '#').upper()
views = (group('source', lambda f: [f['source']], ORDER, BLURB)
         + group('people', lambda f: list(dict.fromkeys(people_label(r) for r, _, _ in f['makers'])))
         + group('maker', lambda f: list(dict.fromkeys(m for _, m, _ in f['makers']))))

# Now showing: rotates weekly among films that embed and play outside Canada
pool = [f for f in films if f['embed'] and not f['canadaOnly'] and f['source'] == 'National Film Board of Canada']
pool_js = json.dumps([{'t': f['title'], 'y': f['year'], 'e': f['embed'], 'u': f['url'], 'm': [[r, m, fid] for r, m, fid in f['makers']]} for f in pool], ensure_ascii=False)
total = len(films); playable = sum(1 for f in films if f['embed'])
nav = '<nav class="primary" aria-label="Explore the atlas"><a href="about.html">About</a><a href="./#view=filmmakers">Filmmakers</a><a href="./#view=films">Films</a><a href="./#view=land">Land</a><a href="./?constellate=1">Constellate</a><a href="watch.html" aria-current="page">▸ Watch</a></nav>'
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>Watch · Indigenous Cinema Atlas</title>
<meta name="description" content="{total} films by Indigenous filmmakers on the atlas that you can stream, {playable} of them on this page.">
<link rel="icon" href="assets/icon-1107.svg" type="image/svg+xml">
<style>
:root{{--ink:#182028;--muted:#55616b;--accent:#9c3b26;--line:rgba(24,32,40,.15);--bg:#eef0ec;--card:#e4e8e2;--serif:Georgia,'Times New Roman',serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,Roboto,Arial,sans-serif}}
@media (prefers-color-scheme:dark){{:root{{--ink:#efe6d2;--muted:#a9b3c8;--accent:#e9d9ad;--line:rgba(233,217,173,.22);--bg:#0e1729;--card:#15213a}}}}
*{{box-sizing:border-box}}html,body{{margin:0;background:var(--bg);color:var(--ink)}}body{{font:400 16px/1.6 var(--sans)}}
a{{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--line)}}a:hover,a:focus-visible{{border-color:var(--accent)}}
header{{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;padding:20px clamp(16px,4vw,48px);border-bottom:1px solid var(--line)}}
.brand{{display:flex;align-items:center;gap:10px;font:400 26px/1.1 var(--serif);color:var(--ink);border:0}}.brand img{{width:30px;height:30px}}
.brand small{{display:block;font:500 11px/1.4 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:4px}}
nav.primary{{display:flex;flex-wrap:wrap;gap:4px 20px}}nav.primary a{{color:var(--ink);border:0;font-size:15px;padding:6px 0}}nav.primary a[aria-current]{{box-shadow:inset 0 -2px 0 var(--accent)}}
main{{max-width:900px;margin:0 auto;padding:32px clamp(16px,4vw,32px) 64px}}
.eyebrow{{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0}}
h1{{font:400 clamp(30px,4vw,44px)/1.1 var(--serif);margin:8px 0 12px}}.lede{{font-size:18px;margin:0 0 6px}}.note{{color:var(--muted);font-size:14px;margin:0 0 22px}}
#now{{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:16px;margin:0 0 26px}}
#now .label{{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 8px;display:flex;justify-content:space-between;gap:8px}}
#now .label button{{font:inherit;font-size:12px;letter-spacing:.06em;text-transform:none;background:none;border:0;color:var(--accent);cursor:pointer;padding:0}}
.frame{{position:relative;aspect-ratio:16/9;background:#000;border-radius:4px;overflow:hidden}}.frame iframe{{position:absolute;inset:0;width:100%;height:100%;border:0}}
#now h2{{font:400 24px/1.25 var(--serif);margin:12px 0 2px}}#now .by{{font-size:14px;color:var(--muted)}}
.tools{{position:sticky;top:0;z-index:2;background:var(--bg);display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}}
#q{{flex:1 1 220px;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--ink)}}
.seg{{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}}.seg button{{font:inherit;font-size:14px;min-height:34px;padding:0 13px;border:0;background:transparent;color:var(--ink);cursor:pointer}}
.seg button+button{{border-left:1px solid var(--line)}}.seg button[aria-pressed=true]{{background:var(--ink);color:var(--bg)}}.count{{font-size:13px;color:var(--muted)}}
h2{{font:400 22px/1.2 var(--serif);margin:30px 0 4px}}h2 small{{font:13px var(--sans);color:var(--muted)}}.blurb{{color:var(--muted);font-size:14px;margin:0 0 8px}}
ol{{list-style:none;margin:0;padding:0}}li{{padding:12px 0;border-bottom:1px solid var(--line)}}
.row{{display:flex;justify-content:space-between;gap:16px;align-items:baseline}}li .t{{font:400 19px/1.3 var(--serif);color:var(--ink);border:0}}li .t:hover{{color:var(--accent)}}
li .meta{{font-size:13px;color:var(--muted);white-space:nowrap}}li .by{{display:block;font-size:14px;color:var(--muted)}}.ppl{{margin-left:6px}}
.tag{{margin-left:10px;font-size:12px;padding:1px 8px;border:1px solid var(--line);border-radius:999px}}
.play{{margin-top:6px;font:inherit;font-size:13px;min-height:30px;padding:0 12px;border:1px solid var(--accent);border-radius:999px;background:transparent;color:var(--accent);cursor:pointer}}
.slot .frame{{margin-top:10px}}.credit,.empty{{color:var(--muted);font-size:14px;margin-top:32px}}
@media (max-width:560px){{.row{{flex-direction:column;gap:0}}}}
</style></head><body>
<header><a class="brand" href="./"><img src="assets/icon-1107.svg" alt=""><span>Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></span></a>{nav}</header>
<main>
<p class="eyebrow">Watch</p><h1>Films you can watch now</h1>
<p class="lede">{total} films by filmmakers on the atlas; {playable} play right on this page.</p>
<p class="note">Each title opens at its source, where the film and its credits live. A filmmaker’s name opens the film on the map. Links checked on {datetime.date.today():%-d %B %Y}; availability can change.</p>
<section id="now" aria-label="Now showing"><p class="label"><span>Now showing</span><button type="button" id="next">Another film ↻</button></p>
<div class="frame"><iframe id="now-frame" title="Now showing" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
<h2 id="now-title"></h2><p class="by" id="now-by"></p></section>
<div class="tools" role="search"><input id="q" type="search" placeholder="Search titles, filmmakers or peoples" aria-label="Search titles, filmmakers or peoples">
<div class="seg" role="group" aria-label="Group by"><button type="button" data-view="source" aria-pressed="true">Source</button><button type="button" data-view="people" aria-pressed="false">Peoples</button><button type="button" data-view="maker" aria-pressed="false">Filmmakers A–Z</button></div>
<span class="count" id="count" aria-live="polite">{total} films</span></div>
{views}
<p class="empty" id="empty" hidden>No films match.</p>
<p class="credit">Know a public link to a film by a filmmaker on the atlas? <a href="corrections.html">Suggest it</a>.</p>
</main>
<script>
(()=>{{const pool={pool_js};const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c]));
const week=Math.floor((Date.now()/864e5+3)/7);let k=pool.length?week%pool.length:0;
const show=()=>{{if(!pool.length){{$('#now').hidden=true;return;}}const f=pool[k];$('#now-frame').src=f.e;$('#now-frame').title=f.t;$('#now-title').textContent=f.t+(f.y?' ('+f.y+')':'');
 $('#now-by').innerHTML=f.m.map(([r,m,id])=>'<a href="./#view=films&amp;maker='+encodeURIComponent(r)+'&amp;film='+encodeURIComponent(id)+'">'+esc(m)+'</a>').join(', ')+' · <a href="'+esc(f.u)+'" target="_blank" rel="noopener">At the NFB</a>';}};
show();$('#next').onclick=()=>{{k=(k+1)%pool.length;show();}};
let view='source';const q=$('#q');
const run=()=>{{const t=q.value.trim().toLowerCase();let seen=new Set();for(const v of $$('.view')){{const on=v.dataset.view===view;v.hidden=!on;if(!on)continue;
 for(const s of v.querySelectorAll('section.grp')){{let n=0;for(const li of s.querySelectorAll('li')){{const ok=!t||li.dataset.q.includes(t);li.hidden=!ok;if(ok){{n++;seen.add(li.dataset.i);}}}}s.hidden=!n;}}}}
 $('#count').textContent=seen.size+(seen.size===1?' film':' films');$('#empty').hidden=seen.size>0;}};
q.addEventListener('input',run);
for(const b of $$('.seg button'))b.onclick=()=>{{view=b.dataset.view;for(const c of $$('.seg button'))c.setAttribute('aria-pressed',String(c===b));run();}};
document.addEventListener('click',e=>{{const b=e.target.closest('.play');if(!b)return;const slot=b.parentElement.querySelector('.slot');
 if(slot.firstChild){{slot.replaceChildren();b.textContent='▶ Play here';return;}}
 for(const s of $$('.slot'))s.replaceChildren();for(const p of $$('.play'))p.textContent='▶ Play here';
 slot.innerHTML='<div class="frame"><iframe src="'+esc(b.dataset.embed)+'" title="'+esc(b.dataset.title)+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>';b.textContent='Close player';}});
document.addEventListener('keydown',e=>{{if(e.key==='/'&&document.activeElement!==q){{e.preventDefault();q.focus();}}}});}})();
</script></body></html>'''
open(sys.argv[4], 'w', encoding='utf-8').write(page)
links = {}
for f in d['found']:
    label = 'Watch at the NFB' if 'nfb.ca' in f['url'] else 'Watch on the filmmaker’s site'
    links.setdefault(f['fid'], []).append({'url': f['url'], 'title': label, 'context': 'Free to stream in Canada.' if f['canadaOnly'] else ''})
js = ('/* Beta-only watch links found 7 Nov 2026 (NFB film pages and skyhopinka.com), each matched on title and director and checked from a runner. */\n'
      '(()=>{const add=' + json.dumps(links, ensure_ascii=False) + ';const X=window.ATLAS_FILM_EXPLORATION=window.ATLAS_FILM_EXPLORATION||{};'
      'for(const [id,ls] of Object.entries(add)){const e=X[id]||(X[id]={});const have=new Set((e.links||[]).map(l=>l.url));e.links=[...(e.links||[]),...ls.filter(l=>!have.has(l.url))];}})();\n')
open(sys.argv[5], 'w', encoding='utf-8').write(js)
print('films', total, '| playable here', playable, '| now-showing pool', len(pool))
