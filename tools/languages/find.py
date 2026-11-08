"""Find what each film's own pages say about its languages. Runs on a GitHub runner (review only).

For each film in targets.json (no language yet):
 1. Wikidata: the film item (title matches; director P57 or year matches) -> original language (P364) /
    language of work (P407), each with its Glottolog (P1394) and ISO 639-3 (P220) codes.
    Also: the filmmaker's own Wikidata item -> every film with P57 = them, matched on title.
 2. Wikipedia (en, es, pt, fr): the film's article (names the director) -> infobox language field.
 3. Film pages: known pages (research master, Watch, Wapikoni) plus guessed NFB, Wapikoni, Morelia and
    Retina Latina film pages whose title is the film -> text that names a language
    ("Language: ...", "in Atikamekw with French subtitles", "hablada en tseltal").
 4. The film's source on the map, only the passage right after the film's title.
 5. Vimeo descriptions (oEmbed) of players on those pages, when the video title is the film.
Nothing is decided here: out/lang.jsonl holds the evidence (page + quoted text) for review."""
import json, re, os, sys, time, html as H, threading
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'thumbs'))
from search import n, main_title, title_ok, maker_ok, get, oembed

UA = {'User-Agent': 'IndigenousCinemaAtlas/1.0 (https://jwilliamkennedy.github.io/abya-yala-film-atlas/; research use)'}
LOCK = threading.Lock()
CACHE = {}

def wjson(url):
    if url in CACHE:
        return CACHE[url]
    r = get(url, headers=UA)
    try:
        j = r.json() if r is not None and r.status_code == 200 else None
    except Exception:
        j = None
    CACHE[url] = j
    return j

def entity(q):
    j = wjson(f'https://www.wikidata.org/wiki/Special:EntityData/{q}.json')
    return (j or {}).get('entities', {}).get(q, {})

def claim_ids(ent, p):
    out = []
    for c in ent.get('claims', {}).get(p, []):
        v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
        if isinstance(v, dict) and v.get('id'):
            out.append(v['id'])
    return out

def claim_str(ent, p):
    for c in ent.get('claims', {}).get(p, []):
        v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
        if isinstance(v, str):
            return v
    return ''

def labels(ent):
    return [v['value'] for v in ent.get('labels', {}).values()]

def year_of(ent):
    for c in ent.get('claims', {}).get('P577', []):
        v = c.get('mainsnak', {}).get('datavalue', {}).get('value', {})
        m = re.match(r'\+(\d{4})', v.get('time', '') if isinstance(v, dict) else '')
        if m:
            return m.group(1)
    return ''

def lang_info(q):
    e = entity(q)
    lab = e.get('labels', {})
    return {'label': (lab.get('en') or lab.get('es') or next(iter(lab.values()), {'value': q}))['value'], 'qid': q,
            'glottocode': claim_str(e, 'P1394'), 'iso639_3': claim_str(e, 'P220')}

def film_langs(ent):
    qs = list(dict.fromkeys(claim_ids(ent, 'P364') + claim_ids(ent, 'P407')))
    return [lang_info(q) for q in qs[:8]]

def wd_film_ok(g, ent):
    if not any(title_ok(g['title'], l) for l in labels(ent)):
        return False
    names = []
    for d in claim_ids(ent, 'P57')[:4]:
        names += labels(entity(d))[:4]
    if names and maker_ok({'makers': g['makers']}, ' '.join(names)):
        return True
    return bool(g.get('year')) and year_of(ent) == str(g['year'])

def try_wikidata(g):
    found = []
    seen = set()
    for lang in ('en', 'es', 'pt', 'fr'):
        j = wjson(f'https://www.wikidata.org/w/api.php?action=wbsearchentities&type=item&limit=6&format=json&language={lang}&search=' + quote(main_title(g['title'])))
        for hit in (j or {}).get('search', []):
            if hit['id'] in seen:
                continue
            seen.add(hit['id'])
            ent = entity(hit['id'])
            if wd_film_ok(g, ent):
                L = film_langs(ent)
                if L:
                    found.append({'how': 'Wikidata film item', 'page': f'https://www.wikidata.org/wiki/{hit["id"]}', 'title': hit.get('label', ''), 'langs': L})
                    return found
    return found

MAKER_FILMS = {}
def maker_films(name):
    if name in MAKER_FILMS:
        return MAKER_FILMS[name]
    films = []
    j = wjson('https://www.wikidata.org/w/api.php?action=wbsearchentities&type=item&limit=5&format=json&language=en&search=' + quote(name))
    for hit in (j or {}).get('search', []):
        if n(hit.get('label')) != n(name):
            continue
        ent = entity(hit['id'])
        if 'Q5' not in claim_ids(ent, 'P31'):
            continue
        s = wjson('https://www.wikidata.org/w/api.php?action=query&list=search&srlimit=50&format=json&srsearch=' + quote(f'haswbstatement:P57={hit["id"]}'))
        for x in (s or {}).get('query', {}).get('search', []):
            films.append(x['title'])
        break
    MAKER_FILMS[name] = films
    return films

def try_wikidata_maker(g):
    for m in g['makers']:
        for q in maker_films(m):
            ent = entity(q)
            if any(title_ok(g['title'], l) for l in labels(ent)):
                L = film_langs(ent)
                if L:
                    return [{'how': 'Wikidata film item (via director)', 'page': f'https://www.wikidata.org/wiki/{q}', 'title': labels(ent)[0] if labels(ent) else '', 'langs': L}]
    return []

INFOBOX = {'en': r'language', 'es': r'idioma|idiomas', 'pt': r'idioma|l[íi]ngua', 'fr': r'langue'}
def try_wikipedia(g):
    for lang in ('en', 'es', 'pt', 'fr'):
        j = wjson(f'https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=3&format=json&srsearch=' + quote(f'"{main_title(g["title"])}" {g["makers"][0]}'))
        for hit in (j or {}).get('query', {}).get('search', []):
            if not title_ok(g['title'], hit['title']):
                continue
            p = wjson(f'https://{lang}.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&section=0&page=' + quote(hit['title']))
            wt = ((p or {}).get('parse', {}).get('wikitext', {}) or {}).get('*', '')
            if not wt or not maker_ok({'makers': g['makers']}, wt):
                continue
            m = re.search(r'\|\s*(?:' + INFOBOX[lang] + r')\s*=\s*([^\n|][^\n]*)', wt, re.I)
            if m and m.group(1).strip():
                v = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', m.group(1))
                v = re.sub(r'\{\{[^}]*\}\}|<[^>]+>', ' ', v).strip()
                if v:
                    return [{'how': f'Wikipedia ({lang}) infobox', 'page': f'https://{lang}.wikipedia.org/wiki/' + quote(hit['title'].replace(' ', '_')), 'title': hit['title'], 'quote': v[:200]}]
    return []

LABEL = r'(?:original\s+language|languages?|langues?(?:\s+originale)?|langue\(s\)|idiomas?(?:\s+original)?|idioma\(s\)|lenguas?|l[íi]nguas?|version\s+originale)'
PATS = [re.compile(r'\b' + LABEL + r'\s*[:：]\s*(.{2,100})', re.I),
        re.compile(r'[^.]{0,120}\b(?:subtit\w*|sous-titr\w*|subt[íi]tul\w*|legendad\w*|legendas)\b[^.]{0,120}', re.I),
        re.compile(r'[^.]{0,100}\b(?:in|en|em)\s+(?:the\s+|la\s+|a\s+|el\s+)?(?:\w+\s+)?(?:language|lengua|langue|l[íi]ngua|idioma)\b[^.]{0,80}', re.I),
        re.compile(r'[^.]{0,100}\b(?:language|lengua|langue|l[íi]ngua|idioma)\s+(?:\w+\s+){0,2}(?:of\s+the\s+)?[A-ZÁÉÍÓÚ][\w’\'-]+[^.]{0,60}'),
        re.compile(r'[^.]{0,100}\b(?:spoken|told|narrated|hablad\w*|narrad\w*|parl[ée]\w*|falad\w*|filmed)\s+(?:entirely\s+|enteramente\s+|entièrement\s+)?(?:in|en|em)\s+[A-ZÁÉÍÓÚ][^.]{0,80}')]

def text_of(html):
    t = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', html)
    t = re.sub(r'(?i)<br\s*/?>|</(p|div|li|tr|h\d|dd|dt)>', '\n', t)
    t = H.unescape(re.sub(r'<[^>]+>', ' ', t))
    return re.sub(r'[ \t\xa0]+', ' ', t)

def snippets(text):
    out = []
    for p in PATS:
        for m in p.finditer(text):
            s = re.sub(r'\s+', ' ', m.group(0)).strip()
            if 6 < len(s) < 320 and s not in out:
                out.append(s)
    return out[:8]

def jsonld_langs(html):
    return list(dict.fromkeys(re.findall(r'"inLanguage"\s*:\s*"([^"]{2,40})"', html)))[:5]

def fetch(url):
    r = get(url)
    if not r or r.status_code >= 400 or 'html' not in r.headers.get('content-type', ''):
        return None
    return r

def page_title(html):
    t = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
    og = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', html, re.I)
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.I | re.S)
    return H.unescape(' | '.join(re.sub('<[^>]+>', '', x.group(1)).strip() for x in (og, t, h1) if x))

def slug(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().replace('&', 'and')
    s = re.sub(r"[’'`]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def vimeo_desc(url, g):
    info = oembed(url)
    if info and title_ok(g['title'], info['title']):
        sn = snippets(info['text'])
        if sn:
            return {'how': 'Vimeo description', 'page': url, 'title': info['title'][:160], 'snippets': sn}
    return None

def try_pages(g):
    found = []
    pages = list(g['pages'])
    for t in dict.fromkeys([g['title'], main_title(g['title'])]):
        s = slug(t)
        if not s:
            continue
        pages += [{'url': f'https://www.nfb.ca/film/{s}/', 'how': 'NFB film page'},
                  {'url': f'https://www.moreliafilmfest.com/peliculas/{s}', 'how': 'Morelia film page'}]
        if any('wapikoni' in x for x in g['sources'] + [p['url'] for p in g['pages']]) or int((re.findall(r'\d{4}', str(g.get('year'))) or ['2004'])[0]) >= 2004:
            pages += [{'url': f'https://www.wapikoni.ca/movies/{s}', 'how': 'Wapikoni film page'},
                      {'url': f'https://evenementswapikoni.ca/{s}', 'how': 'Wapikoni film page'}]
        pages.append({'url': f'https://www.retinalatina.org/peliculas/{s}-{slug(g["makers"][0])}/', 'how': 'Retina Latina film page'})
    seen = set()
    for p in pages:
        u = p['url']
        if u in seen:
            continue
        seen.add(u)
        if re.search(r'vimeo\.com/\d+', u):
            v = vimeo_desc(u, g)
            if v:
                found.append(v)
            continue
        r = fetch(u)
        if not r:
            continue
        html = r.text[:600000]
        if not title_ok(g['title'], page_title(html)) or not maker_ok({'makers': g['makers'], 'year': g.get('year')}, text_of(html[:300000])):
            continue
        text = text_of(html)
        sn, ld = snippets(text), jsonld_langs(html)
        if sn or ld:
            found.append({'how': p['how'], 'page': r.url, 'title': page_title(html)[:160], 'snippets': sn, 'jsonld': ld})
        for v in re.findall(r'https?://(?:player\.)?vimeo\.com/(?:video/)?\d+', html)[:3]:
            v = vimeo_desc(v.replace('player.vimeo.com/video/', 'vimeo.com/'), g)
            if v:
                found.append(v)
        if found:
            break
    return found

def try_source(g):
    found = []
    for u in g['sources']:
        if not u or u.lower().endswith('.pdf'):
            continue
        r = fetch(u)
        if not r:
            continue
        text = text_of(r.text[:800000])
        mt = main_title(g['title'])
        nt = n(text)
        if len(mt) < 4 or mt not in nt:
            continue
        # passages right after each mention of the title (raw text, located via a loose search)
        words = [w for w in re.split(r'\s+', g['title'].split(' = ')[0].split(' / ')[0]) if w][:4]
        pat = re.compile(r'\s+'.join(re.escape(w) for w in words), re.I)
        for m in list(pat.finditer(text))[:4]:
            win = text[m.start(): m.start() + 700]
            sn = snippets(win)
            if sn:
                found.append({'how': 'map source, passage after the title', 'page': r.url, 'title': page_title(r.text[:200000])[:160], 'snippets': sn, 'window': re.sub(r'\s+', ' ', win)[:700]})
                break
    return found

def one(g):
    ev = []
    for step in (try_wikidata, try_wikidata_maker, try_wikipedia, try_pages, try_source):
        try:
            ev += step(g)
        except Exception as e:
            pass
        if any(x.get('langs') for x in ev):
            break
    with LOCK:
        with open('out/lang.jsonl', 'a', encoding='utf-8') as fh:
            fh.write(json.dumps({'n': g['n'], 'id': g['id'], 'title': g['title'], 'year': g['year'], 'makers': g['makers'], 'evidence': ev}, ensure_ascii=False) + '\n')
        print(g['n'], g['title'][:40], '->', len(ev), [x['how'] for x in ev], flush=True)

if __name__ == '__main__':
    os.makedirs('out', exist_ok=True)
    films = json.load(open('tools/languages/targets.json', encoding='utf-8'))
    done = set()
    if os.path.exists('out/lang.jsonl'):
        done = {json.loads(l)['n'] for l in open('out/lang.jsonl', encoding='utf-8')}
    lo, hi = (int(x) for x in (sys.argv[1:3] if len(sys.argv) > 2 else (0, len(films))))
    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(one, [g for g in films[lo:hi] if g['n'] not in done]))
    print('PASS DONE', flush=True)
