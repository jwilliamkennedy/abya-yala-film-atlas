"""Second thumbnail pass: open film databases instead of search engines (which block runners).
For each A–F film still without an image:
 1. NFB: nfb.ca/film/<slug>/ page image, when the page title is the film and names the director.
 2. Wikipedia (en, es, pt, fr): the article for the film whose text names the director; its lead image.
 3. Wikidata: a film item whose title matches and whose director (P57) label matches; its image (P18).
 4. Vimeo/YouTube links already on the film's own source page (oEmbed thumbnail; title must match).
Writes to out/found.jsonl (appends) and out/img/<n>.jpg, same format as search.py."""
import json, re, os, sys, time
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import search as base
from search import n, main_title, title_ok, maker_ok, get, page_meta, oembed, check_image, LOCK

WIKI_UA = {'User-Agent': 'IndigenousCinemaAtlas/1.0 (https://jwilliamkennedy.github.io/abya-yala-film-atlas/; research use)'}

def slug(s):
    s = base.unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().replace('&', 'and')
    s = re.sub(r"[’'`]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def try_nfb(g):
    for t in dict.fromkeys([g['title'], main_title(g['title'])]):
        for s in (slug(t), slug(t).replace('-', '_')):
            info = page_meta(f'https://www.nfb.ca/film/{s}/')
            if info and info.get('image') and title_ok(g['title'], info['title']) and maker_ok(g, info['text']):
                return {'n': g['n'], 'how': 'NFB film page', 'page': info['url'], 'image': info['image'], 'pageTitle': info['title'][:160]}
    return None

def wjson(url):
    r = get(url, headers=WIKI_UA)
    try:
        return r.json() if r is not None and r.status_code == 200 else None
    except Exception:
        return None

def try_wikipedia(g):
    for lang in ('en', 'es', 'pt', 'fr'):
        j = wjson(f'https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=3&format=json&srsearch=' + quote(f'"{main_title(g["title"])}" {(g["makers"] or [""])[0]}'))
        for hit in (j or {}).get('query', {}).get('search', []):
            if not title_ok(g['title'], hit['title']):
                continue
            p = wjson(f'https://{lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&piprop=original&exintro=1&explaintext=1&titles=' + quote(hit['title']))
            for page in (p or {}).get('query', {}).get('pages', {}).values():
                img = page.get('original', {}).get('source')
                if img and maker_ok(g, page.get('extract', '')):
                    return {'n': g['n'], 'how': f'Wikipedia ({lang})', 'page': f'https://{lang}.wikipedia.org/wiki/' + quote(hit['title'].replace(' ', '_')), 'image': img, 'pageTitle': hit['title']}
    return None

def try_wikidata(g):
    j = wjson('https://www.wikidata.org/w/api.php?action=wbsearchentities&type=item&limit=5&format=json&language=en&search=' + quote(main_title(g['title'])))
    for hit in (j or {}).get('search', []):
        if not title_ok(g['title'], hit.get('label', '')):
            continue
        e = wjson(f'https://www.wikidata.org/wiki/Special:EntityData/{hit["id"]}.json')
        ent = (e or {}).get('entities', {}).get(hit['id'], {})
        claims = ent.get('claims', {})
        imgs = [c['mainsnak'].get('datavalue', {}).get('value') for c in claims.get('P18', [])]
        dirs = [c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in claims.get('P57', [])]
        if not imgs or not dirs:
            continue
        names = []
        for d in dirs[:4]:
            dj = wjson(f'https://www.wikidata.org/wiki/Special:EntityData/{d}.json')
            labels = (dj or {}).get('entities', {}).get(d, {}).get('labels', {})
            names += [v['value'] for v in labels.values()][:3]
        if maker_ok(g, ' '.join(names)):
            return {'n': g['n'], 'how': 'Wikidata', 'page': f'https://www.wikidata.org/wiki/{hit["id"]}',
                    'image': 'https://commons.wikimedia.org/wiki/Special:FilePath/' + quote(imgs[0].replace(' ', '_')) + '?width=800', 'pageTitle': hit.get('label', '')}
    return None

def try_video(g):
    for src in g['sources']:
        r = get(src) if src and not src.lower().endswith('.pdf') else None
        if not r or r.status_code >= 400:
            continue
        for v in re.findall(r'https?://(?:player\.)?vimeo\.com/(?:video/)?\d+|https?://(?:www\.)?youtube\.com/(?:watch\?v=|embed/)[\w-]{11}|https?://youtu\.be/[\w-]{11}', r.text)[:4]:
            v = v.replace('player.vimeo.com/video/', 'vimeo.com/').replace('/embed/', '/watch?v=')
            info = oembed(v)
            if info and info.get('image') and title_ok(g['title'], info['title']):
                return {'n': g['n'], 'how': 'video on the film’s source page', 'page': v, 'image': info['image'], 'pageTitle': info['title'][:160]}
    return None

def try_festival(g):
    hosts = ' '.join(g['sources'])
    tries = []
    for t in dict.fromkeys([g['title'], main_title(g['title'])]):
        tries.append(('Morelia film page', f'https://www.moreliafilmfest.com/en/peliculas/{slug(t)}'))
        if 'wapikoni' in hosts or 'Wapikoni' in ' '.join(g.get('nations', [])):
            tries.append(('Wapikoni film page', f'https://www.wapikoni.ca/movies/{slug(t)}'))
    for how, url in tries:
        info = page_meta(url)
        if info and info.get('image') and title_ok(g['title'], info['title']) and maker_ok(g, info['text']):
            if re.search(r'logo|banner|default|placeholder', info['image'], re.I):
                continue
            return {'n': g['n'], 'how': how, 'page': info['url'], 'image': info['image'], 'pageTitle': info['title'][:160]}
    return None

def one(g):
    cand = None
    for step in (try_festival, try_nfb, try_wikipedia, try_wikidata, try_video):
        try:
            cand = step(g)
        except Exception:
            cand = None
        if cand:
            chk = check_image(cand['image'])
            if chk:
                cand.update({'w': chk['w'], 'h': chk['h'], 'hash': chk['hash']})
                chk['img'].thumbnail((400, 300)); chk['img'].save(f"out/img/{g['n']}.jpg", quality=85)
                break
            cand = None
    with LOCK:
        if cand:
            with open('out/found.jsonl', 'a', encoding='utf-8') as fh:
                fh.write(json.dumps(cand, ensure_ascii=False) + '\n')
        print(g['n'], g['title'][:40], '->', cand and (cand['how'] + ' ' + cand['page'][:70]), flush=True)

if __name__ == '__main__':
    os.makedirs('out/img', exist_ok=True)
    films = json.load(open('tools/thumbs/af_missing.json'))
    done = set()
    if os.path.exists('out/found.jsonl'):
        done = {json.loads(l)['n'] for l in open('out/found.jsonl', encoding='utf-8')}
    with ThreadPoolExecutor(max_workers=6) as ex:
        list(ex.map(one, [g for g in films if g['n'] not in done]))
    print('PASS DONE', flush=True)
